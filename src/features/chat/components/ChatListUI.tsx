import { Search, ScanLine, CheckCheck, MessageCircle, Database, Signal, SearchX, Trash2 } from 'lucide-react';
import { useRecentChats } from '../hooks/useRecentChats';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { supabase } from '@/lib/supabase';
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { usePathname } from "next/navigation";
import { useActiveTab } from "@/hooks/useActiveTab";
import { cn } from "@/utils/cn";
import { useAtomicPresence } from '../hooks/useAtomicPresence';
import { ContactsUI } from './ContactsUI';

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
  const { activeChat } = useChatStore();
  const { recentChats } = useRecentChats(currentUserId, currentRole, activeChat?.id, activeChat?.targetRole);
  
  // 顶级 IM 极简交友架构：动态获取物理双向好友映射
  const [friendsList, setFriendsList] = useState<string[]>([]);
  useEffect(() => {
    if (!currentUserId) return;
    
    const fetchFriends = async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id, friend_role')
        .eq('user_id', currentUserId)
        .eq('user_role', currentRole);
        
      if (!error && data) {
        // 提取所有对方的 ID 与角色，构建纯净的熟人白名单 (利用双向插入物理特性)
        const friends = data.map(f => `${f.friend_id}_${f.friend_role}`);
        setFriendsList(friends);
      }
    };
    
    fetchFriends();
    
    // 监听实时破冰：当触发器瞬间融合后，前端光速更新列表，实现无感体验
    const channel = supabase.channel('friendships_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships' }, (payload) => {
        const newFriend = payload.new as any;
        if (newFriend.user_id === currentUserId && newFriend.user_role === currentRole) {
          setFriendsList(prev => [...new Set([...prev, `${newFriend.friend_id}_${newFriend.friend_role}`])]);
        } else if (newFriend.friend_id === currentUserId && newFriend.friend_role === currentRole) {
          setFriendsList(prev => [...new Set([...prev, `${newFriend.user_id}_${newFriend.user_role}`])]);
        }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, currentRole]);

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
  const [navTab, setNavTab] = useState<'chats' | 'contacts' | 'strangers'>('chats');

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
    tracks.push({
      id: 'city_current',
      name: 'RAPALLO',
      avatar: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=150&h=150&fit=crop',
      isOnline: true,
      isCityChannel: true,
      isGroup: true
    });

    // 2. 从 normalChats 里提取前几个联系人
    normalChats.forEach(chat => {
      if (chat.id !== 'city_current' && tracks.length < 6) {
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
  }, [normalChats]);

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
      
      {/* 1. 顶部：全息搜索舱 (The Omni-Scanner) */}
      <div className="px-5 py-4 shrink-0 relative z-20">
        <div className="relative group">
          {/* 无边框幽灵悬浮底色 (完全透明) */}
          <div className={cn("absolute inset-0 rounded-2xl transition-colors duration-500", isLight ? "bg-black/5 group-focus-within:bg-black/10" : "bg-transparent group-focus-within:bg-white/5")} />
          
          {/* 输入框与聚合功能 */}
          <div className="relative flex items-center h-[30px] px-4 space-x-3">
            <Search className={cn("w-[18px] h-[18px]", isLight ? "text-black/50" : "text-white/50")} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索"
              className={cn(
                "flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[15px]",
                isLight ? "text-black placeholder:text-black/30" : "text-white placeholder:text-white/30"
              )}
            />
            {/* 扫码与添加快捷指令 (同样去除分割线，保持极致清透) */}
            <div className="flex items-center space-x-3 pl-3">
              <button className={cn("transition-colors", isLight ? "text-black/60" : "text-white/60")}>
                <ScanLine className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 雷达星轨 (在线好友横向矩阵) + 边缘羽化 (Mask-Image) - 全局置顶显示 */}
      <div className="px-5 pt-[5px] pb-0 shrink-0 z-20 relative">
        <div 
          className="flex overflow-x-auto no-scrollbar space-x-5 pb-2"
          style={{
            // 核心魔法：用 mask-image 让容器右侧 15% 逐渐变透明，露出背后的宇宙
            maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
          }}
        >
          {starTrackContacts.map((contact) => (
            <div 
              key={`${contact.id}_${contact.targetRole || 'user'}`} 
              id={`chat-card-radar-${contact.id}_${contact.targetRole || 'user'}`}
              ref={(contact.isGroup || contact.isCityChannel) ? undefined : observeNode}
              className="flex flex-col items-center space-y-[4px] cursor-pointer shrink-0"
              onClick={() => onChatSelect({
                id: contact.id,
                name: contact.name,
                isGroup: contact.isGroup || false,
                isCityChannel: contact.isCityChannel,
                targetRole: contact.targetRole
              })}
            >
              <div className="relative w-[52px] h-[52px] rounded-full p-[2px]">
                {/* 在线流光边框 / 同城频道特殊边框 */}
                <div 
                  id={`radar-presence-${contact.id}_${contact.targetRole || 'user'}`}
                  data-presence-id={contact.id}
                  className={cn(
                    "absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300",
                    (contact.isGroup || contact.isCityChannel || contact.isOnline) ? "opacity-100" : "opacity-0"
                  )}
                  style={{
                    background: contact.isCityChannel 
                      ? 'linear-gradient(90deg, #bc13fe, #ff00ea, #bc13fe)' // 同城频道：专属紫粉色爆亮光环
                      : 'linear-gradient(90deg, #00f2ff, #bc13fe, #ff00ea, #00f2ff)', // 普通好友七彩光环
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s linear infinite',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    padding: '2px' // 统一边框粗细，保持秩序感
                  }}
                />
                {/* 头像本体 (降级显示首字母) */}
                {contact.avatar ? (
                  <img 
                    src={contact.avatar} 
                    alt={contact.name}
                    className={cn(
                      "w-full h-full rounded-full object-cover border-[1.5px]",
                      isLight ? "border-black" : "border-white"
                    )}
                  />
                ) : (
                  <div 
                    className={cn(
                      "w-full h-full rounded-full flex items-center justify-center border-[1.5px] bg-gradient-to-br font-bold text-xl",
                      isLight ? "border-black text-black" : "border-white text-white"
                    )}
                  >
                    {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              {/* 名字 */}
              <span 
                className={cn(
                  "text-[10px] truncate w-14 text-center tracking-wider uppercase",
                  contact.isCityChannel && "font-bold",
                  isLight ? "text-black" : "text-white"
                )}
              >
                {contact.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 1.5 导航切换: 聊天 / 通讯录 / 陌生消息 (极致极简) */}
      <div className="px-6 pt-2 pb-[3px] shrink-0 z-20 flex items-center space-x-6">
        <button 
          onClick={() => setNavTab('chats')}
          className={cn("text-[15px] font-bold transition-all duration-300 tracking-widest", navTab === 'chats' ? (isLight ? "text-black" : "text-white") : (isLight ? "text-black/30" : "text-white/30"))}
        >
          聊天
        </button>
        <button 
          onClick={() => setNavTab('contacts')}
          className={cn("text-[15px] font-bold transition-all duration-300 tracking-widest", navTab === 'contacts' ? (isLight ? "text-black" : "text-white") : (isLight ? "text-black/30" : "text-white/30"))}
        >
          通讯录
        </button>
        <button 
          onClick={() => setNavTab('strangers')}
          className={cn("text-[15px] font-bold transition-all duration-300 tracking-widest", navTab === 'strangers' ? (isLight ? "text-black" : "text-white") : (isLight ? "text-black/30" : "text-white/30"))}
        >
          陌生消息
        </button>
      </div>

      {navTab === 'contacts' ? (
        <ContactsUI currentUserId={currentUserId} currentRole={currentRole} isLight={isLight} onChatSelect={onChatSelect} />
      ) : (
        <>
          {/* 3. 沉浸式信号瀑布流 (绝对清透) */}
          <div className="flex-1 overflow-y-auto px-0 pt-[8px] pb-20 space-y-0 z-20">
        {searchQuery ? (
          /* 搜索结果面板 (探测与降维打击) */
          <div className="flex flex-col space-y-0 pt-2">
            
            {/* 加载状态 */}
            {isSearching && (
              <div className="flex justify-center items-center py-10">
                <div className={cn("w-16 h-16 rounded-full border flex items-center justify-center relative animate-pulse", isLight ? "border-black/20" : "border-white/20")}>
                  <div className={cn("absolute inset-0 rounded-full border-t animate-spin opacity-80", isLight ? "border-black" : "border-white")} />
                  <Signal className={cn("w-5 h-5", isLight ? "text-black/50" : "text-white/50")} />
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
                    "relative flex items-center py-1 px-2 cursor-pointer transition-colors duration-300 group",
                    isLight ? "hover:bg-black/5" : "hover:bg-white/5"
                  )}
              >
                {/* 内部用户发光效果 */}
                {res.track === 'profiles' && (
                  <div className="absolute inset-0 pointer-events-none p-[1px] overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
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
                    <img src={res.avatar} alt={res.name} className={cn("w-11 h-11 rounded-full object-cover", isLight ? "border-black/10 border" : "border-white/10 border")} />
                  ) : (
                    <div className={cn("w-11 h-11 rounded-full flex items-center justify-center border bg-gradient-to-br font-bold text-[15px]", isLight ? "border-black/20 text-black" : "border-white/20 text-white")}>
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
                      <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-white/20 text-white shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                        生活
                      </span>
                    )}
                    {res.identity === 'merchant' && (
                      <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-[#00f2ff]/40 text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#00f2ff]/80 shadow-[0_0_8px_rgba(0,242,255,0.3)]">
                        智控
                      </span>
                    )}
                    {res.identity === 'boss' && (
                      <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-[#ffd700]/40 text-transparent bg-clip-text bg-gradient-to-r from-[#ffd700] to-[#ff8c00] shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                        BOSS
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* ID 剥离前缀，极致降维 */}
                    <span className={cn("text-[12px] font-mono tracking-widest", isLight ? "text-black/60" : "text-white/60")}>
                      {res.gx_id.replace(/^(GX-)?(UR|MC|NE)-?/, '')}
                    </span>
                    {res.phone && (
                      <span className={cn("text-[12px] font-mono tracking-widest", isLight ? "text-black/60" : "text-white/60")}>
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
                <div className={cn("relative w-full max-w-[320px] border rounded-2xl p-5 flex flex-col items-center justify-center transition-colors group", isLight ? "border-black/10" : "border-white/10")}>
                  <div className="absolute inset-0 rounded-2xl transition-all pointer-events-none" />
                  
                  {/* 中间问号图标 */}
                  <div className="relative mb-4">
                    <div className={cn("w-12 h-12 rounded-full border flex items-center justify-center relative", isLight ? "border-black/20" : "border-white/20")}>
                      <span className={cn("text-xl font-light", isLight ? "text-black/50" : "text-white/50")}>?</span>
                      <MessageCircle className={cn("absolute -bottom-1 -right-1 w-4 h-4", isLight ? "text-green-600 bg-white rounded-full" : "text-green-400 bg-black rounded-full")} />
                    </div>
                  </div>

                  <span className={cn("text-sm font-mono tracking-widest mb-2 font-medium", isLight ? "text-black" : "text-white")}>
                    {searchQuery}
                  </span>
                  
                  <p className={cn("text-xs text-center leading-relaxed max-w-[240px]", isLight ? "text-black/50" : "text-white/50")}>
                    无匹配物理档案。<br/>可通过 WhatsApp 或 微信 强行建联。
                  </p>

                  <a 
                    href={getWhatsAppNativeUrl(searchQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-5 px-6 py-2.5 rounded-full text-xs font-mono tracking-widest transition-all",
                      "border flex items-center space-x-2 group-hover:scale-105 active:scale-95",
                      isLight 
                        ? "bg-black text-white border-transparent hover:bg-black/80" 
                        : "bg-white text-black border-transparent hover:bg-white/80"
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
            {(navTab === 'chats' ? normalChats : strangerChats).length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <p className={cn(
                  "text-sm tracking-[0.2em] font-light",
                  isLight ? "text-black/30" : "text-white/30"
                )}>
                  {navTab === 'chats' ? '开启新聊天' : '无陌生信号'}
                </p>
              </div>
            )}
            
            {(navTab === 'chats' ? normalChats : strangerChats).map((chat) => {
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
                  "relative flex items-center py-1 px-2 cursor-pointer transition-colors duration-300 bg-transparent",
                  isLight ? "hover:bg-black/5" : "hover:bg-white/5"
                )}
              >
                {/* 头像 (左) */}
                 <div className="relative shrink-0 mr-3 w-11 h-11 rounded-full p-[1px]">
                   {/* 在线流光边框 (跑马灯) */}
                   <div 
                     id={`list-presence-${chat.id}_${chat.targetRole || 'user'}`}
                     data-presence-id={chat.id}
                     className={cn(
                       "absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300",
                       (chat.isGroup || chat.isCityChannel || isOnline) ? "opacity-100" : "opacity-0"
                     )}
                     style={{
                       background: 'linear-gradient(90deg, #00f2ff, #bc13fe, #ff00ea, #00f2ff)',
                       backgroundSize: '200% 100%',
                       animation: 'shimmer 3s linear infinite',
                       WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                       WebkitMaskComposite: 'xor',
                       maskComposite: 'exclude',
                       padding: '2px'
                     }}
                   />
                   {chat.avatar ? (
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className={cn("w-full h-full rounded-full object-cover border", isLight ? "border-black/10" : "border-white/10")}
                    />
                  ) : (
                    <div className={cn(
                      "w-full h-full rounded-full flex items-center justify-center border bg-gradient-to-br font-bold text-[15px]",
                      isLight ? "border-black/10 text-black" : "border-white/10 text-white"
                    )}>
                      {chat.name ? chat.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}

                  {/* 未读数字：头像右上角的极简红点 */}
                  {isUnread && (
                    <div className={cn(
                      // 核心定位法则：基于圆的 45 度角（14.6% 偏移），并将红点中心锚定在此点
                      "absolute top-[14.6%] right-[14.6%] z-10 flex items-center justify-center min-w-[16px] h-[16px] px-1.5 rounded-full",
                      "-translate-y-1/2 translate-x-1/2",
                      "bg-red-500",
                      "text-[9px] font-black tracking-tighter text-white leading-none"
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
                      {chat.name}
                      {chat.isPhantom && (
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded border font-mono tracking-widest whitespace-nowrap",
                          isLight ? "border-black/10 text-black/60" : "border-white/10 text-white/60"
                        )}>
                          CONNECTING
                        </span>
                      )}
                    </span>
                    
                    {/* 时间 (右侧) */}
                    <span
                      className={cn(
                        "shrink-0 text-[10px] ml-2 font-medium tracking-wider",
                        isUnread 
                          ? (isLight ? "text-black" : "text-white") 
                          : (isLight ? "text-black/30" : "text-white/30")
                      )}
                    >
                      {chat.time}
                    </span>
                  </div>
                  
                  {/* 第二行：消息预览 */}
                  <div className="flex items-center space-x-1.5 mt-0">
                    {/* 已读状态标记 (双蓝勾/灰勾) */}
                    {!isUnread && (
                      <CheckCheck className={cn("w-[10px] h-[10px] shrink-0", isLight ? "text-black/40" : "text-white/40")} />
                    )}
                    
                    <p
                      className={cn(
                        "truncate text-[12px] leading-tight",
                        isUnread 
                          ? (isLight ? "text-black/90 font-medium" : "text-white/90 font-medium") 
                          : (isLight ? "text-black/50" : "text-white/50")
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
                "w-full px-4 py-3 flex items-center gap-3 transition-colors group",
                isLight ? "text-black/80 hover:bg-black/5" : "text-white/80 hover:bg-white/5"
              )}
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium tracking-wide">删除聊天</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
