"use client";

import { cn } from "@/utils/cn";
import { Smartphone, Eye, EyeOff } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { useTranslations } from "next-intl";

interface PhoneAuthBarProps {
 initialPhone?: string;
 className?: string;
}

export const PhoneAuthBar = ({ initialPhone = "", className }: PhoneAuthBarProps) => {
 const { user } = useAuth();
 const t = useTranslations('PhoneAuthBar');
 const { settings, isLoaded } = useVisualSettings();
 const isLight = isLoaded && settings.frontendBgIndex !== 0;
 
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
 { code: "+1", label: "US/CA" },
 { code: "+44", label: "UK" },
 { code: "+65", label: "SG" },
 ];
 
 // 专属状态与风控状态机
 const [verificationCode, setVerificationCode] = useState("");
 const [isCodeSent, setIsCodeSent] = useState(false);
 const [countdown, setCountdown] = useState(0);
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

 const handleSendCode = async () => {
 if (!phoneInput.trim() || !user) return;
 
 setIsUpdatingPhone(true);
 setPhoneMessage(t('sending'));
 
 const fullPhone = `${countryCode}${phoneInput.trim()}`;
 
 try {
 // 通过 Supabase 后端发送验证码
 const { error } = await supabase.auth.updateUser({ phone: fullPhone });
 if (error) throw error;
 
 setIsCodeSent(true);
 setCountdown(60);
 setPhoneMessage(t('code_sent'));
 } catch (error: any) {
 console.error("SMS 发送失败:", error);
 const displayMsg = error.message || t('invalid_code');
 setPhoneMessage(displayMsg);
 } finally {
 setIsUpdatingPhone(false);
 }
 };

 const handleVerifyCode = async () => {
 if (!verificationCode.trim() || !user) return;
 
 setIsUpdatingPhone(true);
 setPhoneMessage(t('verifying'));
 
 try {
 const fullPhone = `${countryCode}${phoneInput.trim()}`;
 
 // Supabase 验证验证码
 const { error: verifyError } = await supabase.auth.verifyOtp({
 phone: fullPhone,
 token: verificationCode,
 type: 'phone_change'
 });
 if (verifyError) throw verifyError;
 
 // 验证成功后，同步将手机号写入 profiles 表
 const { error: profileError } = await supabase
 .from('profiles')
 .update({ phone: fullPhone })
 .eq('id', user.id);
 
 if (profileError) {
 if (profileError.code === '23505') throw new Error(t('phone_taken'));
 throw profileError;
 }
 
 setPhoneMessage(t('bind_success'));
 setIsCodeSent(false); // 验证成功后恢复 UI 状态
 setIsEditMode(false); // 成功后退出越权编辑模式
 
 } catch (error: any) {
 console.error("验证失败:", error);
 setPhoneMessage(error.message || t('invalid_code'));
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
 "flex items-center rounded-full border overflow-hidden transition-all duration-500",
 isPressing 
 ? "${isLight ? 'bg-black/10' : 'bg-white/10'} ${isLight ? 'border-black/50' : '${isLight ? 'border-black/5' : 'border-white/5'}0'}/50 scale-[0.98]" 
 : "bg-black/40 ${isLight ? 'border-black/10' : 'border-white/10'} "
 )}>
 
 {/* 左侧：机甲铭牌区 (长按进入编辑，单击切换打码) */}
 <div 
 className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:${isLight ? 'bg-black/5' : 'bg-white/5'} transition-all duration-300 group select-none touch-none"
 onClick={() => !isPressing && setShowFullPhone(!showFullPhone)}
 onPointerDown={handlePointerDown}
 onPointerUp={handlePointerUpOrLeave}
 onPointerLeave={handlePointerUpOrLeave}
 onPointerCancel={handlePointerUpOrLeave}
 >
 {/* 状态指示灯 (呼吸绿点) */}
 <div className="relative flex items-center justify-center w-2 h-2">
 <span className={`absolute inline-flex w-full h-full rounded-full animate-ping ${isLight ? 'bg-black/50' : 'bg-white/50'}`} />
 <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${isLight ? 'bg-black' : 'bg-white'}`} />
 </div>
 
 {/* 铭牌文本区 */}
 <div className="flex items-center gap-2">
 <span className={cn("text-[10px] font-bold tracking-widest", isLight ? "text-black" : "text-white")}>{t('txt_421f72')}</span>
 <span className={cn("text-[11px] font-mono tracking-[0.1em] w-[115px] text-center transition-all duration-300", isLight ? "text-black" : "text-white")}>
 {showFullPhone ? initialPhone : formatHiddenPhone(initialPhone)}
 </span>
 </div>

 {/* 物理锁图标 (小眼睛) */}
 <div className="flex items-center justify-center w-4 h-4 ml-1">
 {showFullPhone ? (
 <EyeOff className={cn("w-3 h-3 transition-colors", isLight ? "text-black group-hover:text-black" : "text-white group-hover:text-white")} />
 ) : (
 <Eye className={cn("w-3 h-3 transition-colors", isLight ? "text-black group-hover:text-black" : "text-white group-hover:text-white")} />
 )}
 </div>
 </div>

 {/* 极细物理分割线 */}
 <div className={cn("w-px h-4", isLight ? "bg-black/10" : "bg-white/10")} />

 {/* 右侧：退出系统区 */}
 <button
 onClick={async () => {
 await supabase.auth.signOut();
 window.location.href = "/login";
 }}
 className={cn("flex items-center justify-center px-5 py-2 text-[10px] font-bold tracking-widest transition-colors group", isLight ? "text-black hover:text-black" : "text-white hover:text-white")}
 >
 <span className="">{t('txt_732906')}</span>
 </button>
 
 </div>
 
 {/* 微小提示文案 (Progress Bar Effect based on press) */}
 <div className="mt-2 h-3 flex items-center justify-center overflow-hidden">
 <span className={cn(
 "text-[9px] font-mono tracking-widest transition-all duration-300",
 isPressing ? (isLight ? 'text-black scale-105' : 'text-white scale-105') : (isLight ? 'text-black' : 'text-white')
 )}>
 {isPressing ? ">>> 强制授权中 <<<" : "长按左侧重置终端"}
 </span>
 </div>
 </div>
 ) : (
 <div className={cn("w-full max-w-[320px] mx-auto flex items-center border rounded-lg overflow-hidden transition-all h-10 group", isLight ? "bg-black/5 border-black/10 focus-within:border-black/50" : "bg-white/5 border-white/10 focus-within:border-white/50")}>
 {/* 形态 A：未绑定 / 编辑模式（极简输入流 - 终极空间降维） */}
 
 {/* 左侧：现代手机图标前缀 (动态响应) */}
 <div className={cn(
 "h-full flex items-center px-3 shrink-0 transition-colors border-r",
 isLight ? "border-black/5" : "border-white/5",
 isCodeSent 
 ? (isLight ? "bg-black/10 text-black animate-pulse" : "bg-white/10 text-white animate-pulse") 
 : (isLight ? "bg-black/5 text-black group-focus-within:text-black group-focus-within:bg-black/5" : "bg-white/5 text-white group-focus-within:text-white group-focus-within:bg-white/5")
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
 <div className={cn("h-full flex items-center shrink-0 border-r", isLight ? "border-black/5" : "border-white/5")}>
 <select
 value={countryCode}
 onChange={(e) => setCountryCode(e.target.value)}
 className={cn("h-full bg-transparent font-mono text-[11px] font-bold outline-none px-2 appearance-none cursor-pointer transition-colors w-12 text-center", isLight ? "text-black hover:bg-black/5" : "text-white hover:bg-white/5")}
 style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
 >
 {countryCodes.map((item) => (
 <option key={item.code} value={item.code} className={isLight ? "bg-white text-black" : "bg-black text-white"}>
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
 className={cn("flex-1 min-w-0 bg-transparent px-3 text-xs sm:text-sm font-mono outline-none tracking-wider", isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white")}
 />
 
 {/* 极简执行按钮 */}
 <button 
 onClick={handleSendCode} 
 disabled={isUpdatingPhone || !phoneInput.trim()}
 className={cn("h-full shrink-0 px-4 font-bold tracking-widest text-[10px] transition-all disabled:opacity-40 disabled:cursor-not-allowed border-l", isLight ? "bg-black/5 text-black hover:bg-black/10 hover:text-black disabled:hover:bg-black/5 disabled:hover:text-black border-black/5" : "bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:hover:bg-white/5 disabled:hover:text-white border-white/5")}
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
 className={cn("flex-1 min-w-0 bg-transparent px-4 text-xs font-mono text-center tracking-[0.3em] sm:tracking-[0.5em] outline-none placeholder:tracking-normal", isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white")}
 />
 <button 
 onClick={handleVerifyCode} 
 disabled={isUpdatingPhone || verificationCode.length < 6}
 className={cn("h-full shrink-0 px-5 font-bold tracking-widest text-[10px] transition-all disabled:opacity-40 disabled:cursor-not-allowed border-l", isLight ? "bg-black/10 text-black hover:bg-black/20 hover:text-black disabled:hover:bg-black/10 disabled:hover:text-black border-black/50/20" : "bg-white/10 text-white hover:text-white disabled:hover:bg-white/10 disabled:hover:text-white border-white/50/20")}
 >
 {isUpdatingPhone ? "..." : "确认"}
 </button>
 </>
 )}
 </div>
 )}



 <div className={cn("mt-3 h-4 flex items-center justify-center overflow-hidden transition-all duration-500", 
 phoneMessage ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
 )}>
 {phoneMessage && (
 <div className={cn("px-4 py-0.5 rounded-full border flex items-center gap-2", isLight ? "bg-black/10 border-black/20" : "bg-black/40 border-white/20")}>
 <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
 phoneMessage.includes("激活") || phoneMessage.includes("SUCCESS") ? "" 
 : phoneMessage.includes("等待") || phoneMessage.includes("发送") || phoneMessage.includes("SEND") ? "bg-yellow-400" 
 : "bg-red-500"
 )} />
 <p className={cn(
 "text-[10px] font-bold font-mono uppercase tracking-widest",
 phoneMessage.includes("激活") || phoneMessage.includes("SUCCESS") ? (isLight ? 'text-black ' : 'text-white ') 
 : phoneMessage.includes("等待") || phoneMessage.includes("发送") || phoneMessage.includes("SEND") ? "text-yellow-400 animate-pulse" 
 : "text-red-500 "
 )}>
 {phoneMessage}
 </p>
 </div>
 )}
 </div>
 </div>
 );
};
