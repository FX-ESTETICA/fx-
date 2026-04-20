import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export interface RecentChat {
  id: string; // 对端用户ID 或 房间ID
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unread: boolean;
  isGroup: boolean;
  isCityChannel?: boolean;
  isPhantom?: boolean; // 标记是否为量子幻影（还没有真实聊天记录）
}

// 升级版：接入真实 Profile 反查与全息量子幻影注入
export function useRecentChats(currentUserId: string, activeChatId?: string) {
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchRecentChats = async () => {
      setIsLoading(true);
      // 拉取最近 100 条与自己相关的消息
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('拉取最近聊天失败:', error);
        setIsLoading(false);
        return;
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
            const msgDate = new Date(msg.created_at);
            const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let lastMessageStr = msg.content || '';
            if (msg.image_url) lastMessageStr = '[图片流]';

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
        if (UUID_REGEX.test(id)) {
          validUuids.push(id);
        } else {
          // 物理拦截非 UUID (如 wa_3, guest_123)，直接在内存赋予身份
          if (id.startsWith('wa_')) {
            profilesMap.set(id, {
              name: `WA客户 ${id.replace('wa_', '').substring(0, 4)}`,
              avatar: ''
            });
          } else if (id.startsWith('guest_')) {
            profilesMap.set(id, {
              name: `访客 ${id.replace('guest_', '').substring(0, 4)}`,
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
          console.error('批量查询档案失败:', profileErr);
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
      let finalChats = Array.from(chatMap.values()).map(chat => {
        if (!chat.isGroup) {
          const realProfile = profilesMap.get(chat.id);
          if (realProfile) {
            chat.name = realProfile.name;
            chat.avatar = realProfile.avatar;
          }
        }
        return chat;
      });

      setRecentChats(finalChats);
      setIsLoading(false);
    };

    fetchRecentChats();

    // 监听新消息到达，更新列表 (化假为真的关键)
    const channel = supabase
      .channel('public:messages_list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (_payload) => {
          // 有新消息，重新拉取列表以更新顺序和内容
          fetchRecentChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]); // 【核心修复】：移除 activeChatId 依赖，绝对禁止因为点击列表而重新拉取数据库！

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
      } else if (activeChatId.startsWith('guest_')) {
        name = `访客 ${activeChatId.replace('guest_', '').substring(0, 4)}`;
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