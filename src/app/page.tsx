'use client'

import { useState, useEffect } from 'react'
import { Search, MapPin, Scissors, Utensils, ShoppingBag, Car, Camera, Wine, Star, ChevronRight, UserCircle, Map as MapIcon, X, Store, Shirt, MoreHorizontal, Fuel, Pill, Hospital, Bus, Train, MessageCircle, Send, Sparkles, Bot, Zap, Cpu, Home, Compass, User } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-zinc-100 h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-black uppercase tracking-widest text-zinc-400">正在加载地图数据...</span>
      </div>
    </div>
  )
})

// 模拟分类数据
const MAIN_CATEGORIES = [
  { id: 'beauty', name: '美容', icon: Scissors, color: 'text-pink-500' },
  { id: 'food', name: '餐饮', icon: Utensils, color: 'text-orange-500' },
  { id: 'hotel', name: '酒店', icon: ShoppingBag, color: 'text-blue-500' },
  { id: 'bar', name: '酒吧', icon: Wine, color: 'text-purple-500' },
  { id: 'market', name: '超市', icon: Store, color: 'text-rose-500' },
  { id: 'cloth', name: '服装', icon: Shirt, color: 'text-indigo-500' },
]

const LIFE_CATEGORIES = [
  { id: 'scenic', name: '景点推荐', icon: Camera, color: 'text-cyan-400' },
  { id: 'parking', name: '停车场', icon: Car, color: 'text-emerald-500' },
  { id: 'bus', name: '公交车', icon: Bus, color: 'text-blue-400' },
  { id: 'train', name: '火车站', icon: Train, color: 'text-slate-400' },
  { id: 'gas', name: '加油站', icon: Fuel, color: 'text-slate-300' },
  { id: 'pharmacy', name: '药房', icon: Pill, color: 'text-red-500' },
  { id: 'hospital', name: '医院', icon: Hospital, color: 'text-blue-500' },
]

// 模拟商家数据
const MERCHANTS = [
  {
    id: '3',
    name: '中央停车场',
    category: '停车位',
    rating: 4.5,
    price: '2/h',
    distance: '0.3km',
    image: '/wallhaven-xe75wv.png',
    tags: ['车位充足', '24小时'],
  },
  {
    id: '1',
    name: 'Estetica Bloom',
    category: '美甲',
    rating: 4.9,
    price: '35',
    distance: '0.8km',
    image: '/wallhaven-eo68l8.jpg',
    tags: ['今日可约', '环境好', '老店'],
  },
  {
    id: '2',
    name: 'Bella Vista 餐厅',
    category: '餐饮',
    rating: 4.7,
    price: '60',
    distance: '1.2km',
    image: '/wallhaven-qr3o8q.png',
    tags: ['海景', '地道意餐'],
  },
  {
    id: '4',
    name: 'Rapallo 意式咖啡馆',
    category: '酒吧',
    rating: 4.8,
    price: '5',
    distance: '0.5km',
    image: '/wallhaven-eo68l8.jpg',
    tags: ['手工烘焙', '安静'],
  },
  {
    id: '5',
    name: '海滨酒店',
    category: '酒店',
    rating: 4.6,
    price: '120',
    distance: '1.5km',
    image: '/wallhaven-qr3o8q.png',
    tags: ['海景房', '含早餐'],
  },
  {
    id: '6',
    name: '本地海鲜市场',
    category: '餐饮',
    rating: 4.5,
    price: '20',
    distance: '2.0km',
    image: '/wallhaven-xe75wv.png',
    tags: ['新鲜', '高性价比'],
  }
]

