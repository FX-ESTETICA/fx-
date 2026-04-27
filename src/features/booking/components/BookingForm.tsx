"use client";

import { useForm } from "react-hook-form";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { User, Phone, FileText, Calendar, Clock } from "lucide-react";
import { BookingDetails } from "../types";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";

interface BookingFormProps {
  initialDetails: Partial<BookingDetails>;
  onSubmit: (details: BookingDetails) => void;
  onCancel: () => void;
}

export const BookingForm = ({ initialDetails, onSubmit, onCancel }: BookingFormProps) => {
    const t = useTranslations('BookingForm');
  const { register, handleSubmit, formState: { errors } } = useForm<BookingDetails>({
    defaultValues: initialDetails
  });

  return (
    <GlassCard className="max-w-2xl mx-auto p-8 border-white/5 bg-white/[0.02]" >
      <div className="space-y-8">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{t('txt_432960')}</h2>
          <p className="text-white/40 text-sm">{t('txt_1658db')}</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 服务与时间 (只读展示) */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> {t('txt_97ad14')}</label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium">
                {initialDetails.serviceName}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3" /> {t('txt_652e09')}</label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono">
                {initialDetails.date} {initialDetails.timeSlot}
              </div>
            </div>

            {/* 用户输入字段 */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> {t('txt_a140c4')}</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20  transition-colors" />
                <input
                  {...register("customerName", { required: "请输入姓名" })}
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none  transition-all",
                    errors.customerName && "border-red-500/50"
                  )}
                  placeholder={t('txt_0ec7d3')}
                />
              </div>
              {errors.customerName && <p className="text-[10px] text-red-500 font-mono mt-1">{errors.customerName.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Phone className="w-3 h-3" /> {t('txt_d73ae8')}</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20  transition-colors" />
                <input
                  {...register("customerPhone", { required: "请输入联系电话" })}
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none  transition-all font-mono",
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
              <FileText className="w-3 h-3" /> {t('txt_982cf5')}</label>
            <textarea
              {...register("notes")}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none  transition-all min-h-[100px] resize-none"
              placeholder={t('txt_135237')}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 border-white/10"
              onClick={onCancel}
            >
              {t('txt_6ae048')}</Button>
            <Button
              type="submit"
              variant="cyan"
              className="flex-1"
            >
              {t('txt_a58aae')}</Button>
          </div>
        </form>
      </div>
    </GlassCard>
  );
};
