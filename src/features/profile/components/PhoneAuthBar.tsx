"use client";

import { cn } from "@/utils/cn";
import { Smartphone } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

interface PhoneAuthBarProps {
  initialPhone?: string;
  className?: string;
}

export const PhoneAuthBar = ({ initialPhone = "", className }: PhoneAuthBarProps) => {
  const { user } = useAuth();
  
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
      
    } catch (error) {
      console.error("验证失败:", error);
      setPhoneMessage("验证码错误或已过期 / INVALID CODE");
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  return (
    <div className={cn("w-full flex flex-col relative z-10", className)}>
      <div className="w-full flex items-center bg-black/20 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden focus-within:border-gx-cyan focus-within:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all h-12">
        
        {/* 左侧极致融合 Label */}
        <div className={cn(
          "h-full flex items-center px-3 sm:px-4 border-r transition-colors shrink-0",
          isCodeSent 
            ? "border-gx-cyan/30 bg-gx-cyan/10 text-gx-cyan animate-pulse" 
            : "border-white/10 bg-white/5 text-white/60"
        )}>
          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
          <span className="hidden sm:inline-block text-[10px] sm:text-xs font-bold tracking-widest uppercase">
            {isCodeSent ? `等待 [${countdown}s]` : "手机号绑定"}
          </span>
        </div>

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
              disabled={isUpdatingPhone || !phoneInput.trim() || `${countryCode}${phoneInput.trim()}` === initialPhone}
              className="h-full shrink-0 px-3 sm:px-6 bg-transparent text-white hover:bg-white/10 hover:text-gx-cyan font-bold font-mono uppercase tracking-widest text-[10px] transition-all border-l border-white/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white disabled:cursor-not-allowed"
            >
              {isUpdatingPhone ? "..." : (initialPhone && `${countryCode}${phoneInput.trim()}` === initialPhone) ? "ACTIVE" : "获取验证码"}
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
