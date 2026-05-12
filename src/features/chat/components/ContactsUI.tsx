import { useState, useEffect } from 'react';
import { UserMinus, Check, X, Database } from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';
import { useAtomicPresence } from '../hooks/useAtomicPresence';

interface ContactsUIProps {
 currentUserId: string;
 currentRole: string;
 isLight: boolean;
 onChatSelect: (chat: { id: string; name: string; isGroup: boolean; targetRole?: string }) => void;
}

interface FriendRequest {
  id: string;
  senderId: string;
  name: string;
  avatar: string | null;
  gx_id: string;
  phone: string;
  identity: 'life' | 'merchant' | 'boss';
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
 const [requests, setRequests] = useState<FriendRequest[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 
 // 引入终极视口级在线感知系统
 const { observeNode } = useAtomicPresence(currentUserId);

 const fetchContacts = async () => {
 if (!currentUserId) return;
 setIsLoading(true);

 try {
 // 0. 获取收到的好友申请
 const { data: requestsData } = await supabase
 .from('friend_requests')
 .select(`
 id,
 sender_id,
 sender_profile:profiles!sender_id(id, name, avatar_url, gx_id, phone, merchant_gx_id, merchant_name, merchant_avatar_url, boss_name, boss_avatar_url, role)
 `)
 .eq('receiver_id', currentUserId)
 .eq('status', 'pending');

 if (requestsData) {
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const parsedRequests: FriendRequest[] = requestsData.map((row: any) => {
 const p = row.sender_profile;
 let identity: 'life' | 'merchant' | 'boss' = 'life';
 let finalName = p.name || '神秘信号';
 let finalAvatar = p.avatar_url;
 let displayId = p.gx_id || 'UNKNOWN';
 let finalPhone = p.phone || '';

 if (p.role === 'boss' && p.boss_name) {
 identity = 'boss';
 finalName = p.boss_name;
 finalAvatar = p.boss_avatar_url || p.avatar_url;
 displayId = p.gx_id + '-BOSS';
 } else if (p.merchant_gx_id) {
 identity = 'merchant';
 finalName = p.merchant_name || p.name;
 finalAvatar = p.merchant_avatar_url || p.avatar_url;
 displayId = p.merchant_gx_id;
 }

 return {
 id: row.id,
 senderId: row.sender_id,
 name: finalName,
 avatar: finalAvatar,
 gx_id: displayId,
 phone: finalPhone,
 identity
 };
 });
 setRequests(parsedRequests);
 }

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
 .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
 fetchContacts();
 })
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [currentUserId, currentRole]);

 const handleAcceptRequest = async (request: FriendRequest) => {
 try {
 // 乐观更新
 setRequests(prev => prev.filter(r => r.id !== request.id));
 
 const { error } = await supabase.rpc('nuclear_accept_friend', {
 p_request_id: request.id,
 p_user_id: currentUserId,
 p_user_role: currentRole,
 p_friend_id: request.senderId,
 p_friend_role: 'user' // 这里默认对方使用 user 身份加您，如果是商户加您，可以根据 request.identity 推断
 });

 if (error) {
 console.error("Failed to accept request:", error);
 fetchContacts();
 }
 } catch (e) {
 console.error(e);
 fetchContacts();
 }
 };

 const handleRejectRequest = async (requestId: string) => {
 try {
 setRequests(prev => prev.filter(r => r.id !== requestId));
 await supabase.from('friend_requests').delete().eq('id', requestId);
 } catch (e) {
 console.error(e);
 fetchContacts();
 }
 };

