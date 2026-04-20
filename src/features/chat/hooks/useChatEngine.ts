import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { compressChatImage } from '@/utils/imageCompression';
import { generateBlurhash } from '@/utils/blurhash';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id?: string;
  room_id?: string;
  content?: string;
  image_url?: string;
  blurhash?: string;
  audio_url?: string;
  audio_duration?: number;
  created_at: string;
}

export function useChatEngine(currentUserId: string, roomId?: string, receiverId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  // 1. 初始化拉取历史消息 & 监听 Realtime
  useEffect(() => {
    if (!currentUserId) return;

    // 拉取最近的 50 条消息
    const fetchHistory = async () => {
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (roomId) {
        query = query.eq('room_id', roomId);
      } else if (receiverId) {
        // 1v1 私聊逻辑
        query = query.or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`);
      }

      const { data, error } = await query;
      if (error) console.error('历史消息拉取失败:', error);
      if (data) setMessages(data.reverse()); // 倒序转正序
    };

    fetchHistory();

    // 开启 WebSocket 监听 (0延迟体验核心)
    const channel = supabase
      .channel(`chat_${roomId || receiverId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          // 过滤是否属于当前聊天窗口
          const isForRoom = roomId && newMsg.room_id === roomId;
          const isForPrivate = !roomId && (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === receiverId) ||
            (newMsg.sender_id === receiverId && newMsg.receiver_id === currentUserId)
          );

          if (isForRoom || isForPrivate) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, roomId, receiverId]);

  // 2. 核心发送逻辑 (文本 + 极速图片降维 + 音频支持)
  const sendMessage = useCallback(async (content?: string, file?: File, audioBlob?: Blob, audioDuration?: number) => {
    if (!currentUserId) return;
    setIsSending(true);

    try {
      let imageUrl: string | undefined;
      let blurhashStr: string | undefined;
      let audioUrl: string | undefined;

      // 图片降维打击流
      if (file) {
        // 步骤 1：极限压缩到 100KB 以内
        const compressedFile = await compressChatImage(file);
        
        // 步骤 2：为了生成 Blurhash，我们需要先给这个文件创建一个临时 URL
        const tempObjectUrl = URL.createObjectURL(compressedFile);
        blurhashStr = await generateBlurhash(tempObjectUrl);
        URL.revokeObjectURL(tempObjectUrl); // 释放内存

        // 步骤 3：上传至 Supabase Storage
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat_media')
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;

        // 获取公开访问链接
        const { data: publicUrlData } = supabase.storage
          .from('chat_media')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrlData.publicUrl;
      }

      // 音频文件上传流
      if (audioBlob) {
        const fileExt = 'webm'; // 目前 Web 端默认使用 webm 容器
        const fileName = `audio_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat_media')
          .upload(filePath, audioBlob, { contentType: 'audio/webm' });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('chat_media')
          .getPublicUrl(filePath);
        
        audioUrl = publicUrlData.publicUrl;
      }

      // 步骤 4：写入消息表，瞬间触发 Realtime 推送给对方
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          room_id: roomId,
          content,
          image_url: imageUrl,
          blurhash: blurhashStr,
          audio_url: audioUrl,
          audio_duration: audioDuration,
        });

      if (insertError) throw insertError;

    } catch (error) {
      console.error('发送消息彻底失败:', error);
      // 将错误详细信息抛出，方便定位问题 (比如表结构缺少字段)
      if (error instanceof Error) {
        console.error('Error Details:', error.message);
      } else {
        console.error('Error Object:', JSON.stringify(error, null, 2));
      }
      // 这里应该抛给 UI 层提示错误
    } finally {
      setIsSending(false);
    }
  }, [currentUserId, roomId, receiverId]);

  return { messages, isSending, sendMessage };
}
