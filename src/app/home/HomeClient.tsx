"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { HolographicCarousel } from "@/components/shared/HolographicCarousel";
import { HoloAscensionCard } from "@/components/shared/HoloAscensionCard";
import { GxProCard } from "@/components/shared/GxProCard";
import { ShopDetailOverlay } from "@/components/shared/ShopDetailOverlay";
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
  Martini,
  Zap,
  Camera,
  Lock,
  RefreshCw,
  X
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import useSWR, { preload } from "swr";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMapRouter } from "@/hooks/useMapRouter";
import { MapRouterModal } from "@/components/shared/MapRouterModal";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { useRouter } from "next/navigation";

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
    icon: Sparkles,
    subCategories: []
  },
  { 
    id: "dining", 
    icon: Coffee,
    subCategories: []
  },
  { 
    id: "beauty", 
    icon: ShoppingBag,
    subCategories: []
  },
  { 
    id: "hotel", 
    icon: Palmtree,
    subCategories: []
  },
  { 
    id: "nightlife", 
    icon: Moon,
    subCategories: []
  },
  { 
    id: "bar", 
    icon: Martini,
    subCategories: []
  },
  { 
    id: "fitness", 
    icon: Dumbbell,
    subCategories: []
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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'API Error');
  }
  return res.json();
};

