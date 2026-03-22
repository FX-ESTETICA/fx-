"use client";

import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { UserDashboard } from "@/features/profile/components/UserDashboard";
import { MerchantDashboard } from "@/features/profile/components/MerchantDashboard";
import { UserRole, UserProfile } from "@/features/profile/types";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/shared/Button";
import { LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function DashboardPage() {
  const { activeRole, setActiveRole } = useAuth();

  // 模拟不同角色的数据
  const mockProfiles: Record<UserRole, UserProfile> = {
    user: {
      id: "GX-USR-7721",
      name: "林晓明 / Xiao Ming",
      email: "xiaoming@galaxy.gx",
      role: "user",
      privileges: ["calendar_access"], // 模拟老板授权的特权
      stats: [
        { label: "活跃度", value: "98%" },
        { label: "已完成任务", value: 12 },
      ]
    },
    merchant: {
      id: "GX-MCH-0092",
      name: "陈老板 / Mr. Chen",
      email: "chen@galaxy.gx",
      role: "merchant",
      stats: [
        { label: "本月营收", value: "¥42.8k" },
        { label: "活跃员工", value: 8 },
      ]
    },
    boss: {
      id: "GX-ADM-0001",
      name: "系统管理员 / Admin",
      email: "admin@galaxy.gx",
      role: "boss",
      stats: [
        { label: "全站流量", value: "1.2M" },
        { label: "系统稳定性", value: "99.9%" },
      ]
    }
  };

  const currentProfile = mockProfiles[activeRole as UserRole];

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gx-cyan/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gx-purple/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        {/* Top Nav */}
        <nav className="flex items-center justify-between pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-gx-cyan" />
            <span className="font-mono text-xs uppercase tracking-[0.4em] text-white/40">
              Identity Dashboard // 身份仪表盘
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 角色切换器 (仅供预览/开发使用) */}
            <div className="hidden md:flex bg-white/5 p-1 rounded-lg border border-white/5">
              {(["user", "merchant", "boss"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRole(r as any)}
                  className={`px-3 py-1 text-[10px] font-mono uppercase rounded-md transition-all ${
                    activeRole === r ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            
            <Link href="/login">
              <Button variant="ghost" size="sm" className="gap-2 text-[10px]">
                <LogOut className="w-3 h-3" />
                退出系统 / Exit
              </Button>
            </Link>
          </div>
        </nav>

        {/* Profile Header */}
        <ProfileHeader profile={currentProfile} />

        {/* Dashboard Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {activeRole === "user" ? (
              <UserDashboard profile={currentProfile} />
            ) : (
              <MerchantDashboard merchantId={currentProfile.id} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* System Version Footer */}
        <footer className="pt-12 flex justify-between items-center text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
          <span>GX_CORE_DASHBOARD // 2026</span>
          <div className="flex gap-4">
            <span>Secured Identity</span>
            <span>Encrypted Data</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
