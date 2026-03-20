"use client";

import { useForm } from "react-hook-form";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { User, Phone, FileText, Calendar, Clock } from "lucide-react";
import { BookingDetails } from "../types";
import { cn } from "@/utils/cn";

interface BookingFormProps {
  initialDetails: Partial<BookingDetails>;
  onSubmit: (details: BookingDetails) => void;
  onCancel: () => void;
}

export const BookingForm = ({ initialDetails, onSubmit, onCancel }: BookingFormProps) => {
  const { register, handleSubmit, formState: { errors } } = useForm<BookingDetails>({
    defaultValues: initialDetails
  });

  return (
    <GlassCard className="max-w-2xl mx-auto p-8 border-white/5 bg-white/[0.02]" glowColor="cyan">
      <div className="space-y-8">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">确认预约信息 / Booking Details</h2>
          <p className="text-white/40 text-sm">请核对您的预约服务及个人信息，确保准确无误。</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 服务与时间 (只读展示) */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> 预约服务
              </label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium">
                {initialDetails.serviceName}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3" /> 预约时间
              </label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono">
                {initialDetails.date} {initialDetails.timeSlot}
              </div>
            </div>

            {/* 用户输入字段 */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> 姓名 / Name
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-gx-cyan transition-colors" />
                <input
                  {...register("customerName", { required: "请输入姓名" })}
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-gx-cyan/50 transition-all",
                    errors.customerName && "border-red-500/50"
                  )}
                  placeholder="请输入您的真实姓名"
                />
              </div>
              {errors.customerName && <p className="text-[10px] text-red-500 font-mono mt-1">{errors.customerName.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Phone className="w-3 h-3" /> 电话 / Phone
              </label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-gx-cyan transition-colors" />
                <input
                  {...register("customerPhone", { required: "请输入联系电话" })}
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-gx-cyan/50 transition-all font-mono",
                    errors.customerPhone && "border-red-500/50"
                  )}
                  placeholder="1xx-xxxx-xxxx"
                />
              </div>
              {errors.customerPhone && <p className="text-[10px] text-red-500 font-mono mt-1">{errors.customerPhone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3 h-3" /> 备注 / Notes
            </label>
            <textarea
              {...register("notes")}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-gx-cyan/50 transition-all min-h-[100px] resize-none"
              placeholder="如有特殊需求请在此输入..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 border-white/10"
              onClick={onCancel}
            >
              取消 / Cancel
            </Button>
            <Button
              type="submit"
              variant="cyan"
              className="flex-1"
            >
              下一步 / Next
            </Button>
          </div>
        </form>
      </div>
    </GlassCard>
  );
};
