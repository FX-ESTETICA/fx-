"use client";

import { cn } from "@/utils/cn";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { RefreshCw, X, Sparkles, Play, Eye, LogOut } from "lucide-react";
import { UserProfile } from "../types";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { motion } from "framer-motion";
import { PhoneAuthBar } from "./PhoneAuthBar";
import { PrivacySettings } from "./PrivacySettings";
import { useTranslations } from "next-intl";
import { HoloAscensionCard } from "@/components/shared/HoloAscensionCard";
import { FrontendThemeSwitcher } from "./FrontendThemeSwitcher";

import { useRouter } from "next/navigation";

interface UserDashboardProps {
 profile: UserProfile;
 boundShopId?: string | null;
 industry?: string | null;
 initialShowOnboarding?: boolean;
}

export const UserDashboard = ({ profile, initialShowOnboarding = false }: UserDashboardProps) => {
 const t = useTranslations('UserDashboard');
 const { settings } = useVisualSettings();
 const isLight = settings.frontendBgIndex !== 0;
 const { user, refreshUserData, signOut } = useAuth();
 // ------------------------------------------------------------------
 // 状态机 (The Core State Machine)
 // ------------------------------------------------------------------
 const [showMerchantPortal, setShowMerchantPortal] = useState(initialShowOnboarding);
 const router = useRouter();

 // ------------------------------------------------------------------
 // 自动唤醒与无痕清理 (Auto-wake & Trace-clean)
 // ------------------------------------------------------------------
 useEffect(() => {
 if (initialShowOnboarding) {
 // 抹除 URL 中的 action=onboard 参数，实现真正的“无痕拦截”
 router.replace('/dashboard');
 }
 }, [initialShowOnboarding, router]);

 // 从全局引擎获取最新申请状态，实现零闪烁 (Zero-Flicker)
 const [applicationStatus, setApplicationStatus] = useState<"idle" | "submitting" | "success" | "approved" | "rejected">(() => {
 const status = (user as any)?.applicationStatus;
 if (status === 'pending') return 'success';
 if (status === 'approved') return 'approved';
 if (status === 'rejected') return 'rejected';
 return 'idle';
 });
 
 const [ascensionMode, setAscensionMode] = useState<"indie" | "enterprise">("indie"); // 新增：身份分形开关
 const [formData, setFormData] = useState({
 brandName: "",
 countryCode: "+39", // 新增：国际区号，默认意大利
 contact: "", // 纯手机号
 mapsLink: "",
 industry: "beauty", // 新增：必须选择行业引擎
 nexusCode: "" // 升级：联邦制集结码 (原 genesisCode)
 });
 const [formErrors, setFormErrors] = useState<string[]>([]);
 const [submitError, setSubmitError] = useState("");

 const [mounted, setMounted] = useState(false);
 const [isBannerSunk, setIsBannerSunk] = useState(false); // 新增：商业入口沉降状态

 useEffect(() => {
 setMounted(true);
 // 5秒后触发商业入口沉降
 const sinkTimer = setTimeout(() => {
 setIsBannerSunk(true);
 }, 5000);
 return () => clearTimeout(sinkTimer);
 }, []);

 // 监听全局状态变更 (实现秒级闭环同步)
 useEffect(() => {
 const status = (user as any)?.applicationStatus;
 if (status === 'pending') setApplicationStatus('success');
 else if (status === 'approved') setApplicationStatus('approved');
 else if (status === 'rejected') setApplicationStatus('rejected');
 else setApplicationStatus('idle');
 }, [user]);

 // 处理入驻提交 (全真对接 Supabase)
 const handleAscensionSubmit = async () => {
 // 1. 极简校验 (Zero-Tolerance Validation)
 const errors = [];
 if (!formData.brandName.trim()) errors.push("brandName");
 if (!formData.contact.trim()) errors.push("contact");
 
 // 独立门店模式下必须填物理坐标 (由于 UI 降噪已剥离该输入框，这里必须切断底层拦截)
 // if (ascensionMode === "indie" && !formData.mapsLink.trim()) errors.push("mapsLink");
 
 if (errors.length > 0) {
 setFormErrors(errors);
 const pod = document.getElementById("application-pod");
 if (pod) {
 pod.classList.add("animate-shake");
 setTimeout(() => pod.classList.remove("animate-shake"), 500);
 }
 return;
 }

 // 2. 状态升维：锁定与解析
 setFormErrors([]);
 setSubmitError("");
 setApplicationStatus("submitting");

 try {
 const fullPhone = `${formData.countryCode} ${formData.contact}`;
 
 // 2. 创建商户申请记录
 const { error: appError } = await supabase
 .from('merchant_applications')
 .insert({
 user_id: user?.id,
 brand_name: formData.brandName,
 contact_phone: fullPhone, // 合并区号与手机号存入数据库
 maps_link: ascensionMode === "indie" ? formData.mapsLink : null,
 industry: ascensionMode === "indie" ? formData.industry : 'enterprise', // 企业模式专属标识
 genesis_code: formData.nexusCode || null, // 后端暂时复用 genesis_code 字段存储集结码
 status: formData.nexusCode ? 'pending' : 'approved' // 有总公司ID则挂起，没有则秒批
 });

 if (appError) throw appError;

 // 3. 如果是独立开店（没有填总公司 ID），执行“秒激活”物理链路
 if (!formData.nexusCode) {
 // a. 直接在 shops 表铸造星球，状态强制为 active
 const { data: newShop, error: shopError } = await supabase
 .from('shops')
 .insert({
 name: formData.brandName,
 industry: formData.industry,
 owner_principal_id: user?.id, // 当前用户就是造物主
 nebula_status: 'active' // 【核心物理修改】：秒激活！
 })
 .select()
 .single();

 if (shopError) throw shopError;

 // b. 建立物理绑定关系 (shop_bindings)
 const { error: bindError } = await supabase
 .from('shop_bindings')
 .insert({
 shop_id: newShop.id,
 user_id: user?.id,
 role: 'OWNER'
 });

 if (bindError) throw bindError;

 // c. 【核心修复】：同步将用户的 profile role 更新为 merchant，解决底层 RLS 拦截问题
 const { error: roleError } = await supabase
 .from('profiles')
 .update({ role: 'merchant' })
 .eq('id', user?.id);

 if (roleError) console.error("Failed to update user role to merchant:", roleError);
 }
 
 // 成功后，立刻触发全局引擎同步
 await refreshUserData();

 await new Promise(resolve => setTimeout(resolve, 1200));

 // 3. 终极反馈：收束并切回主视图
 setApplicationStatus("success");
 setTimeout(() => {
 setShowMerchantPortal(false);
 // 【移除幽灵刷新】：废弃硬重载，完全依赖 React 状态机和 refreshUserData 触发路由切换
 }, 1500);

 } catch (e) {
 console.error("Submission failed:", e);
 const message = e instanceof Error ? e.message : "高维链路连接失败，请重试。";
 setSubmitError(message);
 setApplicationStatus("idle");
 }
 };

 // ------------------------------------------------------------------
 // 一镜到底连贯瀑布流 (Seamless Continuum Waterfall)
 // ------------------------------------------------------------------
 
 if (showMerchantPortal && applicationStatus !== "success" && mounted) {
 const portalContent = (
 <div className="fixed inset-0 z-[99999] bg-black flex overflow-hidden font-sans">
 {/* 左轨：愿景丰碑 (大屏展示) */}
 <div className={`hidden lg:flex w-2/5 relative p-12 xl:p-20 flex-col justify-between border-r ${isLight ? "border-black/10" : "border-white/10"} bg-gradient-to-b ${isLight ? "from-black/10" : "from-white/10"} to-black`}>
 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity" />
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
 
 <div className="relative z-10 space-y-6">
 <Sparkles className={`w-12 h-12 ${isLight ? "text-black" : "text-white"}`} />
 <h2 className={`text-4xl xl:text-5xl font-black tracking-tighter leading-tight ${isLight ? "text-black" : "text-white"}`}>
 {t('txt_d3a60f')}<br />{t('txt_697bfe')}
 </h2>
 <p className={`${isLight ? "text-black" : "text-white"} text-sm xl:text-base leading-relaxed max-w-sm`}>
 {t('txt_d946ba')}
 </p>
 </div>
 </div>

 {/* 移动端顶部状态栏 (仅小屏展示) */}
 <div className="lg:hidden absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-center pointer-events-none bg-gradient-to-b from-black/90 to-transparent">
 <div className="space-y-1">
 <h2 className={`text-lg font-black tracking-tighter ${isLight ? "text-black" : "text-white"} flex items-center gap-2`}>
 <Sparkles className={`w-4 h-4 ${isLight ? "text-black" : "text-white"}`} />
 {t('txt_d3a60f')} {t('txt_697bfe')}
 </h2>
 </div>
 <button 
 onClick={() => setShowMerchantPortal(false)} 
 className={`w-10 h-10 rounded-full ${isLight ? "bg-black/10 text-black hover:text-black hover:bg-black/20" : "bg-white/10 text-white hover:text-white hover:bg-white/20"} flex items-center justify-center pointer-events-auto `}
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 
 {/* 大屏关闭按钮 */}
 <button 
 onClick={() => setShowMerchantPortal(false)} 
 className={`hidden lg:flex absolute top-12 right-12 w-12 h-12 rounded-full ${isLight ? "bg-black/5 text-black hover:text-black hover:bg-black/10" : "bg-white/5 text-white hover:text-white hover:bg-white/10"} items-center justify-center z-50 `}
 >
 <X className="w-6 h-6" />
 </button>

 {/* 右轨：一镜到底表单矩阵 */}
 <div className="flex-1 relative overflow-y-auto custom-scrollbar scroll-smooth bg-black/90 lg:bg-transparent">
 {/* 小屏底层视差背景 */}
 <div className="lg:hidden fixed inset-0 z-0 pointer-events-none">
 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity" />
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/60" />
 </div>

 <div className="max-w-2xl mx-auto px-6 py-28 lg:py-32 relative z-10">
 {/* 锁定遮罩 (提交中) */}
 {applicationStatus === "submitting" && (
 <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center">
 <div className="flex flex-col items-center gap-6">
 <div className={`w-20 h-20 border-t-2 border-r-2 rounded-full animate-spin ${isLight ? "border-black" : "border-white"}`} />
 <p className={` tracking-[0.3em] uppercase text-sm ${isLight ? "text-black" : "text-white"}`}>
 {t('txt_950181')}
 </p>
 </div>
 </div>
 )}

 <div className="space-y-16">
 {/* Section 1: 基础身份 */}
 <section className="space-y-8">
 <div className={`border-b ${isLight ? "border-black/5" : "border-white/5"} pb-4`}>
 <h3 className={`text-2xl font-black tracking-tighter ${isLight ? "text-black" : "text-white"}`}>{t('txt_e47036')}</h3>
 </div>
 
 <div className="space-y-6">
 {/* Identity Fission Switch - 已删除集团总部按钮 */}
 <div className={`flex ${isLight ? "bg-black/5" : "bg-white/5"} p-1 rounded-xl`}>
 <button 
 onClick={() => setAscensionMode("indie")}
 className={cn(
 "flex-1 py-3 text-xs tracking-widest rounded-lg",
 ascensionMode === "indie"
 ? cn("pointer-events-none", isLight ? "bg-black text-white" : "bg-white text-black")
 : cn("", isLight ? "text-black hover:text-black" : "text-white hover:text-white")
 )}
 >
 {t('txt_1d078b')}</button>
 </div>

 {/* Brand Name */}
 <div className="space-y-2">
 <label className={`text-xs ${isLight ? "text-black" : "text-white"} tracking-widest`}>
 {t('txt_d4b097')}</label>
 <Input 
 placeholder={t('txt_f3ef2d')}
 value={formData.brandName}
 onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
 className={cn(
 " h-14 text-base ",
 isLight ? "focus:border-black/20" : "focus:border-white/20",
 formErrors.includes("brandName") ? (isLight ? "border-black" : "border-white") : (isLight ? "border-black/10 bg-black/5" : "border-white/10 bg-white/5")
 )} 
 />
 </div>

 {/* Contact */}
 <div className="space-y-2">
 <label className={`text-xs ${isLight ? "text-black" : "text-white"} tracking-widest`}>{t('txt_9e1660')}</label>
 <div className="flex gap-2">
 <div className="relative w-28 shrink-0">
 <select
 value={formData.countryCode}
 onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
 className={`w-full bg-black/50 border ${isLight ? "border-black/10 text-black focus:border-black/20" : "border-white/10 text-white focus:border-white/20"} rounded-lg px-1 text-center text-sm outline-none appearance-none h-14`}
 >
 <option value="+39">{t('txt_2aacf5')}</option>
 <option value="+33">{t('txt_08248a')}</option>
 <option value="+49">{t('txt_457747')}</option>
 <option value="+44">{t('txt_461ac5')}</option>
 <option value="+34">{t('txt_adfe91')}</option>
 <option value="+86">{t('txt_e76414')}</option>
 <option value="+1">{t('txt_6d4b58')}</option>
 </select>
 </div>
 <Input 
 placeholder={t('txt_577644')} 
 value={formData.contact}
 onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
 className={cn(
 " h-14 text-base tracking-widest",
 isLight ? "focus:border-black/20" : "focus:border-white/20",
 formErrors.includes("contact") ? (isLight ? "border-black" : "border-white") : (isLight ? "border-black/10 bg-black/5" : "border-white/10 bg-white/5")
 )} 
 />
 </div>
 </div>

 {/* Industry - 已去除判断条件，因为只有门店一种模式 */}
 <div className="space-y-2">
 <label className={`text-xs ${isLight ? "text-black" : "text-white"} tracking-widest`}>{t('txt_09ab42')}</label>
 <div className="relative">
 <select
 value={formData.industry}
 onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
 className={`w-full bg-black/50 border ${isLight ? "border-black/10 text-black focus:border-black/20" : "border-white/10 text-white focus:border-white/20"} rounded-lg px-3 text-sm outline-none appearance-none h-14 tracking-widest`}
 >
 <option value="beauty">{t('txt_4a6a90')}</option>
 <option value="dining">{t('txt_2a0ad6')}</option>
 <option value="medical">{t('txt_2fbcd8')}</option>
 <option value="fitness">{t('txt_c24d6f')}</option>
 <option value="expert">{t('txt_714dc5')}</option>
 <option value="hotel">{t('txt_d8bb4b')}</option>
 <option value="other">{t('txt_22b777')}</option>
 </select>
 </div>
 </div>
 </div>
 </section>

 {/* 物理分流器：总公司 ID (选填) */}
 <section className="space-y-8">
 <div className={`border-b ${isLight ? "border-black/5" : "border-white/5"} pb-4`}>
 <h3 className={`text-2xl font-black tracking-tighter ${isLight ? "text-black" : "text-white"}`}>
 {t('txt_b4154b')}</h3>
 </div>
 
 <div className="space-y-4">
 <label className={`text-xs ${isLight ? "text-black" : "text-white"} tracking-widest`}>{t('txt_40223b')}</label>
 <Input 
 placeholder={t('txt_95cd99')} 
 value={formData.nexusCode}
 onChange={(e) => setFormData(prev => ({ ...prev, nexusCode: e.target.value }))}
 className={` tracking-widest text-base h-14 text-center focus:outline-none focus:ring-1 ${isLight ? "bg-black/10 border-black/20 focus:border-black text-black placeholder:text-black focus:ring-black" : "bg-white/10 border-white/20 focus:border-white text-white placeholder:text-white focus:ring-white"}`}
 />
 <div className={`mt-6 p-4 rounded-xl border ${isLight ? "border-black/5 bg-black/5" : "border-white/5 bg-white/5"}`}>
 <p className={`text-xs ${isLight ? "text-black" : "text-white"} leading-relaxed tracking-widest`}>
 {t('txt_509c2e')}<br/><br/>
 <span className={` ${isLight ? "text-black" : "text-white"}`}>{t('txt_292fbd')}</span>
 </p>
 </div>
 </div>
 </section>

 {/* 终极跃迁引擎 (Global Submit) */}
 <div className="pt-12 pb-10">
 {submitError && (
 <p className={`text-xs text-center mb-6 p-3 rounded-lg border ${isLight ? "text-black bg-black/10 border-black/20" : "text-white bg-white/10 border-white/20"}`}>{submitError}</p>
 )}
 <Button 
 className={`w-full font-black tracking-widest text-base h-16 rounded-xl ${isLight ? "bg-black text-white hover:bg-black/90" : "bg-white text-black hover:bg-white/90"}`}
 onClick={handleAscensionSubmit}
 disabled={applicationStatus === "submitting"}
 >
 {applicationStatus === "submitting" ? "解析中..." : "提交申请"}
 </Button>
 <p className={`text-center text-[11px] ${isLight ? "text-black" : "text-white"} mt-6 tracking-widest`}>
 {t('txt_a2e766')}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 return createPortal(portalContent, document.body);
 }

 // MOCK 数据：数字印记 (Digital Footprints) 视频缩略图
 const mockFootprints = [
 {
 id: "vid_1",
 title: "2024 春夏色彩趋势预告",
 cover: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=400&auto=format&fit=crop",
 views: "1.2k",
 duration: "0:45"
 },
 {
 id: "vid_2",
 title: "光影美学：空间氛围塑造",
 cover: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=400&auto=format&fit=crop",
 views: "856",
 duration: "1:12"
 },
 {
 id: "vid_3",
 title: "极致体验的最后 1%",
 cover: "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=400&auto=format&fit=crop",
 views: "3.4k",
 duration: "2:05"
 }
 ];

 // 渲染高调的黑金入驻横幅
 const renderCommercialNexus = () => (
 <motion.div 
 
 
 
 
 className="w-full px-2"
 >
 {applicationStatus === "success" ? (
 // 审核中状态卡片
 <div className={`relative overflow-hidden rounded-xl border ${isLight ? "border-black/20" : "border-white/20"} bg-black/20 p-5 flex items-center justify-between`}>
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center">
 <RefreshCw className={`w-3 h-3 ${isLight ? "text-black" : "text-white"} animate-spin-slow`} />
 </div>
 <div>
 <h3 className={`text-xs tracking-widest ${isLight ? "text-black" : "text-white"}`}>{t('txt_58d6be')}</h3>
 <p className={`text-[11px] ${isLight ? "text-black" : "text-white"} mt-0.5 tracking-widest`}>[{formData.brandName || "未知名称"}]</p>
 </div>
 </div>
 </div>
 ) : applicationStatus === "rejected" ? (
 // 被拒绝状态卡片
 <div className={`relative overflow-hidden rounded-xl border ${isLight ? "border-black/30 bg-black/5" : "border-white/30 bg-white/5"} p-5 flex items-center gap-4`}>
 <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${isLight ? "border-black/40 bg-black/10" : "border-white/40 bg-white/10"}`}>
 <X className={`w-3 h-3 ${isLight ? "text-black" : "text-white"}`} />
 </div>
 <div>
 <h3 className={`text-xs tracking-widest ${isLight ? "text-black" : "text-white"}`}>{t('txt_f50e9d')}</h3>
 <p className={`text-[11px] mt-1 ${isLight ? "text-black" : "text-white"}`}>{t('txt_43ea07')}</p>
 </div>
 </div>
 ) : applicationStatus === "approved" ? (
 // 审批通过后，在生活页横幅区域彻底消失 (已降维迁移至智控页)
 null
 ) : (
 <HoloAscensionCard onClick={() => setShowMerchantPortal(true)} />
 )}
 </motion.div>
 );

 // ------------------------------------------------------------------
 // 常规仪表盘场景 (Normal Dashboard) - 极致清透全息法则 (文字材质升维)
 // ------------------------------------------------------------------

 return (
 <div className="space-y-4 flex flex-col items-center w-full max-w-2xl mx-auto pb-12 pt-[5px] animate-in fade-in relative">
 
 {/* 脉冲流光切割线 (The Piercing Flow) - 绝对定位在接缝处 */}
 <div className="absolute top-0 left-0 right-0 h-[1px] z-10">
 <div className={`absolute inset-0 bg-gradient-to-r from-transparent ${isLight ? "via-black/20" : "via-white/20"} to-transparent`} />
 <div className="absolute inset-0 overflow-hidden">
 <motion.div 
 
 
 className={`absolute top-0 bottom-0 left-0 w-[30%] bg-gradient-to-r from-transparent ${isLight ? "via-black" : "via-white"} to-transparent`}
 />
 </div>
 </div>

 {/* 核心态势引擎 (笨重日历入口) 已根据冗余法则物理超度，入口统一收归右下角全局虫洞胶囊 */}

 {/* ------------------------------------------------------------------ */}
 {/* 商业入驻枢纽 (高光降临期) - 0到5秒展示在顶部 */}
 {/* ------------------------------------------------------------------ */}
 {!isBannerSunk && (
 <div className="w-full pt-2 pb-2">
 {renderCommercialNexus()}
 </div>
 )}

 {/* 数字印记 (Digital Footprints) - 0成本动态横滑列表 */}
 <motion.div className="w-full pt-4 space-y-3">
 <div className="flex items-center justify-between px-2">
 <div className={`flex items-center gap-2 text-[11px] uppercase tracking-widest ${isLight ? "text-black" : "text-white"}`}>
 <div className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-black/20" : "bg-white/20"}`} />
 <span>{t('txt_999d5c')}</span>
 </div>
 <button className={`text-[11px] uppercase tracking-widest ${isLight ? "text-black hover:text-black" : "text-white hover:text-white"}`}>
 {t('txt_0467cc')}</button>
 </div>

 {/* 滑动视口：极致阻尼与隐藏滚动条 */}
 <div className="w-full overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-2 px-2">
 <div className="flex gap-3 min-w-max">
 {mockFootprints.map((video) => (
 <div 
 key={video.id}
 className={`relative w-28 md:w-32 aspect-[9/16] shrink-0 snap-center rounded-xl overflow-hidden cursor-pointer group bg-black/20 border ${isLight ? "border-black/5" : "border-white/5"} hover:border-white/20 `}
 >
 {/* 背景封面层：使用 img 标签模拟极低成本的 WebP 缩略图 */}
 <img 
 src={video.cover} 
 alt={video.title}
 className="absolute inset-0 w-full h-full object-cover "
 />
 
 {/* 底部信息遮罩层 */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

 {/* 中央播放诱导元件 */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center border bg-black/40 border-white/20">
 <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" />
 </div>

 {/* 数据锚点挂载区 */}
 <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col gap-1.5 pointer-events-none">
 <span className="text-[11px] text-white leading-tight line-clamp-1">
 {video.title}
 </span>
 <div className="flex items-center justify-between text-[11px] text-white">
 <div className="flex items-center gap-1">
 <Eye className="w-2.5 h-2.5" />
 <span>{video.views}</span>
 </div>
 <span className="bg-black/50 px-1 rounded border border-white/10 text-white">
 {video.duration}
 </span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </motion.div>

 {/* 系统底层锚点 (System Anchor) */}
 <motion.div className="pt-6 pb-6 w-full flex flex-col items-center justify-center px-2 gap-6">
 {/* 前端专属壁纸切换器 */}
 <FrontendThemeSwitcher />

 {/* 融合胶囊组件 */}
 <PhoneAuthBar initialPhone={profile.phone || ""} className="max-w-none mx-0 w-auto" mode="life" />
 
 {/* 隐私防御网关 */}
 <PrivacySettings />

 {/* 退出账号按钮 */}
 <Button
 variant="ghost"
 size="sm"
 className={`text-[11px] uppercase tracking-widest flex items-center gap-1.5 ${isLight ? "text-black hover:text-black" : "text-white hover:text-white"}`}
 onClick={async () => {
 await signOut();
 window.location.href = "/login";
 }}
 >
 <LogOut className="w-3 h-3" />
 {t('txt_4d90f0')}</Button>
 </motion.div>

 {/* ------------------------------------------------------------------ */}
 {/* 商业入驻枢纽 (底部沉降期) - 5秒后沉底 */}
 {/* ------------------------------------------------------------------ */}
 {isBannerSunk && (
 <div className="w-full pb-8">
 {renderCommercialNexus()}
 </div>
 )}

 </div>
 );
};
