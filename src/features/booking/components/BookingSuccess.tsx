"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { CheckCircle, Calendar, Clock, ArrowRight, Download, Share2 } from "lucide-react";
import { BookingDetails } from "../types";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface BookingSuccessProps {
  details: BookingDetails;
  onDone: () => void;
}

export const BookingSuccess = ({ details, onDone }: BookingSuccessProps) => {
    const t = useTranslations('BookingSuccess');
  const fallbackIdSeed = useId();
  const fallbackId = `GX-${fallbackIdSeed.replace(/[^a-z0-9]/gi, "").slice(0, 9).toUpperCase()}`;
  const bookingId = details.id ? `GX-${details.id.split("-")[0].toUpperCase()}` : fallbackId;

  return (
    <div className="max-w-2xl mx-auto space-y-12 py-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="space-y-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="inline-flex p-5 rounded-full  border   "
        >
          <CheckCircle className="w-16 h-16" />
        </motion.div>
        
        <div className="space-y-2">
          <h2 className="text-4xl font-bold tracking-tight">{t('txt_b179be')}</h2>
          <p className="text-white/40 text-lg">{t('txt_1e93c8')}</p>
        </div>
      </div>

      <GlassCard className="p-8  /[0.03] " >
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pb-8 border-b border-white/5">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">BOOKING_ID</p>
              <p className="text-xl font-mono text-white/80 uppercase">
                {bookingId}
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm" className="p-2 border-white/10 hover:bg-white/5">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 border-white/10 hover:bg-white/5">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-left">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> DATE
                </p>
                <p className="text-sm font-medium">{details.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" /> TIME
                </p>
                <p className="text-sm font-mono">{details.timeSlot}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" /> SERVICE
                </p>
                <p className="text-sm font-medium">{details.serviceName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" /> CONTACT
                </p>
                <p className="text-sm">{details.customerName}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row gap-4">
            <Button
              variant="cyan"
              className="flex-1 gap-2"
              onClick={onDone}
            >
              {t('txt_a60715')}</Button>
            <Link href="/dashboard" className="flex-1" prefetch={false}>
              <Button
                variant="ghost"
                className="w-full border-white/10 gap-2"
              >
                {t('txt_33638a')}<ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4 text-white/10 font-mono text-[9px] uppercase tracking-[0.5em]">
        <p>SYSTEM_ID // GX_CORE_V1_2026</p>
        <p>SECURED_TRANSACTION_ID // ENCRYPTED_AUTH</p>
      </div>
    </div>
  );
};
