"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/shared/GlassCard";
import { useState, useRef, useCallback, useEffect } from "react";
import { MapPin, Search, CheckCircle2, ImagePlus, X, Clock, CalendarX, LockKeyhole, Plus, ArrowUpRight, Star, Navigation2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { StudioImageCropModal } from "./StudioImageCropModal";

export function StudioLayout() {
  const router = useRouter();

  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentVersionId, setCurrentVersionId] = useState<number>(1);
  const [storeName, setStoreName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{name: string, address: string, lat: number, lng: number} | null>(null);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  
  // Visual Assets States
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
        // 1. 查找用户的 OWNER 绑定记录
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

        if (bindings?.shop_id) {
          // 2. 拉取真实门店数据
          const { data: shopData, error: shopError } = await supabase
            .from('shops')
            .select('*')
            .eq('id', bindings.shop_id)
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
  }, [user]);

  const fetchPlaces = useCallback(async (input: string) => {
    if (!input || input.length < 2) {
      setAutocompleteResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
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
      const configPayload = { 
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
            config: configPayload
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
            config: configPayload,
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
        router.push('/dashboard');
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
      const res = await fetch(`/api/places/details?place_id=${placeId}`);
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
        <div className="w-8 h-8 border-2 border-gx-cyan/30 border-t-gx-cyan rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row overflow-hidden text-white font-sans">
      {/* 极简返回按钮 - 悬浮 */}
      <button 
        onClick={() => router.back()}
        className="absolute top-6 left-6 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* 左侧：能量注入舱 (数据录入) */}
      <div className="w-full md:w-[50%] lg:w-[45%] xl:w-[40%] h-full overflow-y-auto custom-scrollbar relative border-r border-white/5 bg-gradient-to-br from-black via-gx-cyan/5 to-black flex justify-center">
        <div className="w-full max-w-[700px] min-h-full px-8 md:px-12 lg:px-16 pt-32 pb-24">
          <div className="space-y-2 mb-12">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              数字<span className="text-gradient-cyan">门店</span>
            </h1>
          </div>

          {/* 一镜到底瀑布流表单 */}
          <div className="space-y-10 pb-12">
            
            {/* 区块 1: 商业信息 */}
            <section>
              <div className="mb-4">
                <h2 className="text-sm font-bold tracking-wide text-white">商业信息</h2>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">基础信息与公司坐标</p>
              </div>
              <div className="space-y-5 bg-white/5 border border-white/10 p-6 rounded-2xl">
                {/* Store Name */}
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 font-mono tracking-widest">公司名称</label>
                  <input 
                    type="text" 
                    placeholder="填写公司名称"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-gx-cyan/50 focus:ring-1 focus:ring-gx-cyan/50 transition-all font-mono"
                  />
                </div>

                {/* Search Location */}
                <div className="space-y-2 relative">
                  <label className="text-[10px] text-white/40 font-mono tracking-widest">公司地址</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input 
                      type="text" 
                      placeholder="填写公司地址"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (selectedLocation && e.target.value !== selectedLocation.name) {
                          setSelectedLocation(null);
                        }
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-gx-cyan/50 focus:ring-1 focus:ring-gx-cyan/50 transition-all font-mono"
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {!selectedLocation && searchQuery.length > 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-lg overflow-hidden z-50 shadow-2xl">
                      {isSearching ? (
                        <div className="p-4 text-center text-xs text-white/40 font-mono flex items-center justify-center gap-2">
                          <div className="w-3 h-3 border-2 border-gx-cyan border-t-transparent rounded-full animate-spin" />
                          搜索坐标中...
                        </div>
                      ) : autocompleteResults.length > 0 ? (
                        autocompleteResults.map((res, i) => (
                          <div 
                            key={res.place_id || i} 
                            onClick={() => handleSelectLocation(res.place_id, res.description)}
                            className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex items-start gap-3 transition-colors"
                          >
                            <MapPin className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-sm text-white font-medium">{res.structured_formatting?.main_text || res.description.split(',')[0]}</div>
                              <div className="text-xs text-white/40 mt-0.5">{res.structured_formatting?.secondary_text || res.description}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-white/40 font-mono">
                          未找到相关坐标
                        </div>
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
                <h2 className="text-sm font-bold tracking-wide text-white">视觉定制</h2>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">极简封面与流光文案</p>
              </div>
              <div className="space-y-6 bg-white/5 border border-white/10 p-6 rounded-2xl">
                {/* Slogan */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-white/40 font-mono tracking-widest">公司简介 (一句话卖点)</label>
                    <span className="text-[10px] font-mono text-white/30">{slogan.length}/20</span>
                  </div>
                  <input 
                    type="text" 
                    maxLength={20}
                    placeholder="填写公司简介"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-gx-cyan/50 focus:ring-1 focus:ring-gx-cyan/50 transition-all font-mono"
                  />
                </div>

                {/* Cover Images */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-white/40 font-mono tracking-widest">公司照片 (封面及轮播)</label>
                    <span className="text-[10px] font-mono text-white/30">{coverImages.length}/3</span>
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
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={(e) => removeImage(idx, e)}
                            className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40 transition-colors"
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
                        className="w-32 h-18 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-gx-cyan/50 transition-all flex flex-col items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed aspect-[16/9]"
                      >
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-gx-cyan/30 border-t-gx-cyan rounded-full animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="w-5 h-5 text-white/40" />
                            <span className="text-[10px] font-mono text-white/40">上传图片</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed">
                    支持 WebP/JPG/PNG 格式。上传后可自由裁剪为 16:9 完美比例。
                  </p>
                </div>
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* 区块 3: 引流服务 */}
            <section>
              <div className="mb-4">
                <h2 className="text-sm font-bold tracking-wide text-white">引流服务</h2>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">引流业务与定价</p>
              </div>
              <div className="space-y-6 bg-white/5 border border-white/10 p-6 rounded-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-white/40 font-mono tracking-widest">引流服务信息 (最多 3 个)</label>
                    <span className="text-[10px] font-mono text-white/30">{capsules.length}/3</span>
                  </div>
                  
                  {/* 已添加的胶囊 */}
                  {capsules.length > 0 && (
                    <div className="space-y-2">
                      {capsules.map(cap => (
                        <div key={cap.id} className="flex items-center justify-between p-3 rounded-lg border border-gx-cyan/20 bg-gx-cyan/5 group">
                          <div>
                            <div className="text-sm font-bold text-white">{cap.name} <span className="text-gx-cyan ml-2 font-mono">{cap.price}</span></div>
                            <div className="text-[10px] text-white/40 font-mono mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {cap.duration} min (时空锚点)
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeCapsule(cap.id); }}
                            className="text-white/20 hover:text-red-400 transition-colors"
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
                        placeholder="服务名称"
                        value={newCapsuleName}
                        onChange={(e) => setNewCapsuleName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gx-cyan/50 focus:ring-1 focus:ring-gx-cyan/50 transition-all"
                      />
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            type="number" 
                            placeholder="价格"
                            value={newCapsulePrice}
                            onChange={(e) => setNewCapsulePrice(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gx-cyan/50 focus:ring-1 focus:ring-gx-cyan/50 transition-all font-mono"
                          />
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 font-mono text-[10px]">MIN</span>
                          <input 
                            type="number" 
                            placeholder="耗时"
                            value={newCapsuleDuration}
                            onChange={(e) => setNewCapsuleDuration(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-9 py-2 text-sm text-white outline-none focus:border-gx-cyan/50 focus:ring-1 focus:ring-gx-cyan/50 transition-all font-mono"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={addCapsule}
                        disabled={!newCapsuleName || !newCapsulePrice || !newCapsuleDuration}
                        className="w-full py-2 rounded-lg bg-white/10 text-white font-bold text-xs hover:bg-gx-cyan hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" /> 继续添加引流项目
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* 部署按钮 */}
          <div className="mt-16">
            <button 
              disabled={!storeName || !selectedLocation || !slogan || coverImages.length === 0 || isDeploying}
              onClick={handleDeploy}
              className="w-full py-5 rounded-2xl bg-gx-cyan text-black font-bold tracking-widest hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all disabled:bg-white/5 disabled:text-white/20 disabled:shadow-none disabled:cursor-not-allowed border border-white/5 flex items-center justify-center gap-2"
            >
              {isDeploying ? (
                <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> 部署中...</>
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gx-cyan/5 blur-[120px] rounded-full pointer-events-none" />
        
        {/* 悬浮手机沙盒 */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[2.5rem] md:rounded-[3rem] border-[6px] md:border-[8px] border-[#1a1a1a] shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.05)] overflow-hidden bg-black ring-1 ring-white/10 flex flex-col shrink-0"
          style={{
            height: "100%",
            maxHeight: "812px",
            aspectRatio: "375 / 812"
          }}
        >
          {/* 刘海屏缺口 mock */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[30px] bg-black rounded-b-[1.2rem] z-50 flex items-end justify-center pb-2 shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            <div className="w-12 h-1 rounded-full bg-white/10" />
          </div>

          {/* 屏幕内容区 */}
          <div className="w-full h-full relative flex flex-col">
            
            {/* 模拟 C 端首页的星空背景 */}
            <div className="absolute inset-0 bg-[#0a0a0a] z-0" />
            
            {/* 内容渲染区 */}
            <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar w-full">
              {/* ==================== 门店详情视图 (全息瀑布流) ==================== */}
              <div className="w-full pb-10">
                {/* Detail View Hero Image */}
                <div className="w-full aspect-[4/3] bg-white/5 relative">
                  {coverImages.length > 0 ? (
                    <img src={coverImages[0]} alt="Cover" className="w-full h-full object-cover opacity-90" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 border-b border-white/10">
                      <ImagePlus className="w-6 h-6 text-white/20 mb-2" />
                      <span className="text-white/20 font-mono text-[10px] tracking-widest">AWAITING HERO ASSET</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
                </div>

                  {/* 核心信息舱 */}
                  <div className="px-5 -mt-12 relative z-10">
                    
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl relative">
                      {/* 跨界黑金评分硬币 (The Holographic Rating Coin) - 物理圆心锚定右上角，向外破框 */}
                      <div className="absolute top-0 right-6 -translate-y-1/2 translate-x-1/2 z-20 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#2a2a2a] via-black to-[#111] border border-gx-gold/30 shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1)] backdrop-blur-md cursor-pointer hover:scale-105 hover:border-gx-gold/50 transition-all duration-300 group">
                        <Star className="w-3.5 h-3.5 fill-gx-gold text-gx-gold drop-shadow-[0_0_5px_rgba(255,215,0,0.5)] mb-0.5" />
                        <span className="text-gx-gold text-[10px] font-bold font-mono leading-none">5.0</span>
                        {/* 呼吸光晕 */}
                        <div className="absolute inset-0 rounded-full bg-gx-gold/0 group-hover:bg-gx-gold/10 transition-colors duration-500" />
                      </div>

                      <div className="flex justify-between items-start mb-2 pr-6 pt-2">
                        <h1 className="text-2xl font-bold leading-tight text-white truncate w-full">{storeName || "公司名称"}</h1>
                      </div>
                      
                      <p className={cn(
                        "text-xs text-transparent bg-clip-text bg-[length:200%_auto] font-medium pb-2",
                        slogan ? "bg-gradient-to-r from-gx-cyan via-blue-400 to-purple-500" : "bg-gradient-to-r from-white/40 to-white/10"
                      )}>
                        {slogan || "公司简历"}
                      </p>

                      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

                      <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gx-cyan shrink-0" />
                          <span className="font-mono whitespace-nowrap">
                            去管理页设置
                          </span>
                        </div>
                        <div className="px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider bg-gx-cyan/20 text-gx-cyan shrink-0 ml-2">
                          OPEN
                        </div>
                      </div>

                      <div 
                        className="flex items-start gap-2 text-xs text-white/60 cursor-pointer group"
                        onClick={() => setIsAddressExpanded(!isAddressExpanded)}
                      >
                        <MapPin className="w-3.5 h-3.5 text-gx-cyan mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className={cn(
                          "leading-relaxed transition-all duration-300",
                          !isAddressExpanded && "line-clamp-1"
                        )}>
                          {selectedLocation ? selectedLocation.name : "等待物理坐标接入..."}
                        </span>
                      </div>

                      <button 
                        onClick={() => {
                          if (selectedLocation) {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`, '_blank');
                          }
                        }}
                        className="w-full mt-5 py-3 bg-gx-cyan/10 hover:bg-gx-cyan/20 transition-colors rounded-xl flex items-center justify-center gap-2 text-gx-cyan text-xs font-bold tracking-widest border border-gx-cyan/30"
                      >
                        <Navigation2 className="w-4 h-4" /> 开启导航
                      </button>
                    </div>
                  </div>

                  {/* 货架 / 引流胶囊 */}
                  <div className="px-5 mt-8">
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-gx-cyan" />
                      精品推荐
                    </h3>
                    {capsules.length > 0 ? (
                      <div className="space-y-3">
                        {capsules.map(cap => (
                          <div key={cap.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group hover:border-gx-cyan/30 transition-colors cursor-pointer relative overflow-hidden">
                            <div className="absolute top-0 bottom-0 left-0 w-1 bg-gx-cyan/0 group-hover:bg-gx-cyan/50 transition-colors" />
                            <div>
                              <h4 className="text-sm font-bold text-white group-hover:text-gx-cyan transition-colors">{cap.name}</h4>
                              <div className="text-[10px] text-white/40 font-mono mt-1.5 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> {cap.duration} MIN
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-white font-mono">{cap.price}</div>
                              <div className="text-[9px] text-gx-cyan border border-gx-cyan/30 px-2 py-0.5 rounded-full mt-1 inline-block">预约</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full py-10 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-white/20 bg-white/5">
                        <Plus className="w-6 h-6 mb-2 opacity-50" />
                        <span className="text-[10px] font-mono tracking-widest">添加引流服务</span>
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* 模拟底部 Home Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-[5px] rounded-full bg-white/40 z-50 shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
          </div>
        </motion.div>
        
        {/* 物理设备底部反光 */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[300px] h-[20px] bg-white/5 blur-[30px] rounded-full" />
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
