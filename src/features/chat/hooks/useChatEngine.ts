import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from '@/store/useSyncStore';
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

export function useChatEngine(rawUserId: string, rawRole: string, roomId?: string, receiverId?: string, receiverRole?: string) {
  // 【金钟罩】：防闪断 ID 锁。抵御切回前台时，useAuth 刷新导致的短暂 ID 丢失
  const latchedUserId = useRef(rawUserId);
  if (rawUserId) latchedUserId.current = rawUserId;
  const currentUserId = rawUserId || latchedUserId.current;

  const latchedRole = useRef(rawRole);
  if (rawRole) latchedRole.current = rawRole;
  const currentRole = rawRole || latchedRole.current;

  const syncTick = useSyncStore(state => state.syncTick);
  const resurrectTick = useSyncStore(state => state.resurrectTick);

  const [isSending, setIsSending] = useState(false);

  // 1. SWR 核心接管：提供缓存、去重、并发安全
  const swrKey = currentUserId && (roomId || receiverId) 
    ? `chat_history_${currentUserId}_${currentRole}_${roomId || ''}_${receiverId || ''}_${receiverRole || ''}` 
    : null;

  // Local State 接管真理
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined' && swrKey) {
      const cached = localStorage.getItem(`gx_${swrKey}`);
      if (cached) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);

  // 【核心改造】：彻底废弃 SWR。使用纯正的状态机 + 版本号防覆盖
  useEffect(() => {
    if (!currentUserId || (!roomId && !receiverId)) return;

    let isCancelled = false;
    let currentFetchVersion = 0;

    const performPhysicalFetch = async (source: string) => {
      if (isCancelled) return;
      currentFetchVersion++;
      const thisVersion = currentFetchVersion;
      setIsLoading(true);

      console.log(`[ChatEngine] 🎯 触发物理 Fetch (Source: ${source}, Version: ${thisVersion})`);
      let retries = 3;
      let delay = 1000;
      
      while (retries > 0 && !isCancelled) {
        try {
          const newData = await fetchChatHistory(currentUserId, currentRole, roomId, receiverId, receiverRole);
          
          if (isCancelled) break;
          // 【防覆盖核弹】：如果在我请求期间，有新的请求发出了，我直接把我的数据扔进垃圾桶！
          if (thisVersion !== currentFetchVersion) {
            console.warn(`[ChatEngine] 🛡️ 拦截旧版本数据覆盖！(Version ${thisVersion} expired)`);
            break;
          }

          if (typeof window !== 'undefined' && newData && swrKey) {
            setLocalMessages(newData);
            localStorage.setItem(`gx_${swrKey}`, JSON.stringify(newData));
            break; // 成功则退出重试循环
          }
        } catch (e) {
          console.error(`[ChatEngine] 物理 Fetch 失败，剩余重试: ${retries - 1}`, e);
          retries--;
          if (retries > 0 && !isCancelled) {
            await new Promise(r => setTimeout(r, delay));
            delay *= 2; // 指数退避 1s, 2s
          }
        }
      }
      if (!isCancelled && thisVersion === currentFetchVersion) {
        setIsLoading(false);
      }
    };

    // 1. 初次挂载时执行
    performPhysicalFetch('initial_mount');

    // 2. 监听状态机 Tick
    const unsubscribeSync = useSyncStore.subscribe((state, prevState) => {
      if (state.syncTick > prevState.syncTick) {
        performPhysicalFetch(`sync_tick_${state.syncTick}`);
      }
    });

    // 3. 监听全局清空事件
    const handleClear = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetId = roomId || receiverId;
      const targetRole = receiverRole || 'user';
      if (
        customEvent.detail?.targetId === targetId && 
        (roomId ? true : customEvent.detail?.targetRole === targetRole)
      ) {
        currentFetchVersion++; // 强制过期正在路上的 Fetch
        setLocalMessages([]); // 立刻清空当前显示的视图
        if (swrKey) localStorage.removeItem(`gx_${swrKey}`);
      }
    };
    window.addEventListener('gx_chat_cleared', handleClear);

    return () => {
      isCancelled = true;
      unsubscribeSync();
      window.removeEventListener('gx_chat_cleared', handleClear);
    };
  }, [roomId, receiverId, receiverRole, currentUserId, currentRole, swrKey]); // 完全剥离 SWR 依赖

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
    const setupChannel = () => {
      return supabase
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
                  if (prev.some(m => m.id === newMsg.id)) return prev;
                  const newArray = [...prev, newMsg];
                  if (typeof window !== 'undefined' && swrKey) {
                    localStorage.setItem(`gx_${swrKey}`, JSON.stringify(newArray));
                  }
                  return newArray;
                });

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
                  if (typeof window !== 'undefined' && swrKey) {
                    localStorage.setItem(`gx_${swrKey}`, JSON.stringify(newMessages));
                  }
                  return newMessages;
                });
                // 发出全局事件，通知左侧的 RecentChats 列表刷新
                window.dispatchEvent(new CustomEvent('gx_chat_message_deleted', { detail: { targetId: roomId || receiverId } }));
              }
            }
          }
        )
        .subscribe();
    };
    
    let channel = setupChannel();

    const unsubscribeResurrect = useSyncStore.subscribe((state, prevState) => {
      if (state.resurrectTick > prevState.resurrectTick) {
        console.log(`[ChatEngine] ☢️ 收到状态机 Nuke 信号 (Tick=${state.resurrectTick})，物理重建 WebSocket...`);
        if (channel) supabase.removeChannel(channel);
        channel = setupChannel();
      }
    });

    return () => {
      unsubscribeResurrect();
      supabase.removeChannel(channel);
    };
  }, [resurrectTick, currentUserId, currentRole, roomId, receiverId, receiverRole, swrKey]);

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
      // 乐观更新逻辑已重构：Local State 结合 Realtime
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
      return true;
    } catch (error: any) {
      // 绝对洁癖法则：拦截一切控制台红字，转换为用户友好的业务提示
      const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
      const errorMsg = error?.message || errorStr;

      if (errorMsg.includes('ANTI_SPAM_GATEWAY_BLOCKED')) {
        alert('防骚扰拦截：请等待对方回复后再发送更多消息。');
      } else {
        alert('发送失败，请稍后重试。');
      }
      return false;
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
