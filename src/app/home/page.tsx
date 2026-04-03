"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { 
  Sparkles, 
  ShoppingBag, 
  Coffee, 
  Palmtree, 
  MapPin,
  ArrowUpRight,
  ChevronRight,
  Moon,
  Dumbbell,
  Search,
  Zap,
  Camera
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import Image from "next/image";

type PlaceCategory = "dining" | "beauty" | "hotel" | "nightlife" | "fitness" | "all";

type PlacesApiPlace = {
  id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  status: string;
  category: PlaceCategory | string;
  lat?: number;
  lng?: number;
  photoName?: string | null;
};

type AggregatedPlace = PlacesApiPlace & {
  distance: string;
  image: string;
  isRealGooglePhoto: boolean;
  ugcImages: string[];
};

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
const MOCK_GOOGLE_PLACES: Array<PlacesApiPlace & { distance: string }> = [
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
  const [sortBy, setSortBy] = useState<"POPULARITY" | "DISTANCE" | "RATING">("POPULARITY");
  
  // 冷启动聚合模式状态
  const [isAggregating, setIsAggregating] = useState(false);
  const [aggregatedPlaces, setAggregatedPlaces] = useState<AggregatedPlace[]>([]);
  // 分页与位置状态
  const [displayCount, setDisplayCount] = useState(6);
  const [isRelocating, setIsRelocating] = useState(false);
  
  const [locationName, setLocationName] = useState("定位中...");
  const [isMockMode, setIsMockMode] = useState(false);

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
            radius: 5000,
            sortBy
          })
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(`API Error: ${errData.error || res.status}`);
        }
        
        const data = (await res.json()) as { places: PlacesApiPlace[] };
        
        // 映射返回的数据并附加上占位图和计算出的距离
        const placesWithImages: AggregatedPlace[] = data.places.map((place, idx) => {
          const cat = place.category === "all" ? "dining" : place.category; // fallback
          const imageArray = MOCK_IMAGES[cat as keyof typeof MOCK_IMAGES] || MOCK_IMAGES.all;
          
          const distance = (place.lat !== undefined && place.lng !== undefined) ? getDistanceFromLatLonInKm(lat, lng, place.lat, place.lng) : "999km";
          
          let coverImage = imageArray[idx % imageArray.length];
          let isRealGooglePhoto = false;

          // If we have a real photo and not in mock mode
          if (place.photoName && !isMockMode) {
            // 使用 unoptimized 避免 Next.js 报错，或者直接将 URL 作为一个外部域名而不是相对路径
            coverImage = `/api/photo?name=${encodeURIComponent(place.photoName)}`;
            isRealGooglePhoto = true;
          }
          
          return {
            ...place,
            distance,
            image: coverImage,
            isRealGooglePhoto,
            // Mock UGC images for demonstration of "Color Privilege" (every 2nd place gets one)
            ugcImages: idx % 2 === 0 ? [imageArray[(idx + 1) % imageArray.length]] : []
          };
        });
        
        setAggregatedPlaces(placesWithImages);
        setDisplayCount(6); // 每次重新获取数据时重置显示数量为 6 (响应式公倍数)
        setIsMockMode(false); // 成功获取真实数据
      } catch (err) {
        console.error("Error fetching Google Places:", err);
        // setLocationError("无法连接到卫星网络，正在使用离线数据");
        // 如果 API 失败，可以回退到 Mock 数据 (为了演示不至于白屏)
        const fallbackPlaces: AggregatedPlace[] = MOCK_GOOGLE_PLACES.map((p) => ({
          ...p,
          image: MOCK_IMAGES.all[0],
          isRealGooglePhoto: false,
          ugcImages: []
        }));
        setAggregatedPlaces(fallbackPlaces);
        setDisplayCount(6);
        setIsMockMode(true); // 标记为 Mock 模式
      } finally {
        setIsAggregating(false);
        setIsRelocating(false);
      }
    };

    // 尝试获取用户真实位置
    if (navigator.geolocation) {
      setIsAggregating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // setUserLocation({ lat: latitude, lng: longitude });
          
          // 获取城市名称 (免费且无需 Key 的逆地理编码)
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`, {
                headers: { 'Accept-Language': 'zh-CN,en-US;q=0.9' }
            });
            const geoData = await geoRes.json();
            const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county || "未知位置";
            const country = geoData.address?.country || "";
            setLocationName(`${city}${country ? `, ${country}` : ''}`);
          } catch {
            setLocationName("当前位置");
          }

          fetchPlaces(latitude, longitude);
        },
        (error) => {
          console.warn("Geolocation failed or denied:", error.message);
          setLocationName("未授权定位 (默认坐标)");
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
    
  }, [activeCategory, activeSubCategory, activeTab, sortBy, isMockMode]);

  const handleLoadMore = () => {
    setDisplayCount(prev => Math.min(prev + 6, aggregatedPlaces.length)); // 每次加载也以 6 为基数递增
  };

  return (
    <main className="min-h-screen bg-transparent text-white relative overflow-x-hidden pb-32">
      
      <div className="w-full max-w-[1400px] mx-auto px-4 pt-6 relative z-10 space-y-6">
        {/* Top Info Bar - Brand Identity & LBS Dual Wing */}
        <div className="flex justify-between items-end px-2 mb-2">
          {/* Left Wing - Core Brand Display (Optical Refraction & Holographic Glow) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center select-none mix-blend-screen shrink-0"
          >
            <div className="inline-flex items-baseline gap-1.5 md:gap-2 justify-center">
              <span className="text-[clamp(20px,5vw,30px)] whitespace-nowrap font-black tracking-tighter bg-gradient-to-br from-white via-gray-200 to-white/60 bg-clip-text text-transparent">
                GX<span className="align-super text-[clamp(14px,3vw,20px)] text-gx-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">⁺</span>
              </span>
              {/* 液态金属流光渐变文字，0 JS 开销 */}
              <span className="text-[clamp(16px,4vw,24px)] whitespace-nowrap font-black tracking-tighter bg-gradient-to-r from-cyan-100 via-white to-cyan-200 bg-[length:200%_auto] animate-pulse bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                私人管家
              </span>
            </div>
          </motion.div>

          {/* Right Wing - Location Info (Truncate 防爆保护) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 md:gap-2 group cursor-pointer pb-1 max-w-[45vw] sm:max-w-[200px]"
          >
            <MapPin className="w-[clamp(14px,3vw,20px)] h-[clamp(14px,3vw,20px)] shrink-0 text-gx-cyan group-hover:text-gx-cyan transition-colors" />
            <span className="text-[clamp(12px,2.5vw,16px)] whitespace-nowrap truncate font-bold text-white/60 group-hover:text-white transition-colors">
              {locationName}
            </span>
            <ChevronRight className="w-[clamp(12px,2vw,16px)] h-[clamp(12px,2vw,16px)] shrink-0 text-white/40 group-hover:text-white transition-colors" />
          </motion.div>
        </div>

        {/* 史诗级重构：解绑搜索与模式切换，恢复逻辑层级 */}
        <header className="flex flex-col items-center gap-0">
          {/* 第一层：超维流光中枢 (Hyper-Glow Nexus) - 纯物理镂空 */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full relative group"
          >
            {/* 真正的流光边框层 (通过 mask-composite 实现物理级镂空，中间绝对透明) */}
            <div 
              className="absolute inset-0 rounded-full opacity-60 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, rgba(0,240,255,0.8), rgba(168,85,247,0.8), transparent)',
                padding: '1px',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />

            {/* 物理内容层 - 彻底没有任何 bg 色，纯通透 */}
            <div className="relative flex items-center h-[44px] px-2 z-10 bg-transparent">
              <div className="flex items-center flex-1 h-full pl-4">
                <Search className="w-4 h-4 text-white/30 group-focus-within:text-gx-cyan transition-colors" />
                <input 
                  type="text" 
                  placeholder="搜索商家、服务、景点" 
                  className="flex-1 bg-transparent h-full pl-3 pr-4 text-sm font-light focus:outline-none text-white placeholder:text-white/30"
                />
              </div>
              
              {/* 右侧渐变赛博指令字 */}
              <button className="h-full px-4 flex items-center justify-center transition-all active:scale-95">
                <span className="text-sm font-bold bg-gradient-to-r from-gx-cyan to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] group-focus-within:drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]">
                  搜索
                </span>
              </button>
            </div>
          </motion.div>
        </header>

        {/* The Trinity Nexus: 终极三体枢纽 (采用 Clamp 流体排版 + 强制单行) */}
        <div className="flex justify-center -mt-3 relative z-20">
          {/* 背景暗场保护 */}
          <div className="absolute inset-0 bg-black/40 blur-2xl -z-10 rounded-full" />
          
          {/* 减去顶部 padding，保留极小底部 padding。使用流体 gap 防止手机端挤压 */}
          <div className="flex items-end gap-[clamp(8px,3vw,24px)] px-2 md:px-4 pt-0 pb-[3px]">
            {/* 左翼：发现附近 */}
            <button 
              onClick={() => setActiveTab("merchant")}
              className={cn(
                "relative flex flex-col items-center gap-1 group transition-all duration-500 shrink-0",
                activeTab === "merchant" ? "scale-105" : "opacity-50 hover:opacity-100"
              )}
            >
              <span className={cn(
                "text-[clamp(14px,3.5vw,18px)] font-black tracking-[clamp(1px,0.5vw,2px)] whitespace-nowrap transition-all duration-500",
                activeTab === "merchant" 
                  ? "bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.6)]" 
                  : "text-white/80"
              )}>
                发现附近
              </span>
              <span className="text-[clamp(8px,2vw,9px)] whitespace-nowrap font-mono text-white/40 tracking-widest">DISCOVER</span>
              {activeTab === "merchant" && (
                <motion.div 
                  layoutId="trinityIndicator"
                  className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full shadow-[0_0_12px_rgba(0,240,255,1)]"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(0,240,255,1), transparent)' }}
                />
              )}
            </button>

            <div className="w-[1px] h-6 bg-white/20 shrink-0" />

            {/* 中核：GX 精选 */}
            <button 
              onClick={() => alert('GX 精选 (入驻商家) 视图切换预留')}
              className="relative flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-all duration-500 shrink-0"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[clamp(14px,3.5vw,18px)] font-black tracking-[clamp(1px,0.5vw,2px)] whitespace-nowrap bg-gradient-to-r from-yellow-100 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]">
                  GX 精选
                </span>
                <Sparkles className="w-[clamp(12px,3vw,14px)] h-[clamp(12px,3vw,14px)] shrink-0 text-yellow-300 drop-shadow-[0_0_12px_rgba(255,215,0,1)]" />
              </div>
              <span className="text-[clamp(8px,2vw,9px)] whitespace-nowrap font-mono text-yellow-400/80 tracking-widest">GX PRO</span>
            </button>

            <div className="w-[1px] h-6 bg-white/20 shrink-0" />

            {/* 右翼：生活服务 */}
            <button 
              onClick={() => setActiveTab("service")}
              className={cn(
                "relative flex flex-col items-center gap-1 group transition-all duration-500 shrink-0",
                activeTab === "service" ? "scale-105" : "opacity-50 hover:opacity-100"
              )}
            >
              <span className={cn(
                "text-[clamp(14px,3.5vw,18px)] font-black tracking-[clamp(1px,0.5vw,2px)] whitespace-nowrap transition-all duration-500",
                activeTab === "service" 
                  ? "bg-gradient-to-r from-pink-300 via-purple-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]" 
                  : "text-white/80"
              )}>
                生活服务
              </span>
              <span className="text-[clamp(8px,2vw,9px)] whitespace-nowrap font-mono text-white/40 tracking-widest">SERVICES</span>
              {activeTab === "service" && (
                <motion.div 
                  layoutId="trinityIndicator"
                  className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full shadow-[0_0_12px_rgba(168,85,247,1)]"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,1), transparent)' }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Categories (Level 1) - 空间磁吸与边缘掠光 (绝对居中悬浮拖拽模式) */}
        <div className="relative w-full -mt-2 overflow-hidden" style={{ perspective: "1000px" }}>
          {/* 边缘渐变遮罩 (独立于拖拽层，保持固定) */}
          <div className="absolute inset-0 pointer-events-none z-10 [mask-image:linear-gradient(to_right,#fff_85%,transparent_100%)]" />
          
          <div className="flex justify-center w-full">
            <motion.div 
              drag="x"
              // 因为一级分类很多，肯定会超出屏幕，所以给予左右拖拽的弹性空间
              // 实际项目中可以根据内容总宽度精确计算 right 和 left 值，这里使用较大值配合弹性阻尼
              dragConstraints={{ left: -300, right: 300 }} 
              dragElastic={0.2}
              className="flex items-center gap-6 pb-4 pt-0 px-2 cursor-grab active:cursor-grabbing relative z-0"
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setActiveSubCategory("all"); // 重置二级分类
                  }}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center gap-2 min-w-[56px] h-[46px] rounded-xl transition-all duration-500 relative group/btn",
                    activeCategory === cat.id 
                      ? "text-white" 
                      : "text-white/40 hover:text-white"
                  )}
                  style={{ transformStyle: "preserve-3d" }}
                >
                {/* 动态探照灯背景层 (Hover时显现) */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.08] to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* 图标与文字容器，Hover时Y轴突进与轻微放大 */}
                <div className="relative flex flex-col items-center gap-2 transition-transform duration-500 group-hover/btn:-translate-y-1 group-hover/btn:scale-105">
                  <div className="relative">
                    <cat.icon className={cn(
                      "w-6 h-6 transition-all duration-500 relative z-10",
                      activeCategory === cat.id 
                        ? "drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] text-gx-cyan scale-110" 
                        : "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] group-hover/btn:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold tracking-widest whitespace-nowrap transition-all duration-500 relative z-10",
                    activeCategory === cat.id 
                      ? "bg-gradient-to-r from-white via-cyan-100 to-white/60 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                      : "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] group-hover/btn:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  )}>
                    {cat.label}
                  </span>
                </div>
                
                {/* 底部能量注入游标 (液态张力) */}
                {activeCategory === cat.id && (
                  <motion.div 
                    layoutId="activeCategoryIndicator"
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full shadow-[0_0_12px_rgba(0,240,255,1)]"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(0,240,255,1), transparent)'
                    }}
                  />
                )}
              </button>
            ))}
            </motion.div>
          </div>
        </div>

        {/* Sub Categories (Level 2) - 无界文本游标与液态微光 (绝对居中悬浮拖拽模式) */}
        {activeTab === "merchant" && (CATEGORIES.find(c => c.id === activeCategory)?.subCategories?.length ?? 0) > 0 && (
          <div className="relative w-full -mt-2 overflow-hidden">
            {/* 边缘渐变遮罩 (独立于拖拽层，保持固定) */}
            <div className="absolute inset-0 pointer-events-none z-10 [mask-image:linear-gradient(to_right,#fff_85%,transparent_100%)]" />
            
            <div className="flex justify-center w-full">
              <motion.div 
                drag="x"
                // 动态计算二级分类拖拽范围。此处给出基础范围，配合阻尼回弹
                dragConstraints={{ left: -150, right: 150 }}
                dragElastic={0.2}
                className="flex items-center gap-6 pb-2 pt-2 px-2 cursor-grab active:cursor-grabbing relative z-0"
              >
                {CATEGORIES.find(c => c.id === activeCategory)?.subCategories?.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubCategory(sub.id)}
                    className={cn(
                      "flex-shrink-0 text-[11px] font-mono tracking-widest transition-all duration-500 relative group/sub",
                      activeSubCategory === sub.id
                        ? "text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        : "text-white hover:text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
                    )}
                  >
                    <span className="relative z-10">{sub.label}</span>
                    {activeSubCategory === sub.id && (
                      <motion.div 
                        layoutId="activeSubCategoryIndicator"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        className="absolute -bottom-1 left-0 right-0 h-[1px] bg-white/80 shadow-[0_0_8px_rgba(255,255,255,1)]"
                      />
                    )}
                  </button>
                ))}
              </motion.div>
            </div>
          </div>
        )}

        {/* Content Grid (Google Places Aggregation) */}
        {activeTab === "merchant" && (
          <div className="pt-0">

        {/* The Command Nexus: 第二层 - 战术排序阵列 (绝对居中悬浮拖拽模式) */}
        <div className="flex justify-center mb-6 mt-2 px-2 overflow-hidden">
          <motion.div 
            drag="x"
            dragConstraints={{ left: 0, right: 0 }} // 元素少于屏幕时不让拖动，保持绝对居中
            className="flex items-center gap-6 cursor-grab active:cursor-grabbing"
          >
            {([
              { id: "POPULARITY", label: "综合推荐" },
              { id: "DISTANCE", label: "距离最近" },
              { id: "RATING", label: "好评优先" }
            ] as const).map((sortOption) => (
              <button
                key={sortOption.id}
                onClick={() => setSortBy(sortOption.id)}
                className={cn(
                  "relative pb-1 text-[12px] font-bold tracking-widest transition-all whitespace-nowrap shrink-0",
                  sortBy === sortOption.id
                    ? "bg-gradient-to-r from-gray-100 via-gray-300 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                    : "text-white/40 hover:text-white/80"
                )}
              >
                {sortOption.label}
                {sortBy === sortOption.id && (
                  <motion.div 
                    layoutId="sortIndicator"
                    className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  />
                )}
              </button>
            ))}
          </motion.div>
        </div>

            {/* VIP Hero Banner (静态预留位) */}
            <div className="mb-8 px-2">
              <div className="relative w-full aspect-[21/9] md:aspect-[32/9] rounded-2xl overflow-hidden group cursor-pointer border border-white/10 hover:border-yellow-500/50 transition-colors duration-500">
                {/* 模拟一张极高质感的全彩海报 */}
                <Image
                  src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop"
                  alt="VIP Banner"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700 saturate-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                
                {/* 官方认证印记 */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded border border-yellow-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-[10px] font-black text-yellow-500 tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]">GX PRO 官方认证</span>
                </div>

                {/* 底部信息 */}
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,1)] uppercase tracking-tighter mb-2">午夜霓虹赛博酒馆</h2>
                    <p className="text-sm font-mono text-white/70 tracking-widest">MIDNIGHT NEON BAR / 沉浸式微醺体验</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-yellow-400 font-bold text-sm bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/20 backdrop-blur-md">
                    <span>立即预约</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
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
                        {/* Carousel Container */}
                        <div className="flex w-full h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          
                          {/* Slide 1: Cover (Google or Mock) */}
                          <div className="relative w-full h-full shrink-0 snap-start bg-transparent">
                            <Image
                              src={place.image}
                              alt={place.name}
                              fill
                              unoptimized={place.isRealGooglePhoto} // 针对动态 query 参数图片关闭内置优化以避免报错
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              className={cn(
                                "object-cover transition-all duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100", // 恢复高不透明度，追求全彩高清的电影感
                                place.isRealGooglePhoto && "saturate-[0.95]" // 极轻微的降饱和，保持真实感
                              )}
                              priority={idx < 4} // 前几个卡片优先加载
                              loading={idx < 4 ? "eager" : "lazy"} // 核心：强制首页可见元素加载，防止滑动时被立刻 Abort
                            />
                            {/* 彻底移除黑色遮罩和扫描线，遵从极致清透法则 */}
                            {/* 引入更深邃的自下而上的纯黑渐变暗场，为行动栏腾出空间 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                          </div>

                          {/* Slide 2...N: UGC Images (Color Privilege) */}
                          {place.ugcImages?.map((ugcImg: string, uIdx: number) => (
                            <div key={uIdx} className="relative w-full h-full shrink-0 snap-start bg-transparent">
                              <Image
                                src={ugcImg}
                                alt={`${place.name} UGC`}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-700"
                              />
                              <div className="absolute top-4 left-4 px-2 py-1 bg-white/5 backdrop-blur-md rounded border border-white/10 flex items-center gap-1.5 z-10 pointer-events-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[8px] font-bold text-white tracking-widest uppercase drop-shadow-md">REAL UGC</span>
                              </div>
                              {/* 彻底移除黑色遮罩 - removed to achieve extreme transparency */}
                              {/* <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 pointer-events-none" /> */}
                            </div>
                          ))}

                          {/* Last Slide: Upload UGC */}
                          <div 
                            className="relative w-full h-full shrink-0 snap-start bg-white/5 flex flex-col items-center justify-center border-l border-white/5 group/upload hover:bg-white/10 transition-colors backdrop-blur-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert("UGC 照片上传功能即将开放");
                            }}
                          >
                             <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover/upload:bg-gx-cyan/20 group-hover/upload:border-gx-cyan/50 group-hover/upload:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all duration-500">
                                <Camera className="w-5 h-5 text-white/50 group-hover/upload:text-gx-cyan transition-colors" />
                             </div>
                             <span className="text-[10px] font-bold text-white/50 tracking-widest group-hover/upload:text-gx-cyan transition-colors uppercase">上传真实照片</span>
                             <span className="text-[8px] font-mono text-white/30 mt-1">UNLOCK COLOR PRIVILEGE</span>
                          </div>
                        </div>

                        {/* Swipe Hint */}
                        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 backdrop-blur-md border border-white/10 pointer-events-none">
                          <span className="text-[8px] font-mono text-white/60 tracking-widest">◂ SWIPE</span>
                        </div>
                        
                        {/* 顶部标签 */}
                        <div className="absolute top-4 right-4 flex gap-2 pointer-events-none">
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-bold tracking-widest backdrop-blur-md border",
                            place.status === "OPEN" ? "bg-gx-cyan/20 border-gx-cyan/40 text-gx-cyan" : "bg-white/10 border-white/20 text-white/60"
                          )}>
                            {place.status === "OPEN" ? "🟢 OPEN" : "CLOSED"}
                          </div>
                        </div>

                        {/* 底部信息与行动栏 - 100% 无界融合在渐变暗场中 */}
                        <div className="absolute bottom-0 left-0 right-0 pointer-events-none flex flex-col justify-end p-5 gap-3">
                          {/* 店名与评分区 */}
                          <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-bold tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(0,0,0,1)] line-clamp-1">{place.name}</h3>
                            
                            <div className="flex items-center justify-between w-full drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-gx-gold text-sm font-bold">
                                  <span className="drop-shadow-[0_0_5px_rgba(255,184,0,0.5)]">★</span>
                                  <span>{place.rating}</span>
                                  <span className="text-[10px] text-white/70 font-normal">({place.user_ratings_total})</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-white/40" />
                                <div className="flex items-center gap-1 text-[10px] font-mono text-gx-cyan drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
                                  <MapPin className="w-3 h-3" />
                                  <span>{place.distance}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 行动栏 - 完美融入 */}
                          <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/10 relative z-10 pointer-events-auto">
                            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest drop-shadow-md">
                              {place.category} / GOOGLE MAPS
                            </span>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-gx-cyan opacity-60 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
                              <span>查看详情与导航</span>
                              <ArrowUpRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
              
              {/* 加载更多按钮 (Load More) */}
              {displayCount < aggregatedPlaces.length && (
                <div className="flex justify-center pt-2 pb-2">
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

              {/* 商家入驻招募横幅 (Merchant Onboarding Banner) - 全息去背 HUD 版 (Holographic Border Glow) */}
              <div className="pt-2 pb-6 px-2 -mt-1">
                <div className="relative w-full rounded-2xl group cursor-pointer transition-all duration-700">
                  
                  {/* 物理去背：完全透明，仅保留极微弱的玻璃反光，100% 透出跑车背景 */}
                  <div className="absolute inset-0 bg-transparent rounded-2xl" />
                  
                  {/* 流光边框引擎：利用 mask-composite 实现真正的物理镂空渐变边框 */}
                  <div 
                    className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-700 opacity-60 group-hover:opacity-100"
                    style={{
                      background: 'linear-gradient(90deg, rgba(220,38,38,0.2), rgba(220,38,38,0.8), rgba(220,38,38,0.2))',
                      backgroundSize: '200% auto',
                      animation: 'shimmer 4s linear infinite',
                      padding: '1px', // 边框粗细
                      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                    }}
                  />

                  {/* 悬浮聚光灯：仅在 Hover 时在横幅中央亮起一团暗红色的星云，不接触边界 */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

                  {/* 内容层 (HUD 数据化排版) */}
                  <div className="relative p-6 flex flex-col sm:flex-row items-center justify-between gap-6 z-10">
                    <div className="flex items-start gap-4">
                      {/* Icon: 全息线框态 */}
                      <div className="w-12 h-12 rounded-xl bg-transparent border border-red-500/30 flex items-center justify-center shrink-0 group-hover:border-red-500/80 transition-all duration-500 shadow-[inset_0_0_15px_rgba(220,38,38,0.1)] group-hover:shadow-[inset_0_0_25px_rgba(220,38,38,0.3),0_0_15px_rgba(220,38,38,0.2)]">
                        <Sparkles className="w-6 h-6 text-red-500 opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(220,38,38,1)] transition-all duration-500" />
                      </div>
                      
                      {/* 尊贵文案：高对比度纯粹发光 */}
                      <div className="flex flex-col gap-1 text-center sm:text-left">
                        <h3 className="text-lg md:text-xl font-black tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(220,38,38,0.6)] group-hover:drop-shadow-[0_0_15px_rgba(220,38,38,0.9)] transition-all duration-500 uppercase">
                          跨越阶级的商业特权
                        </h3>
                        <p className="text-[10px] md:text-[11px] font-mono text-red-200/50 tracking-widest uppercase group-hover:text-red-200/80 transition-colors duration-500">
                          ENTER THE ELITE NEXUS / 掌握顶级流量的绝对分配权
                        </p>
                      </div>
                    </div>

                    {/* 行动按钮：全息极简线框态 */}
                    <button className="shrink-0 px-8 py-3 rounded-full bg-transparent text-red-400 font-black text-xs tracking-[0.15em] uppercase transition-all duration-500 border border-red-500/40 hover:border-red-400 hover:text-white hover:bg-red-950/30 hover:shadow-[0_0_30px_rgba(220,38,38,0.4),inset_0_0_15px_rgba(220,38,38,0.2)] flex items-center gap-3 group/btn backdrop-blur-sm">
                      <span className="group-hover/btn:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-300">获取入驻密钥</span>
                      <ArrowUpRight className="w-4 h-4 opacity-60 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-all duration-300" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
            )}
          </div>
        )}

        {/* 原有 Service Tab 内容保留空白或后续开发 */}
        {activeTab === "service" && (
          <div className="py-20 text-center text-white/30 font-mono text-sm tracking-widest flex flex-col items-center gap-4">
            <Zap className="w-12 h-12 text-gx-cyan/40 mb-4 animate-pulse" />
            <p>SERVICE NETWORK OFFLINE</p>
            <p className="text-[10px]">生活服务网络建设中...</p>
          </div>
        )}

        {/* Footer Footnote - 赛博节点化合规水印 */}
        <footer className="pt-6 pb-32 flex flex-col items-center space-y-8">
          <div className="flex items-center gap-2 group cursor-default">
            {/* 链路指示灯 (Pulse) */}
            <div className="relative flex items-center justify-center">
              <span className={cn("absolute w-2.5 h-2.5 rounded-full opacity-50 animate-ping", isRelocating ? "bg-gx-cyan" : isMockMode ? "bg-amber-500" : "bg-green-500")} />
              <span className={cn("relative w-1.5 h-1.5 rounded-full z-10", isRelocating ? "bg-gx-cyan" : isMockMode ? "bg-amber-500" : "bg-green-500")} />
            </div>
            {/* 赛博合规文本：提升透明度，注入深邃科技色彩，并添加轻微发光以剥离背景 */}
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold text-white/40 group-hover:text-white/60 transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              DATA POWERED BY <span className="text-cyan-600/80 drop-shadow-[0_0_4px_rgba(0,240,255,0.2)]">GOOGLE LBS</span>
            </span>
          </div>
        </footer>
      </div>

      {/* Sticky VIP Bar - 悬浮喜报舱 */}
      <div className="fixed bottom-[80px] left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-yellow-500/20 px-6 py-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] pointer-events-auto">
          <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
          <div className="text-[10px] font-mono tracking-widest text-white/80 whitespace-nowrap overflow-hidden max-w-[250px] md:max-w-[400px]">
            <div className="animate-[marquee_10s_linear_infinite] inline-block">
              恭喜 [ 午夜霓虹赛博酒馆 ] 成功入驻 GX PRO 矩阵 // 恭喜 [ Lumina 医美中心 ] 开启全息预约通道 //
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
