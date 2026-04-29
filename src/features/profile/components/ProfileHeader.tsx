"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, ShieldCheck, RefreshCw, Copy, Check } from "lucide-react";
import { UserProfile } from "../types";
import { useState, useEffect, useRef } from "react";
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useShop } from "@/features/shop/ShopContext";
import { AvatarCropModal } from "./AvatarCropModal";
import { DataMatrixAssets } from "./DataMatrixAssets";
import { supabase, isMockMode } from "@/lib/supabase";
import Image from "next/image";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";
import { safeCopyToClipboard } from "@/utils/clipboard";

interface ProfileHeaderProps {
 profile: UserProfile;
}

import { useSubscriptionTimer } from "@/hooks/useSubscriptionTimer";

export const ProfileHeader = ({ profile }: ProfileHeaderProps) => {
 const t = useTranslations('ProfileHeader');
 const { settings } = useVisualSettings();
 const isLight = settings.frontendBgIndex !== 0;
 const { user, activeRole, setActiveRole, refreshUserData } = useAuth();
 const { subscription } = useShop();
 const { remainingTime, remainingMilliseconds } = useSubscriptionTimer();
 const [isUploading, setIsUploading] = useState(false);
 const [imageLoaded, setImageLoaded] = useState(false);
 const [cropModalOpen, setCropModalOpen] = useState(false);
 const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
 // 根据角色动态获取头像和名字
 const getRoleSpecificAvatar = () => {
 if (activeRole === 'boss') return (profile as any).boss_avatar_url || profile.avatar;
 if (activeRole === 'merchant') return (profile as any).merchant_avatar_url || profile.avatar;
 return profile.avatar;
 };

 const getRoleSpecificName = () => {
 if (activeRole === 'boss') return (profile as any).boss_name || profile.name;
 if (activeRole === 'merchant') return (profile as any).merchant_name || profile.name;
 return profile.name;
 };

 const currentAvatar = getRoleSpecificAvatar();
 const [localAvatar, setLocalAvatar] = useState<string | undefined>(currentAvatar);
 const isLocalAvatar = localAvatar?.startsWith("data:") || localAvatar?.startsWith("blob:");

 // 当外部 profile 变化或角色切换时，同步本地 avatar
 useEffect(() => {
 const newAvatar = getRoleSpecificAvatar();
 setLocalAvatar(newAvatar);
 // 重置加载状态，除非没有头像
 setImageLoaded(!newAvatar);
 }, [profile.avatar, (profile as any).merchant_avatar_url, (profile as any).boss_avatar_url, activeRole]);
 
 const roleLabels = {
 user: { zh: t('role_user'), color: isLight ? "text-black" : "text-white" },
 merchant: { zh: t('role_merchant'), color: isLight ? "text-black" : "text-white" },
 boss: { zh: t('role_boss'), color: isLight ? "text-black" : "text-white" },
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

 // 名字复制与修改状态机
 const nameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 const [nameCopyState, setNameCopyState] = useState<"idle" | "copied">("idle");
 const [isEditingName, setIsEditingName] = useState(false);
 const [editNameValue, setEditNameValue] = useState(profile.name || "");

 const handleCopyName = async () => {
 if (isEditingName) return;
 const currentName = getRoleSpecificName();
 if (!currentName) return;
 
 const proceedWithUI = () => {
 setNameCopyState("copied");
 if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
 nameTimeoutRef.current = setTimeout(() => {
 setNameCopyState("idle");
 }, 3000); // 延长到3秒，给用户充足时间点击改名
 };

 // 物理级降维防崩溃复制
 await safeCopyToClipboard(currentName);
 proceedWithUI(); // 无论底层是用的哪种方案，都执行 UI 反馈
 };

 const handleEnterEditName = (e: React.MouseEvent) => {
 e.stopPropagation();
 if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
 setNameCopyState("idle");
 setIsEditingName(true);
 setEditNameValue(getRoleSpecificName() || "");
 };

 const handleSaveName = async (e?: React.MouseEvent | React.FormEvent<HTMLFormElement>) => {
 if (e) e.stopPropagation();
 
 // 如果是商户模式，判断新名字和现在的商户名字是否一致
 const currentName = getRoleSpecificName();
 
 const newName = editNameValue.trim();
 if (!newName || newName === currentName) {
 setIsEditingName(false);
 return;
 }
 
 try {
 const updateData: any = {};
 if (activeRole === 'boss') {
 updateData.boss_name = newName;
 } else if (activeRole === 'merchant') {
 updateData.merchant_name = newName;
 } else {
 updateData.name = newName;
 }

 const { error } = await supabase
 .from('profiles')
 .update(updateData)
 .eq('id', user?.id);
 
 if (error) throw error;
 
 await refreshUserData();
 setIsEditingName(false);
 } catch (error) {
 console.error("Failed to update name:", error);
 setIsEditingName(false);
 }
 };

 // 复制 ID 状态机
 const [copyState, setCopyState] = useState<"idle" | "hover" | "copied">("idle");
 const handleCopyId = async () => {
 const rawId = profileGxId || profile.id;
 if (rawId === "GX-GUEST-0000") return;
 
 // 使用物理级降维防崩溃复制
 await safeCopyToClipboard(rawId);
 
 setCopyState("copied");
 setTimeout(() => {
 setCopyState("idle");
 }, 2000);
 };

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

 if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return t('zodiac_aries');
 if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return t('zodiac_taurus');
 if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return t('zodiac_gemini');
 if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return t('zodiac_cancer');
 if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return t('zodiac_leo');
 if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return t('zodiac_virgo');
 if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return t('zodiac_libra');
 if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return t('zodiac_scorpio');
 if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return t('zodiac_sagittarius');
 if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return t('zodiac_capricorn');
 if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return t('zodiac_aquarius');
 if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return t('zodiac_pisces');
 return null;
 };

 const age = calculateAge(profile.birthday);
 const zodiac = getZodiacInfo(profile.birthday);
 const textColorHex = isLight ? "#000000" : "#ffffff";

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
 const updateData: any = {};
 if (activeRole === 'boss') {
 updateData.boss_avatar_url = urlWithTimestamp;
 } else if (activeRole === 'merchant') {
 updateData.merchant_avatar_url = urlWithTimestamp;
 } else {
 updateData.avatar_url = urlWithTimestamp;
 }

 const { error: updateError } = await supabase
 .from('profiles')
 .update(updateData)
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
 <div className="relative flex flex-col items-center text-center pt-[calc(var(--sat)+16px)] pb-[5px] w-full overflow-visible">
 {/* 前景内容区 */}
 <div className="relative z-10 flex flex-col items-center w-full max-w-4xl mx-auto">
 
 {/* 2. 居中巨型头像与星轨 (作为名字的全息锚点) */}
 <div className="relative group mb-6 flex flex-col items-center">
 
 {/* 左侧僚机 (原生物理区: 星图 + 星座 + 年龄) - 底部锚定 */}
 {(zodiac || age !== null) && (
 <div 
 className="absolute bottom-2 left-0 -translate-x-[calc(100%+32px)] z-10 flex flex-col items-end gap-1"
 >
 {/* 星图 SVG 示意图 (动态生成连线与星点) - 高亮色彩共振版 */}
 {zodiac && (
 <div 
 className="relative w-16 h-16 mb-1"
 >
 <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
 {/* 星轨连线 */}
 <polyline points="20,80 40,50 70,40 85,15" fill="none" stroke={textColorHex} strokeWidth="1" opacity="0.6" />
 <polyline points="40,50 60,75 90,60" fill="none" stroke={textColorHex} strokeWidth="1" opacity="0.6" />
 
 {/* 发光星点 (核心节点放大、呼吸、带发光色) */}
 <circle cx="20" cy="80" r="2" fill={textColorHex} />
 <circle cx="40" cy="50" r="3.5" fill={textColorHex} className="" />
 <circle cx="70" cy="40" r="2" fill={textColorHex} />
 <circle cx="85" cy="15" r="3" fill={textColorHex} />
 <circle cx="60" cy="75" r="2" fill={textColorHex} />
 <circle cx="90" cy="60" r="3.5" fill={textColorHex} className="" />
 </svg>
 </div>
 )}
 
 {/* 星座英文缩写 & 年龄组合 - 色彩共振版 */}
 <div className="flex items-center gap-2">
 {age !== null && (
 <span 
 className={cn("text-[12px] tracking-[0.3em] pointer-events-none select-none whitespace-nowrap leading-none ", isLight ? "text-black" : isLight ? "text-black" : "text-white")}
 >
 {age}
 </span>
 )}
 {zodiac && (
 <div 
 className={cn("text-[12px] tracking-[0.3em] pointer-events-none select-none whitespace-nowrap uppercase leading-none ", isLight ? "text-black" : isLight ? "text-black" : "text-white")}
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
 >
 {/* 名字投影 - 点击展开、复制与修改 */}
 {!isEditingName ? (
 <div 
 onClick={handleCopyName}
 className={cn(
 "text-[18px] md:text-[24px] font-black tracking-widest select-none leading-none mb-1 cursor-pointer pr-2 flex items-center group",
 nameCopyState === "copied" 
 ? "whitespace-nowrap max-w-none" 
 : "truncate max-w-[140px] sm:max-w-[180px] md:max-w-[240px] hover:opacity-80",
 isLight ? "text-black" : "text-white"
 )}
 >
 {getRoleSpecificName()}
 {/* 复制成功指示器 & 改名按钮 */}
 <AnimatePresence>
 {nameCopyState === "copied" && (
 <motion.div
 
 
 
 className="ml-2 flex items-center gap-2"
 >
 <div className={cn("flex items-center ", isLight ? "text-black" : isLight ? "text-black" : "text-white")}>
 <Check className="w-4 h-4" strokeWidth={3} />
 <span className="text-[11px] ml-1 tracking-widest uppercase">Copied</span>
 </div>
 <motion.div 
 
 
 onClick={handleEnterEditName}
 className={cn("flex items-center justify-center text-[11px] tracking-widest cursor-pointer border rounded px-1.5 py-0.5 whitespace-nowrap", isLight ? "bg-black/40 text-black hover:text-black hover:bg-black/10 border-black/20" : isLight ? "bg-black/40" : "bg-white/40", isLight ? "text-black" : "text-white", isLight ? "hover:text-black" : "hover:text-white", isLight ? "hover:bg-black/10" : "hover:bg-white/10", isLight ? "border-black/20" : "border-white/20")}
 >
 {t('rename') || '改名'}
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 ) : (
 // 编辑态
 <div className="flex items-center mb-1 pr-2 group">
 <input 
 autoFocus
 value={editNameValue}
 onChange={(e) => setEditNameValue(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
 className={cn("bg-transparent border-b focus:outline-none text-[18px] md:text-[24px] font-black tracking-widest leading-none w-[140px] sm:w-[180px] md:w-[240px] pb-0.5", isLight ? "border-black/50 focus:border-black text-black placeholder-black/20" : "border-white/50 focus:border-white placeholder-white/20", isLight ? "text-black" : isLight ? "text-black" : "text-white")}
 />
 <div className="ml-3 flex items-center gap-3">
 <button onClick={handleSaveName} className={cn(" hover:scale-110 active:scale-95", isLight ? "text-black hover:text-black" : "hover:text-white", isLight ? "text-black" : isLight ? "text-black" : "text-white")}>
 <Check className="w-5 h-5" strokeWidth={3} />
 </button>
 <button onClick={(e) => { e.stopPropagation(); setIsEditingName(false); }} className={cn(" hover:scale-110 active:scale-95", isLight ? "text-black hover:text-black" : isLight ? "text-black" : "text-white", isLight ? "hover:text-black" : "hover:text-white")}>
 <span className="text-[14px] ">✕</span>
 </button>
 </div>
 </div>
 )}

 {/* 角色暗门切换器 */}
 <button 
 onClick={handleRoleCycle}
 className={cn(
 "relative flex items-center text-[11px] tracking-widest uppercase text-left leading-none pointer-events-auto pr-2",
 availableRoles.length > 1 ? "cursor-pointer hover:opacity-80" : "cursor-default",
 currentRole.color
 )}
 >
 {currentRole.zh}
 </button>

 {/* 赛博钢印 ID */}
 <div 
 className={cn(
 "relative flex items-center text-[11px] tracking-widest cursor-pointer group leading-none pointer-events-auto mt-0.5",
 profile.id !== "GX-GUEST-0000" && "hover:opacity-100 "
 )}
 onMouseEnter={() => copyState === "idle" && setCopyState("hover")}
 onMouseLeave={() => copyState === "hover" && setCopyState("idle")}
 onClick={handleCopyId}
 >
 <div className="relative flex items-center whitespace-nowrap pr-2">
 {/* 原始 ID 渲染 - 同步左侧流光 */}
 <div className={cn(
 "flex items-center whitespace-nowrap",
 isLight ? "text-black" : isLight ? "text-black" : "text-white",
 copyState === "copied" ? "opacity-0 absolute" : "opacity-100 relative group-hover:opacity-80"
 )}>
 ID: {profile.id === "GX-GUEST-0000" ? profile.id : profile.id.split('-').length >= 3 ? profile.id.split('-')[0] + '·' + profile.id.split('-')[1] + '·' + profile.id.split('-')[2] : profile.id}
 </div>

 {/* 复制反馈状态 - 保持高亮白/青色 */}
 <div className={cn(
 "flex items-center gap-1 ",
 copyState === "copied" ? (isLight ? "opacity-100 relative text-black" : "opacity-100 relative text-white") : "opacity-0 absolute",
 copyState === "hover" && (isLight ? "text-black" : "text-white")
 )}>
 {copyState === "copied" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
 {copyState === "copied" ? t('copied') : t('copy')}
 </div>
 </div>
 </div>

 {/* 新增：第四行 订阅倒计时引擎 (极简降维法则：BOSS隐藏，移除"剩余"字样) */}
 {activeRole !== 'boss' && subscription.subscriptionTier !== 'FREE' && remainingTime && remainingTime !== "MEMBERSHIP_EXPIRED" && (
 <div 
 className={cn(
 "relative flex items-center text-[11px] tracking-widest leading-none mt-1.5",
 (remainingMilliseconds ?? 0) < 5 * 60 * 1000 
 ? " " + (isLight ? "text-black " : "text-white ") 
 : (remainingMilliseconds ?? 0) < 24 * 60 * 60 * 1000
 ? (isLight ? "text-black" : "text-white")
 : (isLight ? "text-black" : "text-white")
 )}
 >
 {subscription.subscriptionTier} {remainingTime.replace('天', ' 天')}
 </div>
 )}
 </div>

 {/* 动态角色头像框 (无边框极简悬浮) */}
 <div 
 className="w-24 h-24 rounded-full flex items-center justify-center relative cursor-pointer "
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
 
 {/* 内部图标与图片渲染 */}
 <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center">
 {localAvatar && !imageLoaded && (
 <div className="absolute inset-0 flex items-center justify-center bg-black/40">
 <motion.div 
 
 
 className={`w-10 h-10 rounded-full border-2 border-dashed ${isLight ? "border-black/50" : "border-white/50"}`}
 />
 </div>
 )}

 {localAvatar ? (
 <Image
 key={localAvatar} // 物理探针：强制 React 根据 URL 变化重构 DOM，打破浏览器缓存竞态死锁
 src={localAvatar}
 alt="avatar"
 fill
 sizes="128px"
 className={cn(
 "w-full h-full object-cover ",
 imageLoaded ? "opacity-100" : "opacity-0"
 )}
 unoptimized={isLocalAvatar}
 priority={true} // 提升优先级，确保快速渲染
 onLoad={() => setImageLoaded(true)}
 onError={() => setImageLoaded(true)} // 错误降级：如果图片加载失败，强制解除遮罩，防止无限转圈
 />
 ) : profile.role === "boss" ? (
 <ShieldCheck className={cn("w-16 h-16", isLight ? "text-black" : "text-white")} />
 ) : profile.role === "merchant" ? (
 <ShieldCheck className={`w-16 h-16 ${isLight ? "text-black" : "text-white"}`} />
 ) : (
 <User className={`w-16 h-16 ${isLight ? "text-black group-hover:text-black" : "text-white group-hover:text-white"} `} />
 )}
 </div>

 {/* 上传中的遮罩层 */}
 <AnimatePresence>
 {isUploading && (
 <motion.div 
 
 
 
 className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center z-20 "
 >
 <RefreshCw className={`w-8 h-8 animate-spin ${isLight ? "text-black" : "text-white"}`} />
 </motion.div>
 )}
 </AnimatePresence>
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
 <div className={cn("absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 z-0", isLight ? "bg-gradient-to-r from-transparent via-black/10 to-transparent" : "bg-gradient-to-r from-transparent via-white/10 to-transparent")} />
 
 {/* 绝对定位的脉冲流光 (穿梭于所有元素底部) */}
 <div className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 z-0 overflow-hidden">
 <motion.div 
 
 
 className={cn("absolute top-0 bottom-0 left-0 w-[40%]", isLight ? "bg-gradient-to-r from-transparent via-black to-transparent" : "bg-gradient-to-r from-transparent via-white to-transparent")}
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
 className={`px-4 py-2 rounded-xl ${isLight ? "bg-black/5" : "bg-white/5"} border ${isLight ? "border-black/5" : "border-white/5"} flex flex-col items-center min-w-[80px]`}
 >
 <span className={`text-[11px] ${isLight ? "text-black" : "text-white"} uppercase tracking-tighter`}>{stat.label}</span>
 <span className={`text-lg ${isLight ? "text-black" : "text-white"}`}>{stat.value}</span>
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
