"use client";

import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { Calendar, Compass, MessageSquare, History } from "lucide-react";
import Link from "next/link";
import { UserProfile } from "../types";

interface UserDashboardProps {
  profile: UserProfile;
  boundShopId?: string | null;
  industry?: string | null;
}

export const UserDashboard = ({ profile, boundShopId, industry }: UserDashboardProps) => {
  const hasPrivilege = profile.privileges?.includes("calendar_access");
  const calendarUrl = boundShopId ? `/calendar/${industry || 'beauty'}?shopId=${boundShopId}` : "/calendar/beauty";

  return (
    <div className="space-y-12">
      {/* 核心入口区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 日历特权入口 (如果用户有特权) */}
        {hasPrivilege && (
          <GlassCard glowColor="cyan" className="p-8 group cursor-pointer relative overflow-hidden transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gx-cyan/10 blur-[60px] rounded-full group-hover:bg-gx-cyan/20 transition-all duration-500" />
            <div className="relative z-10 flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan group-hover:bg-gx-cyan/20 transition-all duration-300">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-2xl font-bold tracking-tighter">专属日历 / Calendar</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  您的老板已授权您访问专属日程系统。查看、管理与同步您的任务节点。
                </p>
                <div className="pt-4">
                  <Link href={calendarUrl}>
                    <Button variant="cyan" size="sm" className="uppercase tracking-widest text-[10px]">
                      立即进入 / Access Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* 发现广场入口 */}
        <GlassCard glowColor="purple" className="p-8 group cursor-pointer relative overflow-hidden transition-all duration-500 hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gx-purple/10 blur-[60px] rounded-full group-hover:bg-gx-purple/20 transition-all duration-500" />
          <div className="relative z-10 flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gx-purple/10 border border-gx-purple/20 flex items-center justify-center text-gx-purple group-hover:bg-gx-purple/20 transition-all duration-300">
              <Compass className="w-8 h-8" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-2xl font-bold tracking-tighter">发现广场 / Discovery</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                探索本地生活新态势。集成抖音、小红书等全平台内容分发系统。
              </p>
              <div className="pt-4">
                <Link href="/discovery">
                  <Button variant="purple" size="sm" className="uppercase tracking-widest text-[10px]">
                    探索更多 / Explore
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 辅助操作区 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-6 flex flex-col items-center gap-4 text-center hover:bg-white/5 transition-all cursor-pointer">
          <MessageSquare className="w-6 h-6 text-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest">AI 助手 / AI Recaps</span>
        </GlassCard>
        <GlassCard className="p-6 flex flex-col items-center gap-4 text-center hover:bg-white/5 transition-all cursor-pointer">
          <History className="w-6 h-6 text-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest">历史足迹 / Records</span>
        </GlassCard>
      </div>
    </div>
  );
};
