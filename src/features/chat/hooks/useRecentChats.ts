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
}

// 这个 Hook 用于拉取当前用户所有参与过的最新聊天记录
export function useRecentChats(currentUserId: string) {
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchRecentChats = async () => {
      setIsLoading(true);
      // 拉取最近 100 条与自己相关的消息
      const { data, error } = await supabase
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

      if (data) {
        // 在前端进行归类（按对象或房间去重，只保留最新一条）
        const chatMap = new Map<string, RecentChat>();

        data.forEach((msg) => {
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
            // 因为没有关联 users 表，这里做个假名字
            name = `信号源 ${targetId?.substring(0, 4) || '未知'}`;
            avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${targetId}`;
          }

          // 如果 Map 里还没有这个 targetId，说明这是最新的一条（因为数据已经是倒序的了）
          if (!chatMap.has(targetId) && targetId) {
            
            // 格式化时间
            const msgDate = new Date(msg.created_at);
            const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // 提取消息内容
            let lastMessageStr = msg.content || '';
            if (msg.image_url) {
              lastMessageStr = '[图片流]';
            }

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

        setRecentChats(Array.from(chatMap.values()));
      }
      setIsLoading(false);
    };

    fetchRecentChats();

    // 监听新消息到达，更新列表
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
  }, [currentUserId]);

  return { recentChats, isLoading };
}
