import { Search, ScanLine, Plus, CheckCheck, MessageCircle, Database, Signal, SearchX } from 'lucide-react';
import { useRecentChats } from '../hooks/useRecentChats';
import { useTranslations } from "next-intl";
import { useState, useMemo, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { supabase } from '@/lib/supabase';

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
  
  // 搜索状态机
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

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
          isOnline: true, // 假设近期的都活跃
          isGroup: chat.isGroup,
          isCityChannel: false
        });
      }
    });

    return tracks;
  }, [recentChats]);

  // 构建 100% 多端兼容的 WhatsApp URL 协议 (解决套壳App/PC无反应，解决 404 路由丢失)
  const getWhatsAppNativeUrl = (phone: string) => {
    if (!phone) return '#';
    const finalPhone = phone.replace(/[^\d+]/g, '').replace('+', '');
    const domain = typeof window !== 'undefined' ? window.location.origin : 'https://fx-rapallo.vercel.app';
    
    // 核心修正 1：解决 404 路由丢失问题。从 /chat/wa_xxx 改为 /chat?target=wa_xxx
    // 完美解决方案：加入 Date.now() 动态时间戳锁。
    // 这将从物理层面强迫 WhatsApp 每次都去抓取最新的 OG 图片，彻底摧毁其长达几天的旧图片缓存机制。
    const inviteUrl = `${domain}/chat?target=wa_${finalPhone}&shopId=${currentUserId}&t=${Date.now()}`;
    
    // 极致极简文案：只保留触发卡片的必要链接，和一句最短的引导语
    const message = `点击进入专属聊天室：\n${inviteUrl}`;

    // 核心修正 2：彻底放弃底层 `whatsapp://` 协议，回归官方最强中转站 `wa.me`
    // 这是解决“套壳 APP WebView 拦截”和“PC 端无桌面软件点击没反应”的唯一真理。
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    // 最外层容器，这里假设父级页面会有一个宇宙/星空大背景，所以这里绝对透明
    <div className="w-full h-full bg-transparent flex flex-col pt-safe-top">
      
      {/* 1. 顶部：全息搜索舱 (The Omni-Scanner) */}
      <div className="px-5 py-4 shrink-0 relative z-20">
        <div className="relative group">
          {/* 无边框幽灵悬浮底色 (完全透明) */}
          <div className="absolute inset-0 bg-transparent rounded-2xl group-focus-within:bg-white/5 transition-colors duration-500" />
          
          {/* 输入框与聚合功能 */}
          <div className="relative flex items-center h-12 px-4 space-x-3">
            <Search className="w-5 h-5 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('txt_8a6e8e')}
              className="flex-1 bg-transparent border-none outline-none focus:outline-none text-white placeholder:text-white/30 focus:ring-0 text-[15px]"
            />
            {/* 扫码与添加快捷指令 (同样去除分割线，保持极致清透) */}
            <div className="flex items-center space-x-3 pl-3">
              <button className="text-white/60 hover:text-cyan-400 transition-colors">
                <ScanLine className="w-5 h-5 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
              </button>
              <button className="text-white/60 hover:text-cyan-400 transition-colors">
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
                {contact.isOnline && (
                  <div 
                    className="absolute inset-0 rounded-full pointer-events-none"
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
                )}
                {/* 头像本体 (降级显示首字母) */}
                {contact.avatar ? (
                  <img 
                    src={contact.avatar} 
                    alt={contact.name}
                    className={`w-full h-full rounded-full object-cover border-[1.5px] border-black 
                      ${contact.isCityChannel ? 'shadow-[0_0_15px_rgba(188,19,254,0.6)]' : ''}
                      ${contact.isOnline ? '' : 'grayscale opacity-40 border-white/20'}
                    `}
                  />
                ) : (
                  <div 
                    className={`w-full h-full rounded-full flex items-center justify-center border-[1.5px] border-black bg-gradient-to-br from-gray-800 to-gray-900 text-white font-bold text-xl
                      ${contact.isOnline ? '' : 'opacity-40 border-white/20'}
                    `}
                  >
                    {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                {/* 在线绿点 / 同城雷达点 */}
                {contact.isCityChannel ? (
                   <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 border-2 border-black rounded-full shadow-[0_0_8px_rgba(188,19,254,0.9)] flex items-center justify-center animate-pulse">
                     <div className="w-1.5 h-1.5 bg-white rounded-full" />
                   </div>
                ) : contact.isOnline ? (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                ) : null}
              </div>
              {/* 名字 */}
              <span 
                className={`text-[10px] truncate w-14 text-center tracking-wider uppercase
                  ${contact.isCityChannel ? 'text-purple-300 drop-shadow-[0_0_5px_rgba(188,19,254,0.8)] font-bold' : ''}
                  ${contact.isOnline && !contact.isCityChannel ? 'text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]' : ''}
                  ${!contact.isOnline ? 'text-gray-500' : ''}
                `}
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
                <div className="w-16 h-16 rounded-full border border-cyan-500/20 flex items-center justify-center relative animate-pulse">
                  <div className="absolute inset-0 rounded-full border-t border-cyan-400 animate-spin opacity-80" />
                  <Signal className="w-5 h-5 text-cyan-500/50" />
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
                className="relative flex items-center p-4 rounded-3xl cursor-pointer transition-colors duration-300 border border-white/10 hover:bg-white/5 group"
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
                    <img src={res.avatar} alt={res.name} className="w-14 h-14 rounded-full object-cover border border-white/20" />
                  ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center border border-white/20 bg-gradient-to-br from-gray-800 to-gray-900 text-white font-bold text-xl">
                      {res.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* 身份角标 */}
                  <div className="absolute -bottom-1 -right-1 bg-black border border-gray-700 rounded-full p-1 shadow-lg">
                    {res.track === 'profiles' ? (
                      <Database className="w-3 h-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                    ) : (
                      <SearchX className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-lg font-medium tracking-wide text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                      {res.name}
                    </span>
                    <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                      {res.track === 'profiles' ? '内网档案' : '历史客源'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[12px] font-mono text-cyan-400 tracking-widest">{res.gx_id}</span>
                    {res.phone && (
                      <span className="text-[12px] font-mono text-gray-500 tracking-widest">
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
                <div className="relative w-full max-w-[320px] bg-gray-900/40 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center hover:bg-gray-800/60 transition-colors group">
                  <div className="absolute inset-0 rounded-2xl shadow-[0_0_15px_rgba(37,211,102,0)] group-hover:shadow-[0_0_15px_rgba(37,211,102,0.15)] transition-all pointer-events-none" />
                  
                  <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-3 relative">
                    <span className="text-gray-400 text-sm">?</span>
                    <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5">
                      <MessageCircle className="w-4 h-4 text-[#25D366] drop-shadow-[0_0_3px_rgba(37,211,102,0.8)]" />
                    </div>
                  </div>
                  
                  <span className="text-gray-300 font-mono text-sm mb-1">{searchQuery}</span>
                  <span className="text-xs text-gray-500 mb-4 text-center">
                    {searchResults.length > 0 
                      ? "没找到你想找的人？\n试试通过 WhatsApp 发起强制连接"
                      : "未检测到内部信号\n是否通过 WhatsApp 发起强制连接？"
                    }
                  </span>
                  
                  <a 
                    href={getWhatsAppNativeUrl(searchQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs tracking-wider uppercase hover:bg-[#25D366]/20 transition-colors cursor-pointer z-10"
                  >
                    拉起原生 WhatsApp (免费)
                  </a>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* 正常历史聊天记录 */
          <>
            {isLoading && recentChats.length === 0 && (
              <div className="flex justify-center items-center h-20 text-white/40 text-sm tracking-widest">
                {t('txt_8fc78c')}</div>
            )}
            
            {recentChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect({
                  id: chat.id,
                  name: chat.name,
                  isGroup: chat.isGroup,
                })}
                className={`
                  relative flex items-center p-4 rounded-3xl cursor-pointer transition-colors duration-300
                  ${chat.unread 
                    ? 'shadow-[0_0_20px_rgba(188,19,254,0.15)] border border-transparent' // 未读：底部光晕 + 透明占位边框(防止高度塌陷)
                    : 'border border-white/10' // 已读：极度安静的冷线框
                  }
                  bg-transparent /* 绝对禁用背景色 */
                `}
              >
                {/* 未读状态的七彩流光边框 (绝对定位覆盖) */}
                {chat.unread && (
                  <div 
                    className="absolute inset-0 rounded-3xl pointer-events-none p-[1px] overflow-hidden"
                    style={{
                      background: 'linear-gradient(90deg, #00f2ff, #bc13fe, #ff00ea, #00f2ff)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 3s linear infinite',
                      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                    }}
                  />
                )}

                {/* 头像 (左) */}
                <div className="relative shrink-0 mr-4">
                  {chat.avatar ? (
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-14 h-14 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center border border-white/20 bg-gradient-to-br from-gray-800 to-gray-900 text-white font-bold text-xl">
                      {chat.name ? chat.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  {/* WhatsApp 卫星节点标识 / 或群聊小标签 */}
                  {chat.id.startsWith('wa_') ? (
                    <div className="absolute -bottom-1 -right-1 bg-black border border-gray-700 rounded-full p-0.5">
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366] drop-shadow-[0_0_5px_rgba(37,211,102,0.8)]" />
                    </div>
                  ) : chat.isGroup && (
                    <div className="absolute -bottom-1 -right-1 bg-black border border-cyan-500 rounded-full p-0.5">
                      <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                    </div>
                  )}
                </div>

                {/* 文字信息区 (中) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`
                        truncate text-lg font-medium tracking-wide flex items-center gap-2
                        ${chat.unread 
                          ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]' // 未读：高亮白字+发光
                          : 'text-gray-300' // 已读：沉寂的灰白
                        }
                      `}
                    >
                      {chat.name}
                      {chat.isPhantom && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-mono tracking-widest whitespace-nowrap">
                          CONNECTING
                        </span>
                      )}
                    </span>
                    
                    {/* 时间 (右) */}
                    <span
                      className={`
                        shrink-0 text-xs ml-2
                        ${chat.unread 
                          ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' // 未读：电光紫/青色
                          : 'text-gray-500' // 已读：暗灰
                        }
                      `}
                    >
                      {chat.time}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* 已读状态标记 (双蓝勾/灰勾) */}
                    {!chat.unread && (
                      <CheckCheck className="w-4 h-4 text-cyan-500/50 shrink-0" />
                    )}
                    
                    <p
                      className={`
                        truncate text-[14px]
                        ${chat.unread 
                          ? 'text-white/90 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] font-medium' // 未读：高亮白字
                          : 'text-gray-500' // 已读：暗灰
                        }
                      `}
                    >
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
