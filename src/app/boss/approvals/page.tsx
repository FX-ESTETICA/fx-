"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/shared/GlassCard";
import { CheckCircle2, Clock, ShieldAlert, ArrowLeft, Building2, Store } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";

type MerchantApplication = {
  id: string;
  brand_name: string;
  industry: string;
  maps_link?: string | null;
  nexus_code?: string | null;
  contact_phone?: string | null;
  user_id: string;
  status: string;
  profiles?: { name?: string | null; email?: string | null; gx_id?: string | null } | null;
};

export default function BossApprovalsPage() {
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      // 恢复最优雅的联表查询 (数据库物理外键已建立)
      const { data, error } = await supabase
        .from('merchant_applications')
        .select(`
          *,
          profiles ( name, email, gx_id )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed to fetch applications:", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (app: MerchantApplication) => {
    setProcessingId(app.id);
    try {
      // 1. 物理寻址：通过 user_id 获取该用户在 principals 表里的真实主键 ID
      const { data: principal, error: pError } = await supabase
        .from('principals')
        .select('id')
        .eq('user_id', app.user_id)
        .single();

      if (pError || !principal) {
        console.error("Failed to find principal for user:", pError);
        throw new Error("无法定位申请人的物理身份 (Principal ID)，请确保该用户已初始化基础档案");
      }

      // 2. 铸造实体：在 shops 表中创建实体，并注入底层物理基因锁
      const { data: newShop, error: shopError } = await supabase
        .from('shops')
        .insert({
          name: app.brand_name,
          industry: app.industry === 'enterprise' ? 'none' : app.industry,
          maps_link: app.maps_link,
          config: { isEnterprise: app.industry === 'enterprise' },
          owner_principal_id: principal.id // 绝对 0 冲突的基因锁注入
        })
        .select()
        .single();

      if (shopError) throw shopError;

      // 3. 在 shop_bindings 中建立映射 (申请人是 OWNER)
      const { error: bindError } = await supabase
        .from('shop_bindings')
        .insert({
          shop_id: newShop.id,
          user_id: app.user_id,
          role: 'OWNER'
        });

      if (bindError) throw bindError;

      // 4. 终极降维：如果存在集结码 (Nexus Code)，执行【双重绑定】，将大老板挂载为 SUPER_OWNER
      if (app.nexus_code) {
        // 先去 profiles 表查一下这个集结码 (gx_id) 是否真的存在，防止脏数据爆破
        // 关键修复：匹配字段从 'id' 改为 'gx_id'，因为 app.nexus_code 现在存储的是类似 GX88888888 的短码
        const { data: nexusUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('gx_id', app.nexus_code)
          .single();

        if (nexusUser) {
          const { error: superOwnerError } = await supabase
            .from('shop_bindings')
            .insert({
              shop_id: newShop.id,
              user_id: nexusUser.id, // 将大老板绑定到这家店
              role: 'SUPER_OWNER'
            });
            
          if (superOwnerError) {
            console.error("Failed to bind SUPER_OWNER, but shop creation proceeds.", superOwnerError);
            // 这里可以选择 throw，但为了流程健壮性，如果老板绑定失败，我们不卡死店长的建店流程
          }
        }
      }

      // 5. 更新申请状态
      const { error: updateError } = await supabase
        .from('merchant_applications')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', app.id);

      if (updateError) throw updateError;

      // 6. 刷新列表
      fetchApplications();
    } catch (e) {
      console.error("Approval failed:", e);
      alert("审批执行失败，请检查数据库权限或约束");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (appId: string) => {
    setProcessingId(appId);
    try {
      const { error } = await supabase
        .from('merchant_applications')
        .update({ status: 'rejected' })
        .eq('id', appId);

      if (error) throw error;
      fetchApplications();
    } catch (e) {
      console.error("Rejection failed:", e);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-transparent text-white px-6 py-6 md:px-12 md:pt-8 md:pb-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-black/40 backdrop-blur-sm pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/spatial">
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-red-500 flex items-center gap-3">
                <ShieldAlert className="w-6 h-6" />
                入驻审批台
              </h1>
              <p className="text-[10px] font-mono tracking-[0.2em] text-white/40 mt-1 uppercase">Ascension Command Center // NEXUS</p>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20 text-white/40 text-xs font-mono animate-pulse">
            SYNCING WITH MATRIX...
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
            <CheckCircle2 className="w-12 h-12 text-white/20 mb-4" />
            <p className="text-sm text-white/40 font-mono tracking-widest">目前没有待审批的入驻申请</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {applications.map((app) => (
              <GlassCard 
                key={app.id} 
                className={cn(
                  "p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all",
                  app.status === 'pending' ? "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "border-white/5 opacity-50"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                    app.industry === 'enterprise' ? "bg-gx-purple/10 border-gx-purple/30 text-gx-purple" : "bg-white/5 border-white/10 text-white/60"
                  )}>
                    {app.industry === 'enterprise' ? <Building2 className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold tracking-tight">{app.brand_name}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase border",
                        app.industry === 'enterprise' ? "bg-gx-purple/20 text-gx-purple border-gx-purple/30" : "bg-white/10 text-white/60 border-white/20"
                      )}>
                        {app.industry === 'enterprise' ? '企业联邦 / ENTERPRISE' : `独立节点 / ${app.industry}`}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3">
                      <p className="text-xs text-white/60 font-mono">
                        <span className="text-white/30 mr-2">APPLICANT:</span> 
                        {app.profiles?.name || 'Unknown'} <span className="text-white/30">({app.profiles?.gx_id})</span>
                      </p>
                      <p className="text-xs text-white/60 font-mono">
                        <span className="text-white/30 mr-2">CONTACT:</span> 
                        {app.contact_phone}
                      </p>
                      {app.maps_link && (
                        <p className="text-xs text-white/60 font-mono">
                          <span className="text-white/30 mr-2">COORDINATES:</span> 
                          <a href={app.maps_link} target="_blank" className="text-gx-cyan hover:underline">View Map</a>
                        </p>
                      )}
                      {app.nexus_code && (
                        <p className="text-xs font-mono text-gx-gold">
                          <span className="text-white/30 mr-2">NEXUS LINK:</span> 
                          {app.nexus_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {app.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => handleReject(app.id)}
                        disabled={processingId === app.id}
                        className="px-4 py-2 rounded-lg bg-black border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs font-bold tracking-widest uppercase disabled:opacity-50"
                      >
                        驳回
                      </button>
                      <button 
                        onClick={() => handleApprove(app)}
                        disabled={processingId === app.id}
                        className="px-6 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all text-xs font-bold tracking-widest uppercase disabled:opacity-50 flex items-center gap-2"
                      >
                        {processingId === app.id ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        批准 / APPROVE
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-2 rounded text-xs font-mono tracking-widest text-white/30 border border-white/5 bg-black/50">
                      {app.status.toUpperCase()}
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
