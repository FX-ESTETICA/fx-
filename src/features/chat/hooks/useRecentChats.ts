import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';

export interface RecentChat {
  id: string; // 对端用户ID 或 房间ID
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unread: boolean;
  isGroup: boolean;
  isOnline?: boolean;
  isCityChannel?: boolean;
  isPhantom?: boolean; // 标记是否为量子幻影（还没有真实聊天记录）
}

// 封装专门用于获取最近聊天的 fetcher 函数
const fetchRecentChatsData = async (currentUserId: string): Promise<RecentChat[]> => {
  if (!currentUserId) return [];

  // 拉取最近 100 条与自己相关的消息
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    // 物理拦截: 忽略因为组件卸载或页面跳转导致的 Abort/Fetch 错误，实现 0 报错控制台
    if (error.message?.includes('Failed to fetch') || error.message?.includes('AbortError')) {
      return [];
    }
    console.error('拉取最近聊天失败:', error);
    throw new Error(error.message);
  }

  const chatMap = new Map<string, RecentChat>();
  const userIdsToFetch = new Set<string>();

  if (messages) {
    messages.forEach((msg) => {
      let targetId = '';
      let isGroup = false;
      let name = '';
      let avatar = '';
      let isCityChannel = false;

      // 判断是群聊还是私聊
      if (msg.room_id) {
        targetId = msg.room_id;
        isGroup = true;
        name = msg.room_id === 'city_current' ? 'RAPALLO' : `空间群聊 ${targetId.substring(0,4)}`;
        avatar = msg.room_id === 'city_current' 
          ? 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=150&h=150&fit=crop' 
          : 'https://i.pravatar.cc/150?img=50';
        if (msg.room_id === 'city_current') isCityChannel = true;
      } else {
        targetId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
        isGroup = false;
        name = `信号源 ${targetId?.substring(0, 4) || '未知'}`; // 临时假名字，后面会被覆盖
        avatar = ''; // 移除 Dicebear，使用空字符串触发首字母渲染
        userIdsToFetch.add(targetId); // 记录下真实的 targetId，准备去 profiles 表里反查
      }

      // 如果 Map 里还没有这个 targetId，说明这是最新的一条（因为数据已经是倒序的了）
      if (!chatMap.has(targetId) && targetId) {
        // 获取此对话的本地清空时间戳 (降维打击：物理拦截被清空的历史)
        let clearedAt = 0;
        let deletedIds: string[] = [];
        let isChatDeleted = false;
        
        if (typeof window !== 'undefined') {
          const delChatKey = `gx_deleted_chat_${currentUserId}_${targetId}`;
          const deletedStr = localStorage.getItem(delChatKey);
          if (deletedStr) {
            isChatDeleted = true;
            // 如果存储的是时间戳(新逻辑)，用它作比较；否则用0(旧逻辑)
            const deletedTime = parseInt(deletedStr, 10);
            if (!isNaN(deletedTime)) {
              clearedAt = deletedTime; // 复用 clearedAt 变量作为阻断时间
            }
          }

          const key = `gx_cleared_${currentUserId}_${targetId}`;
          const stored = localStorage.getItem(key);
          if (stored) {
             const clearTime = parseInt(stored, 10);
             if (clearTime > clearedAt) clearedAt = clearTime; // 取最晚的时间作为清理阈值
          }

          const delKey = `gx_deleted_msgs_${currentUserId}`;
          try {
            const delStored = localStorage.getItem(delKey);
            if (delStored) deletedIds = JSON.parse(delStored);
          } catch(e) {}
        }
        
        const msgDate = new Date(msg.created_at);

        // 如果用户右键删除了聊天框，且之后没有新消息，则从列表中抹除
        // 如果有新消息（消息时间 > 清除时间），则解除删除状态，让聊天框重新浮出水面
        if (isChatDeleted) {
          if (clearedAt > 0 && msgDate.getTime() <= clearedAt) {
            return; // 历史消息，继续拦截
          } else if (msgDate.getTime() > clearedAt) {
            // 对方发来了新消息，破除"已删除"状态
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`gx_deleted_chat_${currentUserId}_${targetId}`);
            }
            isChatDeleted = false; // 允许新消息展示
          }
        }
        // 跳过单向删除的消息
        if (deletedIds.includes(msg.id)) {
          return; // 继续找下一条未删除的消息作为 lastMessage
        }

        // 如果最新消息的时间早于清空时间，保留会话但清空预览内容
        if (msgDate.getTime() > clearedAt) {
          const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          let lastMessageStr = msg.content || '';
          if (msg.image_url) lastMessageStr = '[图片流]';
          if (msg.audio_url) lastMessageStr = '[语音流]';
  
          chatMap.set(targetId, {
            id: targetId,
            name,
            lastMessage: lastMessageStr,
            time: timeStr,
            avatar,
            unread: msg.sender_id !== currentUserId, // 简单模拟：如果最新一条不是自己发的，就是未读
            isGroup,
            isCityChannel,
          });
        } else {
          // 被清空的会话：依然留在列表中，但显示空状态，不再往回找更老的消息
          chatMap.set(targetId, {
            id: targetId,
            name,
            lastMessage: '', // 留空
            time: '',
            avatar,
            unread: false,
            isGroup,
            isCityChannel,
          });
        }
      }
    });
  }

  // ==========================================
  // 【全真数据反查引擎】(加入 UUID 防御与身份路由)
  // 批量查询所有单聊对象的真实姓名和真实头像
  // ==========================================
  const profilesMap = new Map<string, { name: string, avatar: string }>();
  const validUuids: string[] = [];
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  Array.from(userIdsToFetch).forEach(id => {
    // 防御保护：如果 id 不存在，直接跳过
    if (!id) return;
    
    if (UUID_REGEX.test(id)) {
      validUuids.push(id);
    } else {
      // 物理拦截非 UUID (如 phone_3937, guest_001)，直接在内存赋予身份
      if (id.startsWith('wa_')) {
        // 兼容历史老数据
        profilesMap.set(id, {
          name: `WA客户 ${id.replace('wa_', '').substring(0, 4)}`,
          avatar: ''
        });
      } else if (id.startsWith('phone_')) {
        // 全新降维呈现：直接显示真实号码 (加入跨国智能解析)
        const rawPhone = id.replace('phone_', '');
        let displayPhone = `+${rawPhone}`;
        
        if (rawPhone.startsWith('86') && rawPhone.length === 13) {
          displayPhone = `+86 ${rawPhone.substring(2,5)} ${rawPhone.substring(5,9)} ${rawPhone.substring(9)}`;
        } else if (rawPhone.startsWith('39') && rawPhone.length >= 11) {
          displayPhone = `+39 ${rawPhone.substring(2,5)} ${rawPhone.substring(5,8)} ${rawPhone.substring(8)}`;
        } else if (rawPhone.length === 11 && rawPhone.startsWith('1')) {
          // 纯11位国内手机号兜底
          displayPhone = `+86 ${rawPhone.substring(0,3)} ${rawPhone.substring(3,7)} ${rawPhone.substring(7)}`;
        } else if (rawPhone.length === 10 || rawPhone.length === 9) {
          // 纯10位或9位意大利手机号兜底
          displayPhone = `+39 ${rawPhone.substring(0,3)} ${rawPhone.substring(3,6)} ${rawPhone.substring(6)}`;
        }
        
        profilesMap.set(id, {
          name: displayPhone,
          avatar: ''
        });
      } else if (id.startsWith('guest_')) {
        // 游客编号直接透传 (如 guest_001 -> 游客 001)
        profilesMap.set(id, {
          name: `游客 ${id.replace('guest_', '')}`,
          avatar: ''
        });
      }
    }
  });

  if (validUuids.length > 0) {
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', validUuids);

    if (profileErr) {
      if (!profileErr.message?.includes('Failed to fetch') && !profileErr.message?.includes('AbortError')) {
        console.error('批量查询档案失败:', profileErr);
      }
    }

    if (profiles) {
      profiles.forEach(p => {
        profilesMap.set(p.id, { 
          name: p.name || `用户 ${p.id.substring(0,4)}`, 
          avatar: p.avatar_url || '' // 使用空字符串，交由 UI 渲染首字母
        });
      });
    }
  }

  // 组装最终数据并合并真实 Profile
  return Array.from(chatMap.values()).map(chat => {
    if (!chat.isGroup) {
      const realProfile = profilesMap.get(chat.id);
      if (realProfile) {
        chat.name = realProfile.name;
        chat.avatar = realProfile.avatar;
      }
    }
    return chat;
  });
};

