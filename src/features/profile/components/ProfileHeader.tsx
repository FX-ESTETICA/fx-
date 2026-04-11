"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, ShieldCheck, RefreshCw, Copy, Check } from "lucide-react";
import { UserProfile } from "../types";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AvatarCropModal } from "./AvatarCropModal";
import { DataMatrixAssets } from "./DataMatrixAssets";
import { supabase, isMockMode } from "@/lib/supabase";
import Image from "next/image";
import { cn } from "@/utils/cn";

interface ProfileHeaderProps {
  profile: UserProfile;
}

export const ProfileHeader = ({ profile }: ProfileHeaderProps) => {
  const { user, activeRole, setActiveRole } = useAuth();
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
    user: { zh: "生活", color: "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" },
    merchant: { zh: "智控", color: "text-gx-cyan drop-shadow-[0_0_12px_rgba(0,242,255,0.7)]" },
    boss: { zh: "BOSS", color: "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" },
  };

  const currentRole = roleLabels[activeRole] || roleLabels[profile.role];

  // 决定可用角色切换逻辑 (与顶层 Dashboard 保持一致)
  const availableRoles: ("user" | "merchant" | "boss")[] = ['user'];
  if (user?.role === 'boss') {
    availableRoles.push('merchant', 'boss');
  } else if (user?.role === 'merchant') {
    availableRoles.push('merchant');
  }

  const handleRoleCycle = () => {
    if (availableRoles.length <= 1) return;
    const currentIndex = availableRoles.indexOf(activeRole);
    const nextRole = availableRoles[(currentIndex + 1) % availableRoles.length];
    setActiveRole(nextRole);
  };

  const profileGxId = (profile as UserProfile & { gx_id?: string; gxId?: string }).gx_id
    ?? (profile as UserProfile & { gx_id?: string; gxId?: string }).gxId;

  // 名字复制与展开状态机
  const [nameCopyState, setNameCopyState] = useState<"idle" | "copied">("idle");
  const handleCopyName = () => {
    if (!profile.name) return;
    navigator.clipboard.writeText(profile.name).then(() => {
      setNameCopyState("copied");
      setTimeout(() => {
        setNameCopyState("idle");
      }, 2000);
    });
  };

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
    
    if (daysDiff < 10) return { level: "LV.0", title: "启航", color: "border-white/20", glow: "shadow-[0_0_10px_rgba(255,255,255,0.1)]" };
    if (daysDiff < 30) return { level: "LV.1", title: "适应", color: "border-gx-cyan/30", glow: "shadow-[0_0_15px_rgba(0,242,255,0.2)]" };
    if (daysDiff < 180) return { level: "LV.2", title: "资深", color: "border-gx-cyan/60", glow: "shadow-[0_0_20px_rgba(0,242,255,0.4)]" };
    if (daysDiff < 365) return { level: "LV.3", title: "核心", color: "border-dashed border-gx-cyan", glow: "shadow-[0_0_25px_rgba(0,242,255,0.5)]" };
    if (daysDiff < 730) return { level: "LV.4", title: "先驱", color: "border-gx-pink/60", glow: "shadow-[0_0_30px_rgba(255,0,234,0.4)]" };
    if (daysDiff < 1825) return { level: "LV.5", title: "传奇", color: "border-gx-purple/80", glow: "shadow-[0_0_40px_rgba(188,0,255,0.5)]" };
    return { level: "LV.6", title: "远古实体", color: "border-white", glow: "shadow-[0_0_50px_rgba(255,255,255,0.8)]" };
  }, [profile.role, profile.createdAt]);

  // 动态推算年龄和星座
  const calculateAge = (birthday?: string) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getZodiacInfo = (birthday?: string) => {
    if (!birthday) return null;
    const date = new Date(birthday);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "白羊座";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "金牛座";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return "双子座";
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return "巨蟹座";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "狮子座";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "处女座";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return "天秤座";
    if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return "天蝎座";
    if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return "射手座";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "摩羯座";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "水瓶座";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "双鱼座";
    return null;
  };

  const getGenderColorInfo = (gender?: string) => {
    if (gender === 'male' || gender === '男') {
      return {
        className: "text-gx-cyan drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]",
        color: "rgb(0, 242, 255)",
        shadow: "rgba(0, 242, 255, 0.8)"
      };
    }
    if (gender === 'female' || gender === '女') {
      return {
        className: "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]",
        color: "rgb(232, 121, 249)",
        shadow: "rgba(232, 121, 249, 0.8)"
      };
    }
    return {
      className: "text-white/60 drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]",
      color: "rgba(255, 255, 255, 0.6)",
      shadow: "rgba(255, 255, 255, 0.4)"
    };
  };

  const age = calculateAge(profile.birthday);
  const zodiac = getZodiacInfo(profile.birthday);
  const genderColorInfo = getGenderColorInfo(profile.gender);

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
    <div className="relative flex flex-col items-center text-center pt-10 pb-[5px] w-full overflow-visible">
      {/* 前景内容区 */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl mx-auto">
        
        {/* 2. 居中巨型头像与星轨 (作为名字的全息锚点) */}
        <div className="relative group mb-6 flex flex-col items-center">
          
          {/* 左侧僚机 (原生物理区: 星图 + 星座 + 年龄) - 底部锚定 */}
          {(zodiac || age !== null) && (
            <div 
              className="absolute bottom-2 left-0 -translate-x-[calc(100%+32px)] z-10 flex flex-col items-end gap-1"
              style={{ 
                transform: 'perspective(1000px) rotateY(15deg) rotateX(5deg) translateZ(-20px)',
                transformOrigin: 'right bottom'
              }}
            >
              {/* 星图 SVG 示意图 (动态生成连线与星点) - 高亮色彩共振版 */}
              {zodiac && (
                <div 
                  className="relative w-16 h-16 mb-1"
                  style={{
                    filter: `drop-shadow(0 0 8px ${genderColorInfo.shadow})`
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    {/* 星轨连线 */}
                    <polyline points="20,80 40,50 70,40 85,15" fill="none" stroke={genderColorInfo.color} strokeWidth="1" opacity="0.6" />
                    <polyline points="40,50 60,75 90,60" fill="none" stroke={genderColorInfo.color} strokeWidth="1" opacity="0.6" />
                    
                    {/* 发光星点 (核心节点放大、呼吸、带发光色) */}
                    <circle cx="20" cy="80" r="2" fill="#fff" filter="blur(0.5px)" />
                    <circle cx="40" cy="50" r="3.5" fill="#fff" filter="blur(1px)" className="animate-pulse" style={{ fill: genderColorInfo.color }} />
                    <circle cx="70" cy="40" r="2" fill="#fff" filter="blur(0.5px)" />
                    <circle cx="85" cy="15" r="3" fill="#fff" filter="blur(1px)" style={{ fill: genderColorInfo.color }} />
                    <circle cx="60" cy="75" r="2" fill="#fff" filter="blur(0.5px)" />
                    <circle cx="90" cy="60" r="3.5" fill="#fff" filter="blur(1px)" className="animate-pulse" style={{ fill: genderColorInfo.color }} />
                  </svg>
                </div>
              )}
              
              {/* 星座英文缩写 & 年龄组合 - 色彩共振版 */}
              <div className="flex items-center gap-2">
                {age !== null && (
                  <span 
                    className="text-[12px] font-bold tracking-[0.3em] pointer-events-none select-none whitespace-nowrap leading-none transition-colors duration-500"
                    style={{
                      color: genderColorInfo.color,
                      WebkitTextStroke: `0.5px ${genderColorInfo.shadow}`,
                      textShadow: `0 0 10px ${genderColorInfo.shadow}`,
                    }}
                  >
                    {age}
                  </span>
                )}
                {zodiac && (
                  <div 
                    className="text-[12px] font-bold tracking-[0.3em] pointer-events-none select-none whitespace-nowrap uppercase leading-none transition-colors duration-500"
                    style={{
                      color: genderColorInfo.color,
                      WebkitTextStroke: `0.5px ${genderColorInfo.shadow}`,
                      textShadow: `0 0 10px ${genderColorInfo.shadow}`,
                    }}
                  >
                    {zodiac}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 右侧僚机 (数字社会区: 名字 + 身份 + ID) - 底部锚定 */}
          <div 
            className="absolute bottom-2 right-0 translate-x-[calc(100%+32px)] z-10 flex flex-col items-start gap-1"
            style={{ 
              transform: 'perspective(1000px) rotateY(-15deg) rotateX(5deg) translateZ(-20px)',
              transformOrigin: 'left bottom'
            }}
          >
            {/* 名字投影 - 点击展开并复制 */}
            <div 
              onClick={handleCopyName}
              className={cn(
                "text-[18px] md:text-[24px] font-black tracking-widest select-none uppercase leading-none mb-1 transition-all duration-500 cursor-pointer pr-2 flex items-center group",
                nameCopyState === "copied" 
                  ? "whitespace-nowrap max-w-none text-gx-cyan" 
                  : "truncate max-w-[140px] sm:max-w-[180px] md:max-w-[240px] hover:brightness-125"
              )}
              style={{
                color: nameCopyState === "copied" ? 'rgb(0, 242, 255)' : 'rgba(255, 255, 255, 0.6)',
                WebkitTextStroke: nameCopyState === "copied" ? '0.5px rgba(0, 242, 255, 0.8)' : '0.5px rgba(0, 242, 255, 0.5)',
                textShadow: nameCopyState === "copied" ? '0 0 15px rgba(0, 242, 255, 0.8)' : '0 0 10px rgba(0, 242, 255, 0.4)',
                filter: nameCopyState === "copied" ? 'none' : 'blur(0.2px)',
              }}
            >
              {profile.name}
              
              {/* 复制成功指示器 */}
              <AnimatePresence>
                {nameCopyState === "copied" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.5, x: -5 }}
                    className="ml-2 text-gx-cyan drop-shadow-[0_0_8px_rgba(0,240,255,1)]"
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 角色暗门切换器 */}
            <button 
              onClick={handleRoleCycle}
              className={cn(
                "relative flex items-center text-[11px] font-bold tracking-widest uppercase transition-all duration-300 text-left leading-none pointer-events-auto pr-2",
                availableRoles.length > 1 ? "cursor-pointer hover:opacity-80" : "cursor-default",
                currentRole.color
              )}
            >
              {currentRole.zh}
            </button>

            {/* 赛博钢印 ID */}
            <div 
              className={cn(
                "relative flex items-center text-[10px] font-mono tracking-widest transition-all duration-500 cursor-pointer group leading-none pointer-events-auto mt-0.5",
                profile.id !== "GX-GUEST-0000" && "hover:opacity-100 opacity-70"
              )}
              onMouseEnter={() => copyState === "idle" && setCopyState("hover")}
              onMouseLeave={() => copyState === "hover" && setCopyState("idle")}
              onClick={handleCopyId}
            >
              <div className="relative flex items-center whitespace-nowrap pr-2">
                {/* 原始 ID 渲染 - 同步左侧流光 */}
                <div className={cn(
                  "flex items-center transition-all duration-300 font-bold whitespace-nowrap",
                  currentRole.color,
                  copyState === "copied" ? "opacity-0 absolute" : "opacity-100 relative group-hover:brightness-125"
                )}>
                  ID: {profile.id === "GX-GUEST-0000" ? profile.id : profile.id.split('-').length >= 3 ? profile.id.split('-')[0] + '·' + profile.id.split('-')[1] + '·' + profile.id.split('-')[2] : profile.id}
                </div>

                {/* 复制反馈状态 - 保持高亮白/青色 */}
                <div className={cn(
                  "flex items-center gap-1 transition-all duration-300 font-bold",
                  copyState === "copied" ? "opacity-100 relative text-gx-cyan drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]" : "opacity-0 absolute",
                  copyState === "hover" && "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                )}>
                  {copyState === "copied" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copyState === "copied" ? "已复制" : "复制"}
                </div>
              </div>
            </div>
          </div>

          {/* 全息阵列 (围绕在头像背后) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 pointer-events-none z-0 opacity-30">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-gx-cyan/30" 
            />
            <motion.div 
              animate={{ rotate: -360 }} 
              transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
              className="absolute inset-6 rounded-full border border-gx-purple/20" 
            />
          </div>

          {/* 动态角色头像框 (尺寸缩小为 w-24 h-24 96px) */}
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
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
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
            
            {/* 性别能量环 (双边框外环) */}
            <div 
              className="absolute inset-[-5px] rounded-full border-[1.5px] pointer-events-none z-0 transition-all duration-500 opacity-80"
              style={{
                borderColor: genderColorInfo.color,
                boxShadow: `0 0 10px ${genderColorInfo.shadow}, inset 0 0 4px ${genderColorInfo.shadow}`
              }}
            >
              {/* 环绕的性别能量粒子 */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-1.5px] rounded-full"
              >
                <div 
                  className="absolute top-0 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" 
                  style={{ 
                    backgroundColor: genderColorInfo.color,
                    boxShadow: `0 0 10px 2px ${genderColorInfo.color}`
                  }} 
                />
              </motion.div>
            </div>

            {/* 内部图标与图片渲染 */}
            <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center">
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
                  sizes="128px"
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-1000",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  unoptimized={isLocalAvatar}
                  priority={false}
                  onLoad={() => setImageLoaded(true)}
                />
              ) : profile.role === "boss" ? (
                <ShieldCheck className="w-16 h-16 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
              ) : profile.role === "merchant" ? (
                <ShieldCheck className="w-16 h-16 text-gx-purple drop-shadow-[0_0_20px_rgba(188,0,255,0.8)]" />
              ) : (
                <User className="w-16 h-16 text-white/60 group-hover:text-white transition-colors" />
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
                  <RefreshCw className="w-8 h-8 text-gx-cyan animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 附加特效层 */}
            {profile.role === "boss" && (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-10px] rounded-full border border-dashed border-red-500/50 pointer-events-none"
              />
            )}
            {profile.role === "merchant" && (
              <div className="absolute inset-[-10px] rounded-full border-[1px] border-gx-purple/30 rotate-45 pointer-events-none" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
            )}
          </div>
        </div>

        {/* 3. 全息共面流光带 (Holographic Piercing Flow) - 分界线重构 */}
        <div className="relative w-full max-w-2xl flex flex-col items-center justify-center mb-0">
          
          {/* --- 第一层：线上方（静态身份阵列） --- */}
          {/* 已重构至左右僚机，此层留白净化 */}
          <div className="relative flex items-center justify-center z-10 px-4 h-4"></div>

          {/* --- 第二层：流光线分割 --- */}
          <div className="relative w-full h-[1px]">
            {/* 绝对定位的底层暗线 (贯穿整个容器) */}
            <div className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
            
            {/* 绝对定位的脉冲流光 (穿梭于所有元素底部) */}
            <div className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 z-0 overflow-hidden">
              <motion.div 
                animate={{ x: ["-200%", "200%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 bottom-0 left-0 w-[40%] bg-gradient-to-r from-transparent via-gx-cyan to-transparent shadow-[0_0_15px_2px_rgba(0,242,255,0.8)]"
              />
            </div>
          </div>

          {/* --- 第三层：线下方（动态日志舱 Holographic Ticker） --- */}
          <div className="relative w-full max-w-lg z-20 mt-1 mb-0">
            <DataMatrixAssets />
          </div>

        </div>

      </div>

      {profile.stats && profile.stats.length > 0 && (
        <div className="relative z-10 flex flex-wrap justify-center gap-3 mt-4">
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
