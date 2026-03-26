"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { NebulaBackground } from "@/components/shared/NebulaBackground";
import { 
  Sparkles, 
  ShoppingBag, 
  Coffee, 
  Palmtree, 
  MapPin,
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Moon,
  Dumbbell,
  Search,
  Building2,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import Image from "next/image";

// 预设的高质感赛博朋克占位图 (用于替代昂贵的 Google Place Photo)
const MOCK_IMAGES = {
  dining: [
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070&auto=format&fit=crop", // 赛博风餐厅
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop", // 暗黑酒吧
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop", // 霓虹快餐
  ],
  beauty: [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop", // 高端沙龙
    "https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?q=80&w=2070&auto=format&fit=crop", // 极简美妆
  ],
  hotel: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop", // 奢华酒店
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop", // 未来感客房
  ],
  all: [
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070&auto=format&fit=crop"
  ]
};

// 模拟的 Google Places 返回数据 (用于前期 UI 验证，后续替换为真实 API 调用)
const MOCK_GOOGLE_PLACES = [
  { id: "gp_1", name: "The Cyber Sushi / 霓虹刺身", rating: 4.8, user_ratings_total: 342, distance: "0.8km", status: "OPEN", category: "dining" },
  { id: "gp_2", name: "Neon Coffee Roasters", rating: 4.9, user_ratings_total: 128, distance: "1.2km", status: "OPEN", category: "dining" },
  { id: "gp_3", name: "Midnight Noodle Bar / 午夜面馆", rating: 4.5, user_ratings_total: 856, distance: "2.5km", status: "READY", category: "dining" },
  { id: "gp_4", name: "Lumina Beauty Studio", rating: 5.0, user_ratings_total: 64, distance: "1.5km", status: "OPEN", category: "beauty" },
  { id: "gp_5", name: "Zenith Hair Salon", rating: 4.7, user_ratings_total: 210, distance: "3.1km", status: "OPEN", category: "beauty" },
  { id: "gp_6", name: "The Grand Horizon Hotel", rating: 4.6, user_ratings_total: 1205, distance: "4.2km", status: "OPEN", category: "hotel" },
];

const CATEGORIES = [
  { 
    id: "all", 
    label: "全部", 
    icon: Sparkles,
    subCategories: []
  },
  { 
    id: "dining", 
    label: "餐饮", 
    icon: Coffee,
    subCategories: [
      { id: "all", label: "全部" },
      { id: "cafe", label: "咖啡" },
      { id: "fast food", label: "快餐" },
      { id: "western restaurant", label: "西餐" },
      { id: "chinese restaurant", label: "中餐" },
      { id: "sushi", label: "寿司" }
    ]
  },
  { 
    id: "beauty", 
    label: "美业", 
    icon: ShoppingBag,
    subCategories: [
      { id: "all", label: "全部" },
      { id: "hair salon", label: "美发" },
      { id: "nail salon", label: "美甲" },
      { id: "spa", label: "美容水疗" }
    ]
  },
  { 
    id: "hotel", 
    label: "住宿", 
    icon: Palmtree,
    subCategories: [
      { id: "all", label: "全部" },
      { id: "luxury hotel", label: "星级酒店" },
      { id: "bed and breakfast", label: "民宿" }
    ]
  },
  { 
    id: "nightlife", 
    label: "休闲夜生活", 
    icon: Moon,
    subCategories: [
      { id: "all", label: "全部" },
      { id: "bar", label: "酒吧" },
      { id: "night club", label: "夜店" }
    ]
  },
  { 
    id: "fitness", 
    label: "运动健身", 
    icon: Dumbbell,
    subCategories: [
      { id: "all", label: "全部" },
      { id: "gym", label: "健身房" },
      { id: "swimming pool", label: "游泳池" },
      { id: "yoga studio", label: "瑜伽" }
    ]
  },
];

