"use client";

import { cn } from "@/utils/cn";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Calendar, MessageSquare, History, RefreshCw, ArrowRight, X, Sparkles, Image as ImageIcon, MapPin, Zap } from "lucide-react";
import Link from "next/link";
import { UserProfile } from "../types";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { motion } from "framer-motion";
import { BookingService } from "@/features/booking/api/booking";
import { PhoneAuthBar } from "./PhoneAuthBar";

interface UserDashboardProps {
  profile: UserProfile;
  boundShopId?: string | null;
  industry?: string | null;
}

export const UserDashboard = ({ profile, boundShopId, industry }: UserDashboardProps) => {
  const { user } = useAuth();
  // 如果绑定的商户 industry 为 'none'，则认为该用户没有日历权限
  const hasPrivilege = profile.privileges?.includes("calendar_access") && industry !== 'none';
  const calendarUrl = boundShopId ? `/calendar/${industry || 'beauty'}?shopId=${boundShopId}` : "/calendar/beauty";
  const profileGxId = (profile as UserProfile & { gx_id?: string; gxId?: string }).gx_id 
    ?? (profile as UserProfile & { gx_id?: string; gxId?: string }).gxId 
    ?? (user as any)?.gxId // 尝试从 user 对象中直接提取
    ?? "GX-PENDING"; // 降级处理

  // ------------------------------------------------------------------
  // 状态机 (The Core State Machine)
  // ------------------------------------------------------------------
  const [showMerchantPortal, setShowMerchantPortal] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"idle" | "submitting" | "success" | "approved" | "rejected">("idle");
  const [ascensionMode, setAscensionMode] = useState<"indie" | "enterprise">("indie"); // 新增：身份分形开关
  const [formData, setFormData] = useState({
    brandName: "",
    countryCode: "+39", // 新增：国际区号，默认意大利
    contact: "",        // 纯手机号
    mapsLink: "",
    industry: "beauty", // 新增：必须选择行业引擎
    nexusCode: ""       // 升级：联邦制集结码 (原 genesisCode)
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState("");

  // 挂载时查询是否有历史申请 (引入 BookingService 单例防爆)
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (!user) return;
      try {
        const { data } = await BookingService.getMerchantApplicationStatus(user.id);
        
        if (data) {
          if (data.status === 'pending') {
            setApplicationStatus('success');
            setFormData(prev => ({ ...prev, brandName: data.brand_name }));
          } else if (data.status === 'approved') {
            setApplicationStatus('approved');
          } else if (data.status === 'rejected') {
            setApplicationStatus('rejected');
          }
        }
      } catch (e) {
        console.error("Error in checkExistingApplication:", e);
      }
    };
    checkExistingApplication();
  }, [user]);
  
  // 处理入驻提交 (全真对接 Supabase)
  const handleAscensionSubmit = async () => {
    // 1. 极简校验 (Zero-Tolerance Validation)
    const errors = [];
    if (!formData.brandName.trim()) errors.push("brandName");
    if (!formData.contact.trim()) errors.push("contact");
    
    // 独立门店模式下必须填物理坐标
    if (ascensionMode === "indie" && !formData.mapsLink.trim()) errors.push("mapsLink");
    
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
      const { error } = await supabase
        .from('merchant_applications')
        .insert({
          user_id: user?.id,
          brand_name: formData.brandName,
          contact_phone: fullPhone, // 合并区号与手机号存入数据库
          maps_link: ascensionMode === "indie" ? formData.mapsLink : null,
          industry: ascensionMode === "indie" ? formData.industry : 'enterprise', // 企业模式专属标识
          genesis_code: formData.nexusCode || null, // 后端暂时复用 genesis_code 字段存储集结码
          status: 'pending'
        });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 1200));

      // 3. 终极反馈：收束并切回主视图
      setApplicationStatus("success");
      setTimeout(() => {
        setShowMerchantPortal(false);
      }, 1500);

    } catch (e) {
      console.error("Submission failed:", e);
      const message = e instanceof Error ? e.message : "高维链路连接失败，请重试。";
      setSubmitError(message);
      setApplicationStatus("idle");
    }
  };

  // ------------------------------------------------------------------
  // 场景分发器 (Scene Dispatcher) - 引入 UI 绝对剥夺法则
  // ------------------------------------------------------------------
  
  if (showMerchantPortal && applicationStatus !== "success") {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 bg-transparent relative z-50">
        {/* 绝对剥夺场景：整个页面只剩下这个表单舱，没有任何干扰 */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-4xl flex flex-col sm:flex-row overflow-hidden border border-gx-gold/30 rounded-3xl bg-black/80 backdrop-blur-2xl shadow-[0_0_50px_rgba(255,184,0,0.1)] relative"
          id="application-pod"
        >
          {/* 锁定遮罩 (提交中) */}
          {applicationStatus === "submitting" && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center">
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 border-t-2 border-r-2 border-gx-gold rounded-full animate-spin" />
                <p className="text-gx-gold font-mono tracking-[0.3em] uppercase animate-pulse text-sm">
                  [ 解析高维数据中... ]
                </p>
              </div>
            </div>
          )}

          {/* 左侧：愿景与荣耀 (隐藏于纯移动端小屏) */}
          <div className="hidden sm:flex w-2/5 relative p-10 flex-col justify-between border-r border-white/5 bg-gradient-to-b from-gx-gold/5 to-transparent">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            
            <div className="relative z-10">
              <Sparkles className="w-8 h-8 text-gx-gold mb-6" />
              <h2 className="text-3xl font-black tracking-tighter mb-4 leading-tight">
                重塑您的<br/>商业维度
              </h2>
              <p className="text-white/40 text-sm leading-relaxed">
                GX 拒绝平庸。只有不到 5% 的申请能通过审核。我们正在寻找城市中最具美学与专业精神的实体空间。
              </p>
            </div>
            
            <div className="relative z-10 text-[10px] font-mono text-white/20 uppercase tracking-widest">
              ASCENSION_PROTOCOL_ACTIVE
            </div>
          </div>

          {/* 右侧：高精度资料录入 */}
          <div className="flex-1 p-6 sm:p-10 flex flex-col h-full overflow-y-auto custom-scrollbar max-h-[85vh]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold tracking-tighter">节点接入认证</h3>
                <p className="text-[10px] font-mono text-gx-gold uppercase tracking-widest mt-1">Application Dossier</p>
              </div>
              <button 
                onClick={() => setShowMerchantPortal(false)} 
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {/* 身份分形开关 (Identity Fission) */}
              <div className="flex bg-white/5 p-1 rounded-xl">
                <button 
                  onClick={() => setAscensionMode("indie")}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all rounded-lg",
                    ascensionMode === "indie" ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white/80"
                  )}
                >
                  独立空间 (Indie Node)
                </button>
                <button 
                  onClick={() => setAscensionMode("enterprise")}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all rounded-lg",
                    ascensionMode === "enterprise" ? "bg-gx-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.5)]" : "text-white/40 hover:text-white/80"
                  )}
                >
                  企业联邦 (Enterprise)
                </button>
              </div>

              {/* 基础身份 */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/5 pb-2">01 / 基础身份 (Identity)</h4>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 relative">
                    <label className="text-[10px] text-white/40 uppercase font-mono sm:w-36 shrink-0">
                      {ascensionMode === "indie" ? "空间名称 / BRAND NAME" : "集团名称 / CONGLOMERATE NAME"}
                    </label>
                    <div className="relative z-20 flex-1">
                      <Input 
                        placeholder={ascensionMode === "indie" ? "输入您的店名..." : "输入您的企业/集团名称..."}
                        value={formData.brandName}
                        onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                        className={cn(
                          "bg-black/50 focus:border-gx-gold/50 transition-all h-12",
                          formErrors.includes("brandName") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-white/10"
                        )} 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 relative">
                    <label className="text-[10px] text-white/40 uppercase font-mono sm:w-36 shrink-0">联系电话 / CONTACT</label>
                    <div className="relative z-20 flex flex-1 gap-2">
                      {/* 国际区号选择器 */}
                      <div className="relative w-28 shrink-0">
                        <select
                          value={formData.countryCode}
                          onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 text-white font-mono text-sm outline-none focus:border-gx-gold/50 appearance-none transition-all h-12"
                        >
                          <option value="+39">IT (+39)</option>
                          <option value="+33">FR (+33)</option>
                          <option value="+49">DE (+49)</option>
                          <option value="+44">UK (+44)</option>
                          <option value="+34">ES (+34)</option>
                          <option value="+86">CN (+86)</option>
                          <option value="+1">US (+1)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-[10px]">▼</div>
                      </div>
                      {/* 手机号输入框 */}
                      <Input 
                        placeholder="138..." 
                        value={formData.contact}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                        className={cn(
                          "flex-1 bg-black/50 focus:border-gx-gold/50 transition-all font-mono h-12",
                          formErrors.includes("contact") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-white/10"
                        )} 
                      />
                    </div>
                  </div>
                </div>
                
                {/* 行业引擎选择器 - 仅独立门店模式显示 */}
                {ascensionMode === "indie" && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 relative">
                    <label className="text-[10px] text-white/40 uppercase font-mono sm:w-36 shrink-0">业务类型 / Industry</label>
                    <div className="relative flex-1">
                      <select
                        value={formData.industry}
                        onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-gx-gold/50 appearance-none transition-all h-12"
                      >
                        <option value="beauty">美业 / BEAUTY (Salon, Spa, Nails)</option>
                        <option value="dining">餐饮 / DINING (Restaurant, Cafe)</option>
                        <option value="medical">医疗 / MEDICAL (Clinic, Dental)</option>
                        <option value="fitness">健身 / FITNESS (Gym, Yoga)</option>
                        <option value="expert">专家 / EXPERT (Consulting)</option>
                        <option value="hotel">住宿 / HOTEL (B&B, Resort)</option>
                        <option value="other">常规 / OTHER (General Booking)</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">▼</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 物理锚点 - 仅独立门店模式显示 */}
              {ascensionMode === "indie" && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/5 pb-2">02 / 物理锚点 (Location)</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 relative">
                    <label className="text-[10px] text-white/40 uppercase font-mono flex items-center gap-2 sm:w-36 shrink-0">
                      <MapPin className="w-3 h-3" /> Google Maps Link
                    </label>
                    <div className="relative z-20 flex-1">
                      <Input 
                        placeholder="https://maps.google.com/..." 
                        value={formData.mapsLink}
                        onChange={(e) => setFormData(prev => ({ ...prev, mapsLink: e.target.value }))}
                        className={cn(
                          "bg-black/50 focus:border-gx-gold/50 font-mono text-xs transition-all h-12",
                          formErrors.includes("mapsLink") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-white/10"
                        )} 
                      />
                      <p className="text-[9px] text-white/30 mt-2">请提供准确的 Google Maps 链接，系统将自动抓取坐标与公开评分。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 核心资产 */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/5 pb-2">
                  {ascensionMode === "indie" ? "03 / 核心视觉 (Visual Assets)" : "02 / 集团标志 (Corporate Identity)"}
                </h4>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-gx-gold transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">上传超高清空间照片</p>
                    <p className="text-[10px] text-white/40 mt-1">支持 JPG, PNG. 最多 3 张，用于展示您的审美特权。</p>
                  </div>
                </div>
              </div>
              
              {/* 联邦制兼并 (可选/固定) */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-[10px] font-bold text-gx-gold uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3" /> 04 / 联邦集结 (Federation) {ascensionMode === "indie" ? <span className="text-white/40">- OPTIONAL</span> : <span className="text-gx-gold/60">- AUTO GENERATED</span>}
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 relative">
                  <label className="text-[10px] text-white/40 uppercase font-mono sm:w-36 shrink-0">集团集结码 / Nexus Code</label>
                  <div className="relative z-20 flex-1">
                    {ascensionMode === "enterprise" ? (
                      <div className="bg-black/50 p-3 rounded-lg border border-gx-gold/30 font-mono text-gx-gold flex items-center justify-between">
                        <span className="tracking-widest">{profileGxId || "SYS-ERROR"}</span>
                        <span className="text-[10px] text-gx-gold/40 border border-gx-gold/20 px-2 py-0.5 rounded">不可修改</span>
                      </div>
                    ) : (
                      <Input 
                        placeholder="请输入大老板的起源代码 (Boss ID)" 
                        value={formData.nexusCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, nexusCode: e.target.value }))}
                        className="bg-gx-gold/5 border-gx-gold/20 focus:border-gx-gold text-gx-gold placeholder:text-gx-gold/20 font-mono tracking-widest text-sm h-12"
                      />
                    )}
                    <p className="text-[9px] text-white/30 leading-relaxed mt-2">
                      {ascensionMode === "enterprise" 
                        ? "您正在创建企业联邦。系统已自动将您的专属标识设为最高统摄集结码。" 
                        : <>若您属于某集团旗下门店，请在此输入大老板提供的起源代码 (Boss ID)。<br/><span className="text-gx-gold/60">留空则代表您将建立一家独立的创始空间。</span></>
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              {submitError && (
                <p className="text-gx-red text-xs text-center mb-4 font-mono">{submitError}</p>
              )}
              <Button 
                onClick={handleAscensionSubmit}
                disabled={applicationStatus === "submitting"}
                className="w-full bg-gx-gold text-black hover:bg-gx-gold/90 font-bold uppercase tracking-widest text-sm h-14 disabled:opacity-50"
              >
                {applicationStatus === "submitting" ? "解析中..." : "提交审核 / Submit to Boss"}
              </Button>
              <p className="text-center text-[9px] text-white/30 mt-4 font-mono">
                提交即代表您同意接受 GX 系统的严格审视。
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 常规仪表盘场景 (Normal Dashboard) - 极致清透全息法则 (文字材质升维)
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6 flex flex-col items-center w-full max-w-2xl mx-auto pb-12 pt-8 animate-in fade-in duration-1000 relative">
      
      {/* 核心态势引擎 (取代原有的笨重日历入口) */}
      {hasPrivilege && (
        <div className="w-full">
          <Link href={calendarUrl} className="block w-full">
            <div className="relative group overflow-hidden rounded-xl border border-white/[0.05] bg-transparent hover:border-gx-cyan/30 transition-all duration-500">
              {/* 极细流光边框 / 绝对透明镂空法则 */}
              <div className="absolute inset-0 bg-gradient-to-r from-gx-cyan/0 via-gx-cyan/10 to-gx-cyan/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              
              <div className="relative z-10 p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg border border-gx-cyan/20 flex items-center justify-center text-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)] group-hover:shadow-[0_0_25px_rgba(0,240,255,0.3)] transition-all bg-black/20">
                    <Calendar className="w-4 h-4 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gx-cyan font-mono uppercase tracking-[0.2em] mb-1 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-gx-cyan animate-pulse shadow-[0_0_8px_#00F0FF]" />
                      NEXT NODE // 态势感知
                    </div>
                    <div className="text-sm font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      进入专属空间日历
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] group-hover:text-gx-cyan group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* 辅助操作区 - 高精度胶囊阵列 */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="relative group cursor-pointer rounded-xl border border-white/[0.05] bg-transparent hover:border-white/20 transition-all duration-300 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
           <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
           <div className="relative z-10 p-4 flex items-center justify-center gap-3">
             <MessageSquare className="w-4 h-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors" />
             <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors">AI Recaps</span>
           </div>
        </div>
        <div className="relative group cursor-pointer rounded-xl border border-white/[0.05] bg-transparent hover:border-white/20 transition-all duration-300 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
           <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
           <div className="relative z-10 p-4 flex items-center justify-center gap-3">
             <History className="w-4 h-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors" />
             <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors">Records</span>
           </div>
        </div>
      </div>

      {/* 跨域身份融合信标绑定 (赛博光刻舱 - Firebase Phone Auth 版) */}
      <PhoneAuthBar initialPhone={profile.phone || ""} />

      {/* 退出系统 */}
      <div className="pt-4 w-full flex justify-center">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        >
          <X className="w-3 h-3" />
          SYSTEM LOGOUT
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 黄金入驻横幅 (The Golden Gateway) - 悬浮切割感 */}
      {/* ------------------------------------------------------------------ */}
      <div className="pt-8 w-full">
        {applicationStatus === "success" ? (
          // 审核中状态卡片
          <div className="relative overflow-hidden rounded-xl border border-white/20 bg-black/20 backdrop-blur-sm transition-all duration-700 p-6 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center">
                <RefreshCw className="w-3 h-3 text-white animate-spin-slow drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
              </div>
              <div>
                <h3 className="text-[12px] font-bold tracking-widest uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">审核中 / Auditing</h3>
                <p className="text-[10px] font-mono text-gray-300 mt-0.5 tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">[{formData.brandName || "UNKNOWN"}]</p>
              </div>
            </div>
          </div>
        ) : applicationStatus === "rejected" ? (
          // 被拒绝状态卡片
          <div className="relative overflow-hidden rounded-xl border border-gx-red/30 bg-black/20 backdrop-blur-sm transition-all duration-700 p-6 flex items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
             <div className="w-8 h-8 rounded-full border border-gx-red/40 flex items-center justify-center bg-gx-red/10">
                <X className="w-3 h-3 text-gx-red drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
              </div>
              <div>
                <h3 className="text-[12px] font-bold tracking-widest uppercase text-gx-red drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]">权限驳回 / Denied</h3>
                <p className="text-[10px] font-mono text-gray-300 mt-0.5 tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">未达到接入标准</p>
              </div>
          </div>
        ) : applicationStatus === "approved" ? (
          // 已通过状态卡片
          <div className="relative overflow-hidden rounded-xl border border-gx-cyan/30 bg-black/20 backdrop-blur-sm transition-all duration-700 p-6 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
             <h3 className="text-[12px] font-bold tracking-widest uppercase text-gx-cyan text-center drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">权限已下发，请切换至商户视图</h3>
          </div>
        ) : (
          // 初始黄金横幅 (极致镂空 + 黄金渐变)
          <div onClick={() => setShowMerchantPortal(true)} className="cursor-pointer group">
            <div className="relative overflow-hidden rounded-xl border border-gx-gold/30 hover:border-gx-gold/60 bg-transparent transition-all duration-700 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <div className="absolute inset-0 bg-gradient-to-r from-gx-gold/0 via-gx-gold/5 to-gx-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              
              <div className="relative z-10 p-6 flex items-center justify-between gap-4 bg-black/20">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg border border-gx-gold/40 flex items-center justify-center text-gx-gold shadow-[0_0_15px_rgba(255,184,0,0.2)] group-hover:shadow-[0_0_25px_rgba(255,184,0,0.4)] transition-all bg-black/40">
                    <Sparkles className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,184,0,0.8)]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">成为认证空间</h3>
                    <p className="text-[10px] font-mono text-gray-300 mt-1 tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Request Ascension</p>
                  </div>
                </div>
                
                <ArrowRight className="w-4 h-4 text-gx-gold drop-shadow-[0_0_8px_rgba(255,184,0,0.8)] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
