"use client";

import { useAuth, SandboxUser } from "@/features/auth/hooks/useAuth";
import { CYBER_COLOR_DICTIONARY, CyberThemeColor } from "@/hooks/useVisualSettings";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Sphere, Billboard, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useState, useRef } from "react";
import { ShieldCheck, X, UserPlus, UserMinus, Calendar, LineChart, Trash2, Search, Loader2, Maximize2, Zap, Rocket, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useShop } from "@/features/shop/ShopContext"; // 引入 ShopContext
import { motion, AnimatePresence } from "framer-motion";

// --- Types & State ---
type NodeStatus = 'pending' | 'active';

export interface PlanetData {
  id: string; // 升级为 UUID
  key: CyberThemeColor | 'core';
  name: string;
  status: NodeStatus;
  industry: string | null;
  managerId: string | null;
  managerName?: string | null; // 新增：店长真实姓名
  managerRole?: string | null; // 新增：店长系统角色
  isCore?: boolean; // 新增：是否为母星
}

// 模拟初始星球颜色的“轨道底座”，真实数据不足时用这些填充
const ORBIT_SLOTS: CyberThemeColor[] = [
  "cyan", "purple", "gold", "emerald", "rose", 
  "silver", "platinum", "cyan", "purple", "emerald"
];

// --- Custom Hooks ---