// 升级版：接入现代 useSWR 架构，防死锁，防竞态
export function useRecentChats(currentUserId: string, activeChatId?: string) {
  // SWR 核心接管：提供缓存、去重、并发安全
  const { data: recentChats = [], isLoading, mutate } = useSWR(
    currentUserId ? `recentChats_${currentUserId}` : null,
    () => fetchRecentChatsData(currentUserId),
    {
      revalidateOnFocus: true, // 焦点回到窗口时刷新
      dedupingInterval: 5000,  // 5秒内的重复请求去重
      keepPreviousData: true   // 保持旧数据防闪烁
    }
  );

  useEffect(() => {
    if (!currentUserId) return;

    // 监听全局清空和删除事件以刷新列表
    const handleUpdate = () => {
      mutate(); // 触发 SWR 重新请求
    };
    window.addEventListener('gx_chat_cleared', handleUpdate);
    window.addEventListener('gx_chat_message_deleted', handleUpdate);

    // 监听新消息到达，更新列表 (化假为真的关键)
    // 注意：这里使用 mutate 触发 SWR 重新拉取，不直接改 state
    const channel = supabase
      .channel('public:messages_list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (_payload) => {
          // 有新消息，重新拉取列表以更新顺序和内容
          mutate();
        }
      )
      .subscribe();

    // 【核心修复】：挂载底层 Auth 监听。一旦监听到 Token 真正就绪（INITIAL_SESSION 或 SIGNED_IN），
    // 强制静默拉取数据，打破因 0 秒抢跑导致的空数据锁死。
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        mutate();
      }
    });

    return () => {
      window.removeEventListener('gx_chat_cleared', handleUpdate);
      window.removeEventListener('gx_chat_message_deleted', handleUpdate);
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [currentUserId, mutate]); // 依赖 mutate，移除 activeChatId 依赖

  // ==========================================
  // 【动态置顶与幻影注入】(仅在前端内存中进行，不触发网络请求)
  // ==========================================
  const finalProcessedChats = useMemo(() => {
    let result = [...recentChats];

    // 如果当前选中的聊天不在历史列表中（如从 URL 进来的 wa_ 客户），就在内存中伪造一个
    if (activeChatId && !result.some(c => c.id === activeChatId)) {
      const isGroup = activeChatId === 'city_current' || activeChatId.startsWith('group_');
      let name = '正在连接...';
      let avatar = '';
      
      if (activeChatId.startsWith('wa_')) {
        name = `WA客户 ${activeChatId.replace('wa_', '').substring(0, 4)}`;
      } else if (activeChatId.startsWith('phone_')) {
        const rawPhone = activeChatId.replace('phone_', '');
        name = `+86 ${rawPhone.substring(0,3)} ${rawPhone.substring(3,7)} ${rawPhone.substring(7)}`;
      } else if (activeChatId.startsWith('guest_')) {
        name = `游客 ${activeChatId.replace('guest_', '')}`;
      }

      result.push({
        id: activeChatId,
        name,
        lastMessage: '[系统] 正在建立全息加密通道...',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar,
        unread: false,
        isGroup,
        isCityChannel: activeChatId === 'city_current',
        isPhantom: true
      });
    }

    // ==========================================
    // 动态注入法则：只处理幻影注入，不再粗暴地因为 activeChatId 就把历史卡片置顶
    // 微信/WhatsApp 只有在发消息或收消息(时间戳改变)时才重排。点击仅仅是改变UI已读状态。
    // ==========================================

    return result;
  }, [recentChats, activeChatId]);

  return { recentChats: finalProcessedChats, isLoading };
}