// 简单的经纬度计算距离函数 (Haversine formula)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d.toFixed(1) + "km";
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"merchant" | "service">("merchant");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSubCategory, setActiveSubCategory] = useState("all");
  
  // 冷启动聚合模式状态
  const [isAggregating, setIsAggregating] = useState(false);
  const [aggregatedPlaces, setAggregatedPlaces] = useState<any[]>([]);
  // 分页与位置状态
  const [displayCount, setDisplayCount] = useState(5);
  const [isRelocating, setIsRelocating] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0); // 用于触发重新定位的依赖
  
  // 暂时保留状态声明以避免 TS 警告，或者如果不需要可以直接移除
  // const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  // const [locationError, setLocationError] = useState("");

  // 获取真实位置并请求 Google API
  useEffect(() => {
    if (activeTab !== "merchant") return;

    const fetchPlaces = async (lat: number, lng: number) => {
      setIsAggregating(true);
      // setLocationError("");
      try {
        const res = await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            lat, 
            lng, 
            category: activeCategory, 
            subCategory: activeSubCategory,
            radius: 5000 
          })
        });
        
        if (!res.ok) throw new Error("Failed to fetch from API");
        
        const data = await res.json();
        
        // 映射返回的数据并附加上占位图和计算出的距离
        const placesWithImages = data.places.map((place: any, idx: number) => {
          const cat = place.category === "all" ? "dining" : place.category; // fallback
          const imageArray = MOCK_IMAGES[cat as keyof typeof MOCK_IMAGES] || MOCK_IMAGES.all;
          
          const distance = getDistanceFromLatLonInKm(lat, lng, place.lat, place.lng);
          
          return {
            ...place,
            distance,
            image: imageArray[idx % imageArray.length]
          };
        });
        
        setAggregatedPlaces(placesWithImages);
        setDisplayCount(5); // 每次重新获取数据时重置显示数量为 5
      } catch (err: any) {
        console.error("Error fetching Google Places:", err);
        // setLocationError("无法连接到卫星网络，正在使用离线数据");
        // 如果 API 失败，可以回退到 Mock 数据 (为了演示不至于白屏)
        setAggregatedPlaces(MOCK_GOOGLE_PLACES.map(p => ({...p, image: MOCK_IMAGES.all[0]})));
        setDisplayCount(5);
      } finally {
        setIsAggregating(false);
        setIsRelocating(false);
      }
    };

    // 尝试获取用户真实位置
    if (navigator.geolocation) {
      setIsAggregating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // setUserLocation({ lat: latitude, lng: longitude });
          fetchPlaces(latitude, longitude);
        },
        (error) => {
          console.warn("Geolocation failed or denied:", error.message);
          // setLocationError("无法获取当前坐标，使用默认测试坐标");
          // 默认坐标 (例如：米兰的某个坐标，或者您需要的某个默认点)
          const defaultLat = 45.4642;
          const defaultLng = 9.1900;
          fetchPlaces(defaultLat, defaultLng);
        },
        { timeout: 5000, enableHighAccuracy: false } // 快速获取粗略位置即可
      );
    } else {
      // setLocationError("当前设备不支持位置服务");
      setIsRelocating(false);
    }
    
  }, [activeCategory, activeSubCategory, activeTab, forceRefresh]);

  const handleLoadMore = () => {
    setDisplayCount(prev => Math.min(prev + 5, aggregatedPlaces.length));
  };

  const handleRelocate = () => {
    setIsRelocating(true);
    setAggregatedPlaces([]); // 清空旧数据以展示骨架屏
    setForceRefresh(prev => prev + 1); // 触发 useEffect 重新执行定位和拉取
  };

  return (
    <main className="min-h-screen bg-black text-white relative overflow-x-hidden pb-32">
      <NebulaBackground rotation={0} />
      
      <div className="w-full max-w-[1400px] mx-auto px-4 pt-6 relative z-10 space-y-6">
        {/* Top Info Bar - Brand Identity & LBS Dual Wing */}
        <div className="flex justify-between items-end px-2">
          {/* Left Wing - Core Brand Display */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center select-none"
          >
            <div className="inline-flex items-baseline gap-2 justify-center">
              <span className="text-3xl font-bold tracking-tighter">
                GX<span className="align-super text-xl text-gx-cyan">⁺</span>
              </span>
              <span className="text-2xl font-bold tracking-tighter drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">私人管家</span>
            </div>
          </motion.div>

          {/* Right Wing - Location Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 group cursor-pointer pb-1"
          >
            <MapPin className="w-5 h-5 text-gx-cyan group-hover:text-gx-cyan transition-colors" />
            <span className="text-base font-bold text-white/60 group-hover:text-white transition-colors">
              Rapallo, Italy
            </span>
            <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
          </motion.div>
        </div>

        {/* Header - Functional Search Architecture */}
        <header className="flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full relative group"
          >
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full backdrop-blur-2xl shadow-2xl group-focus-within:border-gx-cyan/30 transition-all overflow-hidden py-1">
              <Search className="ml-6 w-5 h-5 text-white/50 group-focus-within:text-gx-cyan transition-colors" />
              <input 
                type="text" 
                placeholder="搜索商家、服务、景点" 
                className="flex-1 bg-transparent py-3 pl-4 pr-8 text-base font-mono focus:outline-none text-white placeholder:text-white/50"
              />
              <button className="mr-2 px-6 py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-white/90 transition-all active:scale-95">
                搜索
              </button>
            </div>
          </motion.div>
        </header>

        {/* 双轴切换器 - 对齐搜索栏宽度 */}
        <div className="flex flex-col items-center">
          <div className="w-full flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setActiveTab("merchant")}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500",
                activeTab === "merchant" 
                  ? "text-gx-cyan bg-white/5 shadow-[inset_0_0_20px_rgba(0,240,255,0.1)] border border-gx-cyan/20" 
                  : "text-white/50 hover:text-white/80"
              )}
            >
              {activeTab === "merchant" && (
                <motion.div layoutId="activeTab" className="absolute inset-0 bg-gx-cyan/5 rounded-xl -z-10" />
              )}
              <Building2 className="w-4 h-4" />
              附近商家 / Merchants
            </button>
            <button 
              onClick={() => setActiveTab("service")}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500",
                activeTab === "service" 
                  ? "text-gx-cyan bg-white/5 shadow-[inset_0_0_20px_rgba(0,240,255,0.1)] border border-gx-cyan/20" 
                  : "text-white/50 hover:text-white/80"
              )}
            >
              {activeTab === "service" && (
                <motion.div layoutId="activeTab" className="absolute inset-0 bg-gx-cyan/5 rounded-xl -z-10" />
              )}
              <Zap className="w-4 h-4" />
              生活服务 / Services
            </button>
          </div>
        </div>

        {/* Categories (Level 1) */}
        <div className="relative w-full mt-2">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,#fff_85%,transparent_100%)]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setActiveSubCategory("all"); // 重置二级分类
                }}
                className={cn(
                  "snap-start flex-shrink-0 flex flex-col items-center justify-center gap-1.5 min-w-[72px] h-[72px] rounded-2xl transition-all duration-300",
                  activeCategory === cat.id 
                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                    : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                )}
              >
                <cat.icon className="w-5 h-5" />
                <span className="text-[10px] font-bold tracking-widest whitespace-nowrap">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sub Categories (Level 2) - 胶囊标签 */}
        {activeTab === "merchant" && (CATEGORIES.find(c => c.id === activeCategory)?.subCategories?.length ?? 0) > 0 && (
          <div className="relative w-full -mt-1">
            <div className="flex overflow-x-auto gap-2 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,#fff_85%,transparent_100%)]">
              {CATEGORIES.find(c => c.id === activeCategory)?.subCategories?.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubCategory(sub.id)}
                  className={cn(
                    "flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest transition-all duration-300 border",
                    activeSubCategory === sub.id
                      ? "bg-gx-cyan/20 border-gx-cyan/50 text-gx-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                      : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60"
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Grid (Google Places Aggregation) */}
        {activeTab === "merchant" && (
          <div className="pt-4">
            {/* Header: Powered by Google & Relocate Button */}
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleRelocate}
                  disabled={isRelocating}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-gx-cyan/50 transition-all group active:scale-95"
                >
                  <Crosshair className={cn(
                    "w-4 h-4 text-gx-cyan transition-all", 
                    isRelocating && "animate-spin text-white/50"
                  )} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tighter uppercase">周边聚合探索</h2>
                    {isRelocating && <span className="text-[10px] text-gx-cyan animate-pulse">重新校准中...</span>}
                  </div>
                  <p className="text-[10px] font-mono text-white/40 tracking-widest">NEARBY AGGREGATION</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white/40 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isRelocating ? "bg-gx-cyan animate-ping" : "bg-green-500 animate-pulse"
                )} />
                POWERED BY GOOGLE LBS
              </div>
            </div>

            {isAggregating ? (
              // 骨架屏 Skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden animate-pulse">
                    <div className="aspect-[16/9] bg-white/5" />
                    <div className="p-5 space-y-4">
                      <div className="h-6 bg-white/5 rounded-md w-3/4" />
                      <div className="flex gap-4">
                        <div className="h-4 bg-white/5 rounded-md w-1/4" />
                        <div className="h-4 bg-white/5 rounded-md w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 真实的商家列表卡片
              <div className="space-y-8 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aggregatedPlaces.slice(0, displayCount).map((place, idx) => (
                    <motion.div
                      key={place.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (idx % 5) * 0.05 }}
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`, '_blank')}
                      className="cursor-pointer"
                    >
                    <GlassCard 
                      glowColor="none" 
                      className="group p-0 overflow-hidden border-white/5 hover:border-white/20 transition-all duration-500"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <Image
                          src={place.image}
                          alt={place.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          priority={idx < 2}
                        />
                        {/* 极光渐变遮罩 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />
                        
                        {/* 顶部标签 */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-bold tracking-widest backdrop-blur-md border",
                            place.status === "OPEN" ? "bg-gx-cyan/20 border-gx-cyan/40 text-gx-cyan" : "bg-white/10 border-white/20 text-white/60"
                          )}>
                            {place.status === "OPEN" ? "🟢 OPEN" : "CLOSED"}
                          </div>
                        </div>

                        {/* 底部信息 */}
                        <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-2">
                          <h3 className="text-xl font-bold tracking-tighter uppercase drop-shadow-md line-clamp-1">{place.name}</h3>
                          
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-gx-gold text-sm font-bold">
                                <span>★</span>
                                <span>{place.rating}</span>
                                <span className="text-[10px] text-white/50 font-normal">({place.user_ratings_total})</span>
                              </div>
                              <div className="w-1 h-1 rounded-full bg-white/20" />
                              <div className="flex items-center gap-1 text-[10px] font-mono text-gx-cyan">
                                <MapPin className="w-3 h-3" />
                                <span>{place.distance}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 底部行动栏 */}
                      <div className="px-5 py-4 flex items-center justify-between border-t border-white/5 bg-black/40">
                        <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                          {place.category} / GOOGLE MAPS
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-gx-cyan opacity-50 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <span>查看详情与导航</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
              
              {/* 加载更多按钮 (Load More) */}
              {displayCount < aggregatedPlaces.length && (
                <div className="flex justify-center pt-4 pb-8">
                  <button
                    onClick={handleLoadMore}
                    className="group relative px-6 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-gx-cyan/0 via-gx-cyan/10 to-gx-cyan/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    <span className="text-[10px] font-mono tracking-widest text-white/60 group-hover:text-white transition-colors relative z-10">
                      加载更多卫星节点 / DECRYPT MORE
                    </span>
                    <ChevronRight className="w-3 h-3 text-white/40 group-hover:text-gx-cyan group-hover:translate-x-1 transition-all relative z-10" />
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* 原有 Service Tab 内容保留空白或后续开发 */}
        {activeTab === "service" && (
          <div className="py-20 text-center text-white/30 font-mono text-sm tracking-widest">
            SERVICE NETWORK OFFLINE
          </div>
        )}

        {/* Footer Footnote - 极致去中心化 */}
        <footer className="pt-32 pb-16 flex flex-col items-center space-y-8">
        </footer>
      </div>

      {/* 底部渐变遮罩 (防止滚动到底部时内容显得突兀) */}
    </main>
  );
}