export default function PortalPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showMapModal, setShowMapModal] = useState<{
    show: boolean;
    type: 'parking' | 'bus' | 'train' | 'none';
  }>({ show: false, type: 'none' })
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isAILoading, setIsAILoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'Ciao! 我是您的 Rapallo 智能助手。我已经同步了本地所有商户信息，想找好吃的、好玩的，直接问我就好！' }
  ])

  // 禁止弹窗时背景滚动
  useEffect(() => {
    if (showMapModal.show || isAIChatOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [showMapModal.show, isAIChatOpen])

  // 模拟集成 Gemini API 的真实请求函数
  const askGemini = async (userPrompt: string) => {
    setIsAILoading(true)
    
    // 这里构造给 AI 的本地知识库上下文
    const context = `
      你是 Rapallo 城市的智能导游。以下是当前 App 内的实时商家数据：
      ${MERCHANTS.map(m => `- ${m.name} (${m.category}): 评分${m.rating}, 状态${m.status === 'available' ? '营业中' : '休息'}`).join('\n')}
      
      请根据这些信息回答用户。如果用户问哪家好，请推荐评分高的。回复要简短科幻，带点意大利风情。
    `

    try {
      // 模拟网络请求延迟
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 模拟 AI 根据本地数据生成的回复
      let response = ""
      if (userPrompt.includes("美甲")) {
        response = "为您检索到 Rapallo 评分最高的【Estetica Bloom】，它目前处于营业状态，评分 4.9。需要我为您在地图上定位吗？"
      } else if (userPrompt.includes("吃") || userPrompt.includes("餐")) {
        response = "本地最受欢迎的是【Pizzeria Rapallo】，评分 4.8。地道的意式风味，系统建议立即前往。"
      } else {
        response = "系统已接收指令。Rapallo 港口周边有丰富的休闲选择，建议查看‘景点推荐’或直接询问具体分类。"
      }

      setChatHistory(prev => [...prev, { role: 'ai', content: response }])
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "系统连接波动，请重试指令。" }])
    } finally {
      setIsAILoading(false)
    }
  }

  const handleSendMessage = () => {
    if (!chatMessage.trim() || isAILoading) return
    const userMsg = chatMessage
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
    setChatMessage('')
    askGemini(userMsg)
  }

  const filteredMerchants = MERCHANTS.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         shop.category.toLowerCase().includes(searchQuery.toLowerCase())
    const allCategories = [...MAIN_CATEGORIES, ...LIFE_CATEGORIES]
    const matchesCategory = activeCategory ? shop.category === allCategories.find(c => c.id === activeCategory)?.name : true
    return matchesSearch && matchesCategory
  })

  return (
    <main className="relative w-full bg-[#0a0a0c] pb-32 overflow-y-auto min-h-screen text-zinc-100">
      {/* Full-screen Background Image with Dark Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img 
          src="/wallhaven-eo68l8.jpg" 
          alt="background" 
          className="w-full h-full object-cover opacity-30 grayscale-[0.5] contrast-[1.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0c]/80 via-transparent to-[#0a0a0c]/90" />
      </div>

      {/* Background Decorative Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse duration-[5000ms]" />
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px]" />
      </div>

      {/* Content Wrapper to ensure visibility over background */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header / Search Bar */}
        <div className="p-4 pb-6 sticky top-0 z-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white">
              <MapPin size={18} className="text-blue-400" />
              <span className="font-bold text-sm tracking-tight">Rapallo, Italy</span>
              <ChevronRight size={14} className="text-zinc-600" />
            </div>
            <button 
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              className="flex items-center gap-1.5 bg-white/5 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg border border-white/10 hover:bg-white/10"
            >
              {viewMode === 'list' ? (
                <>
                  <MapIcon size={12} className="stroke-[3]" />
                  地图模式
                </>
              ) : (
                <>
                  <ShoppingBag size={12} className="stroke-[3]" />
                  列表模式
                </>
              )}
            </button>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="搜索商家、服务、景点"
              className="w-full bg-white/5 border border-white/10 text-white rounded-full py-2.5 pl-10 pr-4 text-sm outline-none shadow-sm focus:border-white/20 transition-all placeholder:text-zinc-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="absolute right-1 top-1/2 -translate-y-1/2 bg-white text-zinc-900 px-4 py-1.5 rounded-full text-sm font-black italic uppercase tracking-widest shadow-lg">
              搜索
            </button>
          </div>
        </div>

      {/* View Mode Content */}
      {viewMode === 'map' ? (
        <div className="flex-1 h-[calc(100vh-200px)] relative overflow-hidden">
          <MapComponent showParking={false} showMerchants={true} />
          
          {/* Legend Overlay */}
          {viewMode === 'map' && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-zinc-100 space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">地图说明</h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-zinc-900">今日可约</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-zinc-900">暂无空位</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Categories Sections */}
          <div className="bg-transparent px-4 py-6 space-y-8 relative z-10">
            {/* Main Categories Section */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 px-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">精选服务</h3>
                <div className="grid grid-cols-5 gap-y-6">
                  {(isCategoriesExpanded ? MAIN_CATEGORIES : [...MAIN_CATEGORIES.slice(0, 4), { id: 'more', name: '更多', icon: MoreHorizontal, color: 'text-zinc-400' }]).map((cat) => {
                    const Content = (
                      <div className="flex flex-col items-center gap-2 group">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 group-hover:shadow-xl relative overflow-hidden backdrop-blur-md border border-white/10",
                          activeCategory === cat.id ? "bg-white/20 ring-2 ring-white/50" : "bg-white/5 group-hover:bg-white/10"
                        )}>
                          <cat.icon size={22} className={cn("stroke-[2.5] relative z-10", cat.color)} />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-tighter transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
                          activeCategory === cat.id ? "text-white" : "text-zinc-300 group-hover:text-white"
                        )}>
                          {cat.name}
                        </span>
                      </div>
                    )

                  return (
                     <button 
                       key={cat.id} 
                       onClick={() => {
                         if (cat.id === 'more') {
                           setIsCategoriesExpanded(true)
                         } else {
                           setActiveCategory(activeCategory === cat.id ? null : cat.id)
                         }
                       }}
                       className="w-full"
                     >
                       {Content}
                     </button>
                   )
                 })}
              </div>
            </div>

            {/* Life Services Section */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 px-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">生活服务</h3>
                <div className="grid grid-cols-5 gap-y-6">
                  {(isCategoriesExpanded ? LIFE_CATEGORIES : [...LIFE_CATEGORIES.slice(0, 4), { id: 'more', name: '更多', icon: MoreHorizontal, color: 'text-zinc-400' }]).map((cat) => {
                    const Content = (
                      <div className="flex flex-col items-center gap-2 group">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 group-hover:shadow-xl relative overflow-hidden backdrop-blur-md border border-white/10",
                          activeCategory === cat.id ? "bg-white/20 ring-2 ring-white/50" : "bg-white/5 group-hover:bg-white/10"
                        )}>
                          <cat.icon size={22} className={cn("stroke-[2.5] relative z-10", cat.color)} />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-tighter transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
                          activeCategory === cat.id ? "text-white" : "text-zinc-300 group-hover:text-white"
                        )}>
                          {cat.name}
                        </span>
                      </div>
                    )

                  return (
                    <button 
                      key={cat.id} 
                      onClick={() => {
                        if (cat.id === 'more') {
                          setIsCategoriesExpanded(true)
                        } else if (['parking', 'bus', 'train'].includes(cat.id)) {
                          setShowMapModal({ show: true, type: cat.id as any })
                        } else {
                          setActiveCategory(activeCategory === cat.id ? null : cat.id)
                        }
                      }}
                      className="w-full"
                    >
                      {Content}
                    </button>
                  )
                })}
                
                {/* 展开后的“收起”按钮 */}
                {isCategoriesExpanded && (
                  <button 
                    onClick={() => setIsCategoriesExpanded(false)}
                    className="w-full flex flex-col items-center gap-2 group animate-in fade-in zoom-in-50 duration-300"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-400 shadow-sm transition-all active:scale-90 group-hover:bg-white/10 group-hover:shadow-md">
                      <X size={22} className="stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      收起
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

      {/* 交通/停车地图全屏弹窗 */}
      {showMapModal.show && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          <div className="flex-1 bg-white mt-12 rounded-t-[2.5rem] overflow-hidden flex flex-col relative shadow-2xl animate-in slide-in-from-bottom duration-500">
            {/* 弹窗 Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl text-white shadow-lg",
                  showMapModal.type === 'parking' ? "bg-emerald-500 shadow-emerald-200" :
                  showMapModal.type === 'bus' ? "bg-blue-400 shadow-blue-100" :
                  "bg-slate-700 shadow-slate-200"
                )}>
                  {showMapModal.type === 'parking' && <Car size={20} />}
                  {showMapModal.type === 'bus' && <Bus size={20} />}
                  {showMapModal.type === 'train' && <Train size={20} />}
                </div>
                <div>
                  <h3 className="font-black text-zinc-900 uppercase tracking-tight">
                    {showMapModal.type === 'parking' ? '周边停车场' : 
                     showMapModal.type === 'bus' ? '周边公交站' : '周边火车站'}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">OSM 实时数据驱动</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMapModal({ show: false, type: 'none' })}
                className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* 地图内容 */}
            <div className="flex-1 relative">
              <MapComponent 
                showMerchants={false} 
                showParking={showMapModal.type === 'parking'} 
                showTransport={showMapModal.type === 'bus' ? 'bus' : showMapModal.type === 'train' ? 'train' : undefined}
              />
              
              {/* 地图说明浮层 */}
              <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md px-5 py-4 rounded-3xl shadow-2xl border border-white/50 space-y-3 pointer-events-auto">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">图例说明</h4>
                    <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">实时更新</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {showMapModal.type === 'parking' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-500 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
                          <span className="text-[10px] font-black text-white leading-none">P</span>
                        </div>
                        <span className="text-[11px] font-black text-zinc-800">公共停车场</span>
                      </div>
                    ) : showMapModal.type === 'bus' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-400 rounded-lg flex items-center justify-center shadow-md shadow-blue-100">
                          <Bus size={12} className="text-white" />
                        </div>
                        <span className="text-[11px] font-black text-zinc-800">公交站点</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-slate-700 rounded-lg flex items-center justify-center shadow-md shadow-slate-200">
                          <Train size={12} className="text-white" />
                        </div>
                        <span className="text-[11px] font-black text-zinc-800">火车站</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse border-2 border-white shadow-sm" />
                      <span className="text-[11px] font-black text-zinc-800">您的位置</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Banner (Promotion) */}
      <div className="px-4 py-4 relative z-10">
        <div className="bg-gradient-to-br from-blue-600/40 to-purple-600/40 backdrop-blur-xl rounded-[2rem] p-6 text-white shadow-2xl flex justify-between items-center overflow-hidden relative border border-white/10 group">
          <div className="relative z-10">
            <h3 className="font-black text-xl italic uppercase tracking-tighter group-hover:scale-105 transition-transform origin-left">Rapallo Special</h3>
            <p className="text-[10px] opacity-60 uppercase font-black tracking-[0.2em] mt-1">发现本地隐藏的好店和景点</p>
          </div>
          <div className="bg-white text-zinc-950 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 relative z-10 hover:bg-blue-400 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95">
            查看更多
          </div>
          {/* Decorative Elements */}
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl group-hover:bg-blue-400/40 transition-colors" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent)]" />
        </div>
      </div>

      {/* Merchant List */}
      <div className="px-4 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-black text-lg text-white tracking-tight">推荐商家</h2>
          <div className="flex gap-4 text-xs text-zinc-500 font-bold uppercase tracking-widest">
            <button className="text-blue-400">距离最近</button>
            <button className="hover:text-zinc-300 transition-colors">评分最高</button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredMerchants.length > 0 ? filteredMerchants.map((shop) => (
            <Link 
              key={shop.id} 
              href={`/shop/${shop.id}`}
              className="bg-white/5 backdrop-blur-md rounded-[2rem] overflow-hidden border border-white/10 flex gap-4 p-4 active:scale-[0.98] transition-all hover:bg-white/10 hover:border-white/20 group"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                <img src={shop.image} alt={shop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex-1 flex flex-col justify-between py-0.5 relative z-10">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-white line-clamp-1 tracking-tight group-hover:text-blue-400 transition-colors">{shop.name}</h3>
                    <span className="text-[10px] text-zinc-500 font-black">{shop.distance}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex items-center text-amber-400 gap-0.5">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-black">{shop.rating}</span>
                    </div>
                    <span className="text-zinc-800">/</span>
                    <span className="text-[11px] text-zinc-400 font-bold italic">€{shop.price}起</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 font-bold uppercase tracking-tighter">
                    {shop.category} · Rapallo 核心区
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {shop.tags.map(tag => (
                    <span key={tag} className={cn(
                      "text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md",
                      tag === '今日可约' ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" : "bg-white/5 text-zinc-500 border border-white/5"
                    )}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          )) : (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                <Search size={32} />
              </div>
              <p className="text-sm text-zinc-400 font-medium">没有找到相关商家</p>
            </div>
          )}
        </div>
      </div>

      {/* Merchant Entry Section */}
      <div className="mt-12 mb-8 bg-white/5 backdrop-blur-xl rounded-[3rem] p-10 text-center space-y-6 shadow-2xl border border-white/10 relative overflow-hidden group mx-4 z-10">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-blue-500/20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] -ml-24 -mb-24 transition-all group-hover:bg-purple-500/20" />
        
        <div className="space-y-2 relative z-10">
          <h3 className="text-2xl font-black italic text-white uppercase tracking-[0.3em]">
            想让您的店出现在这里？
          </h3>
          <p className="text-[10px] text-zinc-500 font-black italic uppercase tracking-[0.3em]">
            加入 Rapallo 本地生活服务平台
          </p>
        </div>

        <div className="pt-4 relative z-10">
          <Link 
            href="/admin" 
            className="inline-block px-10 py-4 bg-white text-zinc-950 rounded-full text-sm font-black italic uppercase tracking-[0.2em] hover:bg-blue-400 hover:text-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95"
          >
            商家入驻 / 登录
          </Link>
        </div>
      </div>
    </>
  )}
</div>
      {/* AI 智能球 & 聊天窗口 */}
      <div className="fixed bottom-24 right-6 z-[200] flex flex-col items-end gap-4 mb-2">
        {/* 聊天窗口 */}
        {isAIChatOpen && (
          <div className="w-[300px] h-[420px] bg-zinc-950/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            {/* 窗口 Header - 科幻风格 */}
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-4 flex items-center justify-between border-b border-white/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.15),transparent)] pointer-events-none" />
              <div className="flex items-center gap-2.5 relative">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                  <Cpu size={16} className="text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-cyan-50 tracking-[0.1em] uppercase">Core OS</h4>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                    <span className="text-[8px] text-cyan-500/80 font-black uppercase tracking-tighter">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsAIChatOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-all hover:bg-white/10 border border-white/10"
              >
                <X size={14} />
              </button>
            </div>

            {/* 消息区域 - 科幻对话流 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={cn(
                  "flex flex-col max-w-[90%]",
                  msg.role === 'user' ? "ml-auto items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-4 py-3 rounded-[1.5rem] text-[12px] font-medium leading-relaxed backdrop-blur-md transition-all",
                    msg.role === 'user' 
                      ? "bg-cyan-500/10 text-cyan-50 border border-cyan-500/30 rounded-tr-none shadow-[0_0_15px_rgba(34,211,238,0.05)]" 
                      : "bg-zinc-900/80 text-zinc-300 border border-white/5 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {/* Loading 动画 */}
              {isAILoading && (
                <div className="flex flex-col items-start max-w-[90%]">
                  <div className="bg-zinc-900/80 border border-white/5 px-4 py-3 rounded-[1.5rem] rounded-tl-none flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* 输入区域 - 极简科技感 */}
            <div className="p-4 bg-zinc-900/50 border-t border-white/5 backdrop-blur-xl">
              <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-cyan-500/50 transition-all">
                <input 
                  type="text" 
                  placeholder="等待指令..." 
                  className="flex-1 bg-transparent text-[12px] text-cyan-50 placeholder:text-zinc-600 outline-none"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim()}
                  className="w-8 h-8 rounded-lg bg-cyan-500 text-zinc-950 flex items-center justify-center active:scale-90 transition-all disabled:opacity-20 shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                >
                  <Send size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3D 科幻球体 */}
        <button 
          onClick={() => setIsAIChatOpen(!isAIChatOpen)}
          className={cn(
            "group relative w-14 h-14 rounded-full transition-all duration-700 animate-float",
            isAIChatOpen ? "rotate-[360deg] scale-110" : "hover:scale-110"
          )}
        >
          {/* 3D 球体核心 - 多层渐变 */}
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-700 overflow-hidden",
            "bg-[radial-gradient(circle_at_30%_30%,#334155,0%,#0f172a_100%)]",
            "shadow-[inset_-3px_-3px_10px_rgba(0,0,0,0.8),inset_3px_3px_10px_rgba(255,255,255,0.1),0_0_20px_rgba(34,211,238,0.2)]",
            isAIChatOpen ? "bg-cyan-900 border-2 border-cyan-400/50" : "border border-white/10"
          )}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.4)_0%,transparent_60%)]" />
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:8px_8px] animate-slow-spin" />
            <div className="absolute top-[10%] left-[15%] w-[40%] h-[30%] bg-white/20 rounded-full blur-[2px] rotate-[-20deg]" />
          </div>

          {/* 外环轨道 */}
          <div className={cn(
            "absolute -inset-1.5 border border-cyan-500/20 rounded-full border-dashed animate-slow-spin transition-all duration-700",
            isAIChatOpen ? "scale-125 opacity-100 rotate-180" : "scale-100 opacity-50"
          )} />
          
          <div className="absolute inset-1.5 rounded-full border border-cyan-400/30 animate-pulse-glow" />

          {/* 中心图标 */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {isAIChatOpen ? (
              <X size={24} className="text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            ) : (
              <div className="relative">
                <Bot size={24} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                <div className="absolute -inset-1 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent h-0.5 top-0 animate-[scan_2s_linear_infinite]" />
              </div>
            )}
          </div>

          {/* 粒子装饰 */}
          {!isAIChatOpen && (
            <>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-cyan-500 rounded-full border-[3px] border-zinc-950 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse" />
              <div className="absolute bottom-1 -left-1 w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-50 animate-ping" />
            </>
          )}
        </button>
      </div>

      {/* 底部导航栏 - 全透明 */}
      <div className="fixed bottom-0 left-0 right-0 z-[150] bg-transparent">
        <div className="max-w-md mx-auto flex items-center justify-around py-3 px-2 relative">
          <Link href="/" className="flex flex-col items-center gap-1 group relative px-6">
            {/* 选中态指示光 - 增强发光以补偿全透明背景 */}
            <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 w-10 h-[2.5px] bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,1)] z-20" />
            <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 w-20 h-10 bg-cyan-400/20 blur-2xl rounded-full pointer-events-none" />
            
            <Home size={22} className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)] relative z-10" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] relative z-10">首页</span>
          </Link>
          
          <Link href="/explore" className="flex flex-col items-center gap-1 group px-6">
            <Compass size={22} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors">发现</span>
          </Link>
          
          <Link href="/me" className="flex flex-col items-center gap-1 group px-6">
            <User size={22} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors">我的</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
