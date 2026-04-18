"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X } from "lucide-react";

import { useTranslations } from "next-intl";
import { useHardwareBack } from "@/hooks/useHardwareBack";

export const DataMatrixAssets = () => {
  const t = useTranslations('DataMatrixAssets');
  
  // 模拟动态数据
  const MOCK_ECHOES = [
    { id: 1, content: t('echo_1'), time: "2H AGO", impact: 128 },
    { id: 2, content: t('echo_2'), time: "YESTERDAY", impact: 456 },
    { id: 3, content: t('echo_3'), time: "3D AGO", impact: 89 },
  ];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [echoes, setEchoes] = useState(MOCK_ECHOES);
  const [currentIndex, setCurrentIndex] = useState(0);

  const registerBack = useHardwareBack(state => state.register);
  const unregisterBack = useHardwareBack(state => state.unregister);

  useEffect(() => {
    if (isModalOpen) {
      registerBack('data-matrix-modal', () => {
        setIsModalOpen(false);
        return true;
      }, 40);
    } else {
      unregisterBack('data-matrix-modal');
    }
    return () => unregisterBack('data-matrix-modal');
  }, [isModalOpen, registerBack, unregisterBack]);

  // 状态 1: 自动轮播的呼吸态终端日志 (Holographic Ticker)
  useEffect(() => {
    if (isModalOpen || echoes.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % echoes.length);
    }, 4000); // 每 4 秒呼吸切换一条
    return () => clearInterval(timer);
  }, [isModalOpen, echoes.length]);

  const handleDelete = (id: number) => {
    setEchoes(echoes.filter((e) => e.id !== id));
  };

  if (echoes.length === 0) return null;

  return (
    <>
      {/* 状态 1: 呼吸态终端日志 (Holographic Ticker) - 纯文字，无背景 */}
      <div 
        className="relative flex flex-col items-center justify-center w-full h-5 cursor-pointer group overflow-hidden"
        onClick={() => setIsModalOpen(true)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="flex items-center justify-center px-4 w-full"
          >
            <span className="text-[11px] text-white/70 tracking-wider font-light line-clamp-1 max-w-[80%]">
              {echoes[currentIndex].content}
            </span>
          </motion.div>
        </AnimatePresence>
        
        {/* Hover 提示光线 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-gx-cyan/50 group-hover:w-32 transition-all duration-500 ease-out" />
      </div>

      {/* 状态 2: 零容器全息展开 (Zero-Container Fullscreen Overlay) - 物理逃逸，无实体框 */}
      {/* 顶级修复：持久化全屏毛玻璃护盾 (Persistent Glass Shield) */}
      <motion.div
        initial={false}
        animate={isModalOpen ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed inset-0 z-[99] bg-black/70 backdrop-blur-xl pointer-events-none"
        style={{ willChange: 'opacity' }}
      />
      
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center">
            {/* 点击遮罩拦截事件 */}
            <div 
              className="absolute inset-0 bg-transparent cursor-pointer"
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* 纯文字内容层 (物理逃逸) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-full max-w-2xl flex flex-col h-[80vh] px-6 pointer-events-auto"
            >
              {/* 标题头 */}
              <div className="flex flex-col items-center justify-center pb-12 shrink-0">
                <h2 className="text-xl font-bold tracking-[0.2em] text-white/90 uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                  ECHOES
                </h2>
                <p className="text-[10px] text-gx-cyan/60 font-mono tracking-[0.3em] mt-2 uppercase">
                  {echoes.length} Records Synchronized
                </p>
              </div>

              {/* 无边框列表阵列 */}
              <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                <AnimatePresence>
                  {echoes.map((echo, idx) => (
                    <motion.div 
                      key={echo.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, filter: "blur(5px)" }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative flex flex-col md:flex-row md:items-center gap-2 md:gap-6 py-2"
                    >
                      {/* 影响值 (移除多余英文时间，只保留 IMP 属性) */}
                      <div className="flex items-center gap-3 md:w-24 shrink-0">
                        <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">
                          IMP:{echo.impact}
                        </span>
                      </div>
                      
                      {/* 内容 */}
                      <p className="text-sm text-white/80 font-light tracking-wide flex-1">
                        {echo.content}
                      </p>
                      
                      {/* 悬浮删除 */}
                      <button 
                        onClick={() => handleDelete(echo.id)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-white/10 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {echoes.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center text-white/20 text-sm font-mono tracking-widest uppercase pt-10"
                  >
                    No Records Found
                  </motion.div>
                )}
              </div>

              {/* 底部居中关闭 */}
              <div className="flex justify-center pt-8 shrink-0">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex items-center justify-center w-12 h-12 rounded-full text-white/30 hover:text-white hover:bg-white/5 transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