function useNebulaData(bossId: string | undefined) {
  const [planets, setPlanets] = useState<PlanetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取数据
  const fetchNodes = async () => {
    if (!bossId) return;
    setIsLoading(true);
    try {
      // 1. 获取当前 Boss 的合法的 Principal ID
      const { data: principalData, error: principalError } = await supabase
        .from('principals')
        .select('id')
        .eq('user_id', bossId)
        .single();
        
      if (principalError) {
         console.warn("[Nebula] 未找到对应的 principal_id，可能是首次进入或测试账号", principalError);
      }
      
      const validPrincipalId = principalData?.id || bossId; // 降级回退

      // 2. 从我们设计的视图中拉取数据
      const { data, error } = await supabase
        .from('v_nebula_nodes')
        .select('*')
        .eq('boss_id', validPrincipalId); // 使用 principal_id 查询

      if (error) throw error;

      // --- 新增：提取所有存在的 manager_gx_id，去 profiles 表查真实姓名 ---
      const managerIds = (data || []).map((n: any) => n.manager_gx_id).filter(Boolean);
      let profilesMap: Record<string, { name: string; role: string }> = {};
      
      if (managerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('gx_id, name, role')
          .in('gx_id', managerIds);
          
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.gx_id] = { name: p.name || 'Unknown', role: p.role };
            return acc;
          }, {} as Record<string, { name: string; role: string }>);
        }
      }

      // 将数据库真实节点映射到我们的前端 10 个轨道插槽上，并缝合真实姓名
      const realNodes = (data || []).map((node: any) => ({
        id: node.shop_id,
        key: (node.color_key as CyberThemeColor) || 'cyan',
        name: node.name || '筹备中',
        status: (node.status as NodeStatus) || 'pending',
        industry: node.industry,
        managerId: node.manager_gx_id,
        managerName: node.manager_gx_id ? profilesMap[node.manager_gx_id]?.name : null,
        managerRole: node.manager_gx_id ? profilesMap[node.manager_gx_id]?.role : null
      }));

      // 如果不足 10 个，生成虚拟节点填充轨道
      const filledPlanets: PlanetData[] = [];
      for (let i = 0; i < 10; i++) {
        if (i < realNodes.length) {
          filledPlanets.push(realNodes[i]);
        } else {
          // 生成虚拟的筹备中节点
          filledPlanets.push({
            id: `virtual-${i}`,
            key: ORBIT_SLOTS[i],
            name: "筹备中",
            status: "pending",
            industry: null,
            managerId: null,
            managerName: null,
            managerRole: null
          });
        }
      }
      setPlanets(filledPlanets);
    } catch (err) {
      console.error("Failed to fetch nebula nodes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, [bossId]);

  // 激活/更新节点
  const updateNode = async (id: string, updates: any): Promise<PlanetData | null> => {
    try {
      console.log("[Nebula] 准备更新节点，收到的 ID:", id, "更新内容:", updates);
      
      // 关键修复：获取合法的 owner_principal_id
      // 因为 bossId 是 user_id，我们需要找到对应的 principal_id
      const { data: principalData, error: pErr } = await supabase
        .from('principals')
        .select('id')
        .eq('user_id', bossId)
        .single();
        
      if (pErr) {
        console.error("[Nebula] 严重错误：在 principals 表中找不到当前账号的记录", pErr);
        alert("致命错误：您的最高管理员账号在数据库底层缺乏 Principal 实体，请联系系统架构师补充。");
        return null;
      }
        
      const validPrincipalId = principalData.id;
      let newPlanetId = id;
      
      // 如果 ID 是我们前端生成的虚拟 ID (virtual-x)，说明数据库里根本没有这条记录
      // 我们需要执行 INSERT 而不是 UPDATE
      if (id.startsWith('virtual-')) {
        console.log("[Nebula] 检测到虚拟节点，正在数据库中创建新记录...");
        
        const { data, error } = await supabase
          .from('shops')
          .insert({
            owner_principal_id: validPrincipalId, // 使用合法的 principal_id 规避外键冲突
            name: updates.name,
            industry: updates.industry,
            nebula_status: updates.status,
            theme_color: ORBIT_SLOTS[parseInt(id.split('-')[1]) || 0] // 继承虚拟插槽的颜色
          })
          .select() // 需要 select 才能返回新生成的 id
          .single();

        if (error) {
          console.error("[Nebula] INSERT 失败详情:", error);
          throw error;
        }
        console.log("[Nebula] 新节点创建成功:", data);
        newPlanetId = data.id; // 记录真实返回的 UUID
      } else {
        // 如果是真实存在的 UUID，执行 UPDATE
        console.log("[Nebula] 正在更新现有真实节点...");
        const { error } = await supabase
          .from('shops')
          .update({
            name: updates.name,
            industry: updates.industry,
            nebula_status: updates.status
          })
          .eq('id', id);

        if (error) {
          console.error("[Nebula] UPDATE 失败详情:", error);
          throw error;
        }
      }

      await fetchNodes(); // 重新拉取以保证数据一致性
      
      // 构造并返回最新的 PlanetData，以便外层 HUD 能够无缝接管
      // (注意：这里返回的 name 还没查数据库，但因为是刚更新的，我们先返回一个占位符或旧值，
      // 外层组件的 useEffect 会在下一次 planets 更新时自动对齐真实姓名)
      return {
        id: newPlanetId,
        key: id.startsWith('virtual-') ? ORBIT_SLOTS[parseInt(id.split('-')[1]) || 0] : 'cyan',
        name: updates.name,
        status: updates.status,
        industry: updates.industry,
        managerId: null,
        managerName: null,
        managerRole: null
      };
    } catch (err: any) {
      console.error("Failed to update node. 详细错误:", err.message || err);
      alert(`节点操作失败: ${err.message || "未知错误，请检查控制台"}`);
      return null;
    }
  };

  // 授权店长 (三位一体原子化飞升)
  const delegateManager = async (shopId: string, managerGxId: string): Promise<PlanetData | null> => {
    try {
      // 1. 先去 profiles 找这个 gx_id 对应的真实 UUID
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('gx_id', managerGxId)
        .single();
        
      if (profileErr || !profile) {
        alert("未找到该用户ID，请核对。");
        return null;
      }

      // 【核心突破】2. 身份升维：如果他还是个 user，强行拔高为 merchant
      if (profile.role === 'user') {
        const { error: upgradeErr } = await supabase
          .from('profiles')
          .update({ role: 'merchant' })
          .eq('id', profile.id);
          
        if (upgradeErr) {
          console.error("身份升维失败:", upgradeErr);
          throw new Error("无法提升该用户的系统权限级别");
        }
      }

      // 【核心突破】3. 补全合法性档案：向 merchant_applications 注入一条获批记录，消灭控制台的 406 寻址报错
      // 先查一下他是不是已经有记录了
      const { data: existingApp } = await supabase
        .from('merchant_applications')
        .select('id')
        .eq('user_id', profile.id)
        .limit(1)
        .maybeSingle();
        
      if (!existingApp) {
        // 强行塞入一条合法记录，brand_name 暂时填店铺名，industry 填对应行业
        const targetPlanet = planets.find(p => p.id === shopId);
        const { error: appErr } = await supabase
          .from('merchant_applications')
          .insert({
            user_id: profile.id,
            brand_name: targetPlanet?.name || 'Authorized Node',
            industry: targetPlanet?.industry || 'beauty',
            status: 'approved',
            reviewed_at: new Date().toISOString()
          });
          
        if (appErr) {
           console.warn("补全合法性档案失败 (非致命):", appErr);
        }
      } else {
        // 如果有记录但没通过，强制扭转为 approved
        await supabase
          .from('merchant_applications')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('id', existingApp.id);
      }

      // 4. 物理绑定：将他塞进实体店 (最后一步执行，防止引发实时订阅风暴)
      const { error: bindErr } = await supabase
        .from('shop_bindings')
        .insert({
          shop_id: shopId,
          user_id: profile.id,
          role: 'OWNER' // 修正：对应数据库底层的枚举类型
        });

      if (bindErr) throw bindErr;
      await fetchNodes(); // 重新拉取所有节点数据以保证全局一致
      
      // 构造并返回一个最新的 PlanetData 给面板实现热更新
      return {
        // 这里为了热更新，我们需要从现有的 planets 中找出现有的这颗星球，并把新的经理信息缝合进去
        ...planets.find(p => p.id === shopId)!,
        managerId: managerGxId,
        managerName: profile.name,
        managerRole: 'merchant' // 强制更新 UI 显示的 Role
      };
    } catch (err: any) {
      console.error("Failed to delegate manager:", err);
      alert(`授权失败: ${err.message || "权限不足或数据库约束冲突"}`);
      return null;
    }
  };

  // 撤销店长
  const revokeManager = async (shopId: string): Promise<PlanetData | null> => {
    try {
      const { error } = await supabase
        .from('shop_bindings')
        .delete()
        .match({ shop_id: shopId, role: 'OWNER' }); // 修正：与授权时的枚举类型对齐
        
      if (error) throw error;
      await fetchNodes();
      
      // 构造并返回一个最新的 PlanetData 给面板实现热更新 (清除店长信息)
      return {
        ...planets.find(p => p.id === shopId)!,
        managerId: null,
        managerName: null,
        managerRole: null
      };
    } catch (err) {
      console.error("Failed to revoke manager:", err);
      alert("撤销失败");
      return null;
    }
  };

  // 终极清洗 (慎用) - 连根拔起
  const purgeNode = async (shopId: string) => {
    try {
      // 彻底抹除物理节点：直接删除 shops 表中的该记录
      // Supabase 配置了级联删除(Cascade)的话，相关的 shop_bindings 也会自动消失
      // 为了安全，我们还是显式地先删 binding 再删 shop
      await supabase.from('shop_bindings').delete().eq('shop_id', shopId);
      
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopId);
        
      if (error) throw error;
      
      // 重新拉取数据，被删除的节点会被我们前端的虚拟插槽自动填补，名字自然恢复为"筹备中"
      await fetchNodes();
      return true;
    } catch (err) {
      console.error("Failed to purge node:", err);
      alert("终极清洗失败");
      return false;
    }
  };

  // 终极涅槃 (Phoenix Protocol V2) - 通过 RPC 引擎进行物理级解散联邦
  const obliterateEnterprise = async () => {
    try {
      if (!bossId) throw new Error("缺少 Boss 身份标识");

      // 调用后端最高权限的 RPC 函数，执行原子化清理
      const { error } = await supabase.rpc('obliterate_my_enterprise', {
        target_user_id: bossId
      });

      if (error) {
        console.error("RPC 执行失败:", error);
        throw error;
      }
      
      // 重置 Auth Context 和界面状态
      alert("企业联邦已解散，星系数据已归零。");
      window.location.href = '/dashboard'; // 强制跳转回个人中心以刷新所有缓存状态
    } catch (err) {
      console.error("Failed to obliterate enterprise:", err);
      alert("解散联邦失败，请检查网络或权限。");
    }
  };

  return {
    planets,
    isLoading,
    updateNode,
    delegateManager,
    revokeManager,
    purgeNode,
    obliterateEnterprise
  };
}

