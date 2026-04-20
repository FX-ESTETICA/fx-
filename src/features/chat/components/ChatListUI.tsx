import { Search, ScanLine, Plus, CheckCheck, MessageCircle } from 'lucide-react';
import { useRecentChats } from '../hooks/useRecentChats';
import { useTranslations } from "next-intl";
import { useState } from 'react';

// 模拟雷达星轨数据 (同城频道永远霸占第一)
const mockContacts = [
  // isCityChannel 标识这是同城大群，享有最高级视觉特权
  { id: 'city_current', name: 'RAPALLO', avatar: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=150&h=150&fit=crop', isOnline: true, isCityChannel: true },
  { id: 'c1', name: '李总', avatar: 'https://i.pravatar.cc/150?img=11', isOnline: true },
  { id: 'c2', name: '王设计', avatar: 'https://i.pravatar.cc/150?img=33', isOnline: true },
  { id: 'c3', name: 'Tony老师', avatar: 'https://i.pravatar.cc/150?img=15', isOnline: true },
  { id: 'city_old', name: 'MILANO', avatar: 'https://images.unsplash.com/photo-1548509925-0e543666d911?w=150&h=150&fit=crop', isOnline: true, isOldCityChannel: true }, // 曾经加入但已离开的城市
  { id: 'c5', name: '张三', avatar: 'https://i.pravatar.cc/150?img=8', isOnline: false },
  { id: 'c6', name: 'Lily', avatar: 'https://i.pravatar.cc/150?img=5', isOnline: false },
];

export interface ChatListUIProps {
  currentUserId: string;
  onChatSelect: (chat: { id: string; name: string; isGroup: boolean; isCityChannel?: boolean }) => void;
}

export default function ChatListUI({ currentUserId, onChatSelect }: ChatListUIProps) {
    const t = useTranslations('ChatListUI');
  const { recentChats, isLoading } = useRecentChats(currentUserId);
  const [searchQuery, setSearchQuery] = useState('');

  // 处理拉起原生 WhatsApp (带引流话术与洗流魔法)
  const handleOpenWhatsApp = (phone: string) => {
    // 1. 清洗号码，只保留数字和 +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const finalPhone = cleanPhone.replace('+', '');
    
    // 2. 构建极其优雅的高转化率引流话术 (The Conversion Spell)
    const domain = typeof window !== 'undefined' ? window.location.origin : 'https://fx-rapallo.vercel.app';
    const inviteUrl = `${domain}/chat/wa_${finalPhone}`;
    
    const message = `✨ 欢迎连接 GX 专属全息客服！

为提供更极速的响应与沉浸式体验，请点击下方链接进入您的专属 VIP 通道。
(若此处长时间无响应，请务必点击链接以确保您的信息被系统接收)

👉 点击进入专属服务舱:
${inviteUrl}`;

    // 3. 对话术进行 URL 编码
    const encodedMessage = encodeURIComponent(message);
    
    // 4. 拉起原生 WhatsApp，并自动填入输入框
    window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, '_blank');
  };

  return (
    // 最外层容器，这里假设父级页面会有一个宇宙/星空大背景，所以这里绝对透明
    <div className="w-full h-full min-h-[100dvh] bg-transparent flex flex-col pt-safe-top">
      
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
              className="flex-1 bg-transparent border-none text-white placeholder:text-white/30 focus:ring-0 text-[15px]"
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
          {mockContacts.map((contact) => (
            <div 
              key={contact.id} 
              className="flex flex-col items-center space-y-2 cursor-pointer shrink-0"
              onClick={() => onChatSelect({
                id: contact.id,
                name: contact.name,
                isGroup: contact.isCityChannel || contact.isOldCityChannel || false,
                isCityChannel: contact.isCityChannel
              })}
            >
              <div className="relative w-[52px] h-[52px] rounded-full p-[2px]">
                {/* 在线流光边框 / 同城频道特殊边框 */}
                {contact.isOnline && !contact.isOldCityChannel && (
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
                {/* 头像本体 */}
                <img 
                  src={contact.avatar} 
                  alt={contact.name}
                  className={`w-full h-full rounded-full object-cover border-[1.5px] border-black 
                    ${contact.isCityChannel ? 'shadow-[0_0_15px_rgba(188,19,254,0.6)]' : ''}
                    ${contact.isOnline && !contact.isOldCityChannel ? '' : 'grayscale opacity-40 border-white/20'}
                  `}
                />
                {/* 在线绿点 / 同城雷达点 */}
                {contact.isCityChannel ? (
                   <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 border-2 border-black rounded-full shadow-[0_0_8px_rgba(188,19,254,0.9)] flex items-center justify-center animate-pulse">
                     <div className="w-1.5 h-1.5 bg-white rounded-full" />
                   </div>
                ) : contact.isOnline && !contact.isOldCityChannel ? (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                ) : null}
              </div>
              {/* 名字 */}
              <span 
                className={`text-[10px] truncate w-14 text-center tracking-wider uppercase
                  ${contact.isCityChannel ? 'text-purple-300 drop-shadow-[0_0_5px_rgba(188,19,254,0.8)] font-bold' : ''}
                  ${contact.isOnline && !contact.isCityChannel && !contact.isOldCityChannel ? 'text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]' : ''}
                  ${contact.isOldCityChannel || !contact.isOnline ? 'text-gray-500' : ''}
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
          <div className="flex flex-col items-center justify-center pt-10">
            {/* 模拟探测未注册用户：弹出冷峻灰色卡片 */}
            <div 
              onClick={() => handleOpenWhatsApp(searchQuery)}
              className="relative w-full max-w-[320px] bg-gray-900/40 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800/60 transition-colors group"
            >
              {/* WhatsApp 绿色光晕 */}
              <div className="absolute inset-0 rounded-2xl shadow-[0_0_15px_rgba(37,211,102,0)] group-hover:shadow-[0_0_15px_rgba(37,211,102,0.15)] transition-all pointer-events-none" />
              
              <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-3 relative">
                <span className="text-gray-400 text-sm">?</span>
                <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5">
                  <MessageCircle className="w-4 h-4 text-[#25D366] drop-shadow-[0_0_3px_rgba(37,211,102,0.8)]" />
                </div>
              </div>
              
              <span className="text-gray-300 font-mono text-sm mb-1">{searchQuery}</span>
              <span className="text-xs text-gray-500 mb-4 text-center">未检测到内部信号<br/>是否通过 WhatsApp 发起强制连接？</span>
              
              <button className="px-5 py-2 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs tracking-wider uppercase group-hover:bg-[#25D366]/20 transition-colors">
                拉起原生 WhatsApp (免费)
              </button>
            </div>
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
                  relative flex items-center p-4 rounded-3xl cursor-pointer transition-all duration-300
                  ${chat.unread 
                    ? 'shadow-[0_0_20px_rgba(188,19,254,0.15)]' // 未读：底部光晕
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
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-14 h-14 rounded-full object-cover border border-white/20"
                  />
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
                        truncate text-lg font-medium tracking-wide
                        ${chat.unread 
                          ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]' // 未读：高亮白字+发光
                          : 'text-gray-300' // 已读：沉寂的灰白
                        }
                      `}
                    >
                      {chat.name}
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
