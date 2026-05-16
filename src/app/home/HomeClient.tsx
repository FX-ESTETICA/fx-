"use client";

import { motion, AnimatePresence } from "framer-motion";
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
 ChevronRight,
 Moon,
 Dumbbell,
 Search,
 Martini,
 Zap,
 Lock,
 RefreshCw,
 X
} from "lucide-react";
import { useState, useEffect } from "react";

import { cn } from "@/utils/cn";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

import { useRouter } from "next/navigation";

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



// 优选商城 Mock 数据 (移出组件外部，避免重复声明)
const MOCK_MALL_PRODUCTS = [
  {
    id: "p1",
    name: "星空磨砂美甲套盒",
    price: 299,
    sales: "100+",
    shopName: "FX ESTETICA",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
    tag: "GX PRO 官方认证"
  },
  {
    id: "p2",
    name: "Lumina 抗老面霜",
    price: 899,
    sales: "500+",
    shopName: "Lumina 医美中心",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop",
    tag: "包邮"
  },
  {
    id: "p3",
    name: "极简碳纤维运动水壶",
    price: 129,
    sales: "2k+",
    shopName: "Zenith 健身俱乐部",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=800&auto=format&fit=crop",
    tag: "新品"
  },
  {
    id: "p4",
    name: "手工冷萃咖啡豆 (250g)",
    price: 88,
    sales: "300+",
    shopName: "Neon Coffee Roasters",
    image: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=800&auto=format&fit=crop",
    tag: "热销"
  },
  {
    id: "p5",
    name: "深海海藻睡眠面膜",
    price: 199,
    sales: "800+",
    shopName: "Lumina 医美中心",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=800&auto=format&fit=crop",
    tag: "GX PRO 官方认证"
  },
  {
    id: "p6",
    name: "赛博朋克调酒套装",
    price: 459,
    sales: "50+",
    shopName: "午夜霓虹赛博酒馆",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=800&auto=format&fit=crop",
    tag: "限量"
  }
];



import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useVisualSettings } from "@/hooks/useVisualSettings";


export function HomeClient({ initialRealShops, isActive = true }: { initialRealShops: any[], isActive?: boolean }) {
 const t = useTranslations("Home");
 const router = useRouter();
 const { user } = useAuth();
 const { settings: visualSettings } = useVisualSettings();
 const isLight = visualSettings.frontendBgIndex >= 1;
 
 const [activeTab, setActiveTab] = useState<"gx_pro" | "mall" | "service">("gx_pro");
 
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
 useEffect(() => {
 if (activeTab === "gx_pro") {
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
 const [inputValue, setInputValue] = useState("");
 
 const [locationName, setLocationName] = useState(t('locating'));
 const [showRecoveryModal, setShowRecoveryModal] = useState(false);

 // 1. 获取真实位置 (仅在初次加载时执行一次)
 useEffect(() => {
 const fetchLocation = async () => {
 // 穹顶第一层：光速读取缓存，0毫秒点亮UI
 const cachedCity = localStorage.getItem('gx_last_city');
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
 if (fastestData.city) {
 setLocationName(fastestData.city);
 localStorage.setItem('gx_last_city', fastestData.city);
 }
 }

 // 无论谁赢，静默等待卫星高精度定位完成，用米级坐标无缝覆盖粗略坐标
 const preciseLoc = await hardwarePromise;
 if (preciseLoc) {
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
 setLocationName(t('txt_3d1c77') || "重启定位"); // 完美降维：不再显示具体的错误城市，而是显示赛博提示
 }
 }
 };

 fetchLocation();
 }, []);



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
 setShowRecoveryModal(true);
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
 // Handle search
 }
 }}
 placeholder={t("searchPlaceholder")} 
 className={cn("flex-1 bg-transparent h-full pl-3 pr-4 text-sm font-light focus:outline-none", isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white")}
 />
 </div>
 
 {/* 右侧赛博指令字 */}
 <button 
 onClick={() => {}}
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

 {/* 优选商城 */}
 <button 
 onClick={() => setActiveTab('mall')}
 className={cn(
 "relative flex flex-col items-center gap-1 group shrink-0",
 activeTab === "mall" ? "scale-105" : "scale-100"
 )}
 >
 <div className="flex items-center gap-1.5">
 <span className={cn(
 "text-[clamp(14px,3.5vw,18px)] tracking-[clamp(1px,0.5vw,2px)] whitespace-nowrap ",
 activeTab === "mall"
 ? (isLight ? "text-black font-black" : "text-white font-black")
 : (isLight ? "text-black font-normal" : "text-white font-normal")
 )}>
 {t("tabs.mall")}
 </span>
 </div>
 {isActive && activeTab === "mall" && (
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
 {activeTab !== 'mall' && (
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
 setInputValue("");
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
 {t(`categories.${cat.id}`)}
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
 )}

 {/* Sub Categories (Level 2) - 已废弃传统横向菜单，采用极简场景微标签架构 */}
 {/* 保留占位但不再渲染，后续可接入 Micro-Tags 场景胶囊 */}

 {/* Content Grid (Google Places Aggregation) */}
 {activeTab === "mall" && (
 <div className="pt-0 flex flex-col items-center justify-start min-h-[50vh] w-full pb-20">
 <div className="w-full">
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[clamp(12px,2vw,20px)]">
 {MOCK_MALL_PRODUCTS.map((product: any) => (
 <motion.div
 key={product.id}
 onClick={() => router.push(`/mall/product/${product.id}`)}
 className={cn("cursor-pointer relative w-full aspect-[3/4] rounded-2xl overflow-hidden group border shrink-0", isLight ? "border-black/10 hover:border-yellow-500/50" : "border-white/10 hover:border-yellow-500/50")}
 >
 {/* 背景图 */}
 <Image
 src={product.image}
 alt={product.name}
 fill
 sizes="(max-width: 768px) 50vw, 33vw"
 className="object-cover"
 />
 {/* 纯黑渐变暗场 */}
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

 {/* 顶部标签 */}
 <div className="absolute top-3 right-3 flex items-center px-2 py-1 bg-black/60 rounded border border-yellow-500/30 z-10 pointer-events-none">
 <span className="text-[10px] text-yellow-500 tracking-widest uppercase">{product.tag}</span>
 </div>

 {/* 底部内容区 */}
 <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1 z-20 pointer-events-none">
 <h3 className="text-sm tracking-wider text-white line-clamp-1">
 {product.name}
 </h3>
 <p className="text-[10px] text-white/60 tracking-widest line-clamp-1 uppercase">
 {product.shopName}
 </p>
 <div className="flex items-end justify-between mt-1">
 <span className="text-yellow-400 font-bold">¥{product.price}</span>
 <span className="text-[10px] text-white/40">已售 {product.sales}</span>
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 </div>
 </div>
 )}

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
 
 {/* 商家入驻招募横幅 (Merchant Onboarding Banner) - 全息去背 HUD 版 (Holographic Border Glow) */}
 {user && !('applicationStatus' in user && (user.applicationStatus === 'pending' || user.applicationStatus === 'approved')) && user.role !== 'merchant' && user.role !== 'boss' && (
 <div className="pt-8 pb-6 px-2 w-full">
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
 <div className="pt-8 pb-6 px-2 w-full">
 <HoloAscensionCard onClick={() => {
 router.push(`/login?next=${encodeURIComponent('/dashboard?action=onboard')}`);
 }} />
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
 </main>
 <ShopDetailOverlay shop={selectedShop} onClose={() => setSelectedShop(null)} />
 </>
 );
}
