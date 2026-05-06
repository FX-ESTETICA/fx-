import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';

export interface RecentChat {
  id: string; // 对端用户ID 或 房间ID
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unread: number;
  isGroup: boolean;
  isOnline?: boolean;
  isCityChannel?: boolean;
  isPhantom?: boolean; // 标记是否为量子幻影（还没有真实聊天记录）
  targetRole?: string; // 对方的身份角色
}

// 封装专门用于获取最近聊天的 fetcher 函数
const fetchRecentChatsData = async (currentUserId: string, currentRole: string): Promise<RecentChat[]> => {
  if (!currentUserId) return [];

  // 拉取最近 500 条与自己相关的消息（为了能够统计准确的未读数，适当扩大查询范围）
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUserId},sender_role.eq.${currentRole}),and(receiver_id.eq.${currentUserId},receiver_role.eq.${currentRole})`)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    // 物理拦截: 忽略因为组件卸载或页面跳转导致的 Abort/Fetch 错误，实现 0 报错控制台
    // 修复：网络失败时必须 throw error，而不是 return []。这样 SWR 才会触发 keepPreviousData 保留旧缓存，而不是把列表打空
    if (error.message?.includes('Failed to fetch') || error.message?.includes('AbortError')) {
      throw error;
    }
    console.error('拉取最近聊天失败:', error);
    throw new Error(error.message);
  }

  const chatMap = new Map<string, RecentChat>();
  const userIdsToFetch = new Set<string>();

  if (messages) {
    messages.forEach((msg) => {
      let targetId = '';
      let targetRole = '';
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
        if (msg.sender_id === currentUserId && msg.sender_role === currentRole) {
          targetId = msg.receiver_id;
          targetRole = msg.receiver_role;
        } else {
          targetId = msg.sender_id;
          targetRole = msg.sender_role;
        }
        isGroup = false;
        name = `信号源 ${targetId?.substring(0, 4) || '未知'}`; // 临时假名字，后面会被覆盖
        avatar = ''; // 移除 Dicebear，使用空字符串触发首字母渲染
        userIdsToFetch.add(targetId); // 记录下真实的 targetId，准备去 profiles 表里反查
      }

      // 如果 Map 里还没有这个复合键 (targetId_targetRole)，说明这是最新的一条
      const mapKey = isGroup ? targetId : `${targetId}_${targetRole}`;
      if (!chatMap.has(mapKey) && targetId) {
        // 获取此对话的本地清空时间戳 (降维打击：物理拦截被清空的历史)
        let clearedAt = 0;
        let deletedIds: string[] = [];
        let isChatDeleted = false;
        let lastReadTime = 0;
        
        if (typeof window !== 'undefined') {
          const delChatKey = isGroup ? `gx_deleted_chat_${currentUserId}_${targetId}` : `gx_deleted_chat_${currentUserId}_${targetId}_${targetRole}`;
          const deletedStr = localStorage.getItem(delChatKey);
          if (deletedStr) {
            isChatDeleted = true;
            // 如果存储的是时间戳(新逻辑)，用它作比较；否则用0(旧逻辑)
            const deletedTime = parseInt(deletedStr, 10);
            if (!isNaN(deletedTime)) {
              clearedAt = deletedTime; // 复用 clearedAt 变量作为阻断时间
            }
          }

          const key = isGroup ? `gx_cleared_${currentUserId}_${targetId}` : `gx_cleared_${currentUserId}_${targetId}_${targetRole}`;
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

          const readKey = isGroup ? `gx_last_read_${currentUserId}_${targetId}` : `gx_last_read_${currentUserId}_${targetId}_${targetRole}`;
          const readStored = localStorage.getItem(readKey);
          if (readStored) {
            const parsedReadTime = parseInt(readStored, 10);
            if (!isNaN(parsedReadTime)) {
              lastReadTime = parsedReadTime;
            }
          }
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
  
          // 计算未读数量：如果当前消息是对方发的，且时间晚于最后阅读时间，则算 1 条
          const isUnread = msg.sender_id !== currentUserId && msgDate.getTime() > lastReadTime;
          const unreadCount = isUnread ? 1 : 0;

          chatMap.set(mapKey, {
            id: targetId,
            name,
            lastMessage: lastMessageStr,
            time: timeStr,
            avatar,
            unread: unreadCount,
            isGroup,
            isCityChannel,
            targetRole,
          });
        } else {
          // 被清空的会话：依然留在列表中，但显示空状态，不再往回找更老的消息
          chatMap.set(mapKey, {
            id: targetId,
            name,
            lastMessage: '', // 留空
            time: '',
            avatar,
            unread: 0,
            isGroup,
            isCityChannel,
            targetRole,
          });
        }
      } else if (chatMap.has(mapKey) && targetId) {
        // 如果已经存在该聊天（处理该聊天的历史消息，用于累加未读数）
        const chat = chatMap.get(mapKey)!;
        const msgDate = new Date(msg.created_at);
        
        let lastReadTime = 0;
        if (typeof window !== 'undefined') {
          const readKey = isGroup ? `gx_last_read_${currentUserId}_${targetId}` : `gx_last_read_${currentUserId}_${targetId}_${targetRole}`;
          const readStored = localStorage.getItem(readKey);
          if (readStored) {
            const parsedReadTime = parseInt(readStored, 10);
            if (!isNaN(parsedReadTime)) {
              lastReadTime = parsedReadTime;
            }
          }
        }

        // 如果这条历史消息是对方发的，并且时间晚于最后阅读时间，且晚于被清空的时间，则未读数 +1
        let clearedAt = 0;
        if (typeof window !== 'undefined') {
          const clearKey = isGroup ? `gx_cleared_${currentUserId}_${targetId}` : `gx_cleared_${currentUserId}_${targetId}_${targetRole}`;
          const storedClear = localStorage.getItem(clearKey);
          if (storedClear) {
             const clearTime = parseInt(storedClear, 10);
             if (!isNaN(clearTime)) clearedAt = clearTime;
          }
        }

        if (
          msg.sender_id !== currentUserId && 
          msgDate.getTime() > lastReadTime && 
          msgDate.getTime() > clearedAt
        ) {
          chat.unread += 1;
        }
      }
    });
  }

  // ==========================================
  // 【全真数据反查引擎】(双ID隔离架构：从 profiles 表查询 gx_id / merchant_gx_id)
  // ==========================================
  const profilesMap = new Map<string, any>();
  const validGxIds: string[] = [];
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // 支持解析我们的业务编号 GX-UR-xxx, GX-MC-xxx
  const GX_ID_REGEX = /^GX-(UR|MC)-[A-F0-9]+$/i;

  Array.from(userIdsToFetch).forEach(id => {
    // 防御保护：如果 id 不存在，直接跳过
    if (!id) return;
    
    if (UUID_REGEX.test(id) || GX_ID_REGEX.test(id) || id === 'GX88888888') {
      validGxIds.push(id);
    } else {
      // 物理拦截非 UUID/GX_ID (如 phone_3937, guest_001)，直接在内存赋予身份
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

  if (validGxIds.length > 0) {
    // 【核心重构】：同时去匹配 gx_id 和 merchant_gx_id
    // 如果消息的 sender/receiver 是 merchant_gx_id，这里需要反查商户信息
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, gx_id, merchant_gx_id, name, avatar_url, merchant_name, merchant_avatar_url, boss_name, boss_avatar_url')
      .or(`id.in.(${validGxIds.map(id => `"${id}"`).join(',')}),gx_id.in.(${validGxIds.map(id => `"${id}"`).join(',')}),merchant_gx_id.in.(${validGxIds.map(id => `"${id}"`).join(',')})`);

    if (profileErr) {
      if (!profileErr.message?.includes('Failed to fetch') && !profileErr.message?.includes('AbortError')) {
        console.error('批量查询档案失败:', profileErr);
      }
    }

    if (profiles) {
      profiles.forEach(p => {
        // 为不同的 ID 键值存储完整的 profile 引用，以便后面根据 role 取值
        if (p.gx_id) {
          profilesMap.set(p.gx_id, p);
        }
        if (p.merchant_gx_id) {
          profilesMap.set(p.merchant_gx_id, p);
        }
        // 兼容老数据（如果有的消息还是用的 UUID）
        profilesMap.set(p.id, p);
      });
    }
  }

  // 组装最终数据并合并真实 Profile
  return Array.from(chatMap.values()).map(chat => {
    if (!chat.isGroup) {
      const realProfile = profilesMap.get(chat.id);
      if (realProfile) {
        // 如果是老逻辑（如 wa_、phone_ 等），profilesMap 里存的只有 name 和 avatar，没有 id 属性
        if (!realProfile.id) {
          chat.name = realProfile.name;
          chat.avatar = realProfile.avatar;
        } else {
          // 如果是数据库查出来的 profiles 记录，则根据 role 动态显示名称和头像
          if (chat.targetRole === 'merchant') {
            chat.name = realProfile.merchant_name || `智控 ${realProfile.merchant_gx_id?.substring(realProfile.merchant_gx_id.length - 4) || ''}`;
            chat.avatar = realProfile.merchant_avatar_url || realProfile.avatar_url || '';
          } else if (chat.targetRole === 'boss') {
            chat.name = realProfile.boss_name || realProfile.name || 'BOSS';
            chat.avatar = realProfile.boss_avatar_url || realProfile.avatar_url || '';
          } else {
            chat.name = realProfile.name || `信号源 ${realProfile.gx_id?.substring(realProfile.gx_id.length - 4) || ''}`;
            chat.avatar = realProfile.avatar_url || '';
          }
        }
      }
    }
    return chat;
  });
};

// 升级版：接入现代 useSWR 架构，防死锁，防竞态，并挂载 Local-First 引擎
export function useRecentChats(currentUserId: string, currentRole: string, activeChatId?: string) {
  // 【Local-First 引擎】：从本地硬盘光速读取聊天列表缓存
  const getCachedRecentChats = (userId: string, role: string) => {
    if (typeof window === 'undefined' || !userId) return undefined;
    try {
      const cached = localStorage.getItem(`gx_recent_chats_${userId}_${role}`);
      return cached ? JSON.parse(cached) : undefined;
    } catch (e) {
      return undefined;
    }
  };

  // SWR 核心接管：提供缓存、去重、并发安全，并挂载 Local-First 硬盘备份引擎
  const { data: recentChats = [], isLoading, mutate } = useSWR(
    currentUserId ? `recentChats_${currentUserId}_${currentRole}` : null,
    () => fetchRecentChatsData(currentUserId, currentRole),
    {
      revalidateOnFocus: true, // 焦点回到窗口时刷新
      dedupingInterval: 5000,  // 5秒内的重复请求去重
      keepPreviousData: true,  // 保持旧数据防闪烁
      fallbackData: getCachedRecentChats(currentUserId, currentRole) || [], // 物理秒开：0毫秒同步灌入上次硬盘缓存
      onSuccess: (data) => {
        // 成功拉取到最新数据后，静默覆写到本地硬盘，供下次秒开
        if (typeof window !== 'undefined' && data && currentUserId) {
          localStorage.setItem(`gx_recent_chats_${currentUserId}_${currentRole}`, JSON.stringify(data));
        }
      }
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
    window.addEventListener('gx_chat_read_updated', handleUpdate);

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
      window.removeEventListener('gx_chat_read_updated', handleUpdate);
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [currentUserId, mutate]); // 依赖 mutate，移除 activeChatId 依赖

  // ==========================================
  // 【动态置顶与幻影注入】(仅在前端内存中进行，不触发网络请求)
  // ==========================================
  const finalProcessedChats = useMemo(() => {
    const result = [...recentChats];

    // 如果当前选中的聊天不在历史列表中（如从 URL 进来的 wa_ 客户），就在内存中伪造一个
    if (activeChatId && !result.some(c => c.id === activeChatId)) {
      const isGroup = activeChatId === 'city_current' || activeChatId.startsWith('group_');
      let name = '正在连接...';
      const avatar = '';
      
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
        unread: 0,
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