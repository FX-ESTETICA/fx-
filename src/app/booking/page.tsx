"use client";

import { useState, useEffect } from "react";
import { BookingForm } from "@/features/booking/components/BookingForm";
import { BookingConfirmation } from "@/features/booking/components/BookingConfirmation";
import { BookingSuccess } from "@/features/booking/components/BookingSuccess";
import { BookingStep, BookingDetails, DB_Booking } from "@/features/booking/types";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import { BookingAdapter } from "@/features/booking/utils/adapter";

export default function BookingPage() {
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

  const handleFormSubmit = (formData: BookingDetails) => {
    setDetails({ ...details, ...formData });
    setStep("confirmation");
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 1. 数据转换与持久化
      const dbData = BookingAdapter.toDB(details);
      const { data, error: dbError } = await supabase
        .from('bookings')
        .insert([dbData])
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. 更新本地状态（包含后端生成的 ID）
      if (data) {
        setDetails(BookingAdapter.fromDB(data));
      }
      
      setStep("success");
    } catch (err: any) {
      console.error("Booking failed:", err);
      setError(err.message || "预约失败，请检查连接或重试 / Booking failed, please check connection or retry.");
      // 如果提交失败，可以选择停留在确认页并显示错误
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep("form");
  };

  // 3. 实时状态订阅
  useEffect(() => {
    if (!details.id || step !== "success") return;

    const channel = supabase
      .channel(`booking-updates-${details.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${details.id}`
        },
        (payload) => {
          console.log('Booking updated:', payload);
          const updatedBooking = BookingAdapter.fromDB(payload.new as DB_Booking);
          setDetails(prev => ({ ...prev, ...updatedBooking }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [details.id, step]);

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
      {/* 错误提示 Toast */}
      {error && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-xl px-6 py-3 rounded-xl flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-xs font-mono text-red-500 uppercase tracking-widest">{error}</p>
            <button onClick={() => setError(null)} className="ml-4 text-red-500/50 hover:text-red-500 transition-colors">×</button>
          </div>
        </div>
      )}
      {/* 背景光效 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gx-cyan/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gx-purple/5 blur-[120px] rounded-full pointer-events-none" />

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
