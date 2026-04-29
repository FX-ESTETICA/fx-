import { useState, useEffect } from 'react';
import { UserMinus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';
import { useAtomicPresence } from '../hooks/useAtomicPresence';

interface ContactsUIProps {
 currentUserId: string;
 currentRole: string;
 isLight: boolean;
 onChatSelect: (chat: { id: string; name: string; isGroup: boolean; targetRole?: string }) => void;
}

interface Friend {
 id: string; // `${user_id}_${user_role}_${friend_id}_${friend_role}`
 friendId: string;
 friendRole: string;
 name: string;
 avatar: string | null;
 status: 'online' | 'offline';
}

export function ContactsUI({ currentUserId, currentRole, isLight, onChatSelect }: ContactsUIProps) {
 const [friends, setFriends] = useState<Friend[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 
 // 引入终极视口级在线感知系统
 const { observeNode } = useAtomicPresence(currentUserId);

 const fetchContacts = async () => {
 if (!currentUserId) return;
 setIsLoading(true);

 try {
 // 1. 获取好友列表 (适配复合主键，废弃 id，利用双向插入特性仅查 user_id)
 const { data: friendshipsData } = await supabase
 .from('friendships')
 .select(`
 user_id,
 user_role,
 friend_id,
 friend_role,
 friend_profile:profiles!friend_id(id, name, avatar_url, merchant_name, merchant_avatar_url, boss_name, boss_avatar_url, merchant_gx_id, gx_id)
 `)
 .eq('user_id', currentUserId)
 .eq('user_role', currentRole);

 if (friendshipsData) {
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const parsedFriends: Friend[] = friendshipsData.map((row: any) => {
 const targetProfile = row.friend_profile;
 const role = row.friend_role || 'user';
 
 let finalName = '未知用户';
 let finalAvatar = null;
 
 if (targetProfile) {
 if (role === 'merchant') {
 finalName = targetProfile.merchant_name || `智控 ${targetProfile.merchant_gx_id?.substring(targetProfile.merchant_gx_id.length - 4) || ''}`;
 finalAvatar = targetProfile.merchant_avatar_url || targetProfile.avatar_url || null;
 } else if (role === 'boss') {
 finalName = targetProfile.boss_name || targetProfile.name || 'BOSS';
 finalAvatar = targetProfile.boss_avatar_url || targetProfile.avatar_url || null;
 } else {
 finalName = targetProfile.name || `信号源 ${targetProfile.gx_id?.substring(targetProfile.gx_id.length - 4) || ''}`;
 finalAvatar = targetProfile.avatar_url || null;
 }
 }

 return {
 id: `${row.user_id}_${row.user_role}_${row.friend_id}_${row.friend_role}`,
 friendId: targetProfile?.id || '',
 friendRole: role,
 name: finalName,
 avatar: finalAvatar,
 status: 'offline' // 可以扩展为真实状态
 };
 });
 setFriends(parsedFriends);
 }
 } catch (e) {
 console.error('Failed to fetch contacts', e);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchContacts();

 // 订阅请求表变化
 const channel = supabase.channel('contacts_changes')
 .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
 fetchContacts();
 })
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [currentUserId, currentRole]);

 const handleRemoveFriend = async (friendshipId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 try {
 const [userId, userRole, friendId, friendRole] = friendshipId.split('_');
 // 物理级双向删除：通过触发器或连续两条SQL保证双向关系的完全解除
 await supabase
 .from('friendships')
 .delete()
 .match({ user_id: userId, user_role: userRole, friend_id: friendId, friend_role: friendRole });
 
 await supabase
 .from('friendships')
 .delete()
 .match({ user_id: friendId, user_role: friendRole, friend_id: userId, friend_role: userRole });
 
 setFriends(prev => prev.filter(f => f.id !== friendshipId));
 } catch (error) {
 console.error(error);
 }
 };

 return (
 <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in ">
 {/* 动态列表区 */}
 <div className="flex-1 overflow-y-auto px-0 pt-2 pb-20 space-y-0 z-20">
 <div className="space-y-0">
 {isLoading ? (
 <div className={cn("text-center py-10 text-sm tracking-widest ", isLight ? "text-black" : "text-white")}>
 扫描通讯录中...
 </div>
 ) : friends.length === 0 ? (
 <div className={cn("text-center py-10 text-sm tracking-widest ", isLight ? "text-black" : "text-white")}>
 星轨通讯录为空
 </div>
 ) : (
 friends.map(friend => (
 <div
 key={friend.id}
 id={`chat-card-list-${friend.friendId}_${friend.friendRole}`}
 ref={observeNode}
 onClick={() => onChatSelect({ id: friend.friendId, name: friend.name, isGroup: false, targetRole: friend.friendRole })}
 className={cn(
 "relative flex items-center py-1 px-2 cursor-pointer group",
 isLight ? "hover:bg-black/5" : "hover:bg-white/5"
 )}
 >
 {/* 头像 (左) */}
 <div className="relative shrink-0 mr-3 w-[55px] h-[55px]">
 {/* 内部头像 - 彻底切除光影和实线。解除探针连坐，防止被 opacity-0 误伤 */}
 <div 
 className="w-full h-full rounded-full overflow-hidden "
 >
 {friend.avatar ? (
 <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
 ) : (
 <div className={cn(
 "w-full h-full flex items-center justify-center text-[15px]",
 isLight ? "bg-black/5 text-black" : "bg-white/5 text-white"
 )}>
 {friend.name.charAt(0)}
 </div>
 )}
 </div>
 
 {/* 极简在线绿点指示器 (由 useAtomicPresence 底层探针接管，0延迟秒亮) */}
 <div 
 id={`list-presence-${friend.friendId}_${friend.friendRole}`}
 data-presence-id={friend.friendId}
 className={cn(
 "absolute z-10 w-[12px] h-[12px] rounded-full bg-[#34C759]",
 "bottom-[14.6%] right-[14.6%]",
 "translate-x-1/2 translate-y-1/2",
 "opacity-0" // 初始隐藏，等探针点亮
 )}
 />
 </div>
 <div className="flex-1 min-w-0">
 <span className={cn("truncate text-[15px] leading-tight font-medium flex items-center gap-2", isLight ? "text-black" : "text-white")}>
 {friend.name}
 </span>
 </div>
 {/* 悬浮操作菜单 */}
 <div className="opacity-0 group-hover:opacity-100 ">
 <button 
 onClick={(e) => handleRemoveFriend(friend.id, e)}
 className={cn("p-2 rounded-full", isLight ? "text-black" : "text-white")}>
 <UserMinus className="w-4 h-4" />
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 );
}
