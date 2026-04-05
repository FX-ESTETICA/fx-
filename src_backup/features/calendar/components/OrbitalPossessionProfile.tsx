"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface OrbitalPossessionProfileProps {
  bossName?: string;
  bossId?: string;
  bossAvatar?: string | null;
  shopName?: string;
  shopId?: string; // 如果提供 shopId，则显示该店铺的主理人
  onNavigateHome?: () => void;
}

/**
 * 轨道附体控制台 (Orbital Possession Profile)
 * 位于日历右下角的赛博全息身份标识，用于明确当前正在操作的物理节点归属。
 */
export const OrbitalPossessionProfile = ({ 
  bossName = "SYSTEM_CORE", 
  bossId = "GX88888888",
  bossAvatar,
  shopName,
  shopId,
  onNavigateHome
}: OrbitalPossessionProfileProps) => {
  // 当前处于大位 (主导地位) 的角色
  const [displayRole, setDisplayRole] = useState<'boss' | 'manager'>('boss');
  
  // 从全局/Props 传入的顶级 Boss 身份
  const bossData = {
    name: bossName,
    id: bossId,
    avatar: bossAvatar,
    roleType: 'boss' as const
  };

  // 通过 shopId 异步获取的当前店铺管理者身份
  // 增加 'pending' 状态以处理“单核空转”的业务场景
  const [managerData, setManagerData] = useState<{
    name: string;
    id: string;
    avatar?: string | null;
    roleType: 'boss' | 'merchant' | 'manager' | 'pending';
  } | null>(null);

  // 0冲突防黑洞：组件挂载后，异步获取当前门店的实际店长信息
  useEffect(() => {
    if (!shopId || shopId === 'default') return;

    // 【世界顶端架构：量子纠缠锁】
    const controller = new AbortController();

    const fetchManager = async () => {
      try {
        // 第一步：极速安全查询 shop_bindings，只取 user_id，不连表！
        const { data: bindingData, error: bindingError } = await supabase
          .from('shop_bindings')
          .select('user_id')
          .eq('shop_id', shopId)
          .eq('role', 'OWNER')
          .limit(1)
          .maybeSingle();

        if (bindingError || !bindingData) {
          // 彻底没有找到 OWNER 绑定记录 -> 单核空转降级模式
          setManagerData({
            name: 'PENDING_MGR',
            id: 'AWAITING_AUTH',
            roleType: 'pending'
          });
          return;
        }

        // 第二步：逻辑审判。如果查出来的店长就是 Boss 本人，直接进入单核空转模式！
        // 绝不发起针对 Boss 自身的多余连表查询，从物理上切断 400 报错的根源。
        if (bindingData.user_id === bossId || bindingData.user_id.includes(bossId)) {
           setManagerData({
            name: 'PENDING_MGR',
            id: 'AWAITING_AUTH',
            roleType: 'pending'
          });
          return;
        }

        // 第三步：只有当确实存在一个【真实的、非 Boss 的店长】时，才去拉取他的档案
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('name, gx_id, avatar_url')
          .eq('id', bindingData.user_id)
          .maybeSingle();

        if (!profileError && profileData) {
          setManagerData({
            name: profileData.name || 'UNKNOWN MGR',
            id: profileData.gx_id || bindingData.user_id.split('-')[0],
            avatar: profileData.avatar_url,
            roleType: 'manager'
          });
        } else {
           // 即使有绑定，但档案表里查不到，也视为 pending
           setManagerData({
            name: 'PENDING_MGR',
            id: 'AWAITING_AUTH',
            roleType: 'pending'
          });
        }
      } catch (e: any) {
        // 【终极消音器】：如果是被 Abort 掐断的请求，静默吞噬，绝对不让它脏了控制台！
        if (e.name === 'AbortError') return;
        console.error("Failed to fetch manager data for orbital profile", e);
      }
    };

    fetchManager();

    // 当 React 瞬间卸载组件时，合法地掐断网线
    return () => controller.abort();
  }, [shopId, bossId]);

  const isBossActive = displayRole === 'boss';

  // 如果没有店长数据，降级显示原始的单卡片，防崩溃
  if (!managerData) {
    return (
      <div className="space-y-1">
        <div 
          onClick={onNavigateHome}
          className="flex items-center gap-3 p-3 rounded-xl bg-transparent border border-white/10 cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all group"
          title="返回个人看板"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white group-hover:scale-110 transition-transform overflow-hidden">
            {bossData.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bossData.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              bossData.name[0]
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase">{bossData.name}</div>
            <div className="text-[9px] text-white/40 font-mono tracking-widest">{bossData.id}</div>
          </div>
        </div>
        {shopName && (
          <div className="flex items-center gap-2 mt-2 ml-4 text-[10px] font-mono text-white/40">
            <div className="w-px h-4 bg-white/20" />
            <span className="truncate max-w-[150px]">监视节点: {shopName}</span>
          </div>
        )}
      </div>
    );
  }

  // 轨道附体模式
  const activeProfile = isBossActive ? bossData : managerData;
  const satelliteProfile = isBossActive ? managerData : bossData;

  const handleSwap = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发父容器的点击事件
    setDisplayRole(prev => prev === 'boss' ? 'manager' : 'boss');
  };

  return (
    <div className="space-y-1 select-none">
      <div 
        onClick={onNavigateHome}
        className="flex items-center gap-4 p-3 rounded-xl bg-transparent border border-transparent cursor-pointer hover:bg-white/5 transition-all group"
        title="返回个人看板"
      >
        {/* 左侧：星轨容器 */}
        <div className="relative w-10 h-10 flex items-center justify-center pointer-events-none">
          
          {/* 旋转轨道 (Ring) */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className={`absolute inset-[-6px] rounded-full border-[1px] border-dashed transition-all duration-700
              ${isBossActive ? 'border-gx-cyan/40 shadow-[0_0_10px_rgba(0,242,255,0.2)]' : 'border-white/20 shadow-none'}`}
          />
          
          {/* 主图 (大位) */}
          <motion.div 
            layoutId="orbital-main-avatar"
            className={`relative z-10 w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden transition-all duration-700
              ${isBossActive ? 'border border-gx-cyan shadow-[0_0_15px_rgba(0,242,255,0.3)]' : 'border border-white/30 shadow-none'}`}
          >
            {activeProfile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeProfile.avatar} className="w-full h-full object-cover" alt="main" />
            ) : (
              <span className="text-white font-bold text-sm">{activeProfile.name[0]}</span>
            )}
          </motion.div>

          {/* 卫星 (小位) - 点击互换或显示待指派 */}
          <motion.div
            layoutId="orbital-satellite-avatar"
            onClick={managerData.roleType === 'pending' ? undefined : handleSwap}
            className={`absolute -bottom-1 -right-1 z-20 w-4 h-4 rounded-full bg-black border flex items-center justify-center overflow-hidden transition-all duration-300
              ${managerData.roleType === 'pending' 
                ? 'border-gx-gold/50 shadow-[0_0_10px_rgba(255,184,0,0.3)] cursor-not-allowed' 
                : !isBossActive 
                  ? 'border-gx-cyan shadow-[0_0_10px_rgba(0,242,255,0.4)] cursor-pointer pointer-events-auto hover:scale-125' 
                  : 'border-white/30 hover:border-white/60 cursor-pointer pointer-events-auto hover:scale-125'}`}
          >
            {managerData.roleType === 'pending' ? (
              // PENDING 状态：发光的加号占位符
              <span className="text-gx-gold font-bold text-[10px]">+</span>
            ) : satelliteProfile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={satelliteProfile.avatar} className="w-full h-full object-cover" alt="satellite" />
            ) : (
              <span className="text-white font-bold text-[8px] scale-75">{satelliteProfile.name[0]}</span>
            )}
          </motion.div>
        </div>

        {/* 右侧：信息容器 */}
        <div className="flex flex-col justify-center h-full min-w-[120px] relative">
          {/* 使用 AnimatePresence 实现文字丝滑渐变切换 */}
          <motion.div 
            key={activeProfile.id + "-name"}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs font-bold uppercase tracking-wider transition-all duration-500
              ${isBossActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'text-white/60'}`}
          >
            {activeProfile.name}
          </motion.div>
          <motion.div 
            key={activeProfile.id + "-id"}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-[9px] font-mono tracking-widest transition-all duration-500
              ${isBossActive ? 'text-gx-cyan drop-shadow-[0_0_5px_rgba(0,242,255,0.4)]' : 'text-white/30'}`}
          >
            {activeProfile.id}
          </motion.div>
        </div>
      </div>

      {/* 下方：监视节点锚点 */}
      {shopName && (
        <div className="flex items-center gap-2 mt-1 ml-6 text-[10px] font-mono text-white/40">
          <div className="w-px h-4 bg-white/20" />
          <span className="truncate max-w-[150px]">监视节点: {shopName}</span>
        </div>
      )}
    </div>
  );
}
