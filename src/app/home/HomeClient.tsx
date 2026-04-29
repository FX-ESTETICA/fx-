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
export function getMockPlaces(): Array<PlacesApiPlace & { distance: string }> {
 return [
 { id: "gp_1", name: "Cyber Cafe", rating: 4.8, user_ratings_total: 342, distance: "0.8km", status: "OPEN", category: "dining" },
 { id: "gp_2", name: "Neon Bar", rating: 4.9, user_ratings_total: 128, distance: "1.2km", status: "OPEN", category: "dining" },
 { id: "gp_3", name: "Sushi Blade", rating: 4.5, user_ratings_total: 856, distance: "2.5km", status: "READY", category: "dining" },
 { id: "gp_4", name: "Quantum Salon", rating: 5.0, user_ratings_total: 64, distance: "1.5km", status: "OPEN", category: "beauty" },
 { id: "gp_5", name: "Aero Spa", rating: 4.7, user_ratings_total: 210, distance: "3.1km", status: "OPEN", category: "beauty" },
 { id: "gp_6", name: "Nexus Hotel", rating: 4.6, user_ratings_total: 1205, distance: "4.2km", status: "OPEN", category: "hotel" },
 ];
}

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
import { useVisualSettings } from "@/hooks/useVisualSettings";

export function HomeClient({ initialRealShops, isActive = true }: { initialRealShops: any[], isActive?: boolean }) {
 const t = useTranslations("Home");
 const { openGoogleMaps, showMapModal, handleMapModalChoice } = useMapRouter();
 const router = useRouter();
 const { user } = useAuth();
 const { settings: visualSettings } = useVisualSettings();
 const isLight = visualSettings.frontendBgIndex >= 1;

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
 
 // 【Local-First 引擎】：从本地硬盘光速读取大厅商户缓存
 const getCachedRealShops = () => {
 if (typeof window === 'undefined') return [];
 try {
 const cached = localStorage.getItem('gx_home_real_shops');
 return cached ? JSON.parse(cached) : [];
 } catch (e) {
 return [];
 }
 };

 const [realShops, setRealShops] = useState<any[]>(() => {
 // 如果 SSR 提供了数据，优先使用 SSR 数据，并静默更新本地缓存
 if (initialRealShops && initialRealShops.length > 0) {
 if (typeof window !== 'undefined') {
 localStorage.setItem('gx_home_real_shops', JSON.stringify(initialRealShops));
 }
 return initialRealShops;
 }
 // 否则尝试从本地硬盘光速读取缓存
 return getCachedRealShops();
 });

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
 .eq('nebula_status', 'active') // 1. 必须是 active 状态
 .not('config', 'is', null) // 2. config 不能为 null
 .not('maps_link', 'is', null) // 3. 必须配置了物理地址（这通常是在“装修门店”中填写的）
 .order('created_at', { ascending: false });
 
 if (!error && data) {
 // 4. 进一步过滤：必须要有封面图才能上大厅
 const validShops = data.filter(shop => {
 const config = shop.config as any;
 return config && config.coverImages && config.coverImages.length > 0;
 });
 setRealShops(validShops);
 // 成功拉取后，静默更新本地硬盘缓存，供下次秒开
 if (typeof window !== 'undefined') {
 localStorage.setItem('gx_home_real_shops', JSON.stringify(validShops));
 }
 } else if (error) {
 // 断网防御：如果获取失败且本地有缓存，静默失败，保留已有缓存
 if (error.message?.includes('Failed to fetch') || error.message?.includes('AbortError')) {
 console.warn("[Local-First Shield] Network offline, preserving cached real shops data.");
 } else {
 throw error;
 }
 }
 } catch (err) {
 console.error("Failed to fetch real shops", err);
 }
 };
 // 只有在 SSR 没数据，且本地缓存也没有数据的情况下，或者为了强制更新，才去请求
 // 这里我们保持原逻辑：如果 initialRealShops 为空就去请求兜底
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
 const minRequired = Math.max(6, currentCount);
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
 
 const [locationName, setLocationName] = useState(t('locating'));
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
 // 穹顶第二层：边缘基站 (Vercel Edge IP解析，0成本0跨域，无极并发)
 const networkPromise = fetch('/api/geo').then(r => r.json());

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
 if (preciseLoc) {
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
 }

 } catch (error: any) {
 console.warn("Triple-Tier Geolocation Error:", error.message);
 // 只有在没缓存、没网、没卫星的死地，才走降级
 if (!localStorage.getItem('gx_last_location')) {
 setIsLocationDenied(true);
 setLocationName(t('txt_3d1c77') || "重启定位"); // 完美降维：不再显示具体的错误城市，而是显示赛博提示
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

 // 【Local-First 引擎】：从本地硬盘光速读取附近商家缓存
 const getCachedPlacesData = (key: string | null) => {
 if (typeof window === 'undefined' || !key) return undefined;
 try {
 const cached = localStorage.getItem(`gx_places_${key}`);
 return cached ? JSON.parse(cached) : undefined;
 } catch (e) {
 return undefined;
 }
 };

 // 3. SWR 核心接管：并发请求与 Edge Cache 支持，并挂载 Local-First 硬盘备份引擎
 const { data: placesData, error: placesError, isLoading: isPlacesLoading } = useSWR(
 queryKey,
 fetcher,
 {
 revalidateOnFocus: false, // 防止切换窗口时过度刷新
 dedupingInterval: 60000, // 1分钟内相同的请求会被去重
 keepPreviousData: true, // 在请求新数据时保留旧数据，防止闪烁
 fallbackData: getCachedPlacesData(queryKey), // 物理秒开：0毫秒同步灌入上次硬盘缓存
 onSuccess: (data) => {
 // 成功拉取到最新数据后，静默覆写到本地硬盘，供下次秒开
 if (typeof window !== 'undefined' && data && queryKey) {
 localStorage.setItem(`gx_places_${queryKey}`, JSON.stringify(data));
 }
 },
 onError: (err) => {
 // 断网防御：如果报错是因为网络问题，且本地有缓存，静默忽略以保留 fallbackData
 if (err.message?.includes('Failed to fetch') || err.message?.includes('AbortError')) {
 console.warn("[Local-First Shield] Network offline, preserving cached places data.");
 }
 }
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
 const fallbackPlaces: AggregatedPlace[] = getMockPlaces().map((p) => ({
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
 "min-h-[100dvh] bg-transparent relative overflow-x-hidden pb-6 ",
 isLight ? "text-black" : "text-white",
 selectedShop && "scale-95 pointer-events-none"
 )}>
 
 <div className="w-full px-[clamp(16px,4vw,64px)] pt-[var(--sat)] relative z-10 space-y-[clamp(24px,4vw,40px)]">
 {/* Top Info Bar - Brand Identity & LBS Dual Wing */}
 <div className="flex justify-between items-end px-2 mb-2">
 {/* Left Wing - Core Brand Display (Optical Refraction & Holographic Glow) */}
 <motion.div 
 
 
 className="flex items-center select-none mix-blend-screen shrink-0"
 >
 <div className="inline-flex items-baseline gap-1.5 md:gap-2 justify-center">
 <span className={cn("text-[clamp(20px,5vw,30px)] whitespace-nowrap font-black tracking-tighter", isLight ? "text-black" : "text-white")}>
 GX<span className={cn("align-super text-[clamp(14px,3vw,20px)]", isLight ? "text-black" : "text-white")}>⁺</span>
 </span>
 {/* 标题 */}
 <span className={cn("text-[clamp(16px,4vw,24px)] whitespace-nowrap font-black tracking-tighter", isLight ? "text-black" : "text-white")}>
 {t('txt_b05e70')}</span>
 </div>
 </motion.div>

 {/* Right Wing - Location Info (Truncate 防爆保护) */}
 <motion.div 
 
 
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
 "w-[clamp(14px,3vw,20px)] h-[clamp(14px,3vw,20px)] shrink-0 ",
 isLight ? "text-black" : "text-white"
 )} />
 <span className={cn(
 "text-[clamp(12px,2.5vw,16px)] whitespace-nowrap truncate ",
 isLight ? "text-black" : "text-white"
 )}>
 {locationName}
 </span>
 <ChevronRight className={cn(
 "w-[clamp(12px,2vw,16px)] h-[clamp(12px,2vw,16px)] shrink-0 ",
 isLight ? "text-black" : "text-white"
 )} />
 </motion.div>
 </div>

 {/* 史解绑搜索与模式切换，恢复逻辑层级 */}
 <header className="flex flex-col items-center gap-0">
 {/* 第一层：超维流光中枢 (Hyper-Glow Nexus) - 纯物理镂空 */}
 <motion.div 
 
 
 className="w-full relative group"
 >
 {/* 极简边框层 */}
 <div 
 className={cn("absolute inset-0 rounded-full group-focus-within:opacity-100 pointer-events-none border", isLight ? "border-black/30" : "border-white/30")}
 />

 {/* 物理内容层 - 彻底没有任何 bg 色，纯通透 */}
 <div className="relative flex items-center h-[44px] px-2 z-10 bg-transparent">
 <div className="flex items-center flex-1 h-full pl-4">
 <Search className={cn("w-4 h-4 ", isLight ? "text-black group-focus-within:text-black" : "text-white group-focus-within:text-white")} />
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
 className={cn("flex-1 bg-transparent h-full pl-3 pr-4 text-sm font-light focus:outline-none", isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white")}
 />
 </div>
 
 {/* 右侧赛博指令字 */}
 <button 
 onClick={() => setSearchQuery(inputValue)}
 className="h-full px-4 flex items-center justify-center active:scale-95"
 >
 <span className={cn("text-sm ", isLight ? "text-black" : "text-white")}>
 {t("search")}
 </span>
 </button>
 </div>
 </motion.div>
 </header>

 {/* The Trinity Nexus: 终极三体枢纽 (采用 Clamp 流体排版 + 强制单行) */}
 <div className="flex justify-center -mt-3 relative z-20">
 
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
 "relative flex flex-col items-center gap-1 group shrink-0",
 activeTab === "merchant" ? "scale-105" : "scale-100"
 )}
 >
 <span className={cn(
 "text-[clamp(14px,3.5vw,18px)] tracking-[clamp(1px,0.5vw,2px)] whitespace-nowrap ",
 activeTab === "merchant" 
 ? (isLight ? "text-black font-black" : "text-white font-black")
 : (isLight ? "text-black font-normal" : "text-white font-normal")
 )}>
 {t("tabs.merchant")}
 </span>
 {isActive && activeTab === "merchant" && (
 <motion.div 
 
 className={cn("absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full", isLight ? "bg-black" : "bg-white")}
 />
 )}
 </button>

 <div className={cn("w-[1px] h-6 shrink-0", isLight ? "bg-black/20" : "bg-white/20")} />

 {/* 中核：GX 精选 */}
 <button 
 onClick={() => setActiveTab('gx_pro')}
 className={cn(
 "relative flex flex-col items-center gap-1 group shrink-0",
 activeTab === "gx_pro" ? "scale-105" : "scale-100"
 )}
 >
 <div className="flex items-center gap-1.5">
 <span className={cn(
 "text-[clamp(14px,3.5vw,18px)] tracking-[clamp(1px,0.5vw,2px)] whitespace-nowrap ",
 activeTab === "gx_pro"
 ? (isLight ? "text-black font-black" : "text-white font-black")
 : (isLight ? "text-black font-normal" : "text-white font-normal")
 )}>
 {t("tabs.service")}
 </span>
 <Sparkles className={cn(
 "w-[clamp(12px,3vw,14px)] h-[clamp(12px,3vw,14px)] shrink-0 ",
 activeTab === "gx_pro"
 ? (isLight ? "text-black" : "text-white")
 : (isLight ? "text-black" : "text-white")
 )} />
 </div>
 {isActive && activeTab === "gx_pro" && (
 <motion.div 
 
 className={cn("absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full", isLight ? "bg-black" : "bg-white")}
 />
 )}
 </button>

 <div className={cn("w-[1px] h-6 shrink-0", isLight ? "bg-black/20" : "bg-white/20")} />

 {/* 右翼：生活服务 */}
 <button 
 onClick={() => setActiveTab("service")}
 className={cn(
 "relative flex flex-col items-center gap-1 group shrink-0",
 activeTab === "service" ? "scale-105" : "scale-100"
 )}
 >
 <span className={cn(
 "text-[clamp(14px,3.5vw,18px)] tracking-[clamp(1px,0.5vw,2px)] whitespace-nowrap ",
 activeTab === "service" 
 ? (isLight ? "text-black font-black" : "text-white font-black")
 : (isLight ? "text-black font-normal" : "text-white font-normal")
 )}>
 {t("tabs.third")}
 </span>
 {isActive && activeTab === "service" && (
 <motion.div 
 
 className={cn("absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full", isLight ? "bg-black" : "bg-white")}
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
 drag={isActive ? "x" : false}
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
 "flex-shrink-0 flex flex-col items-center justify-center gap-2 min-w-[56px] h-[46px] rounded-xl relative group/btn",
 activeCategory === cat.id 
 ? (isLight ? "text-black" : "text-white")
 : (isLight ? "text-black" : "text-white")
 )}
 >
 <div className="relative flex flex-col items-center gap-2">
 <div className="relative">
 <cat.icon className={cn(
 "w-6 h-6 relative z-10",
 activeCategory === cat.id 
 ? (isLight ? "text-black scale-110" : "text-white scale-110")
 : (isLight ? "text-black scale-100" : "text-white scale-100")
 )} />
 </div>
 <span className={cn(
 "text-[11px] tracking-widest whitespace-nowrap relative z-10",
 activeCategory === cat.id 
 ? (isLight ? "text-black " : "text-white ")
 : (isLight ? "text-black font-normal" : "text-white font-normal")
 )}>
 {cat.id === "all" && activeTab === "gx_pro" ? "全部" : t(`categories.${cat.id}`)}
 </span>
 </div>
 
 {/* 底部能量注入游标 */}
 {isActive && activeCategory === cat.id && (
 <motion.div 
 
 
 className={cn(
 "absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full",
 isLight ? "bg-black" : "bg-white"
 )}
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
 <HolographicCarousel shops={carouselRealShops} onShopClick={setSelectedShop} isActive={isActive} />
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
 <div className={cn("p-12 flex items-center justify-center text-sm tracking-widest mt-10", isLight ? "text-black" : "text-white")}>
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
 <HolographicCarousel shops={carouselRealShops} onShopClick={setSelectedShop} isActive={isActive} />
 </div>
 )}

 {isAggregating ? (
 // 骨架屏 Skeleton
 <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-[clamp(16px,2vw,24px)]">
 {[1, 2, 3, 4, 5, 6].map((i) => (
 <div key={i} className={cn("rounded-3xl border overflow-hidden ", isLight ? "border-black/5 bg-black/5" : "border-white/5 bg-white/5")}>
 <div className={cn("aspect-[16/9]", isLight ? "bg-black/5" : "bg-white/5")} />
 <div className="p-5 space-y-4">
 <div className={cn("h-6 rounded-md w-3/4", isLight ? "bg-black/5" : "bg-white/5")} />
 <div className="flex gap-4">
 <div className={cn("h-4 rounded-md w-1/4", isLight ? "bg-black/5" : "bg-white/5")} />
 <div className={cn("h-4 rounded-md w-1/4", isLight ? "bg-black/5" : "bg-white/5")} />
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
 
 
 
 onClick={() => handleOpenMaps(place.name)}
 className="cursor-pointer"
 >
 <GlassCard 
 className="group p-0 overflow-hidden border-white/5 hover:border-white/20 "
 >
 <div className="relative aspect-[16/9] overflow-hidden">
 {/* Carousel Container */}
 <div className="flex w-full h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
 
 {/* Slide 1: Cover (Google or Mock) */}
 <div className="relative w-full h-full shrink-0 snap-start bg-transparent">
 {place.image === "HOLOGRAPHIC_PLACEHOLDER" ? (
 <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-white/5">
 <div className="flex flex-col items-center gap-2 z-10 ">
 <div className="w-10 h-10 rounded-full border flex items-center justify-center bg-black/40 border-white/30">
 <Sparkles className="w-5 h-5 text-white" />
 </div>
 <span className="text-[11px] tracking-[0.2em] text-white">{t('txt_fc724a')}</span>
 <span className="text-[11px] tracking-widest text-white">{t('txt_2fa2bd')}</span>
 </div>
 </div>
 ) : (
 <>
 {/* 极简占位底座 */}
 <div className="absolute inset-0 bg-white/5" />
 <Image
 src={place.image}
 alt={place.name}
 fill
 unoptimized={place.isRealGooglePhoto} // 针对动态 query 参数图片关闭内置优化以避免报错
 sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
 className={cn(
 "object-cover", // 恢复高不透明度，追求全彩高清的电影感
 place.isRealGooglePhoto && "saturate-[0.95]" // 极轻微的降饱和，保持真实感
 )}
 priority={idx < 4} // 前几个卡片优先加载
 loading={idx < 4 ? "eager" : "lazy"} // 核心：强制首页可见元素加载，防止滑动时被立刻 Abort
 onLoad={(e) => {
 // 图片加载完成时，如果有需要可以做额外动画，这里配合 className 的 已经足够平滑
 e.currentTarget.classList.remove('opacity-0');
 }}
 />
 </>
 )}
 {/* 顶级抖音级修复：放弃根据主题变色，永远使用极简深邃黑色渐变，保持文字纯白 */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
 </div>

 {/* Slide 2...N: UGC Images (Color Privilege) */}
 {place.ugcImages?.map((ugcImg: string, uIdx: number) => (
 <div key={uIdx} className="relative w-full h-full shrink-0 snap-start bg-transparent">
 <Image
 src={ugcImg}
 alt={`${place.name} UGC`}
 fill
 sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
 className="object-cover group-hover:opacity-80 "
 />
 <div className="absolute top-4 left-4 px-2 py-1 rounded border flex items-center gap-1.5 z-10 pointer-events-none bg-black/20 border-white/10">
 <span className="w-1.5 h-1.5 rounded-full bg-white" />
 <span className="text-[11px] tracking-widest uppercase text-white">{t('txt_3efb32')}</span>
 </div>
 </div>
 ))}

 {/* Last Slide: Upload UGC */}
 <div 
 className="relative w-full h-full shrink-0 snap-start flex flex-col items-center justify-center border-l group/upload bg-black/40 border-white/10 hover:bg-black/60"
 onClick={(e) => {
 e.stopPropagation();
 alert("UGC 照片上传功能即将开放");
 }}
 >
 <div className="w-12 h-12 rounded-full border flex items-center justify-center mb-3 bg-white/5 border-white/10 group-hover/upload:bg-white/10 group-hover/upload:border-white/30">
 <Camera className="w-5 h-5 text-white group-hover/upload:text-white" />
 </div>
 <span className="text-[11px] tracking-widest uppercase text-white group-hover/upload:text-white">{t("uploadRealPhoto")}</span>
 <span className="text-[11px] mt-1 text-white">{t('txt_de7277')}</span>
 </div>
 </div>

 {/* Swipe Hint */}
 <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-1 rounded border pointer-events-none bg-black/40 border-white/10">
 <span className="text-[11px] tracking-widest text-white">◂ SWIPE</span>
 </div>
 
 {/* 顶部标签 */}
 <div className="absolute top-4 right-4 flex gap-2 pointer-events-none">
 <div className={cn(
 "px-3 py-1 rounded-full text-[11px] tracking-widest border",
 place.status === "OPEN" ? "bg-white/10 border-white/20 text-white" : "bg-black/40 border-white/20 text-white"
 )}>
 {place.status === "OPEN" ? "🟢 OPEN" : "CLOSED"}
 </div>
 </div>

 {/* 底部信息与行动栏 - 100% 无界融合在渐变暗场中 */}
 <div className="absolute bottom-0 left-0 right-0 pointer-events-none flex flex-col justify-end p-5 gap-3">
 {/* 店名与评分区 */}
 <div className="flex flex-col gap-2">
 <h3 className="text-xl tracking-tighter uppercase line-clamp-1 text-white">{place.name}</h3>
 
 <div className="flex items-center justify-between w-full">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-1 text-sm text-white">
 <span>★</span>
 <span>{place.rating}</span>
 <span className="text-[11px] font-normal text-white">({place.user_ratings_total})</span>
 </div>
 <div className="w-1 h-1 rounded-full bg-white/40" />
 <div className="flex items-center gap-1 text-[11px] text-white">
 <MapPin className="w-3 h-3" />
 <span>{place.distance}</span>
 </div>
 </div>
 </div>
 </div>
 
 {/* 行动栏 - 完美融入 */}
 <div className="flex items-center justify-between mt-1 pt-3 border-t relative z-10 pointer-events-auto border-white/10">
 <span className="text-[11px] uppercase tracking-widest text-white">
 {place.category} / GOOGLE MAPS
 </span>
 <div className="flex items-center gap-2 text-[11px] group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 text-white">
 <span>{t('txt_306058')}</span>
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
 <span className={cn("text-[11px] tracking-[0.3em] uppercase cursor-default", isLight ? "text-black" : "text-white")}>
 {t('txt_d5b619')}<span>{t('txt_afb9fb')}</span>
 </span>
 {/* 极简加载状态指示器 (仅在还有数据时显示) */}
 {displayCount < aggregatedPlaces.length && (
 <div className={cn("absolute top-1/2 -translate-y-1/2 right-[calc(50%-110px)] w-3 h-3 border rounded-full animate-spin ", isLight ? "border-black/10 border-t-black/50" : "border-white/10 border-t-white/50")} />
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
 <div className={cn("py-20 text-center text-sm tracking-widest flex flex-col items-center gap-4", isLight ? "text-black" : "text-white")}>
 <Zap className={cn("w-12 h-12 mb-4 ", isLight ? "text-black" : "text-white")} />
 <p>{t('txt_6821d6')}</p>
 <p className="text-[11px]">{t('txt_c76b02')}</p>
 </div>
 )}
 </div>

 {/* 定位恢复：全息锁孔引导舱 (Holographic Unlock Matrix) */}
 <AnimatePresence>
 {showRecoveryModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <motion.div 
 
 
 
 className={cn("absolute inset-0 ", isLight ? "bg-white/80" : "bg-black/80")}
 onClick={() => setShowRecoveryModal(false)}
 />
 <motion.div
 
 
 
 className={cn("relative w-full max-w-sm border rounded-3xl p-8 overflow-hidden flex flex-col items-center text-center", isLight ? "bg-white/60 border-black/10" : "bg-black/60 border-white/10")}
 >
 
 <button 
 onClick={() => setShowRecoveryModal(false)}
 className={cn("absolute top-4 right-4 ", isLight ? "text-black hover:text-black" : "text-white hover:text-white")}
 >
 <X className="w-5 h-5" />
 </button>

 <h2 className={cn("text-xl font-black tracking-widest mt-4 mb-8 uppercase", isLight ? "text-black" : "text-white")}>
 {t('txt_a92d4f') || '重启定位'}
 </h2>

 {/* 全息浏览器地址栏骨架模拟 (Holographic Browser UI) */}
 <div className="w-full max-w-[280px] mb-8 flex flex-col gap-2 relative z-10">
 {/* 伪地址栏 */}
 <div className={cn("relative flex items-center justify-center h-12 w-full rounded-xl overflow-hidden shrink-0 border", isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")}>
 
 {/* 左侧固定区：锁图标与点击波纹 */}
 <div className="absolute left-4 flex items-center justify-center w-6 h-6">
 <div className="relative flex items-center justify-center">
 <Lock className={cn("w-4 h-4 relative z-10", isLight ? "text-black" : "text-white")} />
 <div className={cn("absolute inset-0 rounded-full ", isLight ? "bg-black/10" : "bg-white/10")} />
 
 {/* 点击波纹光圈 (以锁为绝对圆心扩散) */}
 <motion.div 
 className={cn("absolute inset-0 rounded-full border", isLight ? "border-black/40 bg-black/10" : "border-white/40 bg-white/10")}
 
 
 />
 </div>
 </div>

 {/* 绝对居中区：域名文本 */}
 <span className={cn("text-xs tracking-wider", isLight ? "text-black" : "text-white")}>
 fx-rapallo.vercel.app
 </span>
 </div>

 {/* 下拉权限菜单模拟 - 回归文档流物理占位 */}
 <motion.div 
 className={cn("w-full max-w-[192px] ml-2 border rounded-lg p-3 flex flex-col gap-3 text-left origin-top-left shrink-0 relative z-20", isLight ? "bg-white/90 border-black/10" : "bg-black/90 border-white/10")}
 
 
 >
 <div className="flex items-center justify-between">
 <span className={cn("text-[11px] flex items-center gap-2", isLight ? "text-black" : "text-white")}>
 <MapPin className="w-3 h-3" />
 {t('txt_6f7f8f')}
 </span>
 {/* 模拟开关 Toggle 被打开 */}
 <div className={cn("w-7 h-4 rounded-full p-0.5 flex items-center justify-end border", isLight ? "bg-black/20 border-black/50" : "bg-white/20 border-white/50")}>
 <div className={cn("w-3 h-3 rounded-full", isLight ? "bg-black" : "bg-white")} />
 </div>
 </div>
 </motion.div>
 </div>

 <p className={cn("text-xs tracking-widest mb-6", isLight ? "text-black" : "text-white")}>
 {t('txt_15c54d')}
 </p>

 <button 
 onClick={() => window.location.reload()}
 className={cn("w-full relative group overflow-hidden border rounded-xl p-4 ", isLight ? "bg-black/5 border-black/10 hover:border-black/30" : "bg-white/5 border-white/10 hover:border-white/30")}
 >
 <div className="relative z-10 flex items-center justify-center gap-2 tracking-widest">
 <RefreshCw className={cn("w-5 h-5 group-hover:rotate-180 ", isLight ? "text-black" : "text-white")} />
 <span className={isLight ? "text-black" : "text-white"}>{t('txt_refresh')}</span>
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
