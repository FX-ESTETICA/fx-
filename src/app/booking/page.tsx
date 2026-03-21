"use client";

import { useState, useEffect, useCallback } from "react";
import { BookingForm } from "@/features/booking/components/BookingForm";
import { BookingConfirmation } from "@/features/booking/components/BookingConfirmation";
import { BookingSuccess } from "@/features/booking/components/BookingSuccess";
import { BookingStep, BookingDetails } from "@/features/booking/types";
import { ArrowLeft, Sparkles, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { BookingService } from "@/features/booking/api/booking";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function BookingPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [step, setStep] = useState<BookingStep>("form");
  const [details, setDetails] = useState<BookingDetails>({
    industry: "beauty",
    serviceId: "s1",
    serviceName: "高级发艺造型 / Premium Hair Styling",
    date: "2026-03-25",
    timeSlot: "14:30 - 15:30",
    customerName: "",
    customerPhone: "",
    price: 398,
    currency: "CNY"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleFormSubmit = (formData: BookingDetails) => {
    setDetails({ ...details, ...formData });
    setStep("confirmation");
  };

  const handleConfirm = useCallback(async () => {
    // 0. 验证身份，若未登录则开启 Auth Modal
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      // 1. 调用 Service 层进行持久化，注入用户 ID (如果已登录)
      const bookingData = { ...details, userId: user?.id };
      const result = await BookingService.createBooking(bookingData);
      
      // 2. 更新本地状态（包含后端生成的 ID）
      setDetails(result);
      setStep("success");
    } catch (err: any) {
      console.error("[BookingPage] Booking failed:", err);
      setError(err.message || "预约失败，请检查连接或重试 / Booking failed, please check connection or retry.");
    } finally {
      setIsSubmitting(false);
    }
  }, [user, details, isSubmitting]);

  const handleBack = () => {
    setStep("form");
  };

  // 3. 实时状态订阅
  useEffect(() => {
    if (!details.id || step !== "success") return;

    const channel = BookingService.subscribeToBooking(details.id, (updatedBooking) => {
      setDetails(prev => ({ ...prev, ...updatedBooking }));
    });

    return () => {
      if (channel) {
        BookingService.unsubscribe(channel);
      }
    };
  }, [details.id, step]);

  // 4. 登录成功后自动关闭 Modal 并尝试继续操作
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
      
      // 如果是在确认步骤中触发的登录，自动执行一次 handleConfirm
      if (step === "confirmation") {
        handleConfirm();
      }
    }
  }, [user, showAuthModal, step, handleConfirm]);

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
      {/* 错误提示 Toast */}
      {error && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-xl px-6 py-3 rounded-xl flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-xs font-mono text-red-500 uppercase tracking-widest">{error}</p>
            <div className="flex items-center gap-2 ml-4 border-l border-red-500/20 pl-4">
              <button 
                onClick={() => handleConfirm()} 
                className="text-[10px] font-mono text-red-500 hover:text-white transition-colors flex items-center gap-1 uppercase"
              >
                <RefreshCcw className="w-3 h-3" /> 重试 / Retry
              </button>
              <button onClick={() => setError(null)} className="text-red-500/50 hover:text-red-500 transition-colors">×</button>
            </div>
          </div>
        </div>
      )}
      {/* 背景光效 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gx-cyan/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gx-purple/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowAuthModal(false)}
          />
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300">
            <LoginForm />
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white text-[10px] font-mono uppercase tracking-widest"
            >
              取消 / Cancel
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto space-y-12 relative z-10">
        {/* Header (仅在非成功页显示) */}
        {step !== "success" && (
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-gx-cyan">
                <Sparkles className="w-5 h-5" />
                <span className="text-[10px] font-mono uppercase tracking-[0.4em]">BOOKING_FLOW // 预约链路</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tighter">完成预约 / Finalize Booking</h1>
              <p className="text-white/40 text-sm max-w-xl">
                请跟随指引完成最后的预约步骤。GX 系统将实时处理您的请求并确保数据安全。
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/calendar">
                <button className="flex items-center gap-2 text-[10px] font-mono text-white/40 hover:text-white transition-colors uppercase tracking-widest">
                  <ArrowLeft className="w-3 h-3" />
                  返回日历 / Back to Calendar
                </button>
              </Link>
            </div>
          </header>
        )}

        {/* 步骤指示器 (仅在非成功页显示) */}
        {step !== "success" && (
          <div className="flex items-center justify-center gap-4">
            {[
              { id: "form", label: "填写信息 / INFO" },
              { id: "confirmation", label: "核对确认 / REVIEW" },
            ].map((s, idx) => (
              <div key={s.id} className="flex items-center gap-4">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-mono transition-all duration-500",
                  step === s.id 
                    ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                    : "bg-white/5 text-white/20 border-white/10"
                )}>
                  <span className="w-4 h-4 rounded-full bg-current opacity-20 flex items-center justify-center text-[8px] font-bold invert">
                    {idx + 1}
                  </span>
                  {s.label}
                </div>
                {idx === 0 && <div className="w-8 h-[1px] bg-white/10" />}
              </div>
            ))}
          </div>
        )}

        {/* 动态内容展示 */}
        <div className="min-h-[500px] flex items-center justify-center">
          {step === "form" && (
            <BookingForm 
              initialDetails={details} 
              onSubmit={handleFormSubmit} 
              onCancel={() => window.history.back()} 
            />
          )}
          {step === "confirmation" && (
            <BookingConfirmation 
              details={details} 
              onConfirm={handleConfirm} 
              onBack={handleBack}
              isLoading={isSubmitting}
            />
          )}
          {step === "success" && (
            <BookingSuccess 
              details={details} 
              onDone={() => window.location.href = "/dashboard"} 
            />
          )}
        </div>
      </div>
    </main>
  );
}
