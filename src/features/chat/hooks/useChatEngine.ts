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
  hash?: string;
  audio_url?: string;
  audio_duration?: number;
  created_at: string;
}

export function useChatEngine(currentUserId: string, roomId?: string, receiverId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  // 监听全局清空事件
  useEffect(() => {
    const handleClear = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetId = roomId || receiverId;
      if (customEvent.detail?.targetId === targetId) {
        setMessages([]); // 立刻清空当前显示的视图
      }
    };
    window.addEventListener('gx_chat_cleared', handleClear);
    return () => window.removeEventListener('gx_chat_cleared', handleClear);
  }, [roomId, receiverId]);

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
      if (data) {
        // 读取单向删除的列表
        const delKey = `gx_deleted_msgs_${currentUserId}`;
        let deletedIds: string[] = [];
        try {
          const stored = localStorage.getItem(delKey);
          if (stored) deletedIds = JSON.parse(stored);
        } catch(e) {}

        // 读取清空时间戳 (直接读 localStorage 避免闭包旧状态)
        let localClearedAt = 0;
        const targetId = roomId || receiverId;
        if (targetId) {
          const clearKey = `gx_cleared_${currentUserId}_${targetId}`;
          const storedClear = localStorage.getItem(clearKey);
          if (storedClear) localClearedAt = parseInt(storedClear, 10);
        }

        // 本地降维：过滤掉清空时间点之前的消息，以及被标记为“单向删除/双向删除”的消息
        let validMessages = data.reverse();
        if (localClearedAt > 0) {
          validMessages = validMessages.filter(m => new Date(m.created_at).getTime() > localClearedAt);
        }
        if (deletedIds.length > 0) {
          validMessages = validMessages.filter(m => !deletedIds.includes(m.id));
        }
        setMessages(validMessages);
      }
    };

    fetchHistory();

    // 开启 WebSocket 监听 (0延迟体验核心)
    const channel = supabase
      .channel(`chat_${roomId || receiverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            // 过滤是否属于当前聊天窗口
            const isForRoom = roomId && newMsg.room_id === roomId;
            const isForPrivate = !roomId && (
              (newMsg.sender_id === currentUserId && newMsg.receiver_id === receiverId) ||
              (newMsg.sender_id === receiverId && newMsg.receiver_id === currentUserId)
            );

            if (isForRoom || isForPrivate) {
              setMessages((prev) => {
                // 防止重复插入
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('🔴 [Realtime] 收到 DELETE 广播:', payload);
            const oldMsg = payload.old;
            if (oldMsg && oldMsg.id) {
              setMessages((prev) => {
                const newMessages = prev.filter(m => m.id !== oldMsg.id);
                console.log('🗑️ [Realtime] 尝试移除消息:', oldMsg.id, '前后数量:', prev.length, '->', newMessages.length);
                return newMessages;
              });
              // 发出全局事件，通知左侧的 RecentChats 列表刷新
              window.dispatchEvent(new CustomEvent('gx_chat_message_deleted', { detail: { targetId: roomId || receiverId } }));
            }
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
      let hashStr: string | undefined;
      let audioUrl: string | undefined;

      // 图片降维打击流
      if (file) {
        // 步骤 1：极限压缩到 100KB 以内
        const compressedFile = await compressChatImage(file);
        
        // 步骤 2：为了生成 Blurhash，我们需要先给这个文件创建一个临时 URL
        const tempObjectUrl = URL.createObjectURL(compressedFile);
        hashStr = await generateBlurhash(tempObjectUrl);
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
          hash: hashStr,
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

  // 单向删除：仅对我删除
  const deleteMessageForMe = useCallback((msgId: string) => {
    if (!currentUserId) return;
    const key = `gx_deleted_msgs_${currentUserId}`;
    let deletedIds: string[] = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) deletedIds = JSON.parse(stored);
    } catch(e) {}
    
    if (!deletedIds.includes(msgId)) {
      deletedIds.push(msgId);
      localStorage.setItem(key, JSON.stringify(deletedIds));
    }
    
    // 立即更新视图
    setMessages(prev => prev.filter(m => m.id !== msgId));
    // 派发全局事件以刷新列表，但不触发全盘清空
    window.dispatchEvent(new CustomEvent('gx_chat_message_deleted', { detail: { targetId: roomId || receiverId } }));
  }, [currentUserId, roomId, receiverId]);

  // 双向删除：撤回消息 (物理删除或标记为已撤回)
  const deleteMessageForEveryone = useCallback(async (msgId: string) => {
    if (!currentUserId) return;
    
    // 1. 乐观更新 (Optimistic UI Update)：立即在本地移除，实现 0 延迟反馈
    setMessages(prev => prev.filter(m => m.id !== msgId));
    
    try {
      // 2. 真实物理删除 (这会触发所有客户端的 DELETE websocket 广播)
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', msgId)
        .eq('sender_id', currentUserId); // 仅允许删除自己发的消息

      if (error) throw error;
      
      // 派发全局事件以刷新列表
      window.dispatchEvent(new CustomEvent('gx_chat_message_deleted', { detail: { targetId: roomId || receiverId } }));
    } catch (error) {
      console.error('撤回消息失败:', error);
      // 可选：如果删除失败，可以在这里把消息加回来 (Rollback)
    }
  }, [currentUserId, roomId, receiverId]);

  return { messages, isSending, sendMessage, deleteMessageForMe, deleteMessageForEveryone };
}
