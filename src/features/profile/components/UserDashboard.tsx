"use client";

import { cn } from "@/utils/cn";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Calendar, MessageSquare, History, Smartphone, RefreshCw, ArrowRight, X, Sparkles, Image as ImageIcon, MapPin } from "lucide-react";
import Link from "next/link";
import { UserProfile } from "../types";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { motion } from "framer-motion";
import { BookingService } from "@/features/booking/api/booking";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

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

  // ------------------------------------------------------------------
  // 状态机 (The Core State Machine) - Firebase Phone Auth 模式
  // ------------------------------------------------------------------
  const [phoneInput, setPhoneInput] = useState(profile.phone || "");
  const [countryCode, setCountryCode] = useState("+39"); // 默认国家号修改为意大利
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState("");
  
  // 国家代码列表
  const countryCodes = [
    { code: "+39", label: "IT" }, // 将意大利置于首位
    { code: "+60", label: "MY" },
    { code: "+86", label: "CN" },
    { code: "+1",  label: "US/CA" },
    { code: "+44", label: "UK" },
    { code: "+65", label: "SG" },
  ];
  
  // Firebase 专属状态与风控状态机
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(false); // 控制显式 reCAPTCHA 降级UI

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // 【全真防刷风控引擎】
  // 废弃游离黑洞方案，采用稳定的 DOM 节点与单例模式，避免触发 Firebase Bot 风控
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);
  
  // ------------------------------------------------------------------
  // 状态机 (The Core State Machine)
  // ------------------------------------------------------------------
  const [showMerchantPortal, setShowMerchantPortal] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"idle" | "submitting" | "success" | "approved" | "rejected">("idle");
  const [formData, setFormData] = useState({
    brandName: "",
    contact: "",
    mapsLink: "",
    genesisCode: ""
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
    if (!formData.mapsLink.trim()) errors.push("mapsLink");
    
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
      const { error } = await supabase
        .from('merchant_applications')
        .insert({
          user_id: user?.id,
          brand_name: formData.brandName,
          contact_phone: formData.contact,
          maps_link: formData.mapsLink,
          genesis_code: formData.genesisCode || null,
          status: 'pending'
        });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 1200));

      // 3. 终极反馈：收束并切回主视图
      setApplicationStatus("success");
      setTimeout(() => {
        setShowMerchantPortal(false);
      }, 1500);

    } catch (e: any) {
      console.error("Submission failed:", e);
      setSubmitError(e.message || "高维链路连接失败，请重试。");
      setApplicationStatus("idle");
    }
  };

  const handleSendCode = async () => {
    if (!phoneInput.trim() || !user) return;
    
    setIsUpdatingPhone(true);
    setPhoneMessage("正在发送 / SENDING...");
    
    const fullPhone = `${countryCode}${phoneInput.trim()}`;
    
    try {
      // 触发显式降级：暴露验证框
      setShowRecaptcha(true);

      // 确保使用稳定的不可见 DOM 节点建立 reCAPTCHA 实例，但这次采用 visible 模式
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'normal', // 降维打击：废弃 invisible，强制要求物理交互
          callback: () => {
            console.log("reCAPTCHA solved in normal mode");
            // 验证通过后可以隐藏或保持，这里让它完成使命
          },
          'expired-callback': () => {
             console.warn("reCAPTCHA expired");
             setPhoneMessage("验证过期，请重试");
             setShowRecaptcha(false);
          }
        });
      }
      
      // 稳如泰山地发送
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifierRef.current);
      
      setConfirmationResult(confirmation);
      setIsCodeSent(true);
      setCountdown(60);
      setPhoneMessage("验证码已发送 / CODE SENT");
      setShowRecaptcha(false); // 发送成功后收起护盾
    } catch (error: any) {
      console.error("SMS 发送失败:", error);
      
      // 出错时清除实例以防死锁，下次重新生成
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
      setShowRecaptcha(false);
      
      const displayMsg = error.code === 'auth/invalid-app-credential' 
        ? "安全凭据无效，请检查云端配置" 
        : error.code === 'auth/too-many-requests'
        ? "请求过于频繁，请稍后再试或更换号码"
        : error.message || "发送失败，请检查号码格式 / SEND FAILED";
        
      setPhoneMessage(displayMsg);
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || !confirmationResult || !user) return;
    
    setIsUpdatingPhone(true);
    setPhoneMessage("正在验证 / VERIFYING...");
    
    try {
      // 1. Firebase 验证验证码
      await confirmationResult.confirm(verificationCode);
      
      // 2. 验证成功后，将手机号写入 Supabase
      const fullPhone = `${countryCode}${phoneInput.trim()}`;
      const { error } = await supabase
        .from('profiles')
        .update({ phone: fullPhone })
        .eq('id', user.id);
        
      if (error) {
        if (error.code === '23505') throw new Error("该终端已被其他实体绑定");
        throw error;
      }
      
      setPhoneMessage("绑定成功 / BIND SUCCESS");
      setIsCodeSent(false); // 验证成功后恢复 UI 状态
      
    } catch (error: any) {
      console.error("验证失败:", error);
      setPhoneMessage("验证码错误或已过期 / INVALID CODE");
    } finally {
      setIsUpdatingPhone(false);
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
              // ASCENSION_PROTOCOL_ACTIVE
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
              {/* 基础身份 */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/5 pb-2">01 / 基础身份 (Identity)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <label className="text-[10px] text-white/40 uppercase font-mono">空间名称 / Brand Name</label>
                    <Input 
                      placeholder="例如: AKIRA STUDIO" 
                      value={formData.brandName}
                      onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                      className={cn(
                        "bg-black/50 focus:border-gx-gold/50 transition-all",
                        formErrors.includes("brandName") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-white/10"
                      )} 
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-[10px] text-white/40 uppercase font-mono">联系电话 / Contact</label>
                    <Input 
                      placeholder="+86 138..." 
                      value={formData.contact}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                      className={cn(
                        "bg-black/50 focus:border-gx-gold/50 transition-all",
                        formErrors.includes("contact") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-white/10"
                      )} 
                    />
                  </div>
                </div>
              </div>

              {/* 物理锚点 */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/5 pb-2">02 / 物理锚点 (Location)</h4>
                <div className="space-y-2 relative">
                  <label className="text-[10px] text-white/40 uppercase font-mono flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Google Maps Link
                  </label>
                  <Input 
                    placeholder="https://maps.google.com/..." 
                    value={formData.mapsLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, mapsLink: e.target.value }))}
                    className={cn(
                      "bg-black/50 focus:border-gx-gold/50 font-mono text-xs transition-all",
                      formErrors.includes("mapsLink") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "border-white/10"
                    )} 
                  />
                  <p className="text-[9px] text-white/30">请提供准确的 Google Maps 链接，系统将自动抓取坐标与公开评分。</p>
                </div>
              </div>

              {/* 核心资产 */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/5 pb-2">03 / 核心视觉 (Visual Assets)</h4>
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
              
              {/* 创世密钥 */}
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gx-gold uppercase font-mono">创世密钥 / Genesis Code (可选)</label>
                  <Input 
                    placeholder="GX-XXXX-XXXX" 
                    value={formData.genesisCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, genesisCode: e.target.value }))}
                    className="bg-gx-gold/5 border-gx-gold/30 focus:border-gx-gold text-center tracking-[0.2em] font-mono text-gx-gold placeholder:text-gx-gold/20 uppercase" 
                  />
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
      <div className={cn(
        "w-full relative overflow-hidden rounded-xl bg-white/[0.02] backdrop-blur-xl transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.4)] border",
        isCodeSent ? "border-gx-cyan/50 shadow-[0_0_30px_rgba(0,240,255,0.2)]" : "border-white/10 hover:border-white/30"
      )}>
        {/* 动态光栅扫描线 */}
        <div className={cn(
          "absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none",
          isCodeSent ? "animate-[shimmer_2s_linear_infinite] via-gx-cyan/10" : "hidden group-hover:block animate-[shimmer_3s_linear_infinite]"
        )} />
        
        <div className="p-6 flex flex-col gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-lg border flex items-center justify-center transition-all",
              isCodeSent 
                ? "border-gx-cyan bg-gx-cyan/20 text-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.5)] animate-pulse" 
                : "border-white/20 bg-white/5 text-white/60"
            )}>
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[13px] font-black tracking-widest uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                手机号绑定
              </h2>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mt-1">
                {isCodeSent ? `AWAITING CODE [${countdown}s]` : "ACCOUNT SECURITY"}
              </p>
            </div>
          </div>
          
          <div className="w-full flex items-center bg-transparent border border-white/20 rounded-xl overflow-hidden focus-within:border-gx-cyan focus-within:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all h-12">
            
            {!isCodeSent ? (
              // 模式 1：输入手机号 (强制单行连体)
              <>
                <div className="h-full flex items-center bg-white/5 border-r border-white/10 shrink-0">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-transparent text-white font-mono text-[11px] outline-none px-2 appearance-none cursor-pointer hover:bg-white/5 transition-colors text-center w-12 sm:w-16"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    {countryCodes.map((item) => (
                      <option key={item.code} value={item.code} className="bg-black text-white">
                        {item.code}
                      </option>
                    ))}
                  </select>
                </div>
                <input 
                  placeholder="PHONE NUMBER" 
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent px-3 text-xs sm:text-sm font-mono text-white outline-none placeholder:text-white/30"
                />
                <button 
                  onClick={handleSendCode} 
                  disabled={isUpdatingPhone || !phoneInput.trim() || `${countryCode}${phoneInput.trim()}` === profile.phone}
                  className="h-full shrink-0 px-3 sm:px-6 bg-transparent text-white hover:bg-white/10 hover:text-gx-cyan font-bold font-mono uppercase tracking-widest text-[10px] transition-all border-l border-white/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white disabled:cursor-not-allowed"
                >
                  {isUpdatingPhone ? "..." : (profile.phone && `${countryCode}${phoneInput.trim()}` === profile.phone) ? "ACTIVE" : "获取验证码"}
                </button>
              </>
            ) : (
              // 模式 2：输入验证码 (强制单行连体)
              <>
                <input 
                  placeholder="6-DIGIT CODE" 
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="flex-1 min-w-0 bg-transparent px-4 text-xs sm:text-sm font-mono text-center tracking-[0.3em] sm:tracking-[0.5em] text-gx-cyan outline-none placeholder:text-white/30 placeholder:tracking-normal"
                />
                <button 
                  onClick={handleVerifyCode} 
                  disabled={isUpdatingPhone || verificationCode.length < 6}
                  className="h-full shrink-0 px-4 sm:px-6 bg-gx-cyan/10 text-gx-cyan hover:bg-gx-cyan/20 font-bold font-mono uppercase tracking-widest text-[10px] transition-all border-l border-gx-cyan/30 disabled:opacity-40 disabled:hover:bg-gx-cyan/10 disabled:cursor-not-allowed"
                >
                  {isUpdatingPhone ? "..." : "验证"}
                </button>
              </>
            )}

          </div>

          {/* 显式 reCAPTCHA 护盾舱 - 常驻DOM，CSS控制显隐 */}
          <div 
            className={cn(
              "w-full flex justify-center overflow-hidden rounded-lg bg-black/40 border border-white/5 transition-all duration-500",
              showRecaptcha ? "py-2 opacity-100 h-auto mt-4" : "opacity-0 h-0 m-0 border-transparent"
            )}
          >
            <div id="recaptcha-container"></div>
          </div>

          {phoneMessage && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
               <p className={cn(
                 "text-[10px] font-bold font-mono uppercase tracking-widest",
                 phoneMessage.includes("激活") ? "text-gx-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" 
                 : phoneMessage.includes("等待") || phoneMessage.includes("发送") ? "text-yellow-400 animate-pulse" 
                 : "text-gx-red drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]"
               )}>
                 {phoneMessage}
               </p>
            </div>
          )}
        </div>
      </div>

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
