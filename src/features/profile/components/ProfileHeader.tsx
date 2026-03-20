"use client";

import { motion } from "framer-motion";
import { User, ShieldCheck } from "lucide-react";
import { UserProfile } from "../types";

interface ProfileHeaderProps {
  profile: UserProfile;
}

export const ProfileHeader = ({ profile }: ProfileHeaderProps) => {
  const roleLabels = {
    user: { zh: "普通用户", color: "text-gx-cyan", icon: <User className="w-4 h-4" /> },
    merchant: { zh: "商户 / 老板", color: "text-gx-purple", icon: <ShieldCheck className="w-4 h-4" /> },
    boss: { zh: "系统管理员", color: "text-gx-red", icon: <ShieldCheck className="w-4 h-4" /> },
  };

  const currentRole = roleLabels[profile.role];

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gx-cyan/20 to-gx-purple/20 border border-white/10 flex items-center justify-center backdrop-blur-xl">
            <User className="w-10 h-10 text-white/40" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-lg bg-black border border-white/10 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full bg-gx-cyan animate-pulse shadow-[0_0_5px_rgba(0,242,255,0.5)]`} />
          </div>
        </div>
        
        <div className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tighter"
          >
            {profile.name}
          </motion.h1>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 ${currentRole.color}`}>
              {currentRole.icon}
              {currentRole.zh}
            </span>
            <span className="text-white/10">|</span>
            <span className="text-white/20 text-[10px] font-mono uppercase tracking-widest">
              ID: {profile.id}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {profile.stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * idx }}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center min-w-[80px]"
          >
            <span className="text-[10px] text-white/20 uppercase tracking-tighter">{stat.label}</span>
            <span className="text-lg font-mono font-bold text-white/80">{stat.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
