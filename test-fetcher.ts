import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const fetchRecentChatsData = async (currentUserId: string) => {
  if (!currentUserId) return [];

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('拉取最近聊天失败:', error);
    throw new Error(error.message);
  }

  const chatMap = new Map<string, any>();
  const userIdsToFetch = new Set<string>();

  if (messages) {
    messages.forEach((msg) => {
      let targetId = '';
      let isGroup = false;
      let name = '';
      let avatar = '';
      let isCityChannel = false;

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
        name = `信号源 ${targetId?.substring(0, 4) || '未知'}`;
        avatar = '';
        userIdsToFetch.add(targetId);
      }

      if (!chatMap.has(targetId) && targetId) {
        chatMap.set(targetId, {
          id: targetId,
          name,
          lastMessage: '',
          time: '',
          avatar,
          unread: false,
          isGroup,
          isCityChannel,
        });
      }
    });
  }

  const profilesMap = new Map<string, { name: string, avatar: string }>();
  const validUuids: string[] = [];
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  Array.from(userIdsToFetch).forEach(id => {
    if (!id) return;
    if (UUID_REGEX.test(id)) {
      validUuids.push(id);
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
          avatar: p.avatar_url || ''
        });
      });
    }
  }

  const finalData = Array.from(chatMap.values()).map(chat => {
    if (!chat.isGroup) {
      const realProfile = profilesMap.get(chat.id);
      if (realProfile) {
        chat.name = realProfile.name;
        chat.avatar = realProfile.avatar;
      }
    }
    return chat;
  });

  return finalData;
};

fetchRecentChatsData('guest_001').then(data => {
  console.log('Result:', data);
}).catch(err => {
  console.error('Error:', err);
});
