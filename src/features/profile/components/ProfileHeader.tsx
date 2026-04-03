"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, ShieldCheck, RefreshCw, Copy, Check } from "lucide-react";
import { UserProfile } from "../types";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AvatarCropModal } from "./AvatarCropModal";
import { supabase, isMockMode } from "@/lib/supabase";
import Image from "next/image";
import { cn } from "@/utils/cn";

interface ProfileHeaderProps {
  profile: UserProfile;
}

export const ProfileHeader = ({ profile }: ProfileHeaderProps) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | undefined>(profile.avatar);
  const isLocalAvatar = localAvatar?.startsWith("data:") || localAvatar?.startsWith("blob:");

  // 当外部 profile 变化时，同步本地 avatar
  useEffect(() => {
    setLocalAvatar(profile.avatar);
    // 重置加载状态，除非没有头像
    setImageLoaded(!profile.avatar);
  }, [profile.avatar]);
  
  const roleLabels = {
    user: { zh: "普通用户", color: "text-gx-cyan", icon: <User className="w-4 h-4" /> },
    merchant: { zh: "商户 / 老板", color: "text-gx-purple", icon: <ShieldCheck className="w-4 h-4" /> },
    boss: { zh: "系统管理员", color: "text-gx-red", icon: <ShieldCheck className="w-4 h-4" /> },
  };

  const currentRole = roleLabels[profile.role];
  const profileGxId = (profile as UserProfile & { gx_id?: string; gxId?: string }).gx_id
    ?? (profile as UserProfile & { gx_id?: string; gxId?: string }).gxId;

  // 复制 ID 状态机
  const [copyState, setCopyState] = useState<"idle" | "hover" | "copied">("idle");
  const handleCopyId = () => {
    const rawId = profileGxId || profile.id;
    if (rawId === "GX-GUEST-0000") return;
    
    navigator.clipboard.writeText(rawId).then(() => {
      setCopyState("copied");
      setTimeout(() => {
        setCopyState("idle");
      }, 2000);
    });
  };

  // 根据注册时间计算普通用户等级
  const userLevelInfo = useMemo(() => {
    if (profile.role !== "user" || !profile.createdAt) return null;
    const createdDate = new Date(profile.createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff < 10) return { level: "LV.0", title: "启航 / Awakening", color: "border-white/20", glow: "shadow-[0_0_10px_rgba(255,255,255,0.1)]" };
    if (daysDiff < 30) return { level: "LV.1", title: "适应 / Adapted", color: "border-gx-cyan/30", glow: "shadow-[0_0_15px_rgba(0,242,255,0.2)]" };
    if (daysDiff < 180) return { level: "LV.2", title: "资深 / Veteran", color: "border-gx-cyan/60", glow: "shadow-[0_0_20px_rgba(0,242,255,0.4)]" };
    if (daysDiff < 365) return { level: "LV.3", title: "核心 / Core", color: "border-dashed border-gx-cyan", glow: "shadow-[0_0_25px_rgba(0,242,255,0.5)]" };
    if (daysDiff < 730) return { level: "LV.4", title: "先驱 / Pioneer", color: "border-gx-pink/60", glow: "shadow-[0_0_30px_rgba(255,0,234,0.4)]" };
    if (daysDiff < 1825) return { level: "LV.5", title: "传奇 / Legend", color: "border-gx-purple/80", glow: "shadow-[0_0_40px_rgba(188,0,255,0.5)]" };
    return { level: "LV.6", title: "远古实体 / Ancient Entity", color: "border-white", glow: "shadow-[0_0_50px_rgba(255,255,255,0.8)]" };
  }, [profile.role, profile.createdAt]);

  // 提取上传逻辑 (切换为 Supabase Storage 直连上传)
  const handleUploadCroppedFile = async (file: File) => {
    setIsUploading(true);
    try {
      if (isMockMode) {
        console.log("[GX-SANDBOX] Mocking avatar upload...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockUrl = URL.createObjectURL(file);
        setLocalAvatar(mockUrl);
        return;
      }

      // 1. 生成唯一文件名 (这里使用 profile.id 可以实现同名覆盖，或者加时间戳避免缓存)
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const bucketName = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';

      // 2. 直接调用 Supabase Storage API 上传
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // 允许覆盖同名文件
        });

      if (error) throw error;

      // 3. 获取上传后的公共访问 URL，并加上时间戳强制破除缓存，实现“秒换”
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
        
      const urlWithTimestamp = `${publicUrl}?v=${Date.now()}`;

      // 4. 更新真实环境：更新 public.profiles 表
      if (user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: urlWithTimestamp })
          .eq('id', user.id);
          
        if (updateError) throw updateError;
        
        // 注意：无需手动 setLocalAvatar，因为 useAuth 的 Realtime 订阅会自动推送到全局状态并引发重绘
      } else {
        // Fallback for visual test if somehow neither matched
        setLocalAvatar(urlWithTimestamp);
      }

    } catch (err) {
      console.error("Avatar upload to Supabase failed:", err);
      alert("头像上传失败，请检查 Supabase 配置与网络");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center text-center gap-6 pb-8 border-b border-white/5 w-full">
      {/* 方案一：动态星云与全息投影环 (Nebula Hologram & Giant Watermark) */}
      
      {/* 1. 巨型水印背景 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] md:text-[200px] font-bold tracking-tighter text-white/[0.02] pointer-events-none select-none uppercase font-mono whitespace-nowrap z-0 leading-none">
        {profile.role}
      </div>

      {/* 2. 深层星云光晕 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gx-cyan/10 via-transparent to-gx-purple/10 blur-[80px] rounded-full animate-pulse transform-gpu" style={{ animationDuration: '8s', willChange: 'opacity' }} />
      </div>

      {/* 前景内容区 (提升 z-index 确保在光效之上) */}
      <div className="relative z-10 flex flex-row items-center gap-6">
        <div className="relative group">
          {/* 3. 全息阵列 (围绕在头像背后) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 pointer-events-none z-0 opacity-30">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-gx-cyan/30" 
            />
            <motion.div 
              animate={{ rotate: -360 }} 
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 rounded-full border border-gx-purple/20" 
            />
          </div>

          {/* 动态角色头像框 (移除额外的进场动画，仅保留 hover 放大和本身样式) */}
          <div 
            className={`w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-xl transition-transform duration-500 relative cursor-pointer group-hover:scale-105 ${
              profile.role === "boss" 
                ? "bg-gradient-to-br from-red-600/20 to-orange-500/20 border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                : profile.role === "merchant"
                ? "bg-gradient-to-br from-gx-purple/20 to-fuchsia-500/20 border-2 border-gx-purple/50 shadow-[0_0_30px_rgba(188,0,255,0.3)]"
                : `bg-gradient-to-br from-white/5 to-white/10 border-2 ${userLevelInfo?.color || "border-white/20"} ${userLevelInfo?.glow || "shadow-none"}`
            }`}
            onClick={() => {
              if (isUploading) return;
              // 触发原生文件选择器进行头像上传
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  // 读取文件为 Data URL，唤起裁剪舱
                  const reader = new FileReader();
                  reader.onload = () => {
                    setSelectedImageSrc(reader.result as string);
                    setCropModalOpen(true);
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
          >
            
            {/* 内部图标与图片渲染 */}
            <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center">
              {/* 骨架屏占位符 (全息脉冲环) - 在真实图片加载完成前显示 */}
              {localAvatar && !imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <motion.div 
                    animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-gx-cyan/50"
                  />
                </div>
              )}

              {localAvatar ? (
                <Image
                  src={localAvatar}
                  alt="avatar"
                  fill
                  sizes="96px"
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-1000",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  unoptimized={isLocalAvatar}
                  priority={false} // 撤销最高优先级，让位于 3D 星空渲染
                  onLoad={() => setImageLoaded(true)}
                />
              ) : profile.role === "boss" ? (
                <ShieldCheck className="w-12 h-12 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
              ) : profile.role === "merchant" ? (
                <ShieldCheck className="w-12 h-12 text-gx-purple drop-shadow-[0_0_15px_rgba(188,0,255,0.8)]" />
              ) : (
                <User className="w-12 h-12 text-white/60 group-hover:text-white transition-colors" />
              )}
            </div>

            {/* 上传中的遮罩层 */}
            <AnimatePresence>
              {isUploading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center z-20 backdrop-blur-sm"
                >
                  <RefreshCw className="w-6 h-6 text-gx-cyan animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 附加特效层 (仅保留持续旋转动画，无进场动画) */}
            {profile.role === "boss" && (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-4px] rounded-full border border-dashed border-red-500/50 pointer-events-none"
              />
            )}
            {profile.role === "merchant" && (
              <div className="absolute inset-[-6px] rounded-full border-[1px] border-gx-purple/30 rotate-45 pointer-events-none" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
            )}
          </div>
        </div>
        
        <div className="space-y-1 text-left">
          <h1 className="text-2xl font-bold tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {profile.name}
          </h1>
          <div className="flex flex-wrap items-center justify-start gap-2 mt-2">
            <span className={`text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${currentRole.color}`}>
              {currentRole.icon}
              {currentRole.zh}
            </span>
            <span className="text-white/10">|</span>
            
            {/* 赛博钢印 ID 渲染 与 复制交互 */}
            <div 
              className={cn(
                "flex items-center text-[10px] font-mono tracking-widest relative overflow-hidden rounded px-1 -mx-1 transition-colors cursor-pointer group",
                profile.id !== "GX-GUEST-0000" && "hover:bg-white/10"
              )}
              onMouseEnter={() => copyState === "idle" && setCopyState("hover")}
              onMouseLeave={() => copyState === "hover" && setCopyState("idle")}
              onClick={handleCopyId}
            >
              <span className="text-white/40 mr-1">ID:</span>
              
              <div className="relative w-full h-full flex items-center">
                {/* 原始 ID 渲染 (在 copied 状态下隐藏) */}
                <div className={cn(
                  "flex items-center transition-opacity duration-200",
                  copyState === "copied" ? "opacity-0 absolute" : "opacity-100 relative"
                )}>
                  {profile.id === "GX-GUEST-0000" ? (
                    <span className="text-white/40">{profile.id}</span>
                  ) : profile.role === "boss" ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600 font-bold drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
                      {profile.id}
                    </span>
                  ) : (
                    <>
                      <span className="text-white font-bold">{profile.id.split('-')[0]}</span>
                      <span className="text-white/20 mx-1">·</span>
                      <span className="text-white/80 font-bold">{profile.id.split('-')[1]}</span>
                      <span className="text-white/20 mx-1">·</span>
                      <span className="text-white/60">{profile.id.split('-')[2]}</span>
                    </>
                  )}
                </div>

                {/* 悬浮提示 (Hover) */}
                <div className={cn(
                  "absolute inset-0 flex items-center gap-1 text-gx-cyan transition-all duration-200 bg-black/80",
                  copyState === "hover" && profile.id !== "GX-GUEST-0000" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                )}>
                  <Copy className="w-3 h-3" />
                  <span>COPY ID</span>
                </div>

                {/* 复制成功 (Copied) */}
                <div className={cn(
                  "flex items-center gap-1 text-green-400 font-bold transition-all duration-200",
                  copyState === "copied" ? "opacity-100 translate-y-0 relative" : "opacity-0 -translate-y-2 absolute pointer-events-none"
                )}>
                  <Check className="w-3 h-3" />
                  <span>COPIED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {profile.stats && profile.stats.length > 0 && (
        <div className="relative z-10 flex flex-wrap justify-center gap-3">
          {profile.stats.map((stat) => (
            <div
              key={stat.label}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center min-w-[80px]"
            >
              <span className="text-[10px] text-white/20 uppercase tracking-tighter">{stat.label}</span>
              <span className="text-lg font-mono font-bold text-white/80">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 裁剪模态框 */}
      {selectedImageSrc && (
        <AvatarCropModal
          isOpen={cropModalOpen}
          imageSrc={selectedImageSrc}
          onClose={() => {
            setCropModalOpen(false);
            setSelectedImageSrc(null);
          }}
          onComplete={handleUploadCroppedFile}
        />
      )}
    </div>
  );
};
