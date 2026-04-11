"use client";

import { useAuth, SandboxUser } from "@/features/auth/hooks/useAuth";
import { cn } from "@/utils/cn";
import { CYBER_COLOR_DICTIONARY, CyberThemeColor } from "@/hooks/useVisualSettings";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Sphere, Billboard, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useState, useRef } from "react";
import { ShieldCheck, X, Calendar, LineChart, Trash2, Search, Loader2, Zap, Rocket, ArrowLeft, Lock, Activity, Sparkles, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useShop } from "@/features/shop/ShopContext"; // 引入 ShopContext
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

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
  const [allPlanets, setAllPlanets] = useState<PlanetData[]>([]); // 存储所有星球，用于降维搜索
  const [isLoading, setIsLoading] = useState(true);

  // 获取数据
  const fetchNodes = async () => {
    if (!bossId) return;
    setIsLoading(true);
    try {
      // 1. 获取当前 Boss 的合法的 Profile ID
      const { data: principalData, error: principalError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', bossId)
        .single();
        
      if (principalError) {
         console.warn("[Nebula] 未找到对应的 profiles id，可能是首次进入或测试账号", principalError);
      }
      
      const validPrincipalId = principalData?.id || bossId; // 降级回退

      // 2. 从我们设计的视图中拉取数据
      // 注意：真实数据库中并没有 v_nebula_nodes 视图，或者该视图缺少 shop 的基础信息。
      // 我们直接连表查询 shop_bindings 和 shops，实现零视图依赖！
      const { data, error } = await supabase
        .from('shop_bindings')
        .select(`
          shop_id,
          role,
          shops (
            id,
            name,
            industry,
            nebula_status,
            theme_color
          )
        `)
        .eq('user_id', validPrincipalId); // 通过 user_id 找到这个人绑定的所有店铺

      if (error) throw error;

      // --- 降维解析：直接从连表结果中映射出我们需要的数据 ---
      const realNodes = (data || []).map((binding: any) => {
        const shop = Array.isArray(binding.shops) ? binding.shops[0] : binding.shops;
        if (!shop) return null;

        return {
          id: shop.id,
          key: (shop.theme_color as CyberThemeColor) || 'cyan',
          name: shop.name || '筹备中',
          status: (shop.nebula_status as NodeStatus) || 'pending',
          industry: shop.industry,
          managerId: null, // 如果需要店长信息，后期再单独查
          managerName: null,
          managerRole: null
        };
      }).filter(Boolean);

      setAllPlanets(realNodes as PlanetData[]);

      // 如果不足 10 个，生成虚拟节点填充轨道
      const filledPlanets: PlanetData[] = [];
      for (let i = 0; i < 10; i++) {
        if (i < realNodes.length) {
          if (realNodes[i]) {
            filledPlanets.push(realNodes[i] as PlanetData);
          }
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
      // 因为 bossId 是 user_id，我们需要找到对应的 profiles id
      const { data: principalData, error: pErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', bossId)
        .single();
        
      if (pErr) {
        console.error("[Nebula] 严重错误：在 profiles 表中找不到当前账号的记录", pErr);
        alert("致命错误：您的最高管理员账号在数据库底层缺乏 Profile 实体，请联系系统架构师补充。");
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

        // 【核心闭环修复】：自动将创建者绑定为该店的 OWNER，消灭孤魂野鬼数据
        const { error: bindError } = await supabase
          .from('shop_bindings')
          .insert({
            shop_id: newPlanetId,
            user_id: validPrincipalId,
            role: 'OWNER'
          });
          
        if (bindError) {
          console.error("[Nebula] 绑定老板权限失败:", bindError);
        }
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
      alert(`${t('node_op_failed') || '节点操作失败'}: ${t(err.message) || err.message}`);
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
        alert(t('user_not_found') || "未找到该用户ID，请核对。");
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
          throw new Error("err_upgrade_failed");
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
      alert(`${t('auth_failed') || '授权失败'}: ${t(err.message) || err.message}`);
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
      if (!bossId) throw new Error("err_missing_boss");

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
    allPlanets,
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

function GlobalSearchHUD({ 
  allPlanets, 
  onSelect 
}: { 
  allPlanets: PlanetData[];
  onSelect: (planet: PlanetData) => void;
}) {
  const t = useTranslations('nebula');
  const [term, setTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = term.trim() === "" 
    ? [] 
    : allPlanets.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));

  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="relative group">
        <div className="absolute inset-0 bg-gx-cyan/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="relative flex items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 transition-all duration-300 group-hover:border-gx-cyan/50 focus-within:border-gx-cyan focus-within:bg-black/60">
          <Search className="w-4 h-4 text-white/50 mr-3" />
          <input 
            type="text" 
            value={term}
            placeholder={t('txt_27474a')} 
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none font-mono tracking-wider"
            onChange={(e) => {
              setTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {term && (
            <button onClick={() => { setTerm(""); setIsOpen(false); }} className="text-white/40 hover:text-white/80">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* 搜索下拉结果 */}
        <AnimatePresence>
          {isOpen && filtered.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 w-full mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.1)] max-h-60 overflow-y-auto"
            >
              {filtered.map(planet => (
                <div 
                  key={planet.id}
                  onClick={() => {
                    setTerm("");
                    setIsOpen(false);
                    onSelect(planet);
                  }}
                  className="px-4 py-3 border-b border-white/5 hover:bg-gx-cyan/10 cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-bold group-hover:text-gx-cyan transition-colors">{planet.name}</span>
                    <span className="text-white/40 text-[10px] font-mono tracking-widest">{planet.id.split('-')[0]}...</span>
                  </div>
                  <Rocket className="w-4 h-4 text-white/20 group-hover:text-gx-cyan group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
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
    const t = useTranslations('nebula');
  const router = useRouter();
  const { setActiveShopId } = useShop(); // 引入全局店铺上下文

  const isPending = planet.status === 'pending';
  
  const [nameInput, setNameInput] = useState(planet.name === '筹备中' ? '' : planet.name);
  const [industryInput, setIndustryInput] = useState(planet.industry || '');
  const [managerInput, setManagerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'control' | 'financial'>('control');

  // 当星球切换时，重置表单
  useEffect(() => {
    setNameInput(planet.name === '筹备中' ? '' : planet.name);
    setIndustryInput(planet.industry || '');
    setManagerInput('');
    setViewMode('control'); // 切换星球时，强制重置为基础控制面板
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
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-none">
      {/* 核心全息控制舱 (Holographic Command Pod) */}
      <div className="relative w-full max-w-4xl bg-[#0a0a0a]/60 backdrop-blur-2xl ring-1 ring-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] rounded-3xl overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-300">
        
        {/* 四角折角装饰 (Cyber Brackets) */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/10 rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/10 rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/10 rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/10 rounded-br-3xl" />

        {/* 顶部关闭按钮 */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors z-50"
        >
          <X className="w-6 h-6" />
        </button>

        {/* --- 顶部穹顶 (The Zenith Dome) --- */}
        <div className="pt-8 pb-4 flex flex-col items-center justify-center relative">
          <div className="text-xl md:text-2xl font-black tracking-[0.3em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-300 to-white/50 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] mb-2 select-none flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gx-cyan shadow-[0_0_10px_rgba(0,242,255,0.8)] animate-pulse" />
            {t('txt_10ab83')}</div>
          <div className="text-[10px] text-white/30 font-mono tracking-widest uppercase">
            Nebula Node Command Pod
          </div>
          {/* 分割能量线 */}
          <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-gx-cyan/50 to-transparent" />
        </div>

        {/* --- 主体双舱矩阵 (Dual-Pane Matrix) / 状态机折叠 --- */}
        <div className="relative min-h-[400px]" style={{ perspective: 2000 }}>
          <AnimatePresence mode="wait">
            {viewMode === 'control' ? (
              <motion.div 
                key="control"
                initial={{ opacity: 0, rotateY: -10, scale: 0.95 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, rotateY: 10, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex flex-col md:flex-row h-full min-h-[400px]"
              >
                {planet.isCore ? (
                <div className="w-full p-8 flex flex-col h-full">
                  {/* 核心联邦数据大盘 - 世界顶端 AI 报表 (宏观 + 异常 + 建议) */}
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                    
                    {/* 左侧板块：帝国的生命体征 (绝对数据流) 7/12 */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                      
                      {/* Top: 宏观现金流与利润 (联邦能量核心) */}
                      <div className="bg-black/40 border border-white/5 rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden group hover:border-gx-cyan/30 transition-colors h-[45%]">
                        {/* 背景微光 */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gx-cyan/5 blur-[80px] rounded-full pointer-events-none" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_24px] pointer-events-none" />
                        
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs text-white/40 font-mono tracking-widest flex items-center gap-2">
                              <Activity className="w-4 h-4 text-gx-cyan animate-pulse" />
                              {t('txt_105031')}</h2>
                            <span className="px-3 py-1 bg-gx-cyan/10 border border-gx-cyan/20 text-gx-cyan text-[10px] font-bold rounded-full tracking-widest shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                              {t('txt_829f9b')}</span>
                          </div>
                          
                          <div className="flex items-end gap-6 mb-6">
                            <div className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                              € 1,245,800
                            </div>
                            <div className="flex flex-col mb-1">
                              <span className="text-gx-cyan font-bold text-lg flex items-center gap-1">
                                ↑ 12.4%
                              </span>
                              <span className="text-[10px] text-white/30 font-mono tracking-widest">{t('txt_7ccf55')}</span>
                            </div>
                          </div>

                          {/* 利润瀑布 (进度条对比) */}
                          <div className="w-full space-y-2">
                            <div className="flex justify-between text-[10px] font-mono tracking-widest">
                              <span className="text-gx-cyan">{t('txt_a5891d')}</span>
                              <span className="text-red-500/80">{t('txt_013e29')}</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                              <div className="h-full bg-gx-cyan/80 shadow-[0_0_10px_rgba(0,242,255,0.5)]" style={{ width: '68%' }} />
                              <div className="h-full bg-red-500/50" style={{ width: '32%' }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom: 节点脉络分析 (各分店贡献度战力对比) */}
                      <div className="bg-black/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors h-[55%] flex flex-col">
                        <h2 className="text-xs text-white/40 font-mono tracking-widest mb-6">
                          {t('txt_c3b0b7')}</h2>
                        
                        <div className="flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                          {/* Node A */}
                          <div className="flex items-center gap-4">
                            <div className="w-24 text-[10px] font-bold text-white tracking-widest uppercase truncate">{t('txt_88b8d0')}</div>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                              <div className="absolute top-0 left-0 h-full bg-gx-cyan shadow-[0_0_10px_rgba(0,242,255,0.8)]" style={{ width: '65%' }} />
                            </div>
                            <div className="w-12 text-right text-[10px] font-mono text-gx-cyan">65%</div>
                            <div className="w-16 text-center text-[9px] py-0.5 rounded border border-gx-cyan/30 bg-gx-cyan/10 text-gx-cyan tracking-wider">{t('txt_572a4f')}</div>
                          </div>
                          
                          {/* Node B */}
                          <div className="flex items-center gap-4">
                            <div className="w-24 text-[10px] font-bold text-white tracking-widest uppercase truncate">{t('txt_1462d2')}</div>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                              <div className="absolute top-0 left-0 h-full bg-white/60" style={{ width: '30%' }} />
                            </div>
                            <div className="w-12 text-right text-[10px] font-mono text-white/60">30%</div>
                            <div className="w-16 text-center text-[9px] py-0.5 rounded border border-white/20 bg-white/5 text-white/60 tracking-wider">{t('txt_42f8a0')}</div>
                          </div>

                          {/* Node C */}
                          <div className="flex items-center gap-4">
                            <div className="w-24 text-[10px] font-bold text-white tracking-widest uppercase truncate">{t('txt_88b8b6')}</div>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                              <div className="absolute top-0 left-0 h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" style={{ width: '5%' }} />
                            </div>
                            <div className="w-12 text-right text-[10px] font-mono text-red-500">5%</div>
                            <div className="w-16 text-center text-[9px] py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-500 tracking-wider">{t('txt_83c21d')}</div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* 右侧板块：AI 幕僚长的深度洞察 (预警与行动) 5/12 */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-gx-cyan" />
                        <span className="text-xs font-bold tracking-widest text-white/80">{t('txt_6c2342')}</span>
                      </div>

                      {/* 致命警报 (Critical) */}
                      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 relative overflow-hidden group hover:bg-red-500/10 transition-colors">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                        <div className="flex items-start gap-3">
                          <Zap className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <div className="text-[10px] font-black text-red-500 tracking-widest mb-1">{t('txt_2ee3dd')}</div>
                            <p className="text-xs text-white/80 leading-relaxed font-medium">
                              {t('txt_e12bb1')}</p>
                          </div>
                        </div>
                      </div>

                      {/* 异动监控 (Warning) */}
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 relative overflow-hidden group hover:bg-yellow-500/10 transition-colors">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
                        <div className="flex items-start gap-3">
                          <UserMinus className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] font-black text-yellow-500 tracking-widest mb-1">{t('txt_7717e3')}</div>
                            <p className="text-xs text-white/80 leading-relaxed font-medium">
                              {t('txt_9e9590')}</p>
                          </div>
                        </div>
                      </div>

                      {/* 战术推演 (Advice) */}
                      <div className="bg-gx-cyan/5 border border-gx-cyan/20 rounded-2xl p-5 relative overflow-hidden group hover:bg-gx-cyan/10 transition-colors flex-1">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gx-cyan shadow-[0_0_10px_rgba(0,242,255,0.8)]" />
                        <div className="flex items-start gap-3">
                          <Rocket className="w-4 h-4 text-gx-cyan shrink-0 mt-0.5" />
                          <div className="flex flex-col h-full justify-between">
                            <div>
                              <div className="text-[10px] font-black text-gx-cyan tracking-widest mb-1">{t('txt_1ec201')}</div>
                              <p className="text-xs text-white/80 leading-relaxed font-medium mb-4">
                                {t('txt_a6dc6b')}</p>
                            </div>
                            <button className="w-full py-2 bg-gx-cyan/10 hover:bg-gx-cyan/20 border border-gx-cyan/30 text-gx-cyan text-[10px] font-bold tracking-widest rounded-lg transition-all">
                              {t('txt_416e0d')}</button>
                          </div>
                        </div>
                      </div>
                      
                      {/* 底部危险操作折叠区 */}
                      <div className="mt-2 w-full flex justify-end">
                        {onObliterate && (
                          <button
                            onClick={async () => {
                              const t = useTranslations('nebula');
                              if (confirm(t('txt_491f90'))) {
                                setIsSubmitting(true);
                                await onObliterate();
                                setIsSubmitting(false);
                              }
                            }}
                            disabled={isSubmitting}
                            className="text-[9px] text-white/20 hover:text-red-500 tracking-widest font-mono transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            {t('txt_7b2419')}</button>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              ) : (
            <>
              {/* 左舱：核心操控 (Operations Matrix) - 60% */}
              <div className="w-full md:w-[60%] p-8 flex flex-col justify-between">
                <div className="space-y-8">
                  
                  {/* 第一行：名字 (2/3) + 行业 (1/3) */}
                  <div className="flex items-end gap-4">
                    <div className="flex-1 group relative">
                      <input 
                        type="text" 
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder={isPending ? "INITIALIZING..." : "ENTER NODE NAME"}
                        className={cn(
                          "w-full bg-transparent border-none outline-none text-2xl md:text-3xl font-black tracking-tight transition-all",
                          isPending ? "text-white/50 placeholder:text-white/30 animate-pulse" : "text-gx-cyan drop-shadow-[0_0_15px_rgba(0,242,255,0.4)] placeholder:text-white/20"
                        )}
                      />
                      {/* 悬浮聚焦下划线 */}
                      <div className={cn(
                        "absolute -bottom-2 left-0 w-full h-px transition-all duration-300",
                        isPending ? "bg-gx-cyan/40 shadow-[0_0_10px_rgba(0,242,255,0.5)] animate-pulse" : "bg-white/10 group-focus-within:bg-gx-cyan shadow-[0_0_10px_rgba(0,242,255,0)] group-focus-within:shadow-[0_0_10px_rgba(0,242,255,0.5)]"
                      )} />
                    </div>

                    <div className="w-[160px] shrink-0">
                      <div className="relative group">
                        <select
                          value={industryInput}
                          onChange={(e) => setIndustryInput(e.target.value)}
                          disabled={!isPending}
                          className="w-full appearance-none bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full px-4 py-2.5 text-xs font-bold text-white tracking-widest cursor-pointer outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="" disabled className="bg-black text-white/50">Select DNA</option>
                          {INDUSTRY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-black text-white">{opt.label}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 group-hover:text-white/80 transition-colors">
                          <Zap className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {isPending && (
                    <div className="pt-4">
                      <button 
                        onClick={handleActivate}
                        disabled={isSubmitting}
                        className="w-full relative overflow-hidden group bg-gx-cyan/10 border border-gx-cyan/30 rounded-xl p-4 transition-all hover:border-gx-cyan hover:shadow-[0_0_30px_rgba(0,242,255,0.2)] disabled:opacity-50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gx-cyan/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <div className="relative z-10 flex items-center justify-center gap-3 text-gx-cyan font-bold tracking-[0.2em]">
                          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                          <span>{t('txt_452293')}</span>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* 第二行：人员管辖 (Command) */}
                  <div className={cn(
                    "animate-in fade-in slide-in-from-left-4 duration-500 delay-100 mt-4",
                    isPending && "opacity-30 grayscale pointer-events-none select-none"
                  )}>
                    <div className="text-[10px] uppercase text-white/30 tracking-[0.2em] mb-2 font-mono flex items-center gap-2">
                      {t('txt_2adf8d')}{isPending && <Lock className="w-3 h-3 text-white/50" />}
                    </div>
                    {planet.managerId ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all">
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-gx-cyan transition-colors">{planet.managerName || 'UNKNOWN'}</div>
                          <div className="text-[10px] text-white/40 font-mono mt-0.5">{planet.managerId}</div>
                        </div>
                        <button 
                          onClick={handleRevoke}
                          disabled={isSubmitting}
                          className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded border border-red-500/20 transition-all uppercase tracking-widest flex items-center gap-2"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex bg-black/50 ring-1 ring-white/10 focus-within:ring-gx-cyan/50 rounded-xl overflow-hidden transition-all shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                        <div className="pl-4 pr-2 py-3 text-gx-cyan/50 font-mono select-none flex items-center">{'>_'}</div>
                        <input 
                          type="text"
                          value={managerInput}
                          onChange={(e) => setManagerInput(e.target.value)}
                          placeholder="Input ID (e.g. GX-UR-123)"
                          className="flex-1 bg-transparent border-none outline-none text-white text-sm font-mono placeholder:text-white/20"
                          onKeyDown={(e) => e.key === 'Enter' && handleAuthorize()}
                        />
                        <button 
                          onClick={handleAuthorize}
                          disabled={isSubmitting || !managerInput}
                          className="px-6 bg-transparent text-gx-cyan hover:text-white hover:bg-gx-cyan/20 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gx-cyan transition-all flex items-center gap-2 font-bold tracking-widest text-xs border-l border-white/10"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>{t('txt_98a315')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 第三行：矩阵入口 (Matrix) */}
                  <div className={cn(
                    "mt-8 pt-6 border-t border-white/5",
                    isPending && "opacity-30 grayscale pointer-events-none select-none"
                  )}>
                    <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 relative">
                      {isPending && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center">
                          <Lock className="w-8 h-8 text-white/50 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        </div>
                      )}
                      
                      {/* 星云下钻 (左) */}
                      <button 
                        onClick={onDive}
                        className="flex-1 relative overflow-hidden group bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                          <Rocket className="w-6 h-6 text-purple-400 group-hover:scale-110 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                          <span className="text-xs text-purple-300 font-bold tracking-widest">{t('txt_b641f2')}</span>
                        </div>
                      </button>

                      {/* 进入日历 (右 - 主入口) */}
                      <button 
                        onClick={handleEnterCalendar}
                        className="flex-[1.5] relative overflow-hidden group bg-gx-cyan/10 border border-gx-cyan/30 rounded-xl p-4 hover:border-gx-cyan hover:shadow-[0_0_30px_rgba(0,242,255,0.2)] transition-all"
                      >
                        {/* 常驻流光背景 */}
                        <div className="absolute inset-0 bg-[length:200%_auto] animate-[shimmer_8s_linear_infinite] bg-gradient-to-r from-gx-cyan/0 via-gx-cyan/10 to-gx-cyan/0" />
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                          <Calendar className="w-6 h-6 text-gx-cyan group-hover:scale-110 transition-transform" />
                          <span className="text-xs text-white font-bold tracking-widest group-hover:text-gx-cyan transition-colors">{t('txt_53656b')}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右舱：AI 洞察域 (AI Financials Core) - 40% */}
              <div className="w-full md:w-[40%] relative border-t md:border-t-0 flex flex-col items-center justify-center overflow-hidden min-h-[250px] bg-black/20">
                {/* 左侧垂直渐变分割线 */}
                <div className="hidden md:block absolute left-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-gx-cyan/20 to-transparent" />

                {/* 微弱的背景跳动动画 */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)] animate-[pulse_4s_ease-in-out_infinite]" />
                </div>

                {/* 扫描线动画 (Data Stream) - 增强休眠态科技感 */}
                <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen">
                  <div className="absolute top-0 left-0 w-full h-full bg-[length:100%_200%] animate-[shimmer_3s_linear_infinite] bg-gradient-to-b from-transparent via-gx-cyan/10 to-transparent" />
                </div>

                {/* AI 财务按钮卡片 / 四宫格降维快照 */}
                {isPending ? (
                  <button 
                    disabled={isPending}
                    className="relative z-10 group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm transition-all duration-500 opacity-30 grayscale cursor-not-allowed"
                  >
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                      <Lock className="w-10 h-10 text-white/30" />
                    </div>
                    <div className="w-16 h-16 rounded-full bg-black/50 border border-white/10 flex items-center justify-center relative">
                      <LineChart className="w-6 h-6 text-white/50" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-white tracking-[0.2em]">{t('txt_f9910c')}</div>
                      <div className="text-[10px] text-white/30 font-mono mt-1">Awaiting Node Activation</div>
                    </div>
                  </button>
                ) : (
                  <div className="relative z-10 w-full h-full flex flex-col p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-widest">Live Node Snapshot</span>
                    </div>

                    {/* 四宫格数据区 */}
                    <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-center group hover:bg-white/10 transition-colors">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Total Revenue</span>
                        <span className="text-xl font-black text-emerald-400 mt-1 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">¥ 45,200</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-center group hover:bg-white/10 transition-colors">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Total Members</span>
                        <span className="text-xl font-black text-white mt-1">128</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-center group hover:bg-white/10 transition-colors">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Walk-ins</span>
                        <span className="text-xl font-black text-white mt-1">45</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-center group hover:bg-white/10 transition-colors">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Services</span>
                        <span className="text-xl font-black text-white mt-1">312</span>
                      </div>
                    </div>

                    {/* 原地翻转下钻按钮 */}
                    <button 
                      onClick={() => setViewMode('financial')}
                      className="w-full relative overflow-hidden group bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 transition-all hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      <div className="relative z-10 flex items-center justify-center gap-2 text-emerald-400 font-bold tracking-[0.1em] text-xs">
                        <LineChart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>{t('txt_5294b4')}</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 只有在 Control 模式下，非母星才显示深渊清洗按钮 */}
          {!planet.isCore && (
            <div className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 w-full max-w-[250px] flex justify-center z-50">
              <button 
                onClick={handlePurge}
                disabled={isSubmitting}
                className="group flex items-center gap-2 px-6 py-2 text-[10px] font-mono tracking-widest text-red-500/30 hover:text-red-400 transition-all duration-300 rounded-full hover:bg-red-500/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-transparent border border-transparent hover:border-red-500/20"
              >
                <Trash2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span>{t('txt_f1e7ae')}</span>
              </button>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="financial"
          initial={{ opacity: 0, rotateY: -10, scale: 0.95 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: 10, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex flex-col h-full min-h-[400px] w-full p-8 relative overflow-hidden"
        >
          {/* 全尺寸 AI 财务详细报表 */}
          <div className="flex items-center justify-between mb-8 z-10 relative">
            <button
              onClick={() => setViewMode('control')}
              className="flex items-center gap-2 text-emerald-400/60 hover:text-emerald-400 transition-colors group px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold tracking-widest uppercase">{t('txt_a08954')}</span>
            </button>
            <div className="text-xs font-mono text-emerald-400/50 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
              {planet.name} // FINANCIAL DATASLATE
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
               <div className="col-span-2 bg-black/40 border border-white/5 rounded-2xl p-6 h-56 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                 <div className="text-xs text-white/40 font-mono tracking-widest uppercase mb-4 flex justify-between">
                   <span>Revenue Trend (7 Days)</span>
                   <span className="text-emerald-400 font-bold">+12.4%</span>
                 </div>
                 <div className="flex items-end gap-2 h-32 w-full">
                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-emerald-500/10 to-emerald-400/60 rounded-t-sm group-hover:to-emerald-400/80 transition-colors" style={{ height: `${h}%` }} />
                    ))}
                 </div>
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_20px] pointer-events-none" />
               </div>

               <div className="col-span-1 bg-black/40 border border-white/5 rounded-2xl p-6 h-56 flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
                 <div className="text-xs text-white/40 font-mono tracking-widest uppercase mb-4 flex items-center gap-2">
                   <Sparkles className="w-3 h-3 text-emerald-400" />
                   AI Insight
                 </div>
                 <p className="text-sm text-white/80 leading-relaxed font-medium">
                   <span className="text-emerald-400 font-bold text-lg mr-1">"</span>
                   {t('txt_e8ec21')}<span className="text-emerald-400 font-bold text-lg ml-1">"</span>
                 </p>
                 <div className="text-[10px] text-emerald-400/50 font-mono mt-2">- Nexus AI Engine</div>
               </div>
            </div>

            <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                   <ShieldCheck className="w-6 h-6 text-emerald-400" />
                 </div>
                 <div>
                   <div className="text-white text-sm font-bold tracking-widest">{t('txt_ca7df9')}</div>
                   <div className="text-xs text-white/40 font-mono">Last updated: LIVE</div>
                 </div>
              </div>
              <button className="px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase rounded-xl transition-all border border-emerald-500/20 hover:border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                Export Report
              </button>
            </div>
          </div>

          {/* 全息扫描线背景 */}
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen">
            <div className="absolute top-0 left-0 w-full h-full bg-[length:100%_200%] animate-[shimmer_5s_linear_infinite] bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent" />
          </div>
        </motion.div>
      )}
      </AnimatePresence>
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
  const t = useTranslations('nebula');

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
          labelSubtitle={
            targetPlanet.status === 'active'
              ? (targetPlanet.managerId ? `🟢 店长ID: ${targetPlanet.managerId}` : t('txt_ba090e'))
              : t('txt_4db67e')
          }
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
  onClick 
}: { 
  onClick?: () => void
}) {
  const t = useTranslations('nebula');
  const [hovered, setHovered] = useState(false);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  // 实现极其纯净的全息玻璃流光 (Pure Holographic Glass)
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime() * 0.15; // 极度平滑的色彩流转
    }
  });

  return (
    <group 
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {/* 核心恒星 - 财务与数据中枢 */}
      {/* 恢复自转，并应用自定义的纯净玻璃着色器 */}
      <Sphere args={[2.5, 128, 128]}>
        <shaderMaterial
          ref={materialRef}
          uniforms={{
            uTime: { value: 0 }
          }}
          vertexShader={`
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
              vUv = uv;
              vNormal = normalize(normalMatrix * normal);
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vViewPosition = -mvPosition.xyz;
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            // 高级冰透色盘 (赛博青 -> 极光紫 -> 深空蓝)
            vec3 palette( in float t ) {
                vec3 a = vec3(0.1, 0.2, 0.4); // 深空蓝底色
                vec3 b = vec3(0.3, 0.5, 0.8); // 青蓝过渡
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.4, 0.6, 0.8); // 极光紫/青相移
                return a + b*cos( 6.28318*(c*t+d) );
            }

            void main() {
              vec3 viewDir = normalize(vViewPosition);
              
              // 1. 极致纯净的边缘高光 (Fresnel Effect) - 模拟玻璃反光
              float fresnel = dot(vNormal, viewDir);
              float rim = clamp(1.0 - fresnel, 0.0, 1.0);
              
              // 锐利的边缘高光
              float intenseRim = pow(rim, 4.0); 
              // 柔和的内部辉光过渡
              float softRim = pow(rim, 1.5);    

              // 2. 平滑的全息流光色彩
              // 不使用任何斑块噪声，而是使用极低频的正弦波，让颜色像彩虹渐变一样在球体表面平滑扫过
              float colorPhase = vUv.x * 0.5 + vUv.y * 0.5 + uTime;
              vec3 baseGlowColor = palette(colorPhase);

              // 3. 玻璃高光 (最边缘是极其刺眼的纯青蓝色)
              vec3 glassRimColor = vec3(0.0, 0.95, 1.0) * intenseRim * 2.0;
              
              // 4. 内部全息辉光 (将流转的色彩应用在次边缘)
              vec3 holographicGlow = baseGlowColor * softRim * 1.2;

              // 最终颜色：边缘刺眼高光 + 内部柔和全息渐变
              vec3 finalColor = glassRimColor + holographicGlow;
              
              // 5. 极致透明度控制
              // 中心完全透明 (0.05)，边缘逐渐不透明 (0.9)，形成完美的空心水晶球质感
              float alpha = mix(0.05, 0.9, rim);
              
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
          transparent={true}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending} // 加法混合，让它像真正的发光玻璃
          depthWrite={false}
        />
      </Sphere>

      {/* 中心图标保留 Billboard 确保永远正对摄像机 */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Html position={[0, 0, 0]} center transform sprite zIndexRange={[100, 0]}>
          <LineChart className="w-16 h-16 text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-pulse" />
        </Html>
      </Billboard>

      {/* 身份标识 - 永远悬浮在核心下方 */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Html position={[0, -4.5, 0]} center transform sprite zIndexRange={[100, 0]}>
          <div className="flex flex-col items-center text-center space-y-2 w-[600px] pointer-events-none select-none">
            <h1 className="text-3xl md:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gx-cyan via-purple-400 to-gx-cyan bg-[length:200%_auto] animate-gradient drop-shadow-[0_0_20px_rgba(0,255,255,0.3)] whitespace-nowrap">
              {t('txt_88c35d')}</h1>
            <div className="text-[10px] font-mono text-gx-cyan/80 tracking-[0.2em] border border-gx-cyan/30 px-3 py-1 rounded-full bg-gx-cyan/[0.05] backdrop-blur-md">
              SYSTEM CORE
            </div>
          </div>
        </Html>
      </Billboard>
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
    const t = useTranslations('nebula');
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
        labelSubtitle={
          planet.status === 'active' 
            ? (planet.managerId ? `🟢 店长ID: ${planet.managerId}` : t('txt_ba090e')) 
            : t('txt_4db67e')
        }
        isDimmed={planet.status !== 'active'}
        glowColor={colorConfig.hex}
        onClick={(e) => { e.stopPropagation(); onClick(planet); }}
      />
    </group>
  );
}

function NebulaUniverse({ 
  userName, 
  userId, 
  planets,
  onPlanetClick
}: {
  userName: string;
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
        onClick={() => {
          // 构造一个代表母星的 PlanetData 对象并触发点击事件
          onPlanetClick({
            id: 'core',
            name: '财务与数据中枢',
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
    const t = useTranslations('nebula');

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
  const userId = sUser?.gxId || (activeRole === 'boss' ? 'GX88888888' : 'GX-NE-000001');

  // 获取真实数据库 ID (假设 activeRole 是 boss 并且 user 存在，这里需要真实的 profile id，如果是沙盒则用 undefined 测试)
  const bossProfileId = sUser?.id; 

  // 使用自定义 Hook 拉取 Supabase 数据
  const { 
    planets, 
    allPlanets,
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
              <span className="text-xs font-bold tracking-widest uppercase">{t('txt_8f3492')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 顶层全局搜索 HUD (在子星系隐藏) */}
      {!diveState.isActive && (
        <GlobalSearchHUD 
          allPlanets={allPlanets} 
          onSelect={(planet) => setSelectedPlanet(planet)} 
        />
      )}

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
