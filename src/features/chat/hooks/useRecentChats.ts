import { useState, useEffect } from 'react';
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
      // 【量子态幻影注入】
      // 如果当前有一个 activeChatId (例如从 URL 进来的)，但它不在历史记录里
      // 我们强行在内存里捏造一个它的实体，并塞进待查询列表！
      // ==========================================
      if (activeChatId && !chatMap.has(activeChatId)) {
        const isGroup = activeChatId === 'city_current' || activeChatId.startsWith('group_');
        chatMap.set(activeChatId, {
          id: activeChatId,
          name: '正在连接...',
          lastMessage: '[系统] 正在建立全息加密通道...',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '', // 移除 Dicebear
          unread: false,
          isGroup,
          isCityChannel: activeChatId === 'city_current',
          isPhantom: true // 打上幻影烙印
        });
        
        if (!isGroup) {
          userIdsToFetch.add(activeChatId);
        }
      }

      // ==========================================
      // 【全真数据反查引擎】
      // 批量查询所有单聊对象的真实姓名和真实头像
      // ==========================================
      const profilesMap = new Map<string, { name: string, avatar: string }>();
      if (userIdsToFetch.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', Array.from(userIdsToFetch));

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

      // ==========================================
      // 【动态置顶法则】
      // 无论 activeChatId 是历史遗留还是幻影注入，都强行把它抽离并塞到数组的最前面（仅次于同城大群）
      // ==========================================
      if (activeChatId) {
        const activeIndex = finalChats.findIndex(c => c.id === activeChatId);
        if (activeIndex > 0) {
          const activeItem = finalChats.splice(activeIndex, 1)[0];
          // 找找有没有同城大群 (RAPALLO)，如果有，把它插在第二位；如果没有，插在第一位
          const cityIndex = finalChats.findIndex(c => c.isCityChannel);
          if (cityIndex !== -1 && cityIndex === 0) {
            finalChats.splice(1, 0, activeItem);
          } else {
            finalChats.unshift(activeItem);
          }
        }
      }

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
  }, [currentUserId, activeChatId]);

  return { recentChats, isLoading };
}