import { Search, ScanLine, Plus, CheckCheck, MessageCircle, Database, Signal, SearchX, Trash2 } from 'lucide-react';
import { useRecentChats } from '../hooks/useRecentChats';
import { useTranslations } from "next-intl";
import { useState, useMemo, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { supabase } from '@/lib/supabase';
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { usePathname } from "next/navigation";
import { useActiveTab } from "@/hooks/useActiveTab";
import { cn } from "@/utils/cn";
import { useAtomicPresence } from '../hooks/useAtomicPresence';

export interface ChatListUIProps {
  currentUserId: string;
  onChatSelect: (chat: { id: string; name: string; isGroup: boolean; isCityChannel?: boolean }) => void;
}

// ------------------------------------------------------------------------
// 多轨雷达搜索结果类型定义
// ------------------------------------------------------------------------
type SearchTrack = 'profiles' | 'bookings' | 'none';

interface SearchResult {
  track: SearchTrack;
  id: string; // profile id 或 booking phone
  name: string;
  avatar: string;
  gx_id: string;
  phone: string;
}

export default function ChatListUI({ currentUserId, onChatSelect }: ChatListUIProps) {
  const t = useTranslations('ChatListUI');
  const { activeChat } = useChatStore();
  const { recentChats, isLoading } = useRecentChats(currentUserId, activeChat?.id);
  
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

  // 本地已读状态记录，用于点击后立刻清除未读提示
  const [readChatIds, setReadChatIds] = useState<Set<string>>(new Set());

  // 引入终极视口级在线感知系统
  const { observeNode } = useAtomicPresence(currentUserId);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, targetId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, targetId });
  };

  const handleDeleteChat = () => {
    if (!contextMenu?.targetId) return;
    
    // 写入物理标识，从列表中抹除（仅删除聊天框，不删除历史记录）
    // 存储当前时间戳，如果后续有新消息(时间戳大于此时间)，则重新显示该聊天框
    const delChatKey = `gx_deleted_chat_${currentUserId}_${contextMenu.targetId}`;
    localStorage.setItem(delChatKey, Date.now().toString());

    // 触发更新事件，让列表重新渲染
    window.dispatchEvent(new CustomEvent('gx_chat_cleared', { detail: { targetId: contextMenu.targetId } }));
    setContextMenu(null);
  };

  const handleClearHistory = () => {
    if (!contextMenu?.targetId) return;
    const clearKey = `gx_cleared_${currentUserId}_${contextMenu.targetId}`;
    localStorage.setItem(clearKey, Date.now().toString());
    window.dispatchEvent(new CustomEvent('gx_chat_cleared', { detail: { targetId: contextMenu.targetId } }));
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
        // 匹配规则：名字模糊匹配 OR ID包含 OR 手机号包含
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, gx_id, phone')
          .or(`name.ilike.%${cleanQuery}%,gx_id.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`)
          .limit(5);

        if (profileData && profileData.length > 0) {
          profileData.forEach(p => {
            results.push({
              track: 'profiles',
              id: p.id,
              name: p.name || '神秘信号',
              avatar: p.avatar_url || '',
              gx_id: p.gx_id || 'UNKNOWN',
              phone: p.phone || ''
            });
          });
        }

        // 轨道二：【线下中维扫描】(查 bookings 历史订单)
        // 只有当查询词看起来像电话号码或名字时，才去历史订单里挖人
        if (cleanQuery.length >= 3 && results.length < 5) {
          const shopId = new URLSearchParams(window.location.search).get('shopId') || 'default';
          const { data: bookingData } = await supabase
            .from('bookings')
            .select('data')
            .eq('shop_id', shopId)
            .neq('status', 'VOID')
            .or(`data->>customerName.ilike.%${cleanQuery}%,data->>customerPhone.ilike.%${cleanQuery}%`)
            .order('created_at', { ascending: false })
            .limit(10); // 多查几个用来去重

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
    const tracks = [];
    
    // 1. 同城频道 (硬编码保障常驻)
    tracks.push({
      id: 'city_current',
      name: 'RAPALLO',
      avatar: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=150&h=150&fit=crop',
      isOnline: true,
      isCityChannel: true,
      isGroup: true
    });

    // 2. 从 recentChats 里提取前几个联系人
    recentChats.forEach(chat => {
      if (chat.id !== 'city_current' && tracks.length < 6) {
        tracks.push({
          id: chat.id,
          name: chat.name,
          avatar: chat.avatar,
          isOnline: chat.isOnline === true, // 初始默认离线，交给 useAtomicPresence 原子接管
          isGroup: chat.isGroup,
          isCityChannel: false
        });
      }
    });

    return tracks;
  }, [recentChats]);

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
          <div className="relative flex items-center h-12 px-4 space-x-3">
            <Search className={cn("w-5 h-5", isLight ? "text-black/50" : "text-white/50")} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('txt_8a6e8e')}
              className={cn(
                "flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[15px]",
                isLight ? "text-black placeholder:text-black/30" : "text-white placeholder:text-white/30"
              )}
            />
            {/* 扫码与添加快捷指令 (同样去除分割线，保持极致清透) */}
            <div className="flex items-center space-x-3 pl-3">
              <button className={cn("transition-colors", isLight ? "text-black/60" : "text-white/60")}>
                <ScanLine className="w-5 h-5" />
              </button>
              <button className={cn("transition-colors", isLight ? "text-black/60" : "text-white/60")}>
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 雷达星轨 (在线好友横向矩阵) + 边缘羽化 (Mask-Image) */}
      <div className="px-5 py-3 shrink-0 z-20 relative">
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
              key={contact.id} 
              id={`chat-card-radar-${contact.id}`}
              ref={(contact.isGroup || contact.isCityChannel) ? undefined : observeNode}
              className="flex flex-col items-center space-y-2 cursor-pointer shrink-0"
              onClick={() => onChatSelect({
                id: contact.id,
                name: contact.name,
                isGroup: contact.isGroup || false,
                isCityChannel: contact.isCityChannel
              })}
            >
              <div className="relative w-[52px] h-[52px] rounded-full p-[2px]">
                {/* 在线流光边框 / 同城频道特殊边框 */}
                <div 
                  id={`radar-presence-${contact.id}`}
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

      {/* 3. 沉浸式信号瀑布流 (绝对清透) */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-20 space-y-4 z-20">
        {searchQuery ? (
          /* 搜索结果面板 (探测与降维打击) */
          <div className="flex flex-col space-y-4 pt-4">
            
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
                key={res.id}
                onClick={() => {
                  onChatSelect({
                    id: res.id,
                    name: res.name,
                    isGroup: false,
                  });
                  setSearchQuery(''); // 选中后清空搜索
                }}
                className={cn(
                  "relative flex items-center p-4 rounded-3xl cursor-pointer transition-colors duration-300 border group",
                  isLight ? "border-black/5 hover:bg-black/5" : "border-white/10 hover:bg-white/5"
                )}
              >
                {/* 内部用户发光效果 */}
                {res.track === 'profiles' && (
                  <div className="absolute inset-0 rounded-3xl pointer-events-none p-[1px] overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
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

                <div className="relative shrink-0 mr-4">
                  {res.avatar ? (
                    <img src={res.avatar} alt={res.name} className={cn("w-14 h-14 rounded-full object-cover border", isLight ? "border-black/20" : "border-white/20")} />
                  ) : (
                    <div className={cn("w-14 h-14 rounded-full flex items-center justify-center border bg-gradient-to-br font-bold text-xl", isLight ? "border-black/20 text-black" : "border-white/20 text-white")}>
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
                  <div className="flex items-center justify-between">
                    <span className={cn("truncate text-lg font-medium tracking-wide", isLight ? "text-black" : "text-white")}>
                      {res.name}
                    </span>
                    <span className={cn("shrink-0 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border", isLight ? "bg-black/5 border-black/10 text-black/50" : "bg-white/5 border-white/10 text-white/50")}>
                      {res.track === 'profiles' ? '内网档案' : '历史客源'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={cn("text-[12px] font-mono tracking-widest", isLight ? "text-black/60" : "text-white/60")}>{res.gx_id}</span>
                    {res.phone && (
                      <span className={cn("text-[12px] font-mono tracking-widest", isLight ? "text-black/60" : "text-white/60")}>
                        {res.phone.substring(0, 3)}•••{res.phone.substring(res.phone.length - 4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* 外部兜底：WhatsApp 降维打击卡片 */}
            {!isSearching && (
              <div className="flex flex-col items-center justify-center pt-6 pb-10">
                <div className={cn("relative w-full max-w-[320px] border rounded-2xl p-5 flex flex-col items-center justify-center transition-colors group", isLight ? "border-black/10" : "border-white/10")}>
                  <div className="absolute inset-0 rounded-2xl transition-all pointer-events-none" />
                  
                  <div className={cn("w-12 h-12 rounded-full border flex items-center justify-center mb-3 relative", isLight ? "border-black/20" : "border-white/20")}>
                    <span className={cn("text-sm", isLight ? "text-black/60" : "text-white/60")}>?</span>
                    <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", isLight ? "bg-white" : "bg-black")}>
                      <MessageCircle className="w-4 h-4 text-[#25D366] " />
                    </div>
                  </div>
                  
                  <span className={cn("font-mono text-sm mb-1", isLight ? "text-black" : "text-white")}>{searchQuery}</span>
                  <span className={cn("text-xs mb-4 text-center", isLight ? "text-black/50" : "text-white/50")}>
                    {searchResults.length > 0 
                      ? "没找到你想找的人？\n试试通过 WhatsApp 发起强制连接"
                      : "未检测到内部信号\n是否通过 WhatsApp 发起强制连接？"
                    }
                  </span>
                  
                  <a 
                    href={getWhatsAppNativeUrl(searchQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "px-6 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300",
                      isLight 
                        ? "bg-black text-white hover:bg-black/80" 
                        : "bg-white text-black hover:bg-white/90"
                    )}
                  >
                    Initiate Link
                  </a>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* 正常历史聊天记录 */
          <>
            {isLoading && recentChats.length === 0 && (
              <div className={cn("flex justify-center items-center h-20 text-sm tracking-widest", isLight ? "text-black/40" : "text-white/40")}>
                {t('txt_8fc78c')}</div>
            )}
            
            {recentChats.map((chat) => {
              const isUnread = chat.unread && !readChatIds.has(chat.id);
              // 如果数据中没有明确指定 isOnline，默认值为 false（离线），由底层的 useAtomicPresence 动态接管真实状态
              const isOnline = chat.isOnline === true; 
              
              return (
               <div
                 key={chat.id}
                 id={`chat-card-list-${chat.id}`}
                 ref={(chat.isGroup || chat.isCityChannel) ? undefined : observeNode}
                 onClick={() => {
                  setReadChatIds(prev => new Set(prev).add(chat.id));
                  onChatSelect({
                    id: chat.id,
                    name: chat.name,
                    isGroup: chat.isGroup,
                  });
                }}
                onContextMenu={(e) => handleContextMenu(e, chat.id)}
                className={cn(
                  "relative flex items-center p-4 rounded-3xl cursor-pointer transition-colors duration-300 bg-transparent",
                  isLight ? "border border-black/10" : "border border-white/10"
                )}
              >
                {/* 头像 (左) */}
                 <div className="relative shrink-0 mr-4 w-[58px] h-[58px] rounded-full p-[2px]">
                   {/* 在线流光边框 (跑马灯) */}
                   <div 
                     id={`list-presence-${chat.id}`}
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
                      className={cn("w-full h-full rounded-full object-cover border-[1.5px]", isLight ? "border-black" : "border-white")}
                    />
                  ) : (
                    <div className={cn(
                      "w-full h-full rounded-full flex items-center justify-center border-[1.5px] bg-gradient-to-br font-bold text-xl",
                      isLight ? "border-black text-black" : "border-white text-white"
                    )}>
                      {chat.name ? chat.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                </div>

                {/* 文字信息区 (中) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "truncate text-lg font-medium tracking-wide flex items-center gap-2",
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
                      
                      <div className="flex items-center space-x-1.5 mt-1">
                        {/* 已读状态标记 (双蓝勾/灰勾) */}
                        {!isUnread && (
                          <CheckCheck className={cn("w-4 h-4 shrink-0", isLight ? "text-black/40" : "text-white/40")} />
                        )}
                        
                        <p
                          className={cn(
                            "truncate text-[14px]",
                            isUnread 
                              ? (isLight ? "text-black/90 font-medium" : "text-white/90 font-medium") 
                              : (isLight ? "text-black/60" : "text-white/60")
                          )}
                        >
                          {chat.lastMessage}
                        </p>
                      </div>
                    </div>
                    
                    {/* 时间和未读数 (右) */}
                    <div className="shrink-0 flex flex-col items-end space-y-1 ml-2">
                      <span
                        className={cn(
                          "text-xs",
                          isUnread 
                            ? (isLight ? "text-black" : "text-white") 
                            : (isLight ? "text-black/40" : "text-white/40")
                        )}
                      >
                        {chat.time}
                      </span>
                      {isUnread && (
                        <div className={cn(
                          "px-1.5 py-0.5 min-w-[20px] text-center rounded-full text-[10px] font-bold",
                          isLight ? "bg-black text-white" : "bg-white text-black"
                        )}>
                          {typeof chat.unread === 'number' ? chat.unread : 1}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </>
        )}
      </div>

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
                handleClearHistory();
              }}
              className={cn(
                "w-full px-4 py-3 flex items-center gap-3 transition-colors group",
                isLight ? "text-black/80 hover:bg-black/5" : "text-white/80 hover:bg-white/5"
              )}
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium tracking-wide">删除聊天记录</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteChat();
              }}
              className={cn(
                "w-full px-4 py-3 flex items-center gap-3 transition-colors group",
                isLight ? "text-red-600 hover:bg-red-500/10" : "text-red-400 hover:bg-red-500/10"
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
