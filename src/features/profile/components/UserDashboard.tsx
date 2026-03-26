"use client";

import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Calendar, MessageSquare, History, Smartphone, CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { UserProfile } from "../types";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface UserDashboardProps {
  profile: UserProfile;
  boundShopId?: string | null;
  industry?: string | null;
}

export const UserDashboard = ({ profile, boundShopId, industry }: UserDashboardProps) => {
  const { user } = useAuth();
  // 如果绑定的商户 industry 为 'none'，则认为该用户没有日历权限
  const hasPrivilege = profile.privileges?.includes("calendar_access") && industry !== 'none';
  const calendarUrl = boundShopId ? `/calendar/${industry || 'beauty'}?shopId=${boundShopId}` : "/calendar/beauty";

  const [phoneInput, setPhoneInput] = useState(profile.phone || "");
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState("");

  const handleUpdatePhone = async () => {
    if (!phoneInput.trim() || !user) return;
    setIsUpdatingPhone(true);
    setPhoneMessage("");
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: phoneInput.trim() })
        .eq('id', user.id);
        
      if (error) {
        if (error.code === '23505') { // unique violation
          throw new Error("该手机号已被其他实体绑定");
        }
        throw error;
      }
      setPhoneMessage("终端链路已建立 / Phone Linked");
    } catch (e: any) {
      setPhoneMessage(e.message || "建立失败 / Update failed");
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  return (
    <div className="space-y-12 flex flex-col items-center w-full max-w-xl mx-auto pb-12">
      {/* 核心入口区 */}
      <div className="w-full">
        {/* 日历特权入口 (如果用户有特权) */}
        {hasPrivilege && (
          <GlassCard glowColor="cyan" className="p-8 group cursor-pointer relative overflow-hidden transition-all duration-500 hover:scale-[1.02] w-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gx-cyan/10 blur-[60px] rounded-full group-hover:bg-gx-cyan/20 transition-all duration-500" />
            <div className="relative z-10 flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gx-cyan/10 border border-gx-cyan/20 flex items-center justify-center text-gx-cyan group-hover:bg-gx-cyan/20 transition-all duration-300">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tighter">专属日历 / Calendar</h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-sm mx-auto">
                  您的老板已授权您访问专属日程系统。查看、管理与同步您的任务节点。
                </p>
                <div className="pt-4 flex justify-center">
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
      </div>

      {/* 辅助操作区 */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <GlassCard className="p-6 flex flex-col items-center justify-center gap-4 text-center hover:bg-white/5 transition-all cursor-pointer">
          <MessageSquare className="w-6 h-6 text-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest">AI 助手 / AI Recaps</span>
        </GlassCard>
        <GlassCard className="p-6 flex flex-col items-center justify-center gap-4 text-center hover:bg-white/5 transition-all cursor-pointer">
          <History className="w-6 h-6 text-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest">历史足迹 / Records</span>
        </GlassCard>
      </div>

      {/* 跨域身份融合信标绑定 (手机号) */}
      <GlassCard className="p-8 border-gx-cyan/20 w-full flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tighter uppercase">通讯终端绑定</h2>
            <p className="text-white/40 text-[10px] font-mono uppercase">Cross-Domain Identity Beacon</p>
          </div>
        </div>
        
        <div className="space-y-4 w-full">
          <div className="space-y-2">
            <label className="text-[10px] text-white/60 uppercase font-mono tracking-widest">Phone Number (信标)</label>
            <Input 
              placeholder="输入您的手机号" 
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="font-mono text-white bg-black/50 border-white/10 focus:border-gx-cyan/50 focus:ring-1 focus:ring-gx-cyan/50 transition-all text-center"
            />
            <p className="text-[10px] text-white/40 leading-relaxed mt-2 max-w-sm mx-auto">
              绑定手机号后，您在实体门店的预约记录将自动与当前身份融合。门店将能识别您尊贵的 <span className="text-gx-cyan font-bold">{profile.id}</span> 标识。
            </p>
          </div>
          
          <Button 
            variant="cyan" 
            onClick={handleUpdatePhone} 
            disabled={isUpdatingPhone || !phoneInput.trim() || phoneInput === profile.phone}
            className="w-full font-mono uppercase tracking-widest text-[10px]"
          >
            {isUpdatingPhone ? (
              <><RefreshCw className="w-3 h-3 animate-spin mr-2 inline-block" /> 建立中...</>
            ) : phoneInput === profile.phone && profile.phone ? (
              <><CheckCircle2 className="w-3 h-3 mr-2 text-gx-cyan inline-block" /> 链路已激活 / ACTIVE</>
            ) : (
              "更新信标 / Update Beacon"
            )}
          </Button>
          
          {phoneMessage && (
            <p className={`text-[10px] font-mono uppercase tracking-widest mt-2 ${phoneMessage.includes("成功") || phoneMessage.includes("建立") ? "text-gx-cyan" : "text-gx-red"}`}>
              {phoneMessage}
            </p>
          )}
        </div>
      </GlassCard>

      {/* 退出系统按钮 (复用 Admin/Merchant 风格) */}
      <div className="mt-4 w-full flex justify-center">
        <Button
          variant="danger"
          size="sm"
          className="text-[10px] uppercase tracking-widest w-full md:w-auto px-12"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
        >
          退出系统 / LOGOUT
        </Button>
      </div>
    </div>
  );
};
