"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
// import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { MapPin, Search, ImagePlus, X, Clock, Plus, ShoppingBag } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { StudioImageCropModal } from "./StudioImageCropModal";
import { useTranslations } from "next-intl";
import { ShopDetailView } from "@/components/shared/ShopDetailView";
import { useViewStack } from "@/hooks/useViewStack";

export function StudioLayout() {
 const t = useTranslations('StudioLayout');
 // const router = useRouter();

 const { user } = useAuth();

 // 拦截智控页透传过来的特定 shopId (如果存在，说明是从“装修当前门店”按钮进来的)
 const overlays = useViewStack(state => state.overlays);
 const studioOverlay = overlays.find(o => o.id === 'studio');
 const targetShopId = studioOverlay?.props?.shopId as string | undefined;

 const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentVersionId, setCurrentVersionId] = useState<number>(1);
  const [storeName, setStoreName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{name: string, address: string, lat: number, lng: number} | null>(null);
  // const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  
  // Google Places Session Token
  const sessionTokenRef = useRef<string | null>(null);

  // Top Level Tab State
  const [activeTab, setActiveTab] = useState<"store" | "mall">("store");
  
  // Mall States
  const [mallProducts, setMallProducts] = useState<any[]>([
    {
      id: "p1",
      name: "星空磨砂美甲套盒",
      price: 299,
      stock: 100,
      image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
      tag: "GX PRO 官方认证",
      desc: "采用纳米级星空磨砂材质，打造独一无二的深邃质感。"
    },
    {
      id: "p2",
      name: "Lumina 抗老面霜",
      price: 899,
      stock: 50,
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop",
      tag: "包邮",
      desc: "医美级核心抗老配方，深入肌底重塑胶原蛋白网络。"
    }
  ]);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [mallProductName, setMallProductName] = useState("");
  const [mallProductPrice, setMallProductPrice] = useState("");
  const [mallProductStock, setMallProductStock] = useState("");
  const [mallProductTags, setMallProductTags] = useState("");
  const [mallProductDesc, setMallProductDesc] = useState("");
  const [mallProductImage, setMallProductImage] = useState<string | null>(null);

  // Generate UUID for Session Token
  const generateSessionToken = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 基因读取：挂载时拉取已有门店数据
  const [slogan, setSlogan] = useState("");
  const [coverImages, setCoverImages] = useState<string[]>([]);
 const [isUploading, setIsUploading] = useState(false);
 
 // Crop States
 const [isCropModalOpen, setIsCropModalOpen] = useState(false);
 const [imageToCrop, setImageToCrop] = useState<string | null>(null);

 // Traffic Capsules States
 const [capsules, setCapsules] = useState<{id: string, name: string, price: string, duration: string}[]>([]);
 const [newCapsuleName, setNewCapsuleName] = useState("");
 const [newCapsulePrice, setNewCapsulePrice] = useState("");
 const [newCapsuleDuration, setNewCapsuleDuration] = useState("60");

 // 基因读取：挂载时拉取已有门店数据
 useEffect(() => {
 const fetchExistingStore = async () => {
 if (!user?.id) return;
 try {
 let fetchTargetShopId = targetShopId;

 // 如果没有透传特定的 shopId，才去 fallback 找用户的第一个 OWNER 店铺
 if (!fetchTargetShopId) {
 const { data: bindings, error: bindError } = await supabase
 .from('shop_bindings')
 .select('shop_id')
 .eq('user_id', user.id)
 .eq('role', 'OWNER')
 .limit(1)
 .maybeSingle();

 if (bindError) {
 console.error("Error fetching bindings:", bindError);
 return;
 }
 fetchTargetShopId = bindings?.shop_id;
 }

 if (fetchTargetShopId) {
 // 2. 拉取真实门店数据
 const { data: shopData, error: shopError } = await supabase
 .from('shops')
 .select('*')
 .eq('id', fetchTargetShopId)
 .single();

 if (!shopError && shopData) {
 setStoreId(shopData.id);
 setStoreName(shopData.name || "");
 if (shopData.version_id) setCurrentVersionId(shopData.version_id);
 
 // 解析 config JSONB
 const config = shopData.config as any || {};
 if (config.slogan) setSlogan(config.slogan);
 if (config.coverImages) setCoverImages(config.coverImages);
 if (config.capsules) setCapsules(config.capsules);
 if (config.location) {
 setSelectedLocation(config.location);
 setSearchQuery(config.location.address || config.location.name || "");
 }
 }
 }
 } catch (error) {
 console.error("Failed to load existing store:", error);
 } finally {
 setIsLoadingStore(false);
 }
 };

 fetchExistingStore();
 }, [user, targetShopId]);

 const fetchPlaces = useCallback(async (input: string) => {
    if (!input || input.length < 2) {
      setAutocompleteResults([]);
      sessionTokenRef.current = null; // 重置 token
      return;
    }
    
    // 如果没有 sessionToken，生成一个新的
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken();
    }
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${sessionTokenRef.current}`);
      const data = await res.json();
      if (data.predictions) {
        setAutocompleteResults(data.predictions);
      }
    } catch (error) {
      console.error("Failed to fetch places:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

 useEffect(() => {
 const timer = setTimeout(() => {
 if (!selectedLocation) {
 fetchPlaces(searchQuery);
 }
 }, 500); // 500ms 防抖
 return () => clearTimeout(timer);
 }, [searchQuery, fetchPlaces, selectedLocation]);

 const handleDeploy = async () => {
 if (!user || !storeName || !selectedLocation || !slogan || coverImages.length === 0) return;
 
 setIsDeploying(true);
 try {
 // 0. 获取当前完整 config，实现深度合并，防止覆写日历数据
 let currentConfig = {};
 if (storeId) {
 const { data: currentShop } = await supabase.from('shops').select('config').eq('id', storeId).single();
 currentConfig = currentShop?.config || {};
 }

 const mergedConfig = { 
 ...currentConfig,
 slogan: slogan,
 coverImages: coverImages,
 capsules: capsules,
 location: selectedLocation
 };

 if (storeId) {
 // 更新已有门店 (带有乐观锁的原子级挂载)
 const { data: updatedShop, error: updateError } = await supabase
 .from('shops')
 .update({
 name: storeName,
 maps_link: `https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`,
 config: mergedConfig
 })
 .eq('id', storeId)
 .eq('version_id', currentVersionId) // 绝对防线：版本号必须匹配
 .select('version_id')
 .maybeSingle();
 
 if (updateError) throw updateError;
 
 // 如果更新成功但返回 null，说明因为 version_id 不匹配导致没有行被更新 (乐观锁拦截)
 if (!updatedShop) {
 throw new Error("OPTIMISTIC_LOCK_FAILED");
 }
 } else {
 // 创建新门店并绑定 (仅用于极其罕见的情况)
 const { data: newShop, error: shopError } = await supabase
 .from('shops')
 .insert({
 name: storeName,
 industry: 'beauty', // 默认或者从某个地方获取，这里可以暂时写死或留空
 maps_link: `https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`,
 config: mergedConfig,
 owner_principal_id: user.id
 })
 .select()
 .single();

 if (shopError) throw shopError;

 // 2. 绑定身份
 const { error: bindError } = await supabase
 .from('shop_bindings')
 .insert({
 shop_id: newShop.id,
 user_id: user.id,
 role: 'OWNER'
 });

 if (bindError) throw bindError;
 }

 if (typeof window !== 'undefined') {
 localStorage.setItem('isStoreConfigured', 'true');
 // 部署成功后，退出弹层回到主舞台
 window.history.back();
 }
 } catch (error: any) {
 console.error("Deploy failed:", error);
 
 // 拦截底层乐观锁防线报错
 if (error.message === "OPTIMISTIC_LOCK_FAILED") {
 alert("🚨 冲突警告：\n\n该门店数据已被其他人或在其他设备上修改！\n为了防止覆盖他人的数据，系统已驳回您的更新。\n\n请刷新页面获取最新数据后重试。");
 return;
 }

 // 拦截底层 PostGIS 抛出的物理防撞墙报错
 if (error?.message?.includes('物理空间冲突')) {
 alert(`🚨 部署失败：\n\n${error.message}\n\n请检查您填写的地址是否与已有门店重叠。`);
 } else {
 alert("部署失败，请重试");
 }
 } finally {
 setIsDeploying(false);
 }
 };

 const handleSelectLocation = async (placeId: string, description: string) => {
    setSearchQuery(description);
    setAutocompleteResults([]);
    
    try {
      const url = sessionTokenRef.current 
        ? `/api/places/details?place_id=${placeId}&sessionToken=${sessionTokenRef.current}`
        : `/api/places/details?place_id=${placeId}`;
        
      const res = await fetch(url);
      const data = await res.json();
      if (data.result && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location;
        const name = data.result.name;
        const address = data.result.formatted_address;
        
        setSelectedLocation({
          name: name || description,
          address: address || description,
          lat,
          lng
        });
      }
    } catch (error) {
      console.error("Failed to fetch place details:", error);
    } finally {
      // 选择完毕后，消耗掉这个 token，下次搜索需要新的
      sessionTokenRef.current = null;
    }
  };

 const handleUploadClick = () => {
 if (coverImages.length >= 3) return;
 fileInputRef.current?.click();
 };

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 // Convert file to object URL for cropping
 const objectUrl = URL.createObjectURL(file);
 setImageToCrop(objectUrl);
 setIsCropModalOpen(true);
 
 if (fileInputRef.current) {
 fileInputRef.current.value = "";
 }
 };

 const handleCropComplete = async (croppedFile: File) => {
 setIsUploading(true);
 try {
 const formData = new FormData();
 formData.append("file", croppedFile);

 const res = await fetch("/api/upload", {
 method: "POST",
 body: formData,
 });

 const data = await res.json();
 if (data.url) {
 setCoverImages((prev) => [...prev, data.url]);
 } else {
 console.error("Upload failed:", data.error);
 alert("上传失败，请重试");
 }
 } catch (error) {
 console.error("Error uploading file:", error);
 alert("上传失败，请重试");
 } finally {
 setIsUploading(false);
 setImageToCrop(null);
 }
 };

 const removeImage = (idx: number, e: React.MouseEvent) => {
 e.stopPropagation();
 setCoverImages(prev => prev.filter((_, i) => i !== idx));
 };

 const addCapsule = () => {
 if (capsules.length >= 3) return;
 if (!newCapsuleName || !newCapsulePrice) return;
 
 setCapsules(prev => [...prev, {
 id: Math.random().toString(),
 name: newCapsuleName,
 price: newCapsulePrice,
 duration: newCapsuleDuration
 }]);
 
 setNewCapsuleName("");
 setNewCapsulePrice("");
 };

 const removeCapsule = (id: string) => {
 setCapsules(prev => prev.filter(c => c.id !== id));
 };

 if (isLoadingStore) {
 return (
 <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
 <div className="w-8 h-8 border-2 rounded-full animate-spin" />
 </div>
 );
 }

 return (
 <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row overflow-hidden text-white font-sans">
 {/* 极简返回按钮 - 悬浮 */}
 <button 
 onClick={() => {
 if (typeof window !== 'undefined') window.history.back();
 }}
 className="absolute top-6 left-6 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:text-white hover:bg-white/10 hover:border-white/20 "
 >
 <ChevronLeft className="w-5 h-5" />
 </button>

 {/* 左侧：能量注入舱 (数据录入) */}
 <div className="w-full md:w-[50%] lg:w-[45%] xl:w-[40%] h-full overflow-y-auto custom-scrollbar relative border-r border-white/5 bg-gradient-to-br from-black to-black flex justify-center">
 <div className="w-full max-w-[700px] min-h-full px-8 md:px-12 lg:px-16 pt-32 pb-24">
 <div className="space-y-2 mb-12">
 <h1 className="text-2xl md:text-3xl tracking-tight">
 {t('txt_55d479')}<span className="">{t('txt_a7da92')}</span>
 </h1>
 </div>

 {/* 一镜到底瀑布流表单 */}
 <div className="space-y-10 pb-12">
 
 {/* Top Level Tab Switcher */}
 <div className="flex bg-white/5 border border-white/10 rounded-lg p-1 w-full max-w-[400px]">
 <button
 onClick={() => setActiveTab('store')}
 className={`flex-1 py-2 text-xs font-medium tracking-widest rounded-md transition-all ${
 activeTab === 'store' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white'
 }`}
 >
 {t('txt_digital_store')}
 </button>
 <button
 onClick={() => setActiveTab('mall')}
 className={`flex-1 py-2 text-xs font-medium tracking-widest rounded-md transition-all ${
 activeTab === 'mall' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white'
 }`}
 >
 {t('txt_digital_mall')}
 </button>
 </div>

 {activeTab === 'store' ? (
 <>
 {/* 区块 1: 商业信息 */}
 <section>
 <div className="mb-4">
 <h2 className="text-sm tracking-wide text-white">{t('txt_ae4cab')}</h2>
 <p className="text-[11px] text-white mt-0.5">{t('txt_de150e')}</p>
 </div>
 <div className="space-y-5 bg-white/5 border border-white/10 p-6 rounded-2xl">
 {/* Store Name */}
 <div className="space-y-2">
 <label className="text-[11px] text-white tracking-widest">{t('txt_d4b097')}</label>
 <input 
 type="text" 
 placeholder={t('txt_5d7e2c')}
 value={storeName}
 onChange={(e) => setStoreName(e.target.value)}
 className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:ring-1 "
 />
 </div>

 {/* Search Location */}
 <div className="space-y-2 relative">
 <label className="text-[11px] text-white tracking-widest">{t('txt_e06494')}</label>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
 <input 
 type="text" 
 placeholder={t('txt_430141')}
 value={searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 if (selectedLocation && e.target.value !== selectedLocation.name) {
 setSelectedLocation(null);
 }
 }}
 className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm text-white outline-none focus:ring-1 "
 />
 </div>

 {/* Autocomplete Dropdown */}
 {!selectedLocation && searchQuery.length > 2 && (
 <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-lg overflow-hidden z-50 ">
 {isSearching ? (
 <div className="p-4 text-center text-xs text-white flex items-center justify-center gap-2">
 <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" />
 {t('txt_a63e13')}</div>
 ) : autocompleteResults.length > 0 ? (
 autocompleteResults.map((res, i) => (
 <div 
 key={res.place_id || i} 
 onClick={() => handleSelectLocation(res.place_id, res.description)}
 className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex items-start gap-3 "
 >
 <MapPin className="w-4 h-4 text-white mt-0.5 shrink-0" />
 <div>
 <div className="text-sm text-white font-medium">{res.structured_formatting?.main_text || res.description.split(',')[0]}</div>
 <div className="text-xs text-white mt-0.5">{res.structured_formatting?.secondary_text || res.description}</div>
 </div>
 </div>
 ))
 ) : (
 <div className="p-4 text-center text-xs text-white ">
 {t('txt_092e00')}</div>
 )}
 </div>
 )}
 </div>
 </div>
 </section>

 <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

 {/* 区块 2: 视觉定制 */}
 <section>
 <div className="mb-4">
 <h2 className="text-sm tracking-wide text-white">{t('txt_13d73f')}</h2>
 <p className="text-[11px] text-white mt-0.5">{t('txt_3dfdf1')}</p>
 </div>
 <div className="space-y-6 bg-white/5 border border-white/10 p-6 rounded-2xl">
 {/* Slogan */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <label className="text-[11px] text-white tracking-widest">{t('txt_041052')}</label>
 <span className="text-[11px] text-white">{slogan.length}/20</span>
 </div>
 <input 
 type="text" 
 maxLength={20}
 placeholder={t('txt_96941d')}
 value={slogan}
 onChange={(e) => setSlogan(e.target.value)}
 className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:ring-1 "
 />
 </div>

 {/* Cover Images */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <label className="text-[11px] text-white tracking-widest">{t('txt_c32326')}</label>
 <span className="text-[11px] text-white">{coverImages.length}/3</span>
 </div>
 
 <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 w-full">
 <input 
 type="file" 
 accept="image/png, image/jpeg, image/webp" 
 ref={fileInputRef} 
 className="hidden" 
 onChange={handleFileChange} 
 />
 {coverImages.map((img, idx) => (
 <div key={idx} className="relative w-32 h-18 rounded-xl overflow-hidden border border-white/10 group shrink-0 aspect-[16/9]">
 <img src={img} alt={`Cover ${idx}`} className="w-full h-full object-cover" />
 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
 <button 
 onClick={(e) => removeImage(idx, e)}
 className="w-8 h-8 rounded-full bg-white/5 text-white/60 flex items-center justify-center "
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>
 ))}

 {coverImages.length < 3 && (
 <button 
 onClick={(e) => {
 e.stopPropagation();
 handleUploadClick();
 }}
 disabled={isUploading}
 className="w-32 h-18 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed aspect-[16/9]"
 >
 {isUploading ? (
 <div className="w-5 h-5 border-2 rounded-full animate-spin" />
 ) : (
 <>
 <ImagePlus className="w-5 h-5 text-white" />
 <span className="text-[11px] text-white">{t('txt_ce6855')}</span>
 </>
 )}
 </button>
 )}
 </div>
 <p className="text-[11px] text-white leading-relaxed">
 {t('txt_3f3a6c')}</p>
 </div>
 </div>
 </section>

 <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

 {/* 区块 3: 引流服务 */}
 <section>
 <div className="mb-4">
 <h2 className="text-sm tracking-wide text-white">{t('txt_574c4b')}</h2>
 <p className="text-[11px] text-white mt-0.5">{t('txt_4bde96')}</p>
 </div>
 <div className="space-y-6 bg-white/5 border border-white/10 p-6 rounded-2xl">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <label className="text-[11px] text-white tracking-widest">{t('txt_0a55cf')}</label>
 <span className="text-[11px] text-white">{capsules.length}/3</span>
 </div>
 
 {/* 已添加的胶囊 */}
 {capsules.length > 0 && (
 <div className="space-y-2">
 {capsules.map(cap => (
 <div key={cap.id} className="flex items-center justify-between p-3 rounded-lg border group">
 <div>
 <div className="text-sm text-white">{cap.name} <span className=" ml-2 ">{cap.price}</span></div>
 <div className="text-[11px] text-white mt-0.5 flex items-center gap-1">
 <Clock className="w-3 h-3" /> {cap.duration} {t('txt_399619')}</div>
 </div>
 <button 
 onClick={(e) => { e.stopPropagation(); removeCapsule(cap.id); }}
 className="text-white hover:text-red-400 "
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 ))}
 </div>
 )}

 {/* 添加新胶囊表单 */}
 {capsules.length < 3 && (
 <div className="p-4 rounded-xl border border-dashed border-white/20 bg-black/50 space-y-3" onClick={(e) => e.stopPropagation()}>
 <input 
 type="text" 
 placeholder={t('txt_8f3747')}
 value={newCapsuleName}
 onChange={(e) => setNewCapsuleName(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 "
 />
 <div className="flex gap-2">
 <div className="relative flex-1">
 <input 
 type="number" 
 placeholder={t('txt_0e9fd9')}
 value={newCapsulePrice}
 onChange={(e) => setNewCapsulePrice(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 "
 />
 </div>
 <div className="relative flex-1">
 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-[11px]">{t('txt_3a17b7')}</span>
 <input 
 type="number" 
 placeholder={t('txt_39f137')}
 value={newCapsuleDuration}
 onChange={(e) => setNewCapsuleDuration(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-9 py-2 text-sm text-white outline-none focus:ring-1 "
 />
 </div>
 </div>
 <button 
 onClick={addCapsule}
 disabled={!newCapsuleName || !newCapsulePrice || !newCapsuleDuration}
 className="w-full py-2 rounded-lg bg-white/10 text-white text-xs hover:text-black flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
 >
 <Plus className="w-3 h-3" /> {t('txt_5c555b')}</button>
 </div>
 )}
 </div>
 </div>
 </section>
 </>
 ) : (
 /* ==================== 数字商城 (Digital Mall) ==================== */
 <div className="space-y-6">
 <div className="mb-4 flex items-center justify-between">
 <div>
 <h2 className="text-sm tracking-wide text-white">{t('txt_product_list')}</h2>
 <p className="text-[11px] text-white/50 mt-0.5">管理您的精品好物与库存</p>
 </div>
 {!editingProduct && (
 <button
 onClick={() => {
 setEditingProduct({});
 setMallProductName("");
 setMallProductPrice("");
 setMallProductStock("");
 setMallProductTags("");
 setMallProductDesc("");
 setMallProductImage(null);
 }}
 className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs hover:bg-white/20 transition-colors"
 >
 {t('txt_add_product')}
 </button>
 )}
 </div>

 {!editingProduct ? (
 /* 资产列表区 */
 <div className="grid grid-cols-2 gap-4">
 {mallProducts.map((p) => (
 <div key={p.id} className="relative group bg-white/5 border border-white/10 rounded-xl overflow-hidden p-3 hover:border-white/20 transition-colors">
 <div className="w-full aspect-square bg-black/50 rounded-lg mb-3 relative overflow-hidden">
 {p.image ? (
 <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-white/20">No Image</div>
 )}
 </div>
 <h3 className="text-xs text-white truncate">{p.name}</h3>
 <div className="flex justify-between items-center mt-1">
 <span className="text-xs text-yellow-500">¥{p.price}</span>
 <span className="text-[10px] text-white/40">库存: {p.stock}</span>
 </div>
 
 {/* 悬浮操作 */}
 <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => {
 setEditingProduct(p);
 setMallProductName(p.name);
 setMallProductPrice(p.price.toString());
 setMallProductStock(p.stock.toString());
 setMallProductTags(p.tag || "");
 setMallProductDesc(p.desc || "");
 setMallProductImage(p.image);
 }}
 className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20"
 >
 <Plus className="w-3.5 h-3.5 rotate-45" /> {/* Edit icon placeholder */}
 </button>
 <button
 onClick={() => setMallProducts(prev => prev.filter(item => item.id !== p.id))}
 className="w-7 h-7 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center text-red-400 hover:bg-red-500/40"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 ))}
 {mallProducts.length === 0 && (
  <div className="col-span-2 py-12 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-white/40">
  <ShoppingBag className="w-8 h-8 mb-2 opacity-50" />
  <span className="text-xs">暂无商品，点击右上角锻造新商品</span>
  </div>
  )}
 </div>
 ) : (
 /* 锻造表单区 */
 <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-5 relative">
 <button
 onClick={() => setEditingProduct(null)}
 className="absolute top-4 right-4 text-white/40 hover:text-white"
 >
 <X className="w-5 h-5" />
 </button>
 
 <h3 className="text-sm tracking-widest text-white mb-6">
 {editingProduct.id ? t('txt_edit_product') : t('txt_add_product')}
 </h3>

 <div className="space-y-4">
 {/* Image Upload Placeholder */}
 <div className="space-y-2">
 <label className="text-[11px] text-white/60 tracking-widest">{t('txt_product_image')}</label>
 <div 
 className="w-full aspect-[4/3] rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors overflow-hidden relative"
 onClick={() => fileInputRef.current?.click()}
 >
 {mallProductImage ? (
 <img src={mallProductImage} alt="preview" className="w-full h-full object-cover" />
 ) : (
 <>
 <ImagePlus className="w-6 h-6 text-white/40 mb-2" />
 <span className="text-xs text-white/40">点击上传主图</span>
 </>
 )}
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[11px] text-white/60 tracking-widest">{t('txt_product_name')}</label>
 <input type="text" value={mallProductName} onChange={e => setMallProductName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-white/30" placeholder="例如：星空磨砂美甲套盒" />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[11px] text-white/60 tracking-widest">{t('txt_product_price')}</label>
 <input type="number" value={mallProductPrice} onChange={e => setMallProductPrice(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-white/30" placeholder="¥ 0.00" />
 </div>
 <div className="space-y-2">
 <label className="text-[11px] text-white/60 tracking-widest">{t('txt_product_stock')}</label>
 <input type="number" value={mallProductStock} onChange={e => setMallProductStock(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-white/30" placeholder="0" />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[11px] text-white/60 tracking-widest">{t('txt_product_tags')}</label>
 <input type="text" value={mallProductTags} onChange={e => setMallProductTags(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-white/30" placeholder="例如：GX PRO 官方认证, 包邮" />
 </div>

 <div className="space-y-2">
 <label className="text-[11px] text-white/60 tracking-widest">{t('txt_product_desc')}</label>
 <textarea value={mallProductDesc} onChange={e => setMallProductDesc(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-white/30 min-h-[80px]" placeholder="描述商品的独特卖点..." />
 </div>

 <button
 onClick={() => {
 const newProduct = {
 id: editingProduct.id || Math.random().toString(),
 name: mallProductName || "未命名商品",
 price: Number(mallProductPrice) || 0,
 stock: Number(mallProductStock) || 0,
 tag: mallProductTags,
 desc: mallProductDesc,
 image: mallProductImage || "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop"
 };
 
 if (editingProduct.id) {
 setMallProducts(prev => prev.map(p => p.id === editingProduct.id ? newProduct : p));
 } else {
 setMallProducts(prev => [newProduct, ...prev]);
 }
 setEditingProduct(null);
 }}
 className="w-full py-4 mt-6 rounded-xl bg-white text-black text-sm font-medium tracking-widest hover:bg-white/90"
 >
 {t('txt_save_product')}
 </button>
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* 部署按钮 */}
 <div className="mt-16">
 <button 
 disabled={!storeName || !selectedLocation || !slogan || coverImages.length === 0 || isDeploying}
 onClick={handleDeploy}
 className="w-full py-5 rounded-2xl text-black tracking-widest disabled:bg-white/5 disabled:text-white disabled:cursor-not-allowed border border-white/5 flex items-center justify-center gap-2"
 >
 {isDeploying ? (
 <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> {t('txt_ce59cd')}</>
 ) : (
 "部署数字门店"
 )}
 </button>
 </div>
 </div>
 </div>

 {/* 右侧：全息沙盒 (1:1 物理级预览) */}
 <div className="hidden md:flex flex-1 relative items-center justify-center bg-black/90 p-4 md:p-8 lg:p-12 overflow-hidden">
 {/* 背景光效 */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" />
 
 {/* 悬浮手机沙盒 */}
 <motion.div 
 
 
 
 className="relative rounded-[2.5rem] md:rounded-[3rem] border-[6px] md:border-[8px] border-[#1a1a1a] overflow-hidden bg-black ring-1 ring-white/10 flex flex-col shrink-0"
 style={{
 height: "100%",
 maxHeight: "812px",
 aspectRatio: "375 / 812"
 }}
 >
 {/* 刘海屏缺口 mock */}
 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[30px] bg-black rounded-b-[1.2rem] z-50 flex items-end justify-center pb-2 ">
 <div className="w-12 h-1 rounded-full bg-white/10" />
 </div>

 {/* 屏幕内容区 */}
 <div className="w-full h-full relative flex flex-col">
 
 {/* 模拟 C 端首页的星空背景 */}
 <div className="absolute inset-0 bg-[#0a0a0a] z-0" />
 
 {/* 内容渲染区 */}
 <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar w-full">
 {activeTab === 'store' ? (
 /* ==================== 门店详情视图 (全息瀑布流) ==================== */
 <ShopDetailView 
 coverImages={coverImages}
 storeName={storeName}
 slogan={slogan}
 location={selectedLocation}
 capsules={capsules}
 variant="compact"
 />
 ) : (
 /* ==================== 数字商城视图 ==================== */
 !editingProduct ? (
 <div className="p-4 space-y-4 pb-20">
 <div className="text-center py-4">
 <h2 className="text-white text-lg font-bold">GX 优选商城</h2>
 <p className="text-white/50 text-xs">商品展示效果预览</p>
 </div>
 <div className="grid grid-cols-2 gap-3">
 {mallProducts.map(p => (
 <div key={p.id} className="w-full aspect-[3/4] rounded-2xl overflow-hidden relative border border-white/10">
 <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
 <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] bg-black/40 backdrop-blur-md text-white border border-white/10">{p.tag || "优选"}</div>
 <div className="absolute bottom-3 left-3 right-3 flex flex-col">
 <span className="text-white text-xs font-medium truncate mb-1">{p.name}</span>
 <div className="flex justify-between items-end">
 <span className="text-yellow-500 font-bold text-sm">¥{p.price}</span>
 <span className="text-white/40 text-[9px]">已售 100+</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div className="relative w-full min-h-full bg-black flex flex-col pb-24">
 {/* 商品大图 */}
 <div className="relative w-full aspect-[4/5]">
 <img 
 src={mallProductImage || "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop"} 
 alt="product" 
 className="w-full h-full object-cover" 
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
 </div>
 
 {/* 商品信息舱 */}
 <div className="relative -mt-6 z-10 bg-[#111] rounded-t-3xl border-t border-white/10 p-5 flex flex-col gap-4">
 <div className="flex justify-between items-start">
 <div className="flex flex-col">
 <span className="text-yellow-500 text-2xl font-bold">¥{mallProductPrice || '0.00'}</span>
 <h1 className="text-white text-lg font-medium mt-1 leading-tight">{mallProductName || '未命名商品'}</h1>
 </div>
 {mallProductTags && (
 <span className="px-2 py-1 rounded bg-white/10 text-white text-[10px]">{mallProductTags.split(',')[0]}</span>
 )}
 </div>
 
 <p className="text-white/60 text-xs leading-relaxed">
 {mallProductDesc || '添加一段引人入胜的描述，吸引顾客购买...'}
 </p>

 <div className="h-px bg-white/10 w-full my-2" />
 
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
 <div className="flex flex-col">
 <span className="text-white text-sm font-medium">{storeName || '您的门店名称'}</span>
 <span className="text-white/40 text-[10px]">官方认证门店</span>
 </div>
 <button className="ml-auto px-3 py-1.5 rounded-full border border-white/20 text-white text-xs">进店逛逛</button>
 </div>
 </div>

 {/* 底部悬浮交易栏 */}
 <div className="absolute bottom-4 left-4 right-4 h-14 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-2 gap-2">
 <div className="w-10 h-10 flex flex-col items-center justify-center text-white/60">
 <div className="w-5 h-5 border border-white/40 rounded-full mb-0.5" />
 <span className="text-[8px]">客服</span>
 </div>
 <button className="flex-1 h-10 rounded-full bg-white/10 text-white text-sm font-medium">加入购物车</button>
 <button className="flex-1 h-10 rounded-full bg-yellow-500 text-black text-sm font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)]">立即购买</button>
 </div>
 </div>
 )
 )}
 </div>

 {/* 模拟底部 Home Indicator */}
 <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-[5px] rounded-full bg-white/40 z-50 " />
 </div>
 </motion.div>
 
 {/* 物理设备底部反光 */}
 <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[300px] h-[20px] bg-white/5 rounded-full" />
 </div>

 <StudioImageCropModal
 isOpen={isCropModalOpen}
 onClose={() => {
 setIsCropModalOpen(false);
 setImageToCrop(null);
 }}
 imageSrc={imageToCrop || ""}
 onComplete={handleCropComplete}
 />
 </div>
 );
}
