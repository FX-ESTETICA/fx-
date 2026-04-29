import { Search, ScanLine, CheckCheck, MessageCircle, Database, Signal, SearchX, Trash2, ArrowLeftRight, Plus } from 'lucide-react';
import { useRecentChats } from '../hooks/useRecentChats';
import { useState, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useChatStore } from '@/store/useChatStore';
import { supabase } from '@/lib/supabase';
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { usePathname } from "next/navigation";
import { useActiveTab } from "@/hooks/useActiveTab";
import { cn } from "@/utils/cn";
import { useAtomicPresence } from '../hooks/useAtomicPresence';
import { ContactsUI } from './ContactsUI';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface ChatListUIProps {
 currentUserId: string;
 currentRole: string;
 onChatSelect: (chat: { id: string; name: string; isGroup: boolean; isCityChannel?: boolean; targetRole?: string }) => void;
}

// ------------------------------------------------------------------------
// 多轨雷达搜索结果类型定义
// ------------------------------------------------------------------------
type SearchTrack = 'profiles' | 'bookings' | 'none';
type IdentityRole = 'life' | 'merchant' | 'boss'; // 身份降维

interface SearchResult {
 track: SearchTrack;
 id: string; // profile id 或 booking phone
 name: string;
 avatar: string;
 gx_id: string;
 phone: string;
 identity?: IdentityRole; // 标记当前卡片展示的是什么身份
}

