'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Calendar,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { MediaRenderer } from '@/components/MediaRenderer'
import { FlashUpload } from '@/components/FlashUpload'

// Mock Data for Social Feed
const EXPLORE_POSTS = [
  {
    id: '1',
    user: {
      name: 'Rapallo 美甲沙龙',
      avatar: '/wallhaven-eo68l8.jpg',
    },
    image: '/wallhaven-eo68l8.jpg',
    title: '法式猫眼美甲初体验 ✨',
    description: '夏日清爽感满分，这款法式猫眼在阳光下真的绝美！点击下方同款即可预约哦～',
    likes: 128,
    comments: 24,
    tags: ['美甲', '法式', '夏日款'],
    relatedService: '经典美睫',
    shopId: '1',
    category: '商家',
    type: 'image'
  },
  {
    id: 'video-1',
    user: {
      name: '时尚博主 Sofia',
      avatar: '/wallhaven-qr3o8q.png',
    },
    image: '/wallhaven-qr3o8q.png',
    title: '探秘拉帕洛最美的隐藏沙滩 🎥',
    description: '今天带大家去一个只有当地人才知道的绝美沙滩，海水清澈见底！',
    likes: 1542,
    comments: 89,
    tags: ['探店', '海滩', 'Vlog'],
    relatedService: '沙滩导览',
    shopId: '3',
    category: '景点',
    type: 'video',
    videoId: '607f8725-7835-4630-8096-7429188d368b' // 示例视频 ID
  },
  {
    id: '2',
    user: {
      name: 'Bella Vista 餐厅',
      avatar: '/wallhaven-qr3o8q.png',
    },
    image: '/wallhaven-qr3o8q.png',
    title: '海边最浪漫的落日晚餐 🌅',
    description: '这里的海鲜意面和夕阳是绝配。想要在窗边位用餐的记得提前预约哦！',
    likes: 256,
    comments: 42,
    tags: ['意餐', '海景', '约会'],
    relatedService: '浪漫双人餐',
    shopId: '2',
    category: '商家'
  },
  {
    id: '3',
    user: {
      name: 'Rapallo 意式咖啡馆',
      avatar: '/wallhaven-xe75wv.png',
    },
    image: '/wallhaven-xe75wv.png',
    title: '午后的一杯拿铁与安静时光 ☕',
    description: '手工烘焙的咖啡豆，香气四溢。这里是读一本好书的最佳场所。',
    likes: 89,
    comments: 12,
    tags: ['咖啡', '下午茶', '治愈'],
    relatedService: '手工拿铁',
    shopId: '4',
    category: '商家'
  },
  {
    id: '4',
    user: {
      name: 'Rapallo 旅游指南',
      avatar: '/wallhaven-eo68l8.jpg',
    },
    image: '/wallhaven-eo68l8.jpg',
    title: '圣玛格丽塔利古雷：地中海的明珠 🏖️',
    description: '从拉帕洛出发只需10分钟车程，这里的海滩和建筑美不胜收。',
    likes: 412,
    comments: 56,
    tags: ['旅游', '景点', '海滨'],
    relatedService: '包车一日游',
    shopId: '5',
    category: '景点'
  },
  {
    id: '5',
    user: {
      name: 'Rapallo 海滨浴场',
      avatar: '/wallhaven-qr3o8q.png',
    },
    image: '/wallhaven-qr3o8q.png',
    title: '这就是向往的海边生活 🌊',
    description: '清澈的海水，五彩的遮阳伞。在这里躺上一整天都不觉得无聊。',
    likes: 672,
    comments: 89,
    tags: ['海滨', '度假', '利古里亚'],
    relatedService: '遮阳伞租赁',
    shopId: '6',
    category: '海边'
  },
  {
    id: '6',
    user: {
      name: 'Casale 公园',
      avatar: '/wallhaven-xe75wv.png',
    },
    image: '/wallhaven-xe75wv.png',
    title: '拉帕洛最美的城市绿肺 🌳',
    description: '在卡萨莱公园散步，可以俯瞰整个海湾。这里也是遛狗和野餐的绝佳去处。',
    likes: 245,
    comments: 31,
    tags: ['公园', '散步', '全景'],
    relatedService: '导游讲解',
    shopId: '7',
    category: '公园'
  }
]

