import { useState } from "react";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { CheckCircle, AlertTriangle, ShieldCheck, MapPin, Calendar, Clock, CreditCard, User } from "lucide-react";
import { BookingDetails } from "../types";
import { cn } from "@/utils/cn";

interface BookingConfirmationProps {
  details: BookingDetails;
  onConfirm: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const BookingConfirmation = ({ details, onConfirm, onBack, isLoading }: BookingConfirmationProps) => {
  const [termsAgreed, setTermsAgreed] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-full bg-gx-cyan/10 border border-gx-cyan/20 text-gx-cyan mb-2">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">核对并提交 / Review & Confirm</h2>
        <p className="text-white/40 text-sm">请最后核对您的预约详情。提交后系统将为您锁定名额。</p>
      </header>

      <GlassCard className="p-8 border-white/10 bg-white/[0.03]" glowColor="cyan">
        <div className="space-y-8">
          {/* 预约核心信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-white/5">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">预约日期 / DATE</p>
                  <p className="text-sm font-medium">{details.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">预约时段 / TIME</p>
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
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">服务名称 / SERVICE</p>
                  <p className="text-sm font-medium">{details.serviceName}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">预计费用 / PRICE</p>
                  <p className="text-sm font-mono text-gx-cyan">¥{details.price || '待确认'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 客户信息 */}
          <div className="space-y-4 py-4">
            <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> 联系人详情 / CONTACT DETAILS
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter mb-1">NAME</p>
                <p className="text-sm">{details.customerName}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter mb-1">PHONE</p>
                <p className="text-sm font-mono">{details.customerPhone}</p>
              </div>
            </div>
            {details.notes && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter mb-1">NOTES</p>
                <p className="text-xs text-white/60 leading-relaxed">{details.notes}</p>
              </div>
            )}
          </div>

          {/* 提示信息与合规勾选 */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-400/80">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-[10px] leading-relaxed font-mono uppercase tracking-tight">
                温馨提示：预约成功后如需更改或取消，请提前至少 24 小时在系统中进行操作。
              </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="peer appearance-none w-5 h-5 rounded-md border border-white/10 bg-white/5 checked:bg-gx-cyan checked:border-gx-cyan transition-all"
                />
                <CheckCircle className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors select-none">
                我已确认预约信息准确无误，并同意相关预约协议 / I agree to terms.
              </span>
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              variant="ghost"
              className="flex-1 border-white/10"
              onClick={onBack}
              disabled={isLoading}
            >
              返回修改 / Edit
            </Button>
            <Button
              variant="cyan"
              className="flex-1 gap-2"
              onClick={onConfirm}
              isLoading={isLoading}
              disabled={!termsAgreed || isLoading}
            >
              确认提交 / Submit Booking
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
