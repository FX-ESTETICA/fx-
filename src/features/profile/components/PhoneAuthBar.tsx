"use client";

import { cn } from "@/utils/cn";
import { Smartphone, Eye, EyeOff, X, Terminal } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { useTranslations } from "next-intl";

interface PhoneAuthBarProps {
  initialPhone?: string;
  className?: string;
}

export const PhoneAuthBar = ({ initialPhone = "", className }: PhoneAuthBarProps) => {
  const { user } = useAuth();
  const t = useTranslations('PhoneAuthBar');
  
  // ------------------------------------------------------------------
  // 状态机 (The Core State Machine) - Firebase Phone Auth 模式
  // ------------------------------------------------------------------
  const [phoneInput, setPhoneInput] = useState(initialPhone);
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
  const [showFullPhone, setShowFullPhone] = useState(false); // 控制军牌号码打码/显影
  const [isEditMode, setIsEditMode] = useState(false); // 控制长按越权进入重新绑定模式

  // 长按 (Long Press) 检测逻辑
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const handlePointerDown = () => {
    setIsPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      setIsEditMode(true); // 长按 1.5 秒后进入编辑模式
      setIsPressing(false);
    }, 1500);
  };

  const handlePointerUpOrLeave = () => {
    setIsPressing(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 格式化手机号打码逻辑
  const formatHiddenPhone = (phone: string) => {
    if (!phone || phone.length < 8) return phone;
    // 假设是 +39123456789，保留前3位(国家码)+前3位，和后4位，中间替换为圆点
    const prefix = phone.substring(0, 6);
    const suffix = phone.substring(phone.length - 4);
    const dots = " ••• ";
    return `${prefix}${dots}${suffix}`;
  };

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
    } catch (error) {
      console.error("SMS 发送失败:", error);
      // 出错时清除实例以防死锁，下次重新生成
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
      setShowRecaptcha(false);
      
      const errorCode = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
      const errorMessage = error instanceof Error ? error.message : "";
      const displayMsg = errorCode === 'auth/invalid-app-credential' 
        ? "安全凭据无效，请检查云端配置" 
        : errorCode === 'auth/too-many-requests'
        ? "请求过于频繁，请稍后再试或更换号码"
        : errorMessage || "发送失败，请检查号码格式 / SEND FAILED";
        
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
      setIsEditMode(false); // 成功后退出越权编辑模式
      
    } catch (error) {
      console.error("验证失败:", error);
      setPhoneMessage("验证码错误或已过期 / INVALID CODE");
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  return (
    <div className={cn("w-full flex flex-col relative z-10", className)}>
      {initialPhone && !isEditMode ? (
        <div className="w-full flex flex-col items-center justify-center pt-8 pb-4">
          {/* 形态 B：已绑定（系统底层信标 - 融合式胶囊） */}
          <div className={cn(
            "flex items-center rounded-full border backdrop-blur-md overflow-hidden transition-all duration-500",
            isPressing 
              ? "bg-gx-cyan/10 border-gx-cyan/50 shadow-[0_0_20px_rgba(0,240,255,0.3)] scale-[0.98]" 
              : "bg-black/40 border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
          )}>
            
            {/* 左侧：机甲铭牌区 (长按进入编辑，单击切换打码) */}
            <div 
              className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/5 transition-all duration-300 group select-none touch-none"
              onClick={() => !isPressing && setShowFullPhone(!showFullPhone)}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUpOrLeave}
              onPointerLeave={handlePointerUpOrLeave}
              onPointerCancel={handlePointerUpOrLeave}
            >
              {/* 状态指示灯 (呼吸绿点) */}
              <div className="relative flex items-center justify-center w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-green-500 opacity-75 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
              
              {/* 铭牌文本区 */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-white/50">{t('txt_421f72')}</span>
                <span className="text-[11px] font-mono tracking-[0.1em] text-white/90 w-[115px] text-center transition-all duration-300">
                  {showFullPhone ? initialPhone : formatHiddenPhone(initialPhone)}
                </span>
              </div>

              {/* 物理锁图标 (小眼睛) */}
              <div className="flex items-center justify-center w-4 h-4 ml-1">
                {showFullPhone ? (
                  <EyeOff className="w-3 h-3 text-white/40 group-hover:text-gx-cyan transition-colors" />
                ) : (
                  <Eye className="w-3 h-3 text-white/20 group-hover:text-gx-cyan transition-colors" />
                )}
              </div>
            </div>

            {/* 极细物理分割线 */}
            <div className="w-px h-4 bg-white/10" />

            {/* 右侧：退出系统区 */}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="flex items-center justify-center px-5 py-2 text-[10px] font-bold tracking-widest text-white/30 hover:text-red-500/80 transition-colors group"
            >
              <span className="drop-shadow-sm">{t('txt_732906')}</span>
            </button>
            
          </div>
          
          {/* 微小提示文案 (Progress Bar Effect based on press) */}
          <div className="mt-2 h-3 flex items-center justify-center overflow-hidden">
            <span className={cn(
              "text-[9px] font-mono tracking-widest transition-all duration-300",
              isPressing ? "text-gx-cyan scale-105" : "text-white/20"
            )}>
              {isPressing ? ">>> AUTHORIZING OVERRIDE <<<" : "长按左侧重置终端"}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[320px] mx-auto flex items-center bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden focus-within:border-gx-cyan focus-within:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all h-10 group">
          {/* 形态 A：未绑定 / 编辑模式（极简输入流 - 终极空间降维） */}
          
          {/* 左侧：现代手机图标前缀 (动态响应) */}
          <div className={cn(
            "h-full flex items-center px-3 shrink-0 transition-colors border-r border-white/5",
            isCodeSent 
              ? "bg-gx-cyan/10 text-gx-cyan animate-pulse" 
              : "bg-white/5 text-white/40 group-focus-within:text-gx-cyan group-focus-within:bg-gx-cyan/5"
          )}>
            <Smartphone className="w-3.5 h-3.5" strokeWidth={1.5} />
            {isCodeSent && (
              <span className="ml-2 text-[10px] font-mono tracking-widest font-bold">
                {countdown}s
              </span>
            )}
          </div>

          {!isCodeSent ? (
            // 模式 1：输入手机号 (无界输入流)
            <>
              {/* 国家码微缩选择器 */}
              <div className="h-full flex items-center shrink-0 border-r border-white/5">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-full bg-transparent text-white/80 font-mono text-[11px] font-bold outline-none px-2 appearance-none cursor-pointer hover:bg-white/5 transition-colors w-12 text-center"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                >
                  {countryCodes.map((item) => (
                    <option key={item.code} value={item.code} className="bg-black text-white">
                      {item.code}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 核心主输入区 */}
              <input 
                placeholder={t('txt_7d4d29')} 
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="flex-1 min-w-0 bg-transparent px-3 text-xs sm:text-sm font-mono text-white outline-none placeholder:text-white/20 tracking-wider"
              />
              
              {/* 极简执行按钮 */}
              <button 
                onClick={handleSendCode} 
                disabled={isUpdatingPhone || !phoneInput.trim()}
                className="h-full shrink-0 px-4 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white font-bold tracking-widest text-[10px] transition-all disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:text-white/50 disabled:cursor-not-allowed border-l border-white/5"
              >
                {isUpdatingPhone ? "..." : "验证"}
              </button>
            </>
          ) : (
            // 模式 2：输入验证码 (无界输入流)
            <>
              <input 
                placeholder={t('txt_cc2ddc')} 
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="flex-1 min-w-0 bg-transparent px-4 text-xs font-mono text-center tracking-[0.3em] sm:tracking-[0.5em] text-gx-cyan outline-none placeholder:text-white/20 placeholder:tracking-normal"
              />
              <button 
                onClick={handleVerifyCode} 
                disabled={isUpdatingPhone || verificationCode.length < 6}
                className="h-full shrink-0 px-5 bg-gx-cyan/10 text-gx-cyan hover:bg-gx-cyan/20 hover:text-white font-bold tracking-widest text-[10px] transition-all disabled:opacity-40 disabled:hover:bg-gx-cyan/10 disabled:hover:text-gx-cyan disabled:cursor-not-allowed border-l border-gx-cyan/20"
              >
                {isUpdatingPhone ? "..." : "确认"}
              </button>
            </>
          )}
        </div>
      )}

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
        <div className="pt-2 flex items-center justify-between">
            <p className={cn(
              "text-[10px] font-bold font-mono uppercase tracking-widest",
              phoneMessage.includes("激活") || phoneMessage.includes("SUCCESS") ? "text-gx-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" 
              : phoneMessage.includes("等待") || phoneMessage.includes("发送") || phoneMessage.includes("SEND") ? "text-yellow-400 animate-pulse" 
              : "text-gx-red drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]"
            )}>
              {phoneMessage}
            </p>
        </div>
      )}
    </div>
  );
};