const CATEGORIES = ['全部', '商家', '景点', '海边', '公园']

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState('recommend')
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const categoryRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Automatically scroll selected category into view
  useEffect(() => {
    if (categoryRefs.current[selectedCategory]) {
      categoryRefs.current[selectedCategory]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [selectedCategory])

  // Swipe logic
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = CATEGORIES.indexOf(selectedCategory)
      if (isLeftSwipe && currentIndex < CATEGORIES.length - 1) {
        setSelectedCategory(CATEGORIES[currentIndex + 1])
        // Optional: Provide haptic feedback or scroll category into view
      } else if (isRightSwipe && currentIndex > 0) {
        setSelectedCategory(CATEGORIES[currentIndex - 1])
      }
    }
  }

  const filteredPosts = EXPLORE_POSTS.filter(post => 
    selectedCategory === '全部' || post.category === selectedCategory
  )

  return (
    <main 
      className="relative w-full bg-[#0a0a0c] pb-32 overflow-x-hidden min-h-screen text-zinc-100 touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 确保没有白色层级 */}
      <div className="absolute inset-0 bg-[#0a0a0c] z-[-1]" />

      {/* Full-screen Background Image with Dark Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <MediaRenderer 
          src="/wallhaven-eo68l8.jpg" 
          alt="background" 
          className="w-full h-full opacity-30 grayscale-[0.5] contrast-[1.2]"
          priority={true}
          options={{ quality: 60, format: 'webp' }}
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
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-transparent">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex gap-6">
              <button 
                onClick={() => setActiveTab('recommend')}
                className={cn(
                  "text-sm font-black uppercase tracking-widest transition-all",
                  activeTab === 'recommend' ? "text-white scale-110 underline underline-offset-8 decoration-2 decoration-blue-500" : "text-zinc-400"
                )}
              >
                推荐
              </button>
              <button 
                onClick={() => setActiveTab('nearby')}
                className={cn(
                  "text-sm font-black uppercase tracking-widest transition-all",
                  activeTab === 'nearby' ? "text-white scale-110 underline underline-offset-8 decoration-2 decoration-blue-500" : "text-zinc-400"
                )}
              >
                附近
              </button>
              <button 
                onClick={() => setActiveTab('follow')}
                className={cn(
                  "text-sm font-black uppercase tracking-widest transition-all",
                  activeTab === 'follow' ? "text-white scale-110 underline underline-offset-8 decoration-2 decoration-blue-500" : "text-zinc-400"
                )}
              >
                关注
              </button>
            </div>
            <div className="flex gap-4 text-zinc-400">
              <Search size={20} className="hover:text-white transition-colors cursor-pointer" />
              <Filter size={20} className="hover:text-white transition-colors cursor-pointer" />
            </div>
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="px-4 pb-3 flex gap-3 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                ref={el => { categoryRefs.current[cat] = el }}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all",
                  selectedCategory === cat 
                    ? "bg-white text-zinc-900 shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105" 
                    : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Waterfall Layout (Masonry-like) */}
        <div className="px-4 mb-4">
          <FlashUpload 
            onSuccess={(data) => console.log('Upload success:', data)}
            onError={(err) => alert(err)}
          />
        </div>

        <div 
          key={selectedCategory}
          className="px-3 py-4 grid grid-cols-2 gap-3 animate-fade-in"
        >
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm border border-white/10 flex flex-col group hover:border-white/20 transition-all">
              {/* Post Media (Image or Video) */}
              <div className="relative aspect-[3/4] overflow-hidden">
                <MediaRenderer
                  src={post.image}
                  alt={post.title}
                  type={post.type as any}
                  videoId={post.videoId}
                  aspectRatio="portrait"
                  className="group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 right-2 z-20">
                  <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-all hover:bg-black/60">
                    <Bookmark size={14} />
                  </button>
                </div>
              </div>

              {/* Post Content */}
              <div className="p-3 space-y-2">
                <h3 className="text-xs font-black text-white line-clamp-2 leading-relaxed group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10">
                      <img src={post.user.avatar} alt={post.user.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-zinc-400 font-bold truncate max-w-[60px]">
                      {post.user.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Heart size={12} className="hover:text-red-500 transition-colors" />
                    <span className="text-[10px] font-bold">{post.likes}</span>
                  </div>
                </div>

                {/* Booking Shortcut (Book Same Item) */}
                <Link 
                  href={`/shop/${post.shopId}?service=${encodeURIComponent(post.relatedService)}`}
                  className="mt-2 w-full bg-amber-500/10 text-amber-400 py-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-amber-500/20 hover:bg-amber-500/20"
                >
                  <Calendar size={12} className="stroke-[3]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">预约同款</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