const INDUSTRY_OPTIONS = [
  { value: "beauty", label: "Beauty // 美业" },
  { value: "dining", label: "Dining // 餐饮" },
  { value: "medical", label: "Medical // 医疗" },
  { value: "fitness", label: "Fitness // 健身" },
];

// --- 2D HUD Components ---

function GlobalSearchHUD({ onSearch }: { onSearch: (term: string) => void }) {
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="relative group">
        <div className="absolute inset-0 bg-gx-cyan/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="relative flex items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 transition-all duration-300 group-hover:border-gx-cyan/50 focus-within:border-gx-cyan focus-within:bg-black/60">
          <Search className="w-4 h-4 text-white/50 mr-3" />
          <input 
            type="text" 
            placeholder="搜索分公司或节点名称..." 
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none font-mono tracking-wider"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function NodeManagementHUD({ 
  planet, 
  onClose, 
  onUpdate,
  onDelegate,
  onRevoke,
  onPurge,
  onPlanetTransition,
  onDive,
  onObliterate
}: { 
  planet: PlanetData; 
  onClose: () => void;
  onUpdate: (id: string, data: Partial<PlanetData>) => Promise<PlanetData | null>;
  onDelegate: (shopId: string, managerGxId: string) => Promise<PlanetData | null>;
  onRevoke: (shopId: string) => Promise<PlanetData | null>;
  onPurge: (shopId: string) => Promise<boolean>;
  onPlanetTransition: (newPlanet: PlanetData) => void;
  onDive: () => void;
  onObliterate?: () => Promise<void>;
}) {
  const router = useRouter();
  const { setActiveShopId } = useShop(); // 引入全局店铺上下文

  const isPending = planet.status === 'pending';
  
  const [nameInput, setNameInput] = useState(planet.name === '筹备中' ? '' : planet.name);
  const [industryInput, setIndustryInput] = useState(planet.industry || '');
  const [managerInput, setManagerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 当星球切换时，重置表单
  useEffect(() => {
    setNameInput(planet.name === '筹备中' ? '' : planet.name);
    setIndustryInput(planet.industry || '');
    setManagerInput('');
  }, [planet]);

  const handleActivate = async () => {
    if (!nameInput || !industryInput) {
      alert("[系统拦截] 必须设置名称和行业才能激活节点");
      return;
    }
    setIsSubmitting(true);
    const updatedPlanet = await onUpdate(planet.id, { 
      name: nameInput, 
      industry: industryInput, 
      status: 'active' 
    });
    setIsSubmitting(false);
    
    // 如果激活成功，通知外层无缝接管新的节点数据，防止窗口闪退或重置
    if (updatedPlanet) {
      onPlanetTransition(updatedPlanet);
    }
  };

  const handleAuthorize = async () => {
    if (!managerInput) return;
    setIsSubmitting(true);
    const updatedPlanet = await onDelegate(planet.id, managerInput);
    if (updatedPlanet) {
      setManagerInput('');
      onPlanetTransition(updatedPlanet); // 强制面板热更新店长信息
    }
    setIsSubmitting(false);
  };

  const handleRevoke = async () => {
    if (confirm("确定要撤销该店长权限吗？节点运营数据将保留，管辖权收归Boss。")) {
      setIsSubmitting(true);
      const updatedPlanet = await onRevoke(planet.id);
      if (updatedPlanet) {
        onPlanetTransition(updatedPlanet); // 强制面板热更新清除店长信息
      }
      setIsSubmitting(false);
    }
  };

  const handlePurge = async () => {
    if (confirm("警告：终极清洗将抹除该节点所有数据，恢复为筹备中状态。是否继续？")) {
      setIsSubmitting(true);
      const success = await onPurge(planet.id);
      setIsSubmitting(false);
      if (success) {
        onClose();
      }
    }
  };

  const handleEnterCalendar = () => {
    if (!planet.industry) {
      alert("该节点尚未绑定行业，无法生成日历矩阵。");
      return;
    }
    
    // 1. 将全局 ShopContext 切换为当前选中的星球
    setActiveShopId(planet.id);
    
    // 2. 携带 Token 和真实 shopId 穿越至对应行业日历
    router.push(`/calendar/${planet.industry}?shopId=${planet.id}`);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-black/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-gx-cyan/10 relative">
        
        {/* 顶部流光线 */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gx-cyan to-transparent opacity-50" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${isPending ? 'bg-white/20' : 'bg-gx-cyan animate-pulse'}`} />
            <h2 className="text-sm font-mono tracking-widest text-white/80">NODE CONTROL PANEL</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {planet.isCore ? (
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <ShieldCheck className="w-16 h-16 text-gx-cyan opacity-80" />
                <h3 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gx-cyan to-purple-400">
                  {planet.name}
                </h3>
                <p className="text-xs font-mono text-white/50">ENTERPRISE CORE // 企业中枢</p>
              </div>
              
              <div className="pt-4 mt-4 border-t border-red-500/20">
                {onObliterate && (
                  <button
                    onClick={async () => {
                      if (confirm("【绝对警告】此操作将引爆整个企业联邦，所有分公司、日历、订单数据将瞬间灰飞烟灭，且无法恢复！您的账号将重置为普通用户。是否确认引爆？")) {
                        setIsSubmitting(true);
                        await onObliterate();
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 bg-red-500/20 border border-red-500 text-white shadow-[0_0_15px_rgba(255,0,0,0.5)] text-xs font-black tracking-[0.1em] uppercase hover:bg-red-500/40 hover:shadow-[0_0_25px_rgba(255,0,0,0.8)] transition-all rounded px-4 py-3 animate-pulse disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ABYSSAL COLLAPSE (解散联邦)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* 基础档案区 (Data Core) */}
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase text-white/40 tracking-[0.2em] mb-2 border-b border-white/5 pb-1">DATA CORE // 基础档案</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase mb-1 block">NODE DESIGNATION</label>
                    {isPending ? (
                      <input 
                        type="text" 
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gx-cyan focus:outline-none transition-colors"
                        placeholder="e.g. 洛圣都一号店"
                      />
                    ) : (
                      <div className="w-full bg-gx-cyan/5 border border-gx-cyan/30 rounded px-3 py-2 text-sm text-gx-cyan font-bold tracking-wider shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                        {planet.name}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-[10px] text-white/40 uppercase mb-1 block">INDUSTRY DNA</label>
                    {isPending ? (
                      <select 
                        value={industryInput}
                        onChange={(e) => setIndustryInput(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gx-cyan focus:outline-none transition-colors appearance-none"
                      >
                        <option value="" disabled>Select Industry Template</option>
                        {INDUSTRY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white/80">
                        {INDUSTRY_OPTIONS.find(o => o.value === planet.industry)?.label || planet.industry}
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <button 
                      onClick={handleActivate}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center space-x-2 bg-gx-cyan/10 hover:bg-gx-cyan/20 border border-gx-cyan/30 hover:border-gx-cyan text-gx-cyan rounded px-4 py-3 text-sm font-bold tracking-widest transition-all group shadow-[0_0_20px_rgba(0,242,255,0.1)] hover:shadow-[0_0_30px_rgba(0,242,255,0.3)] disabled:opacity-50 mt-4"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                      <span>ACTIVATE NODE (激活节点)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 激活后的运营区域 */}
              {!isPending && (
                <>
                  {/* 人员管辖区 (Personnel Command) */}
                  <div className="space-y-4 animate-in slide-in-from-bottom-2">
                    <h3 className="text-[10px] uppercase text-white/40 tracking-[0.2em] mb-2 border-b border-white/5 pb-1">COMMAND // 人员管辖</h3>
                    
                    {planet.managerId ? (
                      <div className="bg-gx-cyan/5 border border-gx-cyan/20 rounded p-4 flex flex-col space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gx-cyan/10 rounded-full blur-xl -mr-8 -mt-8" />
                        
                        <div className="flex items-start justify-between relative z-10">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <ShieldCheck className="w-4 h-4 text-gx-cyan" />
                              <span className="text-sm font-bold text-white tracking-wider">STORE MANAGER</span>
                            </div>
                            <div className="text-[10px] text-white/50 font-mono pl-6">
                              ID: {planet.managerId}
                            </div>
                            <div className="text-xs text-gx-cyan font-bold pl-6 pt-1">
                              {planet.managerName ? `${planet.managerName} | ${planet.managerRole === 'merchant' ? '商户' : '管理员'}` : '同步中...'}
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleRevoke()}
                            className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded transition-all flex items-center justify-center"
                            title="撤销店长权限"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <input 
                          type="text" 
                          value={managerInput}
                          onChange={(e) => setManagerInput(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gx-cyan focus:outline-none transition-colors font-mono"
                          placeholder="Input ID (e.g. GX-UR-123)"
                        />
                        <button 
                          onClick={handleAuthorize}
                          disabled={isSubmitting}
                          className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded px-4 py-2 text-sm transition-all whitespace-nowrap disabled:opacity-50 font-bold"
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                          <span>AUTHORIZE</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 核心流转矩阵 (Operation Matrix) */}
                  <div className="space-y-4 animate-in slide-in-from-bottom-2">
                    <h3 className="text-[10px] uppercase text-white/40 tracking-[0.2em] mb-2 border-b border-white/5 pb-1">MATRIX // 核心流转</h3>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <button 
                        onClick={onDive}
                        className="flex items-center justify-between bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded p-4 transition-all group overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Rocket className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-bold text-purple-100 tracking-wider">NEBULA DIVE</span>
                            <span className="text-[10px] text-purple-400/60 font-mono">星云下钻 / 局部星系视图</span>
                          </div>
                        </div>
                        <Maximize2 className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400" />
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={handleEnterCalendar}
                          className="flex flex-col items-center justify-center space-y-2 bg-white/5 hover:bg-gx-cyan/10 border border-white/10 hover:border-gx-cyan/30 rounded p-4 transition-all group"
                        >
                          <Calendar className="w-5 h-5 text-white/50 group-hover:text-gx-cyan transition-colors" />
                          <span className="text-[11px] font-bold text-white/70 group-hover:text-white tracking-widest">ENTER MATRIX</span>
                        </button>
                        
                        <button 
                          onClick={() => alert("[沙盒拦截] 准备展开全息 AI 财务面板")}
                          className="flex flex-col items-center justify-center space-y-2 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded p-4 transition-all group"
                        >
                          <LineChart className="w-5 h-5 text-white/50 group-hover:text-emerald-400 transition-colors" />
                          <span className="text-[11px] font-bold text-white/70 group-hover:text-white tracking-widest">AI FINANCIALS</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
                      <button 
                        onClick={handlePurge}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center space-x-2 bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 hover:border-red-500/50 text-red-500/80 hover:text-red-400 rounded px-4 py-3 text-[10px] tracking-widest transition-all group"
                      >
                        <Trash2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
                        <span>PURGE NODE DATA (终极清洗)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// --- 3D Components ---

// === 核心基因提纯：通用赛博星球组件 (CyberSphere) ===
// 解决材质冲突，实现主星云与子星系的 100% 视觉克隆
function CyberSphere({
  size,
  colorHex,
  labelTitle,
  labelSubtitle,
  isDimmed = false, // 是否被暗化（用于未激活状态）
  glowColor,        // 发光阴影的颜色
  onClick,
}: {
  size: number;
  colorHex: string;
  labelTitle: string;
  labelSubtitle: string;
  isDimmed?: boolean;
  glowColor?: string;
  onClick?: (e: any) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [labelOpacity, setLabelOpacity] = useState(1);
  const [hovered, setHovered] = useState(false);

  // 鼠标悬浮放大
  const currentSize = hovered ? size * 1.05 : size;

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  // 继承完美的“背面遮挡计算法则”
  useFrame((state) => {
    if (ref.current) {
      const worldPosition = new THREE.Vector3();
      ref.current.getWorldPosition(worldPosition);
      const cameraPosition = state.camera.position;
      const distanceToCamera = worldPosition.distanceTo(cameraPosition);
      const centerPosition = new THREE.Vector3(0, 0, 0);
      const centerDistanceToCamera = centerPosition.distanceTo(cameraPosition);
      
      if (distanceToCamera > centerDistanceToCamera + 2) {
        setLabelOpacity(0);
      } else {
        setLabelOpacity(1);
      }
    }
  });

  const effectiveHex = isDimmed ? '#444444' : colorHex;
  const effectiveGlow = glowColor || colorHex;

  return (
    <group>
      <Sphere 
        ref={ref} 
        args={[currentSize, 64, 64]}
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      >
        {/* 100% 复刻主星云的高光烤漆材质 */}
        <meshStandardMaterial 
          color={effectiveHex} 
          emissive={effectiveHex}
          emissiveIntensity={0} 
          roughness={0.1}
          metalness={0.2}
        />
      </Sphere>

      <Html position={[0, -currentSize - 0.8, 0]} center transform sprite zIndexRange={[100, 0]}>
        <div 
          className="pointer-events-auto cursor-pointer group w-max flex flex-col items-center select-none transition-opacity duration-300"
          style={{ opacity: labelOpacity }}
          onClick={onClick}
        >
          <span 
            className={`text-[10px] font-medium tracking-[0.3em] px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-300 group-hover:scale-110 group-hover:bg-white/10 ${!isDimmed ? 'shadow-[0_0_15px_var(--glow-color)]' : ''}`}
            style={{
              backgroundColor: `${effectiveHex}20`,
              borderColor: `${effectiveHex}40`,
              color: isDimmed ? '#888888' : '#ffffff',
              '--glow-color': `${effectiveGlow}40`
            } as any}
          >
            {labelTitle}
          </span>
          <span 
            className="text-[8px] font-mono mt-1 tracking-widest transition-colors duration-300 group-hover:text-white"
            style={{ color: isDimmed ? '#555555' : `${effectiveHex}80` }}
          >
            {labelSubtitle}
          </span>
        </div>
      </Html>
    </group>
  );
}

// --- 子星系视图组件 (Nebula SubSystem) ---
function NebulaSubSystem({ targetPlanet }: { targetPlanet: PlanetData }) {
  const [staffs, setStaffs] = useState<any[]>([]);
  const orbitGroupRef = useRef<THREE.Group>(null);
  
  // 1. 挂载时，去 shop_configs 查这家店的员工
  useEffect(() => {
    const fetchStaffs = async () => {
      try {
        const { data, error } = await supabase
          .from('shop_configs')
          .select('config')
          .eq('shop_id', targetPlanet.id)
          .maybeSingle(); // 极其关键的修改：从 single() 降级为 maybeSingle()，彻底解决全新公司报 404 的问题
          
        if (!error && data?.config?.staffs) {
          // 过滤掉已离职的员工
          const activeStaffs = data.config.staffs.filter((s: any) => s.status !== 'resigned');
          setStaffs(activeStaffs);
        }
      } catch (e) {
        console.error("Failed to load staffs for subsystem", e);
      }
    };
    fetchStaffs();
  }, [targetPlanet.id]);

  // 2. 整个星系的缓慢自转
  useFrame((_, delta) => {
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group>
      {/* 更深邃的背景星空，参数与主星云不同，营造内部空间的错觉 */}
      <Stars radius={50} depth={20} count={2000} factor={2} saturation={0.5} fade speed={2} />
      
      {/* 摄像机控制器：锁定在原点，允许旋转，但限制缩放距离 */}
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={5} 
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 + 0.5} 
      />
      
      {/* 中心恒星 (当前门店) - 绝对居中于 [0,0,0]，复用 CyberSphere */}
      <group position={[0, 0, 0]}>
        <CyberSphere 
          size={2.5} // 略微缩小，让出更多空间给卫星
          colorHex={CYBER_COLOR_DICTIONARY[targetPlanet.key as CyberThemeColor]?.hex || '#ffffff'}
          labelTitle={targetPlanet.name}
          labelSubtitle={targetPlanet.industry?.toUpperCase() + " NODE"}
        />
      </group>

      {/* 员工卫星阵列 (围绕中心恒星) */}
      <group ref={orbitGroupRef}>
        {staffs.map((staff, index) => {
          const total = staffs.length;
          const angle = (index / total) * Math.PI * 2;
          const radius = 8; // 卫星轨道半径
          
          return (
            <group key={staff.id} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
              <CyberSphere 
                size={0.6} // 员工卫星尺寸更小
                colorHex={staff.color || '#00f2ff'} // 注入日历里的员工颜色
                labelTitle={staff.name}
                labelSubtitle={staff.role || 'STAFF'}
                glowColor={staff.color || '#00f2ff'}
              />
            </group>
          );
        })}
      </group>
    </group>
  );
}

function CoreNode({ 
  userAvatar, 
  userName, 
  userId,
  onClick 
}: { 
  userAvatar: string | null, 
  userName: string, 
  userId: string,
  onClick?: () => void
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [hovered, setHovered] = useState(false);

  // 动态加载头像纹理，处理 CORS 和 null 回退
  useEffect(() => {
    if (userAvatar) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      loader.load(
        userAvatar,
        (txt) => {
          txt.colorSpace = THREE.SRGBColorSpace;
          setTexture(txt);
        },
        undefined,
        (err) => console.error("Failed to load avatar texture", err)
      );
    }
  }, [userAvatar]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  return (
    <group 
      onClick={(e) => {
        // 阻止事件冒泡，防止触发背景的点击
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {/* 核心恒星 - 使用 Billboard 确保头像永远正对摄像机 */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {/* 真实的 3D 球体，贴上头像纹理，并添加交互反馈 */}
        <Sphere args={[2, 64, 64]}>
          <meshStandardMaterial 
            map={texture || undefined} 
            color={texture ? "#ffffff" : "#000000"} 
            emissive={texture ? "#000000" : "#00f2ff"}
            emissiveIntensity={texture ? 0 : 0.2}
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>

        {/* 如果头像加载失败或没有头像，显示全息 Icon */}
        {!texture && (
          <Html position={[0, 0, 0]} center transform sprite zIndexRange={[100, 0]}>
            <ShieldCheck className="w-12 h-12 text-gx-cyan drop-shadow-[0_0_15px_rgba(0,242,255,0.8)]" />
          </Html>
        )}
      </Billboard>

      {/* 身份标识 - 永远悬浮在核心下方，支持物理遮挡 */}
      <Html position={[0, -3.5, 0]} center transform sprite zIndexRange={[100, 0]}>
        {/* 添加 select-none 禁用文本选中，防止拖拽 3D 场景时误触原生高亮 */}
        {/* 扩大 w-[600px] 容器宽度并使用 whitespace-nowrap 强制不换行 */}
        <div className="flex flex-col items-center text-center space-y-2 w-[600px] pointer-events-none select-none">
          <h1 className="text-4xl md:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gx-cyan via-purple-400 to-gx-cyan bg-[length:200%_auto] animate-gradient drop-shadow-[0_0_20px_rgba(0,255,255,0.3)] whitespace-nowrap">
            {userName}
          </h1>
          <div className="text-[10px] font-mono text-gx-cyan/80 tracking-[0.2em] border border-gx-cyan/30 px-3 py-1 rounded-full bg-gx-cyan/[0.05] backdrop-blur-md">
            ID: {userId}
          </div>
        </div>
      </Html>
    </group>
  );
}

// === 重构：使用 CyberSphere 的主星云星球 (PlanetNode) ===
function PlanetNode({ 
  planet, 
  index, 
  total,
  onClick
}: { 
  planet: PlanetData, 
  index: number, 
  total: number,
  onClick: (planet: PlanetData) => void
}) {
  const colorConfig = CYBER_COLOR_DICTIONARY[planet.key as CyberThemeColor];
  
  // 绝对等分轨道
  const angle = (index / total) * Math.PI * 2;
  const radius = 12; // 轨道半径
  
  return (
    <group position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
      <CyberSphere 
        size={0.8}
        colorHex={colorConfig.hex}
        labelTitle={planet.name}
        labelSubtitle={planet.status === 'active' ? (planet.industry + " NODE") : "筹备中"}
        isDimmed={planet.status !== 'active'}
        glowColor={colorConfig.hex}
        onClick={(e) => { e.stopPropagation(); onClick(planet); }}
      />
    </group>
  );
}

function NebulaUniverse({ 
  userName, 
  userAvatar, 
  userId, 
  planets,
  onPlanetClick
}: {
  userName: string;
  userAvatar: string | null;
  userId: string;
  planets: PlanetData[];
  onPlanetClick: (planet: PlanetData) => void;
}) {
  // 增加一个外层群组的引用，用于控制整个星系的统一缓慢自转
  const galaxyRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (galaxyRef.current) {
      // 整个星系像表盘一样极其缓慢地统一公转
      galaxyRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <>
      {/* R3F 原生 3D 星空背景 */}
      <Stars radius={100} depth={50} count={3000} factor={3} saturation={0} fade speed={0.5} />

      {/* 绝对中心：神枢 (不参与星系旋转，永远保持正对) */}
      <CoreNode 
        userAvatar={userAvatar} 
        userName={userName} 
        userId={userId} 
        onClick={() => {
          // 构造一个代表母星的 PlanetData 对象并触发点击事件
          onPlanetClick({
            id: 'core',
            name: userName,
            industry: 'enterprise',
            status: 'active',
            key: 'core',
            managerId: userId,
            managerName: userName,
            managerRole: 'boss',
            isCore: true
          });
        }}
      />

      {/* 星系旋转层：包含轨道和所有行星，保持绝对秩序 */}
      <group ref={galaxyRef}>
        {/* 物理轨道参照线 */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[11.98, 12.02, 128]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} />
        </mesh>

        {/* 业务行星群 */}
        {planets.map((planet: PlanetData, i: number) => (
          <PlanetNode 
            key={planet.id} 
            planet={planet} 
            index={i} 
            total={planets.length} 
            onClick={onPlanetClick}
          />
        ))}
      </group>

      {/* R3F 官方 3D 摄像机控制器 */}
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={5} 
        maxDistance={40}
        makeDefault
      />
    </>
  );
}

export default function NebulaPage() {
  const { user, activeRole } = useAuth();
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  
  // === 世界顶端架构：虚空置换 (Wormhole Swap) 状态机 ===
  const [diveState, setDiveState] = useState<{
    isActive: boolean;
    targetPlanet: PlanetData | null;
    isTransitioning: boolean;
  }>({ isActive: false, targetPlanet: null, isTransitioning: false });

  // 安全地提取用户信息
  const sUser = user as SandboxUser;
  const userName = sUser?.name || "BOSS_NAME";
  const userAvatar = sUser?.avatar || null;
  const userId = sUser?.gxId || (activeRole === 'boss' ? 'GX88888888' : 'GX-NE-000001');

  // 获取真实数据库 ID (假设 activeRole 是 boss 并且 user 存在，这里需要真实的 profile id，如果是沙盒则用 undefined 测试)
  const bossProfileId = sUser?.id; 

  // 使用自定义 Hook 拉取 Supabase 数据
  const { 
    planets, 
    isLoading, 
    updateNode, 
    delegateManager, 
    revokeManager, 
    purgeNode,
    obliterateEnterprise
  } = useNebulaData(bossProfileId);

  // 当星球数据更新时，如果当前选中了某个星球，也需要同步更新面板状态
  useEffect(() => {
    if (selectedPlanet) {
      const updated = planets.find(p => p.id === selectedPlanet.id);
      if (updated) {
        setSelectedPlanet(updated);
      }
    }
  }, [planets]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-gx-cyan animate-spin" />
          <div className="text-gx-cyan/50 font-mono text-sm tracking-widest animate-pulse">INITIALIZING NEBULA PROTOCOL...</div>
        </div>
      </main>
    );
  }

  const handleSearch = (term: string) => {
    console.log("[GlobalSearch] Searching for:", term);
    // TODO: 实现摄像机飞越到对应星球的逻辑
  };

  // --- 虚空置换控制逻辑 ---
  const triggerNebulaDive = (planet: PlanetData) => {
    if (planet.status !== 'active') {
      alert("仅已激活且授权的节点可进行星云下钻。");
      return;
    }
    
    // 1. 关闭面板
    setSelectedPlanet(null);
    
    // 2. 开启跃迁遮罩 (0.8秒)
    setDiveState({ isActive: false, targetPlanet: planet, isTransitioning: true });
    
    // 3. 0.8秒后，遮罩达到最不透明时，瞬间卸载主星云，挂载子星系
    setTimeout(() => {
      setDiveState({ isActive: true, targetPlanet: planet, isTransitioning: false });
    }, 800);
  };

  const triggerReturnToNebula = () => {
    // 1. 开启返航跃迁遮罩
    setDiveState(prev => ({ ...prev, isTransitioning: true }));
    
    // 2. 0.8秒后，瞬间卸载子星系，重新挂载主星云
    setTimeout(() => {
      setDiveState({ isActive: false, targetPlanet: null, isTransitioning: false });
    }, 800);
  };

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
      
      {/* 虫洞跃迁全屏遮罩特效：极光深渊 (Abyssal Aurora) */}
      <AnimatePresence>
        {diveState.isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center bg-black"
          >
            {/* 极光深渊特效 */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,242,255,0.1)_0%,transparent_50%)] animate-pulse" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(188,0,255,0.05)_0%,transparent_100%)]" />
            <div className="w-screen h-[2px] bg-gx-cyan/50 blur-[2px] shadow-[0_0_20px_#00f2ff] scale-x-0 animate-[scale-x-up_0.4s_ease-in-out_forwards]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 返航按钮 (仅在子星系视图显示，置于顶层) */}
      <AnimatePresence>
        {diveState.isActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-6 left-6 z-50 pointer-events-auto"
          >
            <button
              onClick={triggerReturnToNebula}
              className="flex items-center space-x-2 bg-black/40 backdrop-blur-md border border-white/20 hover:border-gx-cyan/50 rounded-xl p-3 transition-colors text-white/80 hover:text-white group shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold tracking-widest uppercase">RETURN TO GALAXY</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 顶层全局搜索 HUD (在子星系隐藏) */}
      {!diveState.isActive && <GlobalSearchHUD onSearch={handleSearch} />}

      {/* 2D 业务管理舱 HUD (当选中星球时出现) */}
      {selectedPlanet && !diveState.isActive && (
        <NodeManagementHUD 
          planet={selectedPlanet} 
          onClose={() => setSelectedPlanet(null)} 
          onUpdate={updateNode}
          onDelegate={delegateManager}
          onRevoke={revokeManager}
          onPurge={purgeNode}
          onPlanetTransition={(newPlanet) => setSelectedPlanet(newPlanet)}
          onDive={() => selectedPlanet && triggerNebulaDive(selectedPlanet)}
          onObliterate={obliterateEnterprise}
        />
      )}

      {/* 
        全量替换为 WebGL (React Three Fiber) Canvas
        必须给外层容器明确的高度 (flex-1 或 h-screen)，否则 Canvas 高度为 0，导致黑屏
      */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 8, 25], fov: 45 }} style={{ width: '100%', height: '100%' }}>
          {/* 宇宙环境光影重构：强化明暗对比 */}
      {/* 极度压榨环境光，让没有被光照到的暗部彻底陷入“死黑” */}
      <ambientLight intensity={0.02} />
      
      {/* 中心恒星主光源：照亮行星的内侧，模拟太阳光，产生强烈的明暗交界线 */}
      <pointLight position={[0, 0, 0]} intensity={3.5} color="#ffffff" distance={30} decay={1.5} />
      
      {/* 顶部/侧边辅助光：勾勒行星外侧轮廓（Rim Light），增加立体感，不破坏暗部 */}
      <directionalLight position={[15, 20, 10]} intensity={1.2} color="#00f2ff" />
      
      {/* 底部微弱补光：极度微弱，仅提供一丝边缘反射，防止彻底融合于背景 */}
      <directionalLight position={[-10, -20, -10]} intensity={0.1} color="#bc00ff" />
      
      {/* 虚空置换：根据状态决定挂载哪颗树 */}
      {!diveState.isActive ? (
        <NebulaUniverse 
          userName={userName} 
          userAvatar={userAvatar} 
          userId={userId} 
          planets={planets} 
          onPlanetClick={(planet) => setSelectedPlanet(planet)}
        />
      ) : (
        <NebulaSubSystem
          targetPlanet={diveState.targetPlanet!}
        />
      )}
    </Canvas>
      </div>
    </main>
  );
}
