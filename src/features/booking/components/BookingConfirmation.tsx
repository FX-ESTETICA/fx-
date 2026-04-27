import { useState } from "react";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { CheckCircle, AlertTriangle, ShieldCheck, MapPin, Calendar, Clock, CreditCard, User } from "lucide-react";
import { BookingDetails } from "../types";
import { useTranslations } from "next-intl";

interface BookingConfirmationProps {
  details: BookingDetails;
  onConfirm: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const BookingConfirmation = ({ details, onConfirm, onBack, isLoading }: BookingConfirmationProps) => {
    const t = useTranslations('BookingConfirmation');
  const [termsAgreed, setTermsAgreed] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-full  border   mb-2">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">{t('txt_f8ce3d')}</h2>
        <p className="text-white/40 text-sm">{t('txt_c4043e')}</p>
      </header>

      <GlassCard className="p-8 border-white/10 bg-white/[0.03]" >
        <div className="space-y-8">
          {/* 预约核心信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-white/5">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">{t('txt_77480b')}</p>
                  <p className="text-sm font-medium">{details.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">{t('txt_ac3930')}</p>
                  <p className="text-sm font-mono">{details.timeSlot}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">{t('txt_3c116d')}</p>
                  <p className="text-sm font-medium">{details.serviceName}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">{t('txt_63fb41')}</p>
                  <p className="text-sm font-mono ">¥{details.price || '待确认'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 客户信息 */}
          <div className="space-y-4 py-4">
            <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> {t('txt_8fa0a1')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter mb-1">{t('txt_60d045')}</p>
                <p className="text-sm">{details.customerName}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter mb-1">{t('txt_5a93d3')}</p>
                <p className="text-sm font-mono">{details.customerPhone}</p>
              </div>
            </div>
            {details.notes && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter mb-1">{t('txt_2432b5')}</p>
                <p className="text-xs text-white/60 leading-relaxed">{details.notes}</p>
              </div>
            )}
          </div>

          {/* 提示信息与合规勾选 */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-400/80">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-[10px] leading-relaxed font-mono uppercase tracking-tight">
                {t('txt_40d678')}</p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="peer appearance-none w-5 h-5 rounded-md border border-white/10 bg-white/5   transition-all"
                />
                <CheckCircle className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors select-none">
                {t('txt_b87e42')}</span>
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              variant="ghost"
              className="flex-1 border-white/10"
              onClick={onBack}
              disabled={isLoading}
            >
              {t('txt_49999e')}</Button>
            <Button
              variant="cyan"
              className="flex-1 gap-2"
              onClick={onConfirm}
              isLoading={isLoading}
              disabled={!termsAgreed || isLoading}
            >
              {t('txt_099af3')}</Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