 const handleRemoveFriend = async (friendshipId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 try {
 const [userId, userRole, friendId, friendRole] = friendshipId.split('_');
 
 // 1. 乐观 UI 阻断闪烁：立即从视图中剔除
 setFriends(prev => prev.filter(f => f.id !== friendshipId));

 // 2. 全局 UI 级联崩塌事件派发
 // 通知 ChatListUI 彻底抹除左侧聊天雷达中的卡片，并强杀右侧僵尸聊天室
 window.dispatchEvent(new CustomEvent('gx_chat_cleared', { 
 detail: { targetId: friendId, targetRole: friendRole, isFriendDelete: true } 
 }));

 // 3. 物理级双向斩断关系与消息记录 (调用 RPC 核按钮)
 const { error } = await supabase.rpc('nuclear_delete_friend', {
 p_user_id: userId,
 p_user_role: userRole,
 p_friend_id: friendId,
 p_friend_role: friendRole
 });

 if (error) {
 console.error("Failed to delete friend via RPC:", error);
 // 回退乐观更新
 fetchContacts();
 }
 } catch (error) {
 console.error(error);
 fetchContacts();
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
 ) : friends.length === 0 && requests.length === 0 ? (
 <div className={cn("text-center py-10 text-sm tracking-widest ", isLight ? "text-black" : "text-white")}>
 星轨通讯录为空
 </div>
 ) : (
 <>
 {/* 好友申请区 (置顶扁平化展示) */}
 {requests.map(req => (
 <div
 key={req.id}
 className={cn(
 "relative flex items-center py-1 px-2 mb-2 group",
 isLight ? "" : ""
 )}
 >
 <div className="relative shrink-0 mr-3">
 {req.avatar ? (
 <img src={req.avatar} alt={req.name} className="w-11 h-11 rounded-full object-cover" />
 ) : (
 <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-[15px]", isLight ? "bg-black/5 text-black" : "bg-white/5 text-white")}>
 {req.name.charAt(0).toUpperCase()}
 </div>
 )}
 {/* 身份角标 */}
 <div className={cn("absolute -bottom-1 -right-1 border rounded-full p-1", isLight ? "bg-white border-black/10" : "bg-black border-white/10")}>
 <Database className={cn("w-3 h-3", isLight ? "text-black" : "text-white")} />
 </div>
 </div>

 <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
 <div className="flex items-center space-x-2">
 <span className={cn("truncate text-lg font-medium tracking-wide", isLight ? "text-black" : "text-white")}>
 {req.name}
 </span>
 {/* 身份徽章渲染 (视觉降维) */}
 {req.identity === 'life' && (
 <span className="shrink-0 text-[11px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/20 text-white shadow-[0_0_8px_rgba(255,255,255,0.3)]">
 生活
 </span>
 )}
 {req.identity === 'merchant' && (
 <span className="shrink-0 text-[11px] uppercase tracking-widest px-2 py-0.5 rounded border border-[#00f2ff]/40 text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#00f2ff]/80 shadow-[0_0_8px_rgba(0,242,255,0.3)]">
 智控
 </span>
 )}
 {req.identity === 'boss' && (
 <span className="shrink-0 text-[11px] uppercase tracking-widest px-2 py-0.5 rounded border border-[#ffd700]/40 text-transparent bg-clip-text bg-gradient-to-r from-[#ffd700] to-[#ff8c00] shadow-[0_0_8px_rgba(255,215,0,0.3)]">
 BOSS
 </span>
 )}
 </div>
 <div className="flex items-center space-x-2">
 {/* ID 剥离前缀，极致降维 */}
 <span className={cn("text-[12px] tracking-widest", isLight ? "text-black" : "text-white")}>
 {req.gx_id.replace(/^(GX-)?(UR|MC|NE)-?/, '')}
 </span>
 {req.phone && (
 <span className={cn("text-[12px] tracking-widest", isLight ? "text-black" : "text-white")}>
 {req.phone.substring(0, 3)}•••{req.phone.substring(req.phone.length - 4)}
 </span>
 )}
 </div>
 </div>

 {/* 右侧操作区 (同意 / 拒绝) */}
 <div className="shrink-0 flex flex-col gap-1 ml-2">
 <button 
 onClick={() => handleAcceptRequest(req)}
 className={cn("p-1.5 rounded border flex items-center justify-center transition-colors", isLight ? "border-black/20 hover:bg-black hover:text-white" : "border-white/20 hover:bg-white hover:text-black")}
 >
 <Check className="w-3.5 h-3.5" />
 </button>
 <button 
 onClick={() => handleRejectRequest(req.id)}
 className={cn("p-1.5 rounded border flex items-center justify-center transition-colors", isLight ? "border-black/20 hover:bg-black/10" : "border-white/20 hover:bg-white/10")}
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 ))}

 {/* 原有好友列表 */}
 {friends.map(friend => (
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
 ))}
 </>
 )}
 </div>
 </div>
 </div>
 );
}