import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export function HomeClient({ initialRealShops }: { initialRealShops: any[] }) {
  const t = useTranslations("Home");
  const { openGoogleMaps, showMapModal, handleMapModalChoice } = useMapRouter();
  const router = useRouter();
  const { user } = useAuth();

  const handleOpenMaps = (placeName: string) => {
    if (Capacitor.isNativePlatform()) {
      // 在原生 App 中，使用底层 geo 协议瞬间拉起地图 App，避免跳应用商店
      const encodedQuery = encodeURIComponent(placeName);
      window.location.href = `geo:0,0?q=${encodedQuery}`;
    } else {
      // 网页端，保持原有的 openGoogleMaps 或直接打开网页版 Google Maps
      openGoogleMaps(placeName);
    }
  };
  
  const [activeTab, setActiveTab] = useState<"merchant" | "gx_pro" | "service">("gx_pro");
  const [realShops, setRealShops] = useState<any[]>(initialRealShops);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  // 当切换顶部大标签时，强制重置默认的分类选项
  useEffect(() => {
    if (activeTab === "merchant") {
      setActiveCategory("attraction");
    } else if (activeTab === "gx_pro") {
      setActiveCategory("all");
    }
  }, [activeTab]);

  useEffect(() => {
    // 仅在 initialRealShops 为空且不在 mock 模式时，触发客户端获取 (兜底)
    const fetchRealShops = async () => {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .not('config', 'is', null)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setRealShops(data);
        }
      } catch (err) {
        console.error("Failed to fetch real shops", err);
      }
    };
    if (initialRealShops.length === 0) {
      fetchRealShops();
    }
  }, [initialRealShops]);
  const [activeSubCategory, setActiveSubCategory] = useState("all");
  const [sortBy] = useState<"POPULARITY" | "DISTANCE" | "RATING">("POPULARITY");
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // 冷启动聚合模式状态
  const [isAggregating, setIsAggregating] = useState(false);
  const [aggregatedPlaces, setAggregatedPlaces] = useState<AggregatedPlace[]>([]);
  // 智能响应式网格与位置状态
  const [columns, setColumns] = useState(3);
  const [targetCount, setTargetCount] = useState(6); // 核心：取代 rowCount，直接追踪目标显示数量
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 0冲突法则：基于 ResizeObserver 的物理级网格列数监听与底线补偿
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // 匹配 Tailwind gap-[clamp(16px,2vw,24px)]
        const gap = width > 1024 ? 24 : 16;
        // 匹配 minmax(min(100%,320px),1fr)
        let cols = Math.floor((width + gap) / (320 + gap));
        if (cols < 1) cols = 1;
        
        setColumns(prev => {
          if (prev !== cols) {
            // 当列数发生变化时，重新计算目标显示数量，确保符合“最低6个且铺满”的绝对底线
            setTargetCount(currentCount => {
              // 1. 基础逻辑：至少需要显示 6 个
              let minRequired = Math.max(6, currentCount);
              // 2. 铺满逻辑：必须是当前列数的整数倍（向上取整）
              return Math.ceil(minRequired / cols) * cols;
            });
            return cols;
          }
          return prev;
        });
      }
    });
    
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab]);

  // 1. 瀑布流列表的严格过滤：只有选中的分类才能显示 (GX 精选视图下展示全部)
  const listRealShops = activeTab === "gx_pro" 
    ? realShops 
    : realShops.filter(shop => shop.industry === activeCategory);

  // 2. 顶部轮播广告位的权重排序：全量展示，但当前分类的商家排在最前面
  const carouselRealShops = [...realShops].sort((a, b) => {
    if (a.industry === activeCategory && b.industry !== activeCategory) return -1;
    if (a.industry !== activeCategory && b.industry === activeCategory) return 1;
    return 0; // 相同优先级保持原序 (按创建时间)
  });

  // 0冲突法则：无感无限滚动 (Infinite Scroll)
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // 精准地再加完整的 2 行（即列数的 2 倍），受限于 displayCount 在渲染时的计算
          setTargetCount(prev => prev + (columns * 2));
        }
      },
      { rootMargin: "400px" } // 提前 400px 触发，实现完美的无缝衔接
    );
    
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [columns]); // 依赖 columns，当列数改变时更新加载步长

  // 动态推算最终渲染数量，永远保持完美矩形，并受限于实际数据总数
  const displayCount = Math.min(targetCount, aggregatedPlaces.length);
  
  const [locationName, setLocationName] = useState("定位中...");
  const [isMockMode, setIsMockMode] = useState(false);
  const [isLocationDenied, setIsLocationDenied] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // 用户地理位置状态独立管理
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // 1. 获取真实位置 (仅在初次加载时执行一次)
  useEffect(() => {
    const fetchLocation = async () => {
      // 穹顶第一层：光速读取缓存，0毫秒点亮UI
      const cachedLoc = localStorage.getItem('gx_last_location');
      const cachedCity = localStorage.getItem('gx_last_city');
      if (cachedLoc) setUserLocation(JSON.parse(cachedLoc));
      if (cachedCity) setLocationName(cachedCity);

      try {
        // 穹顶第二层：网络基站 (IP定位兜底)，200毫秒
        const networkPromise = fetch('https://ipapi.co/json/').then(r => r.json());

        // 穹顶第三层：硬件卫星 (高精度 15秒)
        const hardwarePromise = new Promise<{lat: number, lng: number}>(async (resolve, reject) => {
          try {
            let lat, lng;
            if (Capacitor.isNativePlatform()) {
              const permission = await Geolocation.checkPermissions();
              if (permission.location !== 'granted') {
                const req = await Geolocation.requestPermissions();
                if (req.location !== 'granted') throw new Error("Permission denied");
              }
              const position = await Geolocation.getCurrentPosition({ timeout: 15000, enableHighAccuracy: true });
              lat = position.coords.latitude;
              lng = position.coords.longitude;
            } else {
              if (!navigator.geolocation) throw new Error("No geolocation support");
              const position = await new Promise<GeolocationPosition>((res, rej) => {
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 15000, enableHighAccuracy: true });
              });
              lat = position.coords.latitude;
              lng = position.coords.longitude;
            }
            resolve({lat, lng});
          } catch (err) {
            reject(err);
          }
        });

        // 竞速法则：谁快先用谁 (大概率 IP 定位 0.2秒抢跑)
        const fastestData: any = await Promise.race([
          hardwarePromise.catch(() => null), // 防止硬件错误导致 Promise 失败退出
          networkPromise.catch(() => null)
        ]);

        if (fastestData) {
          const lat = fastestData.latitude || fastestData.lat;
          const lng = fastestData.longitude || fastestData.lng;
          if (lat && lng) {
            setUserLocation({ lat, lng });
          }
          if (fastestData.city) {
            setLocationName(fastestData.city);
            localStorage.setItem('gx_last_city', fastestData.city);
          }
        }

        // 无论谁赢，静默等待卫星高精度定位完成，用米级坐标无缝覆盖粗略坐标
        const preciseLoc = await hardwarePromise;
        if (preciseLoc) {
          setUserLocation({ lat: preciseLoc.lat, lng: preciseLoc.lng });
          localStorage.setItem('gx_last_location', JSON.stringify({ lat: preciseLoc.lat, lng: preciseLoc.lng }));

          // 获取高精度城市名称
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${preciseLoc.lat}&lon=${preciseLoc.lng}&zoom=10&addressdetails=1`, {
                headers: { 'Accept-Language': 'zh-CN,en-US;q=0.9' }
            });
            const geoData = await geoRes.json();
            const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county || "未知位置";
            setLocationName(city);
            localStorage.setItem('gx_last_city', city);
          } catch {
            // 静默失败，保持现有城市显示
          }
        }

      } catch (error: any) {
        console.warn("Triple-Tier Geolocation Error:", error.message);
        // 只有在没缓存、没网、没卫星的死地，才走降级
        if (!localStorage.getItem('gx_last_location')) {
          setIsLocationDenied(true);
          setLocationName("定位失败");
          setUserLocation({ lat: 45.4642, lng: 9.1900 }); // Milan fallback
        }
      }
    };

    fetchLocation();
  }, []);

  // 2. 构建 SWR 查询 Key (当参数变化时自动重新发起请求)
  const queryKey = useMemo(() => {
    if (!userLocation || activeTab !== "merchant") return null;
    const params = new URLSearchParams({
      lat: userLocation.lat.toString(),
      lng: userLocation.lng.toString(),
      category: activeCategory,
      subCategory: activeSubCategory,
      sortBy: sortBy,
      ...(searchQuery ? { q: searchQuery } : {})
    });
    return `/api/places?${params.toString()}`;
  }, [userLocation, activeTab, activeCategory, activeSubCategory, sortBy, searchQuery]);

  // 3. SWR 核心接管：并发请求与 Edge Cache 支持
  const { data: placesData, error: placesError, isLoading: isPlacesLoading } = useSWR(
    queryKey,
    fetcher,
    {
      revalidateOnFocus: false, // 防止切换窗口时过度刷新
      dedupingInterval: 60000, // 1分钟内相同的请求会被去重
      keepPreviousData: true, // 在请求新数据时保留旧数据，防止闪烁
    }
  );

  // 4. 监听 SWR 数据并映射为视图模型
  useEffect(() => {
    if (isPlacesLoading) {
      // 只有在没有缓存的首次加载时才显示骨架屏
      if (!placesData) setIsAggregating(true);
      return;
    }

    setIsAggregating(false);

    if (placesData && placesData.places) {
      const placesWithImages: AggregatedPlace[] = placesData.places
        .filter((place: PlacesApiPlace) => !isMockMode || place.photoName) // 在 Mock 模式下保留原逻辑，真实模式下不再过滤无图商家
        .map((place: PlacesApiPlace) => {
        
        // 距离已经在后端计算好，这里直接使用，或者保留客户端计算作为 fallback
        const distance = (place.lat !== undefined && place.lng !== undefined && userLocation) 
          ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, place.lat, place.lng) 
          : "999km";
        
        const coverImage = place.photoName 
          ? `/api/photo?name=${encodeURIComponent(place.photoName)}`
          : "HOLOGRAPHIC_PLACEHOLDER";
        
        return {
          ...place,
          distance,
          image: coverImage,
          isRealGooglePhoto: !!place.photoName,
          ugcImages: [] // 强制清空 UGC 数组，不再使用本地虚拟图片
        };
      });
      
      setAggregatedPlaces(placesWithImages);
      setTargetCount(Math.max(6, Math.ceil(6 / columns) * columns));
      setIsMockMode(false);
    } else if (placesError) {
      console.error("Error fetching Google Places via SWR:", placesError);
      const fallbackPlaces: AggregatedPlace[] = MOCK_GOOGLE_PLACES.map((p) => ({
        ...p,
        image: MOCK_IMAGES.all[0],
        isRealGooglePhoto: false,
        ugcImages: []
      }));
      setAggregatedPlaces(fallbackPlaces);
      setTargetCount(Math.max(6, Math.ceil(6 / columns) * columns));
      setIsMockMode(true);
    }
  }, [placesData, placesError, isPlacesLoading, columns, userLocation, isMockMode]);

  return (
    <>
      <main className={cn(
        "min-h-screen bg-transparent text-white relative overflow-x-hidden pb-6 transition-all duration-500",
        selectedShop && "scale-95 blur-sm opacity-50 pointer-events-none"
      )}>
        
        <div className="w-full px-[clamp(16px,4vw,64px)] pt-6 relative z-10 space-y-[clamp(24px,4vw,40px)]">
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
            onClick={() => {
              if (isLocationDenied) {
                setShowRecoveryModal(true);
              } else {
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 md:gap-2 group cursor-pointer pb-1 max-w-[45vw] sm:max-w-[200px]"
          >
            <MapPin className={cn(
              "w-[clamp(14px,3vw,20px)] h-[clamp(14px,3vw,20px)] shrink-0 transition-colors",
              isLocationDenied ? "text-red-500 group-hover:text-red-400" : "text-gx-cyan group-hover:text-gx-cyan"
            )} />
            <span className={cn(
              "text-[clamp(12px,2.5vw,16px)] whitespace-nowrap truncate font-bold transition-colors",
              isLocationDenied ? "text-red-500/80 group-hover:text-red-400" : "text-white/60 group-hover:text-white"
            )}>
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
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearchQuery(inputValue);
                    }
                  }}
                  placeholder={t("searchPlaceholder")} 
                  className="flex-1 bg-transparent h-full pl-3 pr-4 text-sm font-light focus:outline-none text-white placeholder:text-white/30"
                />
              </div>
              
              {/* 右侧渐变赛博指令字 */}
              <button 
                onClick={() => setSearchQuery(inputValue)}
                className="h-full px-4 flex items-center justify-center transition-all active:scale-95"
              >
                <span className="text-sm font-bold bg-gradient-to-r from-gx-cyan to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] group-focus-within:drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]">
                  {t("search")}
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
              onMouseEnter={() => {
                // 微观预判：鼠标悬停时立刻静默拉取数据
                if (userLocation && activeTab !== "merchant") {
                  const params = new URLSearchParams({
                    lat: userLocation.lat.toString(),
                    lng: userLocation.lng.toString(),
                    category: activeCategory === "all" ? "attraction" : activeCategory,
                    subCategory: activeSubCategory,
                    sortBy: sortBy,
                    ...(searchQuery ? { q: searchQuery } : {})
                  });
                  preload(`/api/places?${params.toString()}`, fetcher);
                }
              }}
              onTouchStart={() => {
                // 移动端微观预判：手指触碰瞬间立刻静默拉取
                if (userLocation && activeTab !== "merchant") {
                  const params = new URLSearchParams({
                    lat: userLocation.lat.toString(),
                    lng: userLocation.lng.toString(),
                    category: activeCategory === "all" ? "attraction" : activeCategory,
                    subCategory: activeSubCategory,
                    sortBy: sortBy,
                    ...(searchQuery ? { q: searchQuery } : {})
                  });
                  preload(`/api/places?${params.toString()}`, fetcher);
                }
              }}
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
                {t("tabs.merchant")}
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
              onClick={() => setActiveTab('gx_pro')}
              className={cn(
                "relative flex flex-col items-center gap-1 group transition-all duration-500 shrink-0",
                activeTab === "gx_pro" ? "scale-105" : "opacity-60 hover:opacity-100"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-[clamp(14px,3.5vw,18px)] font-black tracking-[clamp(1px,0.5vw,2px)] whitespace-nowrap transition-all duration-500",
                  activeTab === "gx_pro"
                    ? "bg-gradient-to-r from-yellow-100 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]"
                    : "text-white/80"
                )}>
                  {t("tabs.service")}
                </span>
                <Sparkles className={cn(
                  "w-[clamp(12px,3vw,14px)] h-[clamp(12px,3vw,14px)] shrink-0 transition-all duration-500",
                  activeTab === "gx_pro"
                    ? "text-yellow-300 drop-shadow-[0_0_12px_rgba(255,215,0,1)]"
                    : "text-white/50"
                )} />
              </div>
              <span className="text-[clamp(8px,2vw,9px)] whitespace-nowrap font-mono text-yellow-400/80 tracking-widest">GX PRO</span>
              {activeTab === "gx_pro" && (
                <motion.div 
                  layoutId="trinityIndicator"
                  className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full shadow-[0_0_12px_rgba(255,215,0,1)]"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,1), transparent)' }}
                />
              )}
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
                {t("tabs.third")}
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
                    // 彻底干掉二级分类，选中一级分类后直接触发该大类的综合搜索
                    setActiveSubCategory("all");
                    setSearchQuery("");
                    setInputValue("");
                  }}
                  onMouseEnter={() => {
                    // 预加载幽灵机制 (Hover Prefetching)
                    if (!userLocation) return;
                    const params = new URLSearchParams({
                      lat: userLocation.lat.toString(),
                      lng: userLocation.lng.toString(),
                      category: cat.id,
                      subCategory: "all",
                      sortBy: sortBy,
                      ...(searchQuery ? { q: searchQuery } : {})
                    });
                    preload(`/api/places?${params.toString()}`, fetcher);
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
                        ? (cat.id === "all" && activeTab === "gx_pro"
                          ? "drop-shadow-[0_0_12px_rgba(255,215,0,0.8)] text-yellow-400 scale-110"
                          : "drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] text-gx-cyan scale-110")
                        : "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] group-hover/btn:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold tracking-widest whitespace-nowrap transition-all duration-500 relative z-10",
                    activeCategory === cat.id 
                      ? (cat.id === "all" && activeTab === "gx_pro"
                        ? "bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]"
                        : "bg-gradient-to-r from-white via-cyan-100 to-white/60 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]")
                      : "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] group-hover/btn:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  )}>
                    {cat.id === "all" && activeTab === "gx_pro" ? "全部" : t(`categories.${cat.id}`)}
                  </span>
                </div>
                
                {/* 底部能量注入游标 (液态张力) */}
                {activeCategory === cat.id && (
                  <motion.div 
                    layoutId="activeCategoryIndicator"
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className={cn(
                      "absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full",
                      cat.id === "all" && activeTab === "gx_pro"
                        ? "shadow-[0_0_12px_rgba(255,215,0,1)]"
                        : "shadow-[0_0_12px_rgba(0,240,255,1)]"
                    )}
                    style={{
                      background: cat.id === "all" && activeTab === "gx_pro"
                        ? 'linear-gradient(90deg, transparent, rgba(255,215,0,1), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(0,240,255,1), transparent)'
                    }}
                  />
                )}
              </button>
            ))}
            </motion.div>
          </div>
        </div>

        {/* Sub Categories (Level 2) - 已废弃传统横向菜单，采用极简场景微标签架构 */}
        {/* 保留占位但不再渲染，后续可接入 Micro-Tags 场景胶囊 */}

        {/* Content Grid (Google Places Aggregation) */}
        {activeTab === "gx_pro" && (
          <div className="pt-0 flex flex-col items-center justify-start min-h-[50vh] w-full pb-20">
            {/* 顶部轮播广告位：GX PRO 全站展示 */}
            <div className="w-full mb-[clamp(32px,5vw,64px)]">
              <HolographicCarousel shops={carouselRealShops} onShopClick={setSelectedShop} />
            </div>
            
            {/* 下方货架区：所有入驻商家的静态卡片瀑布流 */}
            <div className="w-full">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-[clamp(16px,2vw,24px)]">
                {listRealShops.map((shop, idx) => (
                  <GxProCard 
                    key={`gxpro-list-${shop.id}`} 
                    shop={shop} 
                    index={idx} 
                    onClick={() => setSelectedShop(shop)} 
                  />
                ))}
              </div>
              
              {listRealShops.length === 0 && (
                <div className="p-12 flex items-center justify-center text-white/30 font-mono text-sm tracking-widest mt-10">
                  NO GX PRO NODES FOUND
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "merchant" && (
          <div className="pt-0" ref={gridContainerRef}>

            {/* The Command Nexus: 排序栏已废弃，默认采用 POPULARITY 确保 Google 检索质量 */}

            {/* 核心升级：全息流体景深堆叠轮播 (Holographic Depth Stack Carousel) - 广告位全站竞价展示 */}
            {carouselRealShops.length > 0 && (
              <div className="mb-[clamp(32px,5vw,64px)] w-full">
                <HolographicCarousel shops={carouselRealShops} onShopClick={setSelectedShop} />
              </div>
            )}

            {isAggregating ? (
              // 骨架屏 Skeleton
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-[clamp(16px,2vw,24px)]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden animate-pulse">
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
              <div className="space-y-[clamp(32px,5vw,64px)] pb-20">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-[clamp(16px,2vw,24px)]">
                  
                  {/* 强制置顶：GX PRO 入驻商家 (瀑布流严格隔离分类) */}
                  {listRealShops.map((shop, idx) => (
                    <GxProCard 
                      key={`list-top-${shop.id}`} 
                      shop={shop} 
                      index={idx} 
                      onClick={() => setSelectedShop(shop)} 
                    />
                  ))}

                  {/* 谷歌抓取商家 */}
                  {aggregatedPlaces.slice(0, displayCount).map((place, idx) => (
                    <motion.div
                      key={place.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (idx % 5) * 0.05 }}
                      onClick={() => handleOpenMaps(place.name)}
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
                            {place.image === "HOLOGRAPHIC_PLACEHOLDER" ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gx-cyan/10 via-purple-900/20 to-black overflow-hidden group-hover:scale-105 transition-all duration-700">
                                {/* AI 流光占位特效 */}
                                <div className="absolute inset-0 bg-[length:200%_auto] animate-[shimmer_8s_linear_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                                <div className="flex flex-col items-center gap-2 z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <div className="w-10 h-10 rounded-full border border-gx-cyan/30 flex items-center justify-center bg-black/40 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                                    <Sparkles className="w-5 h-5 text-gx-cyan animate-pulse" />
                                  </div>
                                  <span className="text-[10px] font-mono tracking-[0.2em] font-bold text-gx-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">UNCLAIMED NODE</span>
                                  <span className="text-[8px] font-mono tracking-widest text-white/40">AWAITING OWNER</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* 流光渐变底座 (Image Placeholder) - 防止黑框，提供加载时的赛博质感 */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-gx-cyan/10 to-transparent animate-pulse" />
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
                                  onLoadingComplete={(result) => {
                                    // 图片加载完成时，如果有需要可以做额外动画，这里配合 className 的 transition 已经足够平滑
                                    result.classList.remove('opacity-0');
                                  }}
                                />
                              </>
                            )}
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
                             <span className="text-[10px] font-bold text-white/50 tracking-widest group-hover/upload:text-gx-cyan transition-colors uppercase">{t("uploadRealPhoto")}</span>
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

              {/* 极致降噪版无限加载底座：嵌入卡片与横幅缝隙的隐形文字 */}
              <div ref={loadMoreRef} className="w-full flex justify-center py-2 relative z-10">
                <span className="text-[9px] font-mono tracking-[0.3em] uppercase font-bold text-white/20 transition-colors cursor-default">
                  DATA POWERED BY <span className="text-cyan-600/40">GOOGLE LBS</span>
                </span>
                {/* 极简加载状态指示器 (仅在还有数据时显示) */}
                {displayCount < aggregatedPlaces.length && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-[calc(50%-110px)] w-3 h-3 border border-white/10 border-t-gx-cyan/50 rounded-full animate-spin opacity-50" />
                )}
              </div>
              
              {/* 商家入驻招募横幅 (Merchant Onboarding Banner) - 全息去背 HUD 版 (Holographic Border Glow) */}
              {user && !('applicationStatus' in user && (user.applicationStatus === 'pending' || user.applicationStatus === 'approved')) && user.role !== 'merchant' && user.role !== 'boss' && (
                <div className="pt-2 pb-6 px-2 -mt-1">
                  <HoloAscensionCard onClick={() => {
                    if (!user) {
                      router.push(`/login?next=${encodeURIComponent('/dashboard?action=onboard')}`);
                    } else {
                      router.push('/dashboard?action=onboard');
                    }
                  }} />
                </div>
              )}
              {!user && (
                <div className="pt-2 pb-6 px-2 -mt-1">
                  <HoloAscensionCard onClick={() => {
                    router.push(`/login?next=${encodeURIComponent('/dashboard?action=onboard')}`);
                  }} />
                </div>
              )}

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
      </div>

      {/* 定位恢复：全息锁孔引导舱 (Holographic Unlock Matrix) */}
      <AnimatePresence>
        {showRecoveryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowRecoveryModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-black/60 border border-red-500/30 rounded-3xl p-8 overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center text-center"
            >
              {/* 装饰光效 */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
              
              <button 
                onClick={() => setShowRecoveryModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-black text-white tracking-widest mt-4 mb-8 uppercase">
                {t('txt_a92d4f') || '卫星连接遭拒'}
              </h2>

              {/* 全息浏览器地址栏骨架模拟 (Holographic Browser UI) */}
              <div className="w-full max-w-[280px] mb-8 flex flex-col gap-2 relative z-10">
                {/* 伪地址栏 */}
                <div className="relative flex items-center justify-center h-12 w-full bg-white/5 border border-white/10 rounded-xl overflow-hidden shrink-0">
                  
                  {/* 左侧固定区：锁图标与点击波纹 */}
                  <div className="absolute left-4 flex items-center justify-center w-6 h-6">
                    <div className="relative flex items-center justify-center">
                      <Lock className="w-4 h-4 text-gx-cyan relative z-10" />
                      {/* 锁图标的呼吸光晕 */}
                      <div className="absolute inset-0 bg-gx-cyan/30 blur-md rounded-full animate-pulse" />
                      
                      {/* 点击波纹光圈 (以锁为绝对圆心扩散) */}
                      <motion.div 
                        className="absolute inset-0 rounded-full border border-white/40 bg-white/10"
                        animate={{ scale: [0.5, 2, 2], opacity: [0, 1, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", times: [0, 0.2, 0.5] }}
                      />
                    </div>
                  </div>

                  {/* 绝对居中区：域名文本 */}
                  <span className="text-xs font-mono text-white/30 tracking-wider">
                    fx-rapallo.vercel.app
                  </span>
                </div>

                {/* 下拉权限菜单模拟 - 回归文档流物理占位 */}
                <motion.div 
                  className="w-full max-w-[192px] ml-2 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-2xl p-3 flex flex-col gap-3 text-left origin-top-left shrink-0 relative z-20"
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.95, 1, 1, 0.95] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.8, 1] }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/80 flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {t('txt_6f7f8f')}
                    </span>
                    {/* 模拟开关 Toggle 被打开 */}
                    <div className="w-7 h-4 rounded-full bg-gx-cyan/20 p-0.5 flex items-center justify-end border border-gx-cyan/50">
                      <div className="w-3 h-3 rounded-full bg-gx-cyan shadow-[0_0_5px_#00f2ff]" />
                    </div>
                  </div>
                </motion.div>
              </div>

              <p className="text-xs text-white/60 font-mono tracking-widest mb-6">
                {t('txt_15c54d')}
              </p>

              <button 
                onClick={() => window.location.reload()}
                className="w-full relative group overflow-hidden bg-red-500/10 border border-red-500/30 rounded-xl p-4 transition-all hover:border-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <div className="relative z-10 flex items-center justify-center gap-2 text-red-500 font-bold tracking-widest">
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span>{t('txt_refresh')}</span>
                </div>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MapRouterModal isOpen={showMapModal} onChoice={handleMapModalChoice} />
    </main>
    <ShopDetailOverlay shop={selectedShop} onClose={() => setSelectedShop(null)} />
    </>
  );
}