export default function ChatListUI({ currentUserId, currentRole, onChatSelect }: ChatListUIProps) {
 const { user, setActiveRole } = useAuth();
 const { activeChat } = useChatStore();
 const { recentChats } = useRecentChats(currentUserId, currentRole, activeChat?.id);
 
 // 顶级 IM 极简交友架构：利用 SWR 和 Local-First 引擎实现 0 延迟的好友名单加载
 const getCachedFriends = (userId: string, role: string) => {
 if (typeof window === 'undefined' || !userId) return [];
 try {
 const cached = localStorage.getItem(`gx_friends_${userId}_${role}`);
 return cached ? JSON.parse(cached) : [];
 } catch (e) {
 return [];
 }
 };

 const { data: friendsList = [], mutate: mutateFriends } = useSWR(
 currentUserId ? `friends_${currentUserId}_${currentRole}` : null,
 async () => {
 const { data, error } = await supabase
 .from('friendships')
 .select('friend_id, friend_role')
 .eq('user_id', currentUserId)
 .eq('user_role', currentRole);
 
 if (!error && data) {
 return data.map(f => `${f.friend_id}_${f.friend_role}`);
 }
 return [];
 },
 {
 fallbackData: getCachedFriends(currentUserId, currentRole),
 onSuccess: (data) => {
 if (typeof window !== 'undefined' && currentUserId && data) {
 localStorage.setItem(`gx_friends_${currentUserId}_${currentRole}`, JSON.stringify(data));
 }
 }
 }
 );

 useEffect(() => {
 if (!currentUserId) return;
 
 // 监听实时破冰：当触发器瞬间融合后，前端光速更新列表，实现无感体验
 const channel = supabase.channel('friendships_changes')
 .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships' }, (payload) => {
 const newFriend = payload.new as any;
 if (newFriend.user_id === currentUserId && newFriend.user_role === currentRole) {
 mutateFriends();
 } else if (newFriend.friend_id === currentUserId && newFriend.friend_role === currentRole) {
 mutateFriends();
 }
 })
 .subscribe();
 
 return () => { supabase.removeChannel(channel); };
 }, [currentUserId, currentRole, mutateFriends]);

 // 对 recentChats 进行分类：熟人/群聊 vs 陌生人
 const { normalChats, strangerChats } = useMemo(() => {
 const normal: typeof recentChats = [];
 const stranger: typeof recentChats = [];
 recentChats.forEach(chat => {
 const isFriend = friendsList.includes(`${chat.id}_${chat.targetRole || 'user'}`);
 if (chat.isGroup || chat.isCityChannel || isFriend || chat.isPhantom) {
 normal.push(chat);
 } else {
 stranger.push(chat);
 }
 });
 return { normalChats: normal, strangerChats: stranger };
 }, [recentChats, friendsList]);

 // 主题嗅探系统
 const { settings } = useVisualSettings();
 const pathname = usePathname();
 const activeTab = useActiveTab();
 
 const isCalendar = activeTab === "calendar" || pathname?.startsWith("/calendar");
 const isLight = isCalendar 
 ? settings.calendarBgIndex !== 0 
 : settings.frontendBgIndex !== 0;

 // 搜索状态机
 const [searchQuery, setSearchQuery] = useState('');
 const [isSearching, setIsSearching] = useState(false);
 const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
 const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

 // 顶层导航状态：聊天流 vs 通讯录 vs 陌生消息
 const [navTab, setNavTab] = useState<'chats' | 'contacts' | 'strangers' | 'group' | 'moments' | 'nearby'>('chats');

 // 引入终极视口级在线感知系统
 const { observeNode } = useAtomicPresence(currentUserId);

 // 右键菜单状态
 const [contextMenu, setContextMenu] = useState<{ x: number, y: number, targetId: string, targetRole: string, isGroup: boolean } | null>(null);

 const handleContextMenu = (e: React.MouseEvent, targetId: string, targetRole: string = 'user', isGroup: boolean = false) => {
 e.preventDefault();
 setContextMenu({ x: e.clientX, y: e.clientY, targetId, targetRole, isGroup });
 };

 const handleDeleteChat = () => {
 if (!contextMenu?.targetId) return;
 
 // 写入物理标识，从列表中抹除（仅删除聊天框，不删除历史记录）
 // 存储当前时间戳，如果后续有新消息(时间戳大于此时间)，则重新显示该聊天框
 const delChatKey = contextMenu.isGroup ? `gx_deleted_chat_${currentUserId}_${contextMenu.targetId}` : `gx_deleted_chat_${currentUserId}_${contextMenu.targetId}_${contextMenu.targetRole}`;
 localStorage.setItem(delChatKey, Date.now().toString());

 // 触发更新事件，让列表重新渲染
 window.dispatchEvent(new CustomEvent('gx_chat_cleared', { detail: { targetId: contextMenu.targetId, targetRole: contextMenu.targetRole } }));
 setContextMenu(null);
 };

 // =========================================================================
 // 【世界级多轨探测雷达 (Multi-Track Radar)】
 // =========================================================================
 useEffect(() => {
 if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

 if (!searchQuery || searchQuery.trim().length < 2) {
 setSearchResults([]);
 setIsSearching(false);
 return;
 }

 setIsSearching(true);

 searchTimerRef.current = setTimeout(async () => {
 try {
 const rawQuery = searchQuery.trim();
 // 1. 去噪处理：剥离符号，用于打数据库
 const cleanQuery = rawQuery.replace(/[^\w\d\u4e00-\u9fa5]/g, ''); 
 
 const results: SearchResult[] = [];

 // 轨道一：【内网高维扫描】(查 profiles)
 // 1. 多轨搜索雷达 - 从 profiles 表搜索 (支持双身份双手机号)
 const { data: profileData, error: profileError } = await supabase
 .from('profiles')
 .select('id, name, avatar_url, gx_id, phone, merchant_gx_id, merchant_name, merchant_avatar_url, boss_name, boss_avatar_url, boss_phone, role, allow_search_by_phone, allow_search_by_id, merchant_phone, merchant_allow_search_by_phone, merchant_allow_search_by_id, boss_allow_search_by_phone, boss_allow_search_by_id')
 .or(`name.ilike.%${cleanQuery}%,gx_id.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%,merchant_gx_id.ilike.%${cleanQuery}%,merchant_phone.ilike.%${cleanQuery}%,boss_phone.ilike.%${cleanQuery}%`)
 .limit(10);
 
 if (profileError) {
 console.error("Profiles Scan Error:", profileError);
 }

 if (profileData && profileData.length > 0) {
 profileData.forEach(p => {
 // 隐私防御网关 (Privacy Gateway)
 const cleanLower = cleanQuery.toLowerCase();
 const isNameMatch = (p.name && p.name.toLowerCase().includes(cleanLower)) ||
 (p.merchant_name && p.merchant_name.toLowerCase().includes(cleanLower)) ||
 (p.boss_name && p.boss_name.toLowerCase().includes(cleanLower));
 
 const isLifePhoneMatch = p.phone?.includes(cleanQuery);
 const isMerchantPhoneMatch = p.merchant_phone?.includes(cleanQuery);
 const isBossPhoneMatch = p.boss_phone?.includes(cleanQuery);
 
 const isLifeIdMatch = p.gx_id?.toLowerCase().includes(cleanLower);
 const isMerchantIdMatch = p.merchant_gx_id?.toLowerCase().includes(cleanLower);

 // --- 生活卡片 (Life Card) 呈现逻辑 ---
 let shouldShowLife = false;
 if (isNameMatch) {
 shouldShowLife = true;
 } else if (isLifePhoneMatch) {
 shouldShowLife = p.allow_search_by_phone !== false;
 } else if (isLifeIdMatch) {
 shouldShowLife = p.allow_search_by_id !== false;
 }

 if (shouldShowLife) {
 results.push({
 track: 'profiles',
 id: p.id,
 name: p.name || '神秘信号',
 avatar: p.avatar_url || '',
 gx_id: p.gx_id || 'UNKNOWN',
 phone: p.phone || '',
 identity: 'life'
 });
 }

 // --- 智控卡片 (Merchant Card) 呈现逻辑 ---
 const hasMerchantIdentity = p.merchant_gx_id || p.role === 'boss';
 let shouldShowMerchant = false;
 
 if (hasMerchantIdentity) {
 if (isNameMatch) {
 shouldShowMerchant = true;
 } else if (isMerchantPhoneMatch) {
 shouldShowMerchant = p.merchant_allow_search_by_phone !== false;
 } else if (isMerchantIdMatch || (isLifeIdMatch && !cleanLower.startsWith('ur') && !cleanLower.startsWith('ne'))) {
 // 对于没有 merchant_gx_id 的 boss，通过基础 id 搜索时也可以搜出智控身份
 shouldShowMerchant = p.merchant_allow_search_by_id !== false;
 }
 }

 if (shouldShowMerchant) {
 const displayMerchantId = p.merchant_gx_id || (p.gx_id ? `${p.gx_id}-MC` : 'UNKNOWN');
 results.push({
 track: 'profiles',
 id: p.id,
 name: p.merchant_name || p.name || '神秘信号',
 avatar: p.merchant_avatar_url || p.avatar_url || '',
 gx_id: displayMerchantId,
 phone: p.merchant_phone || p.phone || '',
 identity: 'merchant'
 });
 }

 // --- BOSS卡片 (Boss Card) 呈现逻辑 ---
 let shouldShowBoss = false;
 if (p.role === 'boss') {
 if (isNameMatch) {
 shouldShowBoss = true;
 } else if (isBossPhoneMatch) {
 shouldShowBoss = p.boss_allow_search_by_phone !== false;
 } else if (isLifeIdMatch && !cleanLower.startsWith('ur') && !cleanLower.startsWith('mc')) {
 shouldShowBoss = p.boss_allow_search_by_id !== false;
 }
 }

 if (shouldShowBoss && p.boss_name) {
 results.push({
 track: 'profiles',
 id: p.id,
 name: p.boss_name,
 avatar: p.boss_avatar_url || p.avatar_url || '',
 gx_id: p.gx_id + '-BOSS',
 phone: p.boss_phone || p.merchant_phone || p.phone || '',
 identity: 'boss'
 });
 }
 });
 }

 // 轨道二：【线下中维扫描】(查 bookings 历史订单)
 // 只有当查询词看起来像电话号码或名字时，才去历史订单里挖人
 if (cleanQuery.length >= 3 && results.length < 5) {
 const shopId = new URLSearchParams(window.location.search).get('shopId');
 
 // 注意：Supabase 对 JSONB 内部字段的 ilike 查询要求非常严格，不能直接写在 or 里面用箭头操作符。
 // 由于目前只需要搜纯数字或纯字母，并且是在顶层搜索，我们可以暂时采用将整个 data 字段转文本来搜。
 // 更严谨的做法是在 bookings 表上建立专门的 customer_phone 和 customer_name 列。
 // 这里使用 text 转换以避免 400 Bad Request 报错。
 let bookingQuery = supabase
 .from('bookings')
 .select('data')
 .neq('status', 'VOID')
 .textSearch('data', cleanQuery) // 替换为全文搜索或先获取数据再过滤，或者使用含 ::text 的写法。这里直接查询然后前端过滤以防报错。
 .order('created_at', { ascending: false })
 .limit(50); // 多取一点，然后在前端进行精准匹配
 
 // 仅在明确拥有合法的 shopId (通常是 UUID) 时，才去加这个条件过滤，
 // 防止把 "default" 这种纯英文字母强行塞给 UUID 类型的列，引发 PostgreSQL 的 22P02 崩溃。
 if (shopId && shopId !== 'default' && shopId.length > 10) {
 bookingQuery = bookingQuery.eq('shop_id', shopId);
 }

 const { data: bookingData, error: bookingError } = await bookingQuery;
 
 if (bookingError) {
 console.error("Booking search error:", bookingError);
 }

 if (bookingData && bookingData.length > 0) {
 const historyMap = new Map<string, any>();
 bookingData.forEach((b: any) => {
 const rawName = b.data?.customerName || "";
 const rawPhone = b.data?.customerPhone || "";
 const actualPhone = rawPhone || rawName;
 const actualName = rawName === actualPhone ? "" : rawName;
 
 // 排除掉已经在第一轨找到的人 (基于手机号或名字)
 const alreadyFound = results.some(r => r.phone === actualPhone || r.name === actualName);
 
 if (actualPhone && !alreadyFound && !historyMap.has(actualPhone)) {
 historyMap.set(actualPhone, {
 name: actualName,
 gx_id: b.data?.customerId || 'CO 散客',
 phone: actualPhone
 });
 }
 });

 Array.from(historyMap.values()).slice(0, 5 - results.length).forEach(h => {
 results.push({
 track: 'bookings',
 id: `guest_${h.phone}`, // 虚拟 ID，点击时会在 useRecentChats 里拦截生成幻影
 name: h.name || h.phone,
 avatar: '',
 gx_id: h.gx_id,
 phone: h.phone
 });
 });
 }
 }

 setSearchResults(results);
 } catch (err) {
 console.error("Radar Scan Error:", err);
 } finally {
 setIsSearching(false);
 }
 }, 500); // 500ms 物理级防抖

 return () => {
 if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
 };
 }, [searchQuery]);

 // 动态构建横向星轨 (Star Track)
  const starTrackContacts = useMemo(() => {
    const tracks: Array<{ id: string, name: string, avatar: string, isOnline: boolean, isGroup: boolean, isCityChannel: boolean, targetRole?: string }> = [];
    
    // 1. 同城频道 (硬编码保障常驻)
    // 在动态(moments) Tab 下，不显示同城频道（群聊）
    if (navTab !== 'moments') {
      tracks.push({
        id: 'city_current',
        name: 'RAPALLO',
        avatar: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=150&h=150&fit=crop',
        isOnline: true,
        isCityChannel: true,
        isGroup: true
      });
    }

    // 2. 从 normalChats 里提取前几个联系人 (基于当前 Tab 降维过滤)
    normalChats.forEach(chat => {
      if (chat.id !== 'city_current' && tracks.length < 6) {
        // 群聊 Tab 下严格拦截，只允许群聊进入星轨
        if (navTab === 'group' && !chat.isGroup) return;
        // 动态 Tab 下严格拦截，不允许任何群聊进入星轨
        if (navTab === 'moments' && chat.isGroup) return;

        tracks.push({
          id: chat.id,
          name: chat.name,
          avatar: chat.avatar,
          isOnline: chat.isOnline === true, // 初始默认离线，交给 useAtomicPresence 原子接管
          isGroup: chat.isGroup,
          isCityChannel: false,
          targetRole: chat.targetRole
        });
      }
    });

    return tracks;
  }, [normalChats, navTab]);

 // 构建 100% 多端兼容的 WhatsApp URL 协议 (采用无感加密 Token 穿透，隐藏手机号)
 const getWhatsAppNativeUrl = (phone: string) => {
 if (!phone) return '#';
 const finalPhone = phone.replace(/[^\d+]/g, '').replace('+', '');
 const domain = typeof window !== 'undefined' ? window.location.origin : 'https://fx-rapallo.vercel.app';
 
 // 核心改造：前端不再直接把 wa_3937 暴露在 URL 中。
 // 我们在这里使用一种“前端伪加密/映射”的临时降维方案（如果将来有后端 API，这里换成调用 API 获取真实 Token）。
 // 将手机号通过 Base64 编码变形，加上一个随机混淆前缀，生成一个表面上毫无意义的 Token。
 // 例如：3937 -> 'gx_tk_' + btoa('3937_salt')
 const token = encodeURIComponent(`gx_tk_${btoa(finalPhone + '_nexus')}`);
 
 // 最终的邀请链接：干净、无明文手机号。带上时间戳彻底摧毁 WhatsApp 的旧图片缓存机制。
 const inviteUrl = `${domain}/chat?t=${token}&shopId=${currentUserId}&ts=${Date.now()}`;
 
 // 极致极简文案：只保留触发卡片的必要链接，和一句最短的引导语
 const message = `点击进入专属聊天室：\n${inviteUrl}`;

 // 彻底放弃底层 `whatsapp://` 协议，回归官方最强中转站 `wa.me`
 return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
 };

 return (
 // 最外层容器，这里假设父级页面会有一个宇宙/星空大背景，所以这里绝对透明
 <div className="w-full h-full bg-transparent flex flex-col pt-safe-top">
 
 {/* 0. 品牌顶栏 (The Brand Header) - 绝对的视觉中心 */}
   <div className="px-4 pt-2 pb-0 flex items-center justify-between shrink-0 z-20">
   <div className={cn("text-2xl font-black tracking-tighter", isLight ? "text-black" : "text-white")}>
 GX<sup className="text-lg font-bold -ml-0.5 relative top-[2px]">⁺</sup>
 </div>
 {/* 预留右侧操作区，如扫码、发群聊等，暂时与搜索栏内的扫码保持统一，这里可以放别的或者留空 */}
 <div className="flex items-center space-x-4">
 {/* 可以把一些全局操作提到这里 */}
 </div>
 </div>

 {/* 1. 顶部：全息搜索舱 (The Omni-Scanner) */}
 <div className="px-3 py-2 shrink-0 relative z-20">
 <div className="relative group ">
 {/* 无边框幽灵悬浮底色 (完全透明) */}
 <div className={cn("absolute inset-0 rounded-2xl ", isLight ? "bg-black/5 group-focus-within:bg-black/10" : "bg-transparent group-focus-within:bg-white/5")} />
 
 {/* 输入框与聚合功能 */}
  <div className="relative flex items-center h-[35px] px-4 space-x-3">
  <Search className={cn("w-[18px] h-[18px]", isLight ? "text-black" : "text-white")} />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="搜索"
 className={cn(
 "flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[15px]",
 isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white"
 )}
 />
 {/* 扫码与添加快捷指令 (同样去除分割线，保持极致清透) */}
 <div className="flex items-center space-x-3 pl-3">
 <button className={cn("", isLight ? "text-black" : "text-white")}>
 <ScanLine className="w-[18px] h-[18px]" />
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* 1.5 导航切换: 纯黑白反转镂空胶囊 (Inverted Outline Capsule) */}
 <div className="px-2 pt-[6px] pb-2 shrink-0 z-20 flex items-center w-full overflow-x-auto no-scrollbar whitespace-nowrap gap-2.5">
 {[
 { id: 'chats', label: '聊天' },
 { id: 'contacts', label: '好友' },
 { id: 'group', label: '群聊' },
 { id: 'moments', label: '动态' },
 { id: 'nearby', label: '附近' },
 { id: 'strangers', label: '陌生人' }
 ].map(tab => {
 const isActive = navTab === tab.id;
 return (
 <button 
 key={tab.id}
 onClick={() => setNavTab(tab.id as any)}
 className={cn(
 "px-4 py-1.5 rounded-full text-[13px] tracking-widest border flex-shrink-0 active:scale-95 transition-transform",
 // 纯黑白法则：绝不使用灰色或透明度
 isActive 
 // 选中：实心底色，反色文字
 ? (isLight ? "bg-black border-black text-white font-medium" : "bg-white border-white text-black font-medium")
 // 未选中：纯净线框，纯净文字，无底色
 : (isLight ? "bg-transparent border-black text-black" : "bg-transparent border-white text-white")
 )}
 >
 {tab.label}
 </button>
 )
 })}
 </div>

 {/* 2. 双轨雷达星轨 (左侧本我固定锚点 + 右侧流动星轨) - 在 聊天(chats)、群聊(group)、动态(moments) 模式下渲染 */}
  {(navTab === 'chats' || navTab === 'group' || navTab === 'moments') && (
 <div className="pt-[5px] pb-0 shrink-0 z-20 relative flex items-start">
 
 {/* 左轨：本我锚点 (The Anchor) - 绝对物理锁定，左侧 8px 留白 (px-2) */}
 <div className="shrink-0 pl-2 pr-[15px] relative flex flex-col items-center justify-start z-30">
 
 {/* 55px 的物理锚点容器 */}
 <div className="relative w-[55px] h-[55px] shrink-0">
 
 {/* 内部头像照片容器 (极致清透，无任何边框) */}
 <div 
 className={cn(
 "w-full h-full rounded-full flex items-center justify-center relative z-10 overflow-hidden cursor-pointer",
 isLight ? "bg-white/50" : "bg-black/50"
 )}
 onClick={() => console.log("Trigger Post Moment")}
 >
 {/* 发动态遮罩 */}
 <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center z-20">
 <Plus className="w-6 h-6 text-white" />
 </div>
 
 <img 
 key={`${currentRole}_${(user as any)?.avatar}`}
 src={
 (currentRole === 'boss' ? ((user as any)?.boss_avatar_url || (user as any)?.avatar || '') :
 currentRole === 'merchant' ? ((user as any)?.merchant_avatar_url || (user as any)?.avatar || '') :
 ((user as any)?.avatar || '')) as string
 } 
 className="w-full h-full rounded-full object-cover" 
 alt="Current Identity"
 onError={(e) => {
 (e.target as HTMLImageElement).style.display = 'none';
 const parent = (e.target as HTMLImageElement).parentElement;
 if (parent && !parent.querySelector('.fallback-avatar')) {
 const fallback = document.createElement('div');
 fallback.className = 'fallback-avatar w-full h-full flex items-center justify-center text-[20px] text-white';
 fallback.textContent = (user as any)?.name ? (user as any).name.charAt(0).toUpperCase() : 'U';
 parent.appendChild(fallback);
 }
 }}
 />
 </div>
 </div>

 {/* 下方身份文字改造为极简切换按钮 */}
 <button 
 onClick={(e) => {
 e.stopPropagation();
 const availableRoles: ("user" | "merchant" | "boss")[] = ['user'];
 if ((user as any)?.role === 'boss') {
 availableRoles.push('merchant', 'boss');
 } else if ((user as any)?.role === 'merchant') {
 availableRoles.push('merchant');
 }
 
 if (availableRoles.length <= 1) return;
 const currentIndex = availableRoles.indexOf(currentRole as any);
 const nextRole = availableRoles[(currentIndex + 1) % availableRoles.length];
 if (setActiveRole) setActiveRole(nextRole);
 }}
 className={cn(
              "text-[11px] truncate w-14 text-center tracking-wider uppercase mt-[4px] cursor-pointer active:scale-95 transition-transform",
              isLight ? "text-black" : "text-white"
            )}
          >
            切换身份
          </button>
 </div>

 {/* 右轨：雷达星轨 (The Stream) - 独立滑动容器，到达左侧自动截断 */}
 <div 
 className="flex-1 overflow-x-auto no-scrollbar pb-2"
 style={{
 maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
 WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
 }}
 >
 <div className="flex space-x-5 px-0">
 {starTrackContacts.map((contact) => (
 <div 
 key={`${contact.id}_${contact.targetRole || 'user'}`} 
 id={`chat-card-radar-${contact.id}_${contact.targetRole || 'user'}`}
 ref={(contact.isGroup || contact.isCityChannel) ? undefined : observeNode}
 className="flex flex-col items-center cursor-pointer shrink-0"
 onClick={() => onChatSelect({
 id: contact.id,
 name: contact.name,
 isGroup: contact.isGroup || false,
 isCityChannel: contact.isCityChannel,
 targetRole: contact.targetRole
 })}
 >
 <div className="relative w-[55px] h-[55px] shrink-0">
 {/* 绝对纯净的头像本体 (无任何 padding/边框/光环) */}
 {contact.avatar ? (
 <img 
 src={contact.avatar} 
 alt={contact.name}
 className="w-full h-full rounded-full object-cover"
 />
 ) : (
 <div 
 className={cn(
 "w-full h-full rounded-full flex items-center justify-center text-xl",
 isLight ? "bg-black/5 text-black" : "bg-white/5 text-white"
 )}
 >
 {contact.name ? contact.name.charAt(0).toUpperCase() : '连'}
 </div>
 )}

 {/* 
 世界顶端状态标识：极简无切边绿点
 1. 绝对定位在 45 度角 (14.6%)，完美压边。
 2. 永远挂载 DOM，由底层 useAtomicPresence 探针通过修改 opacity 物理控制显隐（0延迟秒亮）。
 3. 群聊永不显示。
 */}
 {(!contact.isGroup && !contact.isCityChannel) && (
 <div 
 id={`radar-presence-${contact.id}_${contact.targetRole || 'user'}`}
 data-presence-id={contact.id}
 className={cn(
 "absolute z-10 w-[12px] h-[12px] rounded-full bg-[#34C759]",
 "bottom-[14.6%] right-[14.6%]",
 "translate-x-1/2 translate-y-1/2",
 contact.isOnline ? "opacity-100" : "opacity-0"
 )}
 />
 )}
 </div>
 {/* 名字 */}
 <span 
 className={cn(
 "text-[11px] truncate w-14 text-center tracking-wider uppercase mt-[4px]",
 isLight ? "text-black" : "text-white"
 )}
 >
 {contact.name}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 
 {navTab === 'contacts' ? (
        <ContactsUI currentUserId={currentUserId} currentRole={currentRole} isLight={isLight} onChatSelect={onChatSelect} />
      ) : navTab === 'moments' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          {/* 动态视图 */}
        </div>
      ) : navTab === 'nearby' ? (
 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
 {/* 附近视图 */}
 </div>
 ) : navTab === 'strangers' ? (
 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
 {/* 陌生人视图 */}
 </div>
 ) : (
 <>
 {/* 3. 沉浸式信号瀑布流 (绝对清透) */}
 {/* 聊天列表容器恢复原始状态 */}
 <div className="flex-1 overflow-y-auto px-0 pt-[8px] pb-20 space-y-0 z-20">
 {searchQuery ? (
 /* 搜索结果面板 (探测与降维打击) */
 <div className="flex flex-col space-y-0 pt-2">
 
 {/* 加载状态 */}
 {isSearching && (
 <div className="flex justify-center items-center py-10">
 <div className={cn("w-16 h-16 rounded-full border flex items-center justify-center relative ", isLight ? "border-black/20" : "border-white/20")}>
 <div className={cn("absolute inset-0 rounded-full border-t animate-spin ", isLight ? "border-black" : "border-white")} />
 <Signal className={cn("w-5 h-5", isLight ? "text-black" : "text-white")} />
 </div>
 </div>
 )}

 {/* 扫描结果列表 */}
 {!isSearching && searchResults.map((res) => (
 <div
 key={`${res.id}-${res.identity}`}
 onClick={() => {
 onChatSelect({
 id: res.id,
 name: res.name,
 isGroup: false,
 targetRole: res.identity === 'life' ? 'user' : res.identity === 'merchant' ? 'merchant' : res.identity === 'boss' ? 'boss' : undefined
 });
 setSearchQuery(''); // 选中后清空搜索
 }}
 className={cn(
 "relative flex items-center py-1 px-2 cursor-pointer group",
 isLight ? "" : ""
 )}
 >
 {/* 内部用户发光效果 */}
 {res.track === 'profiles' && (
 <div className="absolute inset-0 pointer-events-none p-[1px] overflow-hidden opacity-0 group-hover:opacity-100 ">
 <div 
 className="w-full h-full"
 style={{
 background: 'linear-gradient(90deg, #00f2ff, #bc13fe, #ff00ea, #00f2ff)',
 backgroundSize: '200% 100%',
 animation: 'shimmer 3s linear infinite',
 WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
 WebkitMaskComposite: 'xor',
 maskComposite: 'exclude',
 }}
 />
 </div>
 )}

 <div className="relative shrink-0 mr-3">
 {res.avatar ? (
 <img src={res.avatar} alt={res.name} className="w-11 h-11 rounded-full object-cover" />
 ) : (
 <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-[15px]", isLight ? "bg-black/5 text-black" : "bg-white/5 text-white")}>
 {res.name.charAt(0).toUpperCase()}
 </div>
 )}
 {/* 身份角标 */}
 <div className={cn("absolute -bottom-1 -right-1 border rounded-full p-1", isLight ? "bg-white border-black/10" : "bg-black border-white/10")}>
 {res.track === 'profiles' ? (
 <Database className={cn("w-3 h-3", isLight ? "text-black" : "text-white")} />
 ) : (
 <SearchX className={cn("w-3 h-3", isLight ? "text-black" : "text-white")} />
 )}
 </div>
 </div>

 <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
 <div className="flex items-center space-x-2">
 <span className={cn("truncate text-lg font-medium tracking-wide", isLight ? "text-black" : "text-white")}>
 {res.name}
 </span>
 {/* 身份徽章渲染 (视觉降维) */}
 {res.identity === 'life' && (
 <span className="shrink-0 text-[11px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/20 text-white shadow-[0_0_8px_rgba(255,255,255,0.3)]">
 生活
 </span>
 )}
 {res.identity === 'merchant' && (
 <span className="shrink-0 text-[11px] uppercase tracking-widest px-2 py-0.5 rounded border border-[#00f2ff]/40 text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#00f2ff]/80 shadow-[0_0_8px_rgba(0,242,255,0.3)]">
 智控
 </span>
 )}
 {res.identity === 'boss' && (
 <span className="shrink-0 text-[11px] uppercase tracking-widest px-2 py-0.5 rounded border border-[#ffd700]/40 text-transparent bg-clip-text bg-gradient-to-r from-[#ffd700] to-[#ff8c00] shadow-[0_0_8px_rgba(255,215,0,0.3)]">
 BOSS
 </span>
 )}
 </div>
 <div className="flex items-center space-x-2">
 {/* ID 剥离前缀，极致降维 */}
 <span className={cn("text-[12px] tracking-widest", isLight ? "text-black" : "text-white")}>
 {res.gx_id.replace(/^(GX-)?(UR|MC|NE)-?/, '')}
 </span>
 {res.phone && (
 <span className={cn("text-[12px] tracking-widest", isLight ? "text-black" : "text-white")}>
 {res.phone.substring(0, 3)}•••{res.phone.substring(res.phone.length - 4)}
 </span>
 )}
 </div>
 </div>
 </div>
 ))}

 {/* 外部兜底：WhatsApp/WeChat 降维打击卡片 */}
 {!isSearching && searchResults.length === 0 && (
 <div className="flex flex-col items-center justify-center pt-6 pb-10">
 <div className={cn("relative w-full max-w-[320px] border rounded-2xl p-5 flex flex-col items-center justify-center group", isLight ? "border-black/10" : "border-white/10")}>
 <div className="absolute inset-0 rounded-2xl pointer-events-none" />
 
 {/* 中间问号图标 */}
 <div className="relative mb-4">
 <div className={cn("w-12 h-12 rounded-full border flex items-center justify-center relative", isLight ? "border-black/20" : "border-white/20")}>
 <span className={cn("text-xl font-light", isLight ? "text-black" : "text-white")}>?</span>
 <MessageCircle className={cn("absolute -bottom-1 -right-1 w-4 h-4", isLight ? "text-green-600 bg-white rounded-full" : "text-green-400 bg-black rounded-full")} />
 </div>
 </div>

 <span className={cn("text-sm tracking-widest mb-2 font-medium", isLight ? "text-black" : "text-white")}>
 {searchQuery}
 </span>
 
 <p className={cn("text-xs text-center leading-relaxed max-w-[240px]", isLight ? "text-black" : "text-white")}>
 无匹配物理档案。<br/>可通过 WhatsApp 或 微信 强行建联。
 </p>

 <a 
 href={getWhatsAppNativeUrl(searchQuery)}
 target="_blank"
 rel="noopener noreferrer"
 className={cn(
 "mt-5 px-6 py-2.5 rounded-full text-xs tracking-widest ",
 "border flex items-center space-x-2 active:scale-95",
 isLight ? "bg-black text-white border-transparent" 
 : "bg-white text-black border-transparent"
 )}
 >
 <span>跳转至外部通讯录</span>
 </a>
 </div>
 </div>
 )}
 </div>
 ) : (
 /* 正常历史聊天记录 */
 <>
 {(navTab === 'chats' || navTab === 'group' ? normalChats : strangerChats)
 .filter(chat => {
 if (navTab === 'group') return chat.isGroup;
 if (navTab === 'chats') return true; // chats tab 可以看所有（或者你希望chats不显示群聊？这里按目前逻辑是不拦截）
 return true; // strangerChats
 })
 .length === 0 && (navTab === 'chats' || navTab === 'group') && (
 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
 <p className={cn(
 "text-sm tracking-[0.2em] font-light",
 isLight ? "text-black" : "text-white"
 )}>
 {navTab === 'group' ? '暂无群聊' : '开启新聊天'}
 </p>
 </div>
 )}
 
 {(navTab === 'chats' || navTab === 'group' ? normalChats : strangerChats)
 .filter(chat => {
 if (navTab === 'group') return chat.isGroup;
 return true;
 })
 .map((chat) => {
 const isUnread = typeof chat.unread === 'number' ? chat.unread > 0 : chat.unread;
 // 如果数据中没有明确指定 isOnline，默认值为 false（离线），由底层的 useAtomicPresence 动态接管真实状态
 const isOnline = chat.isOnline === true; 
 
 return (
 <div
 key={`${chat.id}_${chat.targetRole || 'user'}`}
 id={`chat-card-list-${chat.id}_${chat.targetRole || 'user'}`}
 ref={(chat.isGroup || chat.isCityChannel) ? undefined : observeNode}
 onClick={() => {
 // 点击时立即写入物理级别的最后阅读时间戳
 if (typeof window !== 'undefined') {
 // 加入 2000ms 容差，防御客户端与服务器之间的时钟偏移（Clock Skew）导致刚读完就又变成未读
 const readKey = chat.isGroup ? `gx_last_read_${currentUserId}_${chat.id}` : `gx_last_read_${currentUserId}_${chat.id}_${chat.targetRole || 'user'}`;
 localStorage.setItem(readKey, (Date.now() + 2000).toString());
 window.dispatchEvent(new CustomEvent('gx_chat_read_updated'));
 }
 onChatSelect({
 id: chat.id,
 name: chat.name,
 isGroup: chat.isGroup,
 targetRole: chat.targetRole,
 });
 }}
 onContextMenu={(e) => handleContextMenu(e, chat.id, chat.targetRole || 'user', chat.isGroup)}
 className={cn(
 "relative flex items-center py-2 px-2 cursor-pointer bg-transparent",
 isLight ? "" : ""
 )}
 >
 {/* 头像 (左) */}
 <div className="relative shrink-0 mr-3 w-[55px] h-[55px]">
 {chat.avatar ? (
 <img
 src={chat.avatar}
 alt={chat.name}
 className="w-full h-full rounded-full object-cover"
 />
 ) : (
 <div className={cn(
 "w-full h-full rounded-full flex items-center justify-center text-[15px]",
 isLight ? "bg-black/5 text-black" : "bg-white/5 text-white"
 )}>
 {chat.name ? chat.name.charAt(0).toUpperCase() : '连'}
 </div>
 )}

 {/* 极简在线绿点指示器：群聊永不显示。由 useAtomicPresence 接管 */}
                    {(!chat.isGroup && !chat.isCityChannel) && (
                      <div 
                        id={`list-presence-${chat.id}_${chat.targetRole || 'user'}`}
                        data-presence-id={chat.id}
                        className={cn(
                          "absolute z-10 w-[12px] h-[12px] rounded-full bg-[#34C759]",
                          "bottom-[14.6%] right-[14.6%]",
                          "translate-x-1/2 translate-y-1/2",
                          isOnline ? "opacity-100" : "opacity-0"
                        )}
                      />
                    )}

 {/* 未读数字：头像右上角的极简红点 */}
 {isUnread && (
 <div className={cn(
 // 核心定位法则：基于圆的 45 度角（14.6% 偏移），并将红点中心锚定在此点
 "absolute top-[14.6%] right-[14.6%] z-10 flex items-center justify-center min-w-[16px] h-[16px] px-1.5 rounded-full",
 "-translate-y-1/2 translate-x-1/2",
 "bg-red-500",
 "text-[11px] font-black tracking-tighter text-white leading-none"
 )}>
 {typeof chat.unread === 'number' ? (chat.unread > 99 ? '99+' : chat.unread) : 1}
 </div>
 )}
 </div>

 {/* 文字信息区 (中) */}
 <div className="flex-1 min-w-0 flex flex-col justify-center">
 {/* 第一行：名字与时间 */}
 <div className="flex items-center justify-between w-full">
 <span
 className={cn(
 "truncate text-[15px] leading-tight font-medium flex items-center gap-2",
 isLight ? "text-black" : "text-white"
 )}
 >
 {chat.name || '连接中...'}
 {chat.isPhantom && (
 <span className={cn(
 "text-[11px] px-1.5 py-0.5 rounded border tracking-widest whitespace-nowrap",
 isLight ? "border-black/10 text-black" : "border-white/10 text-white"
 )}>
 CONNECTING
 </span>
 )}
 </span>
 
 {/* 时间 (右侧) */}
 <span
 className={cn(
 "shrink-0 text-[11px] ml-2 font-medium tracking-wider",
 isUnread 
 ? (isLight ? "text-black" : "text-white") 
 : (isLight ? "text-black" : "text-white")
 )}
 >
 {chat.time}
 </span>
 </div>
 
 {/* 第二行：消息预览 */}
 <div className="flex items-center space-x-1.5 mt-0">
 {/* 已读状态标记 (双蓝勾/灰勾) */}
 {!isUnread && (
 <CheckCheck className={cn("w-[10px] h-[10px] shrink-0", isLight ? "text-black" : "text-white")} />
 )}
 
 <p
 className={cn(
 "truncate text-[12px] leading-tight",
 isUnread 
 ? (isLight ? "text-black font-medium" : "text-white font-medium") 
 : (isLight ? "text-black" : "text-white")
 )}
 >
 {chat.lastMessage}
 </p>
 </div>
 </div>
 </div>
 )})}
 </>
 )}
 </div>
 </>
 )}

 {/* 右键菜单层 */}
 {contextMenu && (
 <>
 <div 
 className="fixed inset-0 z-[100]" 
 onClick={() => setContextMenu(null)}
 onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
 />
 <div 
 className={cn(
 "fixed w-48 rounded-xl border z-[110] overflow-hidden py-1 shadow-2xl backdrop-blur-xl",
 isLight ? "bg-white/80 border-black/10" : "bg-black/80 border-white/10"
 )}
 style={{ 
 left: `${contextMenu.x}px`, 
 top: `${contextMenu.y}px`,
 // 防止菜单超出屏幕右侧或底部
 transform: `translate(min(0px, calc(100vw - 100% - ${contextMenu.x}px - 16px)), min(0px, calc(100vh - 100% - ${contextMenu.y}px - 16px)))`
 }}
 >
 <button 
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteChat();
 }}
 className={cn(
 "w-full px-4 py-3 flex items-center gap-3 group",
 isLight ? "text-black" : "text-white"
 )}
 >
 <Trash2 className="w-4 h-4 " />
 <span className="text-sm font-medium tracking-wide">删除聊天</span>
 </button>
 </div>
 </>
 )}
 </div>
 );
}
