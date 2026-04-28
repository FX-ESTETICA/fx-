import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { compressChatImage } from '@/utils/imageCompression';
import { generateBlurhash } from '@/utils/blurhash';

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_role?: string;
  receiver_id?: string;
  receiver_role?: string;
  room_id?: string;
  content?: string;
  image_url?: string;
  hash?: string;
  audio_url?: string;
  audio_duration?: number;
  created_at: string;
}

// 提取数据获取逻辑为 SWR 的 fetcher
const fetchChatHistory = async (currentUserId: string, currentRole: string, roomId?: string, receiverId?: string, receiverRole?: string) => {
  if (!currentUserId) return [];

  let query = supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (roomId) {
    query = query.eq('room_id', roomId);
  } else if (receiverId) {
    // 1v1 私聊逻辑 (加入身份复合主键隔离)
    const roleCond1 = `sender_role.eq.${currentRole},receiver_role.eq.${receiverRole || 'user'}`;
    const roleCond2 = `sender_role.eq.${receiverRole || 'user'},receiver_role.eq.${currentRole}`;
    query = query.or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId},${roleCond1}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId},${roleCond2})`);
  }

  const { data, error } = await query;
  if (error) {
    // 物理拦截: 忽略因为组件卸载或页面跳转导致的 Abort/Fetch 错误，实现断网防御，保留本地缓存
    if (error.message?.includes('Failed to fetch') || error.message?.includes('AbortError')) {
      throw error;
    }
    console.error('历史消息拉取失败:', error);
    throw error;
  }

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
    return validMessages as ChatMessage[];
  }
  return [];
};

export function useChatEngine(currentUserId: string, currentRole: string, roomId?: string, receiverId?: string, receiverRole?: string) {
  const [isSending, setIsSending] = useState(false);

  // 1. SWR 核心接管：提供缓存、去重、并发安全
  const swrKey = currentUserId && (roomId || receiverId) 
    ? `chat_history_${currentUserId}_${currentRole}_${roomId || ''}_${receiverId || ''}_${receiverRole || ''}` 
    : null;

  // 【Local-First 引擎】：从本地硬盘光速读取聊天记录缓存
  const getCachedChatHistory = () => {
    if (typeof window === 'undefined' || !swrKey) return undefined;
    try {
      const cached = localStorage.getItem(`gx_${swrKey}`);
      return cached ? JSON.parse(cached) : undefined;
    } catch (e) {
      return undefined;
    }
  };

  // 【世界顶级：0毫秒同步点火】
  // 废弃空数组开局，组件挂载的瞬间直接吞下硬盘缓存，抹平 Hydration Gap
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(() => getCachedChatHistory() || []);

  const { data: swrMessages, isLoading, mutate } = useSWR(
    swrKey,
    () => fetchChatHistory(currentUserId, currentRole, roomId, receiverId, receiverRole),
    {
      revalidateOnFocus: true, // 焦点回到窗口时刷新
      dedupingInterval: 2000,  // 2秒内的重复请求去重
      keepPreviousData: true,  // 保持旧数据防闪烁
      fallbackData: getCachedChatHistory() || [], // 物理秒开：0毫秒同步灌入硬盘缓存
      onSuccess: (data) => {
        // 静默覆写到本地硬盘，供下次秒开
        if (typeof window !== 'undefined' && data && swrKey) {
          localStorage.setItem(`gx_${swrKey}`, JSON.stringify(data));
        }
      }
    }
  );

  // 同步 SWR 数据到本地状态，以便能够进行乐观更新和实时插入
  useEffect(() => {
    if (swrMessages) {
      setLocalMessages(swrMessages);
    }
  }, [swrMessages]);

  // 【Local-First 镜像同步引擎】：确保任何内存状态的变化（WebSocket 接收、乐观更新、撤回）都瞬间刻入硬盘
  useEffect(() => {
    if (typeof window !== 'undefined' && swrKey && localMessages.length > 0) {
      // 通过 debounce 或直接写入来防止高频 IO。这里直接写入因为消息数组通常不会太大。
      localStorage.setItem(`gx_${swrKey}`, JSON.stringify(localMessages));
    }
  }, [localMessages, swrKey]);

  // 监听全局清空事件
  useEffect(() => {
    const handleClear = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetId = roomId || receiverId;
      const targetRole = receiverRole || 'user';
      if (
        customEvent.detail?.targetId === targetId && 
        (roomId ? true : customEvent.detail?.targetRole === targetRole)
      ) {
        setLocalMessages([]); // 立刻清空当前显示的视图
        mutate([], false); // 同步清空缓存，不触发重新验证
      }
    };
    window.addEventListener('gx_chat_cleared', handleClear);
    return () => window.removeEventListener('gx_chat_cleared', handleClear);
  }, [roomId, receiverId, receiverRole, mutate]);

  // 2. 监听 Realtime
  useEffect(() => {
    if (!currentUserId || (!roomId && !receiverId)) return;

    // 每次进入聊天室或聊天室切换，立即更新一次当前聊天对象的阅读时间戳
    if (typeof window !== 'undefined') {
      // 加入 2000ms 容差，防御客户端与 Supabase 服务器之间的时钟偏移（Clock Skew）
      const targetRole = receiverRole || 'user';
      const readKey = roomId ? `gx_last_read_${currentUserId}_${roomId}` : `gx_last_read_${currentUserId}_${receiverId}_${targetRole}`;
      localStorage.setItem(readKey, (Date.now() + 2000).toString());
      window.dispatchEvent(new CustomEvent('gx_chat_read_updated'));
    }

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
              (newMsg.sender_id === currentUserId && newMsg.sender_role === currentRole && newMsg.receiver_id === receiverId && (newMsg.receiver_role || 'user') === (receiverRole || 'user')) ||
              (newMsg.sender_id === receiverId && (newMsg.sender_role || 'user') === (receiverRole || 'user') && newMsg.receiver_id === currentUserId && newMsg.receiver_role === currentRole)
            );

            if (isForRoom || isForPrivate) {
              setLocalMessages((prev) => {
                // 防止重复插入
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              // 同步更新 SWR 缓存（必须放在 setState 回调外部，防止 React Cannot update component 报错）
              mutate((prevData: any = []) => {
                if (prevData.some((m: any) => m.id === newMsg.id)) return prevData;
                return [...prevData, newMsg];
              }, false);

              // 物理级复查防线：用户当前处于聊天室内，收到新消息直接将其物理标记为已读
              if (typeof window !== 'undefined') {
                // 加入 2000ms 容差，防御客户端与 Supabase 服务器之间的时钟偏移（Clock Skew）
                const msgTime = new Date(newMsg.created_at).getTime();
                const readTime = Math.max(Date.now(), msgTime + 2000);
                const targetRole = receiverRole || 'user';
                const readKey = roomId ? `gx_last_read_${currentUserId}_${roomId}` : `gx_last_read_${currentUserId}_${receiverId}_${targetRole}`;
                localStorage.setItem(readKey, readTime.toString());
                window.dispatchEvent(new CustomEvent('gx_chat_read_updated'));
              }
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('🔴 [Realtime] 收到 DELETE 广播:', payload);
            const oldMsg = payload.old;
            if (oldMsg && oldMsg.id) {
              setLocalMessages((prev) => {
                const newMessages = prev.filter(m => m.id !== oldMsg.id);
                console.log('🗑️ [Realtime] 尝试移除消息:', oldMsg.id, '前后数量:', prev.length, '->', newMessages.length);
                return newMessages;
              });
              mutate((prevData: any = []) => {
                return prevData.filter((m: any) => m.id !== oldMsg.id);
              }, false);
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
  }, [currentUserId, roomId, receiverId, mutate]);

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
          sender_role: currentRole,
          receiver_id: receiverId,
          receiver_role: receiverRole || 'user',
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
  }, [currentUserId, currentRole, roomId, receiverId, receiverRole]);

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
    setLocalMessages((prev: ChatMessage[]) => prev.filter(m => m.id !== msgId));
    // 派发全局事件以刷新列表，但不触发全盘清空
    window.dispatchEvent(new CustomEvent('gx_chat_message_deleted', { detail: { targetId: roomId || receiverId } }));
  }, [currentUserId, roomId, receiverId]);

  // 双向删除：撤回消息 (物理删除或标记为已撤回)
  const deleteMessageForEveryone = useCallback(async (msgId: string) => {
    if (!currentUserId) return;
    
    // 1. 乐观更新 (Optimistic UI Update)：立即在本地移除，实现 0 延迟反馈
    setLocalMessages((prev: ChatMessage[]) => prev.filter(m => m.id !== msgId));
    
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

  return { messages: localMessages, isLoading, isSending, sendMessage, deleteMessageForMe, deleteMessageForEveryone };
}
