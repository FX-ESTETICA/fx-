"use client";

import { useEffect, useState } from "react";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { UserDashboard } from "@/features/profile/components/UserDashboard";
import { MerchantDashboard } from "@/features/profile/components/MerchantDashboard";
import { UserRole, UserProfile } from "@/features/profile/types";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/shared/Button";
import { LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth, SandboxUser } from "@/features/auth/hooks/useAuth";

export default function DashboardPage() {
  const { user, activeRole, setActiveRole, signOut } = useAuth();
  const [boundShopId, setBoundShopId] = useState<string | null>(null);
  const [shopIndustry, setShopIndustry] = useState<string | null>(null);

  // 挂载时检查云端绑定关系和门店行业配置
  useEffect(() => {
    const checkCloudData = async () => {
      try {
        const res = await fetch('/api/sandbox');
        const data = await res.json();
        
        // 如果是 SandboxUser
        const sUser = user as SandboxUser;
        if (!sUser) return;

        // 获取该用户的归属门店
        let userAssignedShopId = null;
        if (sUser.role === 'user' && data.bindings && data.bindings[sUser.gxId]) {
          userAssignedShopId = data.bindings[sUser.gxId];
          setBoundShopId(userAssignedShopId);
        } else if (sUser.role === 'merchant') {
          userAssignedShopId = sUser.shopId;
        }

        // 如果有关联门店，拉取该门店的行业配置
        if (userAssignedShopId && data.shop_configs) {
          setShopIndustry(data.shop_configs[userAssignedShopId] || null);
        }
      } catch (e) {
        console.error("Failed to check cloud data:", e);
      }
    };
    if (user) {
      checkCloudData();
    }
  }, [user, activeRole]);

  // 构建当前用户信息
  const sUser = user as SandboxUser;
  
  // 决定可用角色切换
  const availableRoles: UserRole[] = [];
  if (sUser?.role === 'boss') {
    availableRoles.push('user', 'merchant', 'boss');
  } else if (sUser?.role === 'merchant') {
    availableRoles.push('user', 'merchant');
  } else {
    // user 没有任何切换按钮
  }

  const currentProfile: UserProfile = {
    id: sUser?.gxId || "GX-GUEST-0000",
    name: sUser?.name || "未知实体 / Unknown",
    email: sUser?.email || "unknown@gx.com",
    role: activeRole as UserRole,
    privileges: boundShopId || sUser?.role === 'boss' ? ["calendar_access"] : [], 
    stats: []
  };

  // 给 UserDashboard 传递绑定的 shopId (如果有)
  const isUser = activeRole === "user";
  const userShopId = boundShopId || "default";
  const merchantShopId = sUser?.shopId || "default";
  const targetCalendarPath = isUser 
    ? (boundShopId ? `/calendar/beauty?shopId=${boundShopId}` : "#") 
    : `/calendar/beauty?shopId=${merchantShopId}`;

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
            {/* 动态角色切换器 */}
            {availableRoles.length > 0 && (
              <div className="hidden md:flex bg-white/5 p-1 rounded-lg border border-white/5">
                {availableRoles.map((r) => (
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
            )}
            
            <Button variant="ghost" size="sm" className="gap-2 text-[10px]" onClick={signOut}>
              <LogOut className="w-3 h-3" />
              退出系统 / Exit
            </Button>
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
            {activeRole === "user" && <UserDashboard profile={currentProfile} boundShopId={boundShopId} industry={shopIndustry} />}
            {activeRole === "merchant" && <MerchantDashboard merchantId={currentProfile.id} shopId={sUser?.shopId} industry={shopIndustry} onIndustrySet={setShopIndustry} />}
            {activeRole === "boss" && (
              <div className="grid grid-cols-1 gap-6">
                 {/* Admin专属驾驶舱入口 */}
                 <Link href="/spatial">
                  <GlassCard glowColor="purple" className="p-8 group cursor-pointer relative overflow-hidden transition-all duration-500 hover:scale-[1.01]">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-gx-purple/10 border border-gx-purple/20 flex items-center justify-center text-gx-purple">
                        <LayoutDashboard className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tighter">全景驾驶舱 / Spatial Cockpit</h3>
                        <p className="text-white/40 text-sm mt-2">最高管理权限，监控所有节点运行状态。</p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
                {/* 可以附加其他全站管理功能 */}
              </div>
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
