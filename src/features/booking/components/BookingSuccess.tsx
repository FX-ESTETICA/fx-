"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { CheckCircle, Calendar, Clock, ArrowRight, Download, Share2 } from "lucide-react";
import { BookingDetails } from "../types";
import Link from "next/link";

interface BookingSuccessProps {
  details: BookingDetails;
  onDone: () => void;
}

export const BookingSuccess = ({ details, onDone }: BookingSuccessProps) => {
  return (
    <div className="max-w-2xl mx-auto space-y-12 py-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="space-y-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="inline-flex p-5 rounded-full bg-gx-cyan/10 border border-gx-cyan/30 text-gx-cyan shadow-[0_0_40px_rgba(34,211,238,0.2)]"
        >
          <CheckCircle className="w-16 h-16" />
        </motion.div>
        
        <div className="space-y-2">
          <h2 className="text-4xl font-bold tracking-tight">预约成功 / Confirmed!</h2>
          <p className="text-white/40 text-lg">您的预约已成功提交并获系统确认。</p>
        </div>
      </div>

      <GlassCard className="p-8 border-gx-cyan/20 bg-gx-cyan/[0.03] shadow-[0_0_50px_rgba(34,211,238,0.05)]" glowColor="cyan">
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pb-8 border-b border-white/5">
            <div className="space-y-1 text-left">
              <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">BOOKING_ID</p>
              <p className="text-xl font-mono text-white/80 uppercase">
                {details.id ? `GX-${details.id.split("-")[0].toUpperCase()}` : `GX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`}
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
              完成并返回 / Done
            </Button>
            <Link href="/dashboard" className="flex-1" prefetch={false}>
              <Button
                variant="ghost"
                className="w-full border-white/10 gap-2"
              >
                查看我的预约 / View All
                <ArrowRight className="w-4 h-4" />
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
