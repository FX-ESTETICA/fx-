"use client";

import { useEffect, useState } from "react";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { UserDashboard } from "@/features/profile/components/UserDashboard";
import { MerchantDashboard } from "@/features/profile/components/MerchantDashboard";
import { UserRole, UserProfile } from "@/features/profile/types";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/shared/Button";
import { GlassCard } from "@/components/shared/GlassCard";
import { LayoutDashboard, Mail, Key, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useAuth, SandboxUser } from "@/features/auth/hooks/useAuth";
import { useShop } from "@/features/shop/ShopContext";
import { BookingService } from "@/features/booking/api/booking";
import { useRouter } from "next/navigation";
import { useBackground } from "@/hooks/useBackground";
import { PhoneAuthBar } from "@/features/profile/components/PhoneAuthBar";
import { NexusSwitcher } from "@/features/shop/NexusSwitcher";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
    const t = useTranslations('dashboard');
  const { user, isLoading, activeRole, setActiveRole, signOut } = useAuth();
  const { activeShopId } = useShop();
  const { cycleBackground } = useBackground();
  const [boundShopId] = useState<string | null>(null);
  const [shopIndustry, setShopIndustry] = useState<string | null>(null);
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  // 挂载时检查云端绑定关系和门店行业配置
  useEffect(() => {
    const checkCloudData = async () => {
      try {
        // 如果是 SandboxUser
        const sUser = user as SandboxUser;
        if (!sUser) return;

        // 获取该用户的归属门店
        const userAssignedShopId = activeShopId;

        // 如果有关联门店，拉取该门店的行业配置
        if (userAssignedShopId) {
          const { data: config } = await BookingService.getConfigs(userAssignedShopId);
          if (config && config.industry) {
            setShopIndustry(config.industry as string);
          }
        }
      } catch (e) {
        console.error("Failed to check cloud data:", e);
      }
    };
    if (user) {
      checkCloudData();
    }
  }, [user, activeRole, activeShopId]);

  // 构建当前用户信息
  const sUser = user as SandboxUser;
  
  // 决定可用角色切换
  const availableRoles: UserRole[] = [];
  if (sUser?.role === 'boss') {
    availableRoles.push('user', 'merchant', 'boss');
  } else if (sUser?.role === 'merchant') {
    availableRoles.push('user', 'merchant');
  }

  // (为了测试新 ID 渲染，临时注入 mock ID)
  const getMockIdForRole = (role: UserRole) => {
    if (role === 'boss') return 'GX88888888';
    if (role === 'merchant') return 'GX-MC-000015';
    return 'GX-NE-000001';
  };

  // 严格映射当前角色与头像
  const currentProfile: UserProfile = {
    id: (sUser && 'gxId' in sUser && sUser.gxId) ? sUser.gxId : getMockIdForRole(activeRole as UserRole),
    name: (sUser && 'name' in sUser && sUser.name) ? sUser.name : "未知实体 / Unknown",
    email: sUser?.email || "unknown@gx.com",
    phone: (sUser && 'phone' in sUser) ? sUser.phone : undefined,
    role: activeRole as UserRole,
    avatar: sUser?.avatar || undefined, // 修复：确保直接读取全局 user.avatar
    createdAt: sUser?.created_at || "2024-01-01T00:00:00Z",
    privileges: boundShopId || sUser?.role === 'boss' ? ["calendar_access"] : [], 
    stats: []
  };
  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";

  // 决定可用角色切换
  return (
    <main className="min-h-screen bg-transparent text-white px-6 py-6 md:px-12 md:pt-8 md:pb-12 relative overflow-hidden">
      
      {/* 背景光效 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gx-cyan/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gx-purple/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* 动态角色切换器 & 联邦星云切换舱 */}
        <nav className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-3">
            {/* 注入 Nexus Switcher */}
            <NexusSwitcher />
            
            {availableRoles.length > 0 && (
              <div className="hidden md:flex bg-white/5 p-1 rounded-lg border border-white/5">
                {availableRoles.map((r) => (
                  <button
                    key={r}
                    onClick={() => setActiveRole(r)}
                    className={`px-3 py-1 text-[10px] font-mono uppercase rounded-md transition-all ${
                      activeRole === r ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Profile Header */}
        <ProfileHeader profile={currentProfile} />

        {/* Dashboard Content */}
        <div className="mt-8">
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
                 <Link href="/spatial" prefetch={false}>
                  <GlassCard glowColor="purple" className="p-8 group cursor-pointer relative overflow-hidden transition-all duration-500 hover:scale-[1.01]">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-gx-purple/10 border border-gx-purple/20 flex items-center justify-center text-gx-purple">
                        <LayoutDashboard className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tighter">{t('txt_cbfd59')}</h3>
                        <p className="text-white/40 text-sm mt-2">{t('txt_ec7573')}</p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>

                <PhoneAuthBar className="w-full" />

                <GlassCard className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white/50" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t('txt_8f0aa2')}</div>
                      <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{currentProfile.email}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] uppercase tracking-widest"
                    onClick={() => navigator.clipboard?.writeText(currentProfile.email || "")}
                  >
                    {t('txt_79d3ab')}</Button>
                </GlassCard>

                <GlassCard className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-white/50" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t('txt_913aff')}</div>
                      <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                        {showAdminPwd ? adminPassword : "•".repeat(Math.max(8, adminPassword.length || 8))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] uppercase tracking-widest"
                      onClick={() => setShowAdminPwd(v => !v)}
                    >
                      {showAdminPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showAdminPwd ? "隐藏" : "显示"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] uppercase tracking-widest"
                      onClick={() => navigator.clipboard?.writeText(adminPassword || "")}
                      disabled={!adminPassword}
                    >
                      {t('txt_79d3ab')}</Button>
                  </div>
                </GlassCard>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] uppercase tracking-widest flex items-center gap-1 text-gx-cyan hover:text-gx-cyan/80"
                    onClick={cycleBackground}
                  >
                    <ImageIcon className="w-3 h-3" />
                    {t('txt_09b3cd')}</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] uppercase tracking-widest"
                    onClick={() => setActiveRole("merchant")}
                  >
                    {t('txt_23013e')}</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] uppercase tracking-widest"
                    onClick={() => setActiveRole("user")}
                  >
                    {t('txt_dbe983')}</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="text-[10px] uppercase tracking-widest"
                    onClick={async () => {
                      await signOut();
                      router.replace("/login");
                    }}
                  >
                    {t('txt_732906')}</Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        </div>

        {/* System Version Footer */}
        <footer className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
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
