"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NebulaNode as NebulaNodeType } from "../types";
import { Button } from "@/components/shared/Button";
import { ChevronLeft, Maximize2, Users, Activity } from "lucide-react";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";

// Mock Hierarchy Data
const MOCK_NEBULA_DATA: NebulaNodeType = {
  id: "GX-CORE",
  name: "我的商业版图",
  type: "total",
  value: "¥1.2M",
  children: [
    {
      id: "IND-BEAUTY",
      name: "美业连锁",
      type: "branch",
      value: "2 店面",
      children: [
        { id: "B-001", name: "静安店", type: "member", value: "88% 预约率" },
        { id: "B-002", name: "徐汇店", type: "member", value: "92% 预约率" },
      ]
    },
    {
      id: "IND-DINING",
      name: "餐饮板块",
      type: "branch",
      value: "3 餐厅",
      children: [
        { id: "D-101", name: "川味馆", type: "member", value: "¥45k/日" },
        { id: "D-102", name: "星空吧", type: "member", value: "¥82k/日" },
      ]
    },
    {
      id: "IND-HOTEL",
      name: "精品酒店",
      type: "branch",
      value: "¥400k/月",
      children: [
        { id: "H-201", name: "外滩店", type: "member", value: "100% 入住" },
      ]
    }
  ]
};

export const NebulaCore = () => {
    const t = useTranslations('NebulaCore');
  const [history, setHistory] = useState<NebulaNodeType[]>([MOCK_NEBULA_DATA]);
  const currentLevel = history[history.length - 1];

  const handleDrillDown = (node: NebulaNodeType) => {
    if (node.children && node.children.length > 0) {
      setHistory([...history, node]);
    }
  };

  const handleBack = () => {
    if (history.length > 1) {
      setHistory(history.slice(0, -1));
    }
  };

  return (
    <div className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
      {/* 顶部控制栏 */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          {history.length > 1 && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              {t('txt_fd5def')}</Button>
          )}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tighter uppercase">{currentLevel.name}</h2>
            <p className="text-[10px] font-mono text-white/40 tracking-[0.2em]">
              STATUS: {currentLevel.type.toUpperCase()} // ACTIVE_NODES: {currentLevel.children?.length || 0}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button variant="ghost" size="sm" className="gap-2 text-white/40">
            <Maximize2 className="w-4 h-4" />
            {t('txt_b02de4')}</Button>
        </div>
      </div>

      {/* 核心交互区 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLevel.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {/* 中心主节点 */}
          <motion.div 
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="relative z-20 group"
          >
            <div className="w-48 h-48 rounded-full bg-black border-2 border-gx-cyan/30 flex flex-col items-center justify-center gap-2 shadow-[0_0_50px_rgba(0,242,255,0.15)] group-hover:border-gx-cyan transition-all duration-500 cursor-default">
              <Activity className="w-8 h-8 text-gx-cyan animate-pulse" />
              <div className="text-center">
                <div className="text-sm font-mono text-white/40 uppercase">{t('txt_6ee5ac')}</div>
                <div className="text-2xl font-bold text-white tracking-tighter">{currentLevel.value}</div>
              </div>
            </div>
            {/* 装饰环 */}
            <div className="absolute inset-[-20px] rounded-full border border-white/5 animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-[-40px] rounded-full border border-white/5 animate-[spin_30s_linear_infinite_reverse]" />
          </motion.div>

          {/* 卫星子节点 */}
          {currentLevel.children?.map((child, idx) => {
            const angle = (idx / (currentLevel.children?.length || 1)) * Math.PI * 2;
            const radius = 260;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{ opacity: 1, x, y }}
                transition={{ delay: 0.2 + idx * 0.1, type: "spring", stiffness: 100 }}
                className="absolute z-30"
              >
                <div 
                  onClick={() => handleDrillDown(child)}
                  className={cn(
                    "w-32 h-32 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center gap-2 transition-all duration-300",
                    child.children && child.children.length > 0 ? "cursor-pointer hover:border-gx-purple hover:bg-gx-purple/5" : "cursor-default opacity-80"
                  )}
                >
                  {child.type === "branch" ? (
                    <Users className="w-6 h-6 text-gx-purple" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gx-cyan" />
                  )}
                  <div className="text-center px-2">
                    <div className="text-[10px] font-bold text-white/80 line-clamp-1">{child.name}</div>
                    <div className="text-[10px] font-mono text-white/40">{child.value}</div>
                  </div>
                </div>
                {/* 连接线 */}
                <svg className="absolute top-1/2 left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[-1]">
                  <line 
                    x1="150" y1="150" 
                    x2={150 - x} y2={150 - y} 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="1" 
                  />
                </svg>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
