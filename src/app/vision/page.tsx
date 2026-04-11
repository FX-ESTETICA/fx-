/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ChevronRight, ShieldCheck, Sparkles, Layers } from "lucide-react";
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl";

export default function VisionPage() {
    const t = useTranslations('vision');
  const [activeFeature, setActiveFeature] = useState<number>(0);
  
  // 滚动监听系统
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  // 第一幕专属：双图自动轮播状态 (0 代表 showcase-1, 1 代表 showcase-2)
  const [heroCarouselIndex, setHeroCarouselIndex] = useState(0);

  useEffect(() => {
    // 只有当停留在第一幕 (activeFeature === 0) 时，才开启自动轮播
    let interval: NodeJS.Timeout;
    if (activeFeature === 0) {
      interval = setInterval(() => {
        setHeroCarouselIndex((prev) => (prev === 0 ? 1 : 0));
      }, 4000); // 4秒切换一次，保证足够的阅读时间
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeFeature]);

  useEffect(() => {
    const handleScroll = () => {
      // 遍历所有区块，找到当前距离屏幕中央最近的区块
      let closestSectionIndex = 0;
      let minDistance = Infinity;

      sectionRefs.forEach((ref, index) => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          // 计算区块中心到屏幕中心的绝对距离
          const sectionCenter = rect.top + rect.height / 2;
          const screenCenter = window.innerHeight / 2;
          const distance = Math.abs(sectionCenter - screenCenter);

          if (distance < minDistance) {
            minDistance = distance;
            closestSectionIndex = index;
          }
        }
      });

      // 如果发现新的焦点区块，更新状态以触发右侧 3D 矩阵重组
      if (closestSectionIndex !== activeFeature) {
        setActiveFeature(closestSectionIndex);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // 初始化调用一次
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeFeature]);

  const handleEnterSandbox = () => {
    // 点击按钮，物理重载跳转到主系统的真实入口
    window.location.href = "https://fx-rapallo.vercel.app";
  };

  const features = [
    {
      id: 0,
      title: "全息星云渲染与三轨合一矩阵",
      desc: "打破传统 SaaS 静态白底黑字。生活、智控、BOSS 三端在统一的沉浸式星空场域中无缝共振，0 延时身份流转。这不是网页，这是一个运行在浏览器里的高维空间。",
      icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />,
      target: "tablet",
    },
    {
      id: 1,
      title: "高并发零冲突实时调度中枢",
      desc: "毫秒级内爆拆单、连单与防死锁。彻底消灭预约碰撞，压榨前沿计算性能，实现全真三维矩阵调度。",
      icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />,
      target: "pc",
    },
    {
      id: 2,
      title: "联邦制多门店星系级版图",
      desc: "彻底抛弃传统的下拉框切换门店。将企业组织架构升维成真实的星系拓扑图。全局数据与财务中枢如同恒星，统御并实时流转全宇宙的业务能量。",
      icon: <Layers className="w-5 h-5 text-amber-400" />,
      target: "mobile",
    },
  ];

  return (
    <main className="min-h-screen bg-transparent relative flex flex-col xl:flex-row">
      {/* 由于是在 /vision 独立路由，底层 layout.tsx 的 NebulaBackground 会自动作为最底层星空背景 */}
      
      {/* 沉浸式毛玻璃遮罩，为了突出路演舱的主体 */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md pointer-events-none z-0" />

      {/* ------------------------------------------------------------- */}
      {/* 左侧：文案与护城河 (1/3 区域) - 解除高度限制，允许自然滚动 */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full xl:w-1/3 flex flex-col px-6 sm:px-12 lg:pl-20 relative z-10 py-12 xl:py-0">
        
        {/* 顶部居中 Logo 区域 */}
        <div className="w-full flex justify-center pt-4 pb-8 xl:pt-8 xl:pb-0">
          <div className="flex items-center select-none mix-blend-screen">
            <div className="inline-flex items-baseline gap-1.5 md:gap-2 justify-center">
              <span className="text-3xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                GX
              </span>
              <span className="text-lg md:text-xl font-black text-cyan-400 tracking-tighter transform -translate-y-3 md:-translate-y-4 -translate-x-1.5 md:-translate-x-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                +
              </span>
              <span className="text-xl md:text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neutral-400 to-neutral-600">
                {t('txt_b05e70')}</span>
            </div>
          </div>
        </div>

        {/* 垂直排布的正文区块 - 将其变为 3 个高度等于屏幕的锚点容器 */}
        <div className="flex-1 flex flex-col xl:pb-32" ref={containerRef}>
          
          {features.map((feat, idx) => (
            <div 
              key={feat.id} 
              ref={sectionRefs[idx]}
              className="xl:min-h-[70vh] flex flex-col justify-center py-16 xl:py-32 relative"
            >
              {/* 为了在移动端也能看出层级，我们在非大屏下保持普通展示；在大屏下启用视差叙事 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, margin: "-20% 0px -20% 0px" }}
                transition={{ duration: 0.8 }}
                className={cn(
                  "transition-all duration-700",
                  // 在桌面端，如果不是当前激活的区块，文字变暗以凸显当前主题
                  activeFeature === idx ? "opacity-100 xl:scale-100" : "xl:opacity-30 xl:scale-95"
                )}
              >
                {/* 标题部分已删除，彻底留白交由图标和文案讲述 */}
                {idx === 0 && (
                  <div className="h-0 xl:h-8" /> 
                )}

                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-black border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                    {feat.icon}
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-white/90">{feat.title}</h3>
                </div>
                <p className="text-lg lg:text-xl text-white/50 leading-relaxed pl-16">
                  {feat.desc}
                </p>
              </motion.div>
            </div>
          ))}

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={handleEnterSandbox}
            className="hidden md:flex group relative z-50 items-center justify-center gap-3 w-fit px-10 py-5 rounded-full bg-white text-black font-bold text-lg overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
            <span>{t('txt_86ef01')}</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 移动端专属：垂直堆叠卡片瀑布流 (Mobile Only) */}
      {/* ------------------------------------------------------------- */}
      <div className="md:hidden flex-1 flex flex-col gap-8 px-6 pb-24 relative z-10">
        {features.map((feat, idx) => (
          <motion.div
            key={`mobile-${feat.id}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + idx * 0.2 }}
            className="flex flex-col bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* 移动端设备特写区 */}
            <div className="relative w-full h-[300px] flex items-center justify-center bg-gradient-to-b from-white/[0.05] to-transparent overflow-hidden">
               {feat.id === 0 && (
                 // Tablet 剪影
                 <div className="w-[80%] h-[70%] rounded-xl border border-white/20 bg-black shadow-2xl relative overflow-hidden transform rotate-2">
                   <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/10 border-r border-white/10" />
                   <img src="https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=1969&auto=format&fit=crop" alt="Tablet Mockup" className="absolute inset-0 w-full h-full object-cover opacity-60 ml-2" />
                 </div>
               )}
               {feat.id === 1 && (
                 // PC 剪影
                 <div className="w-[90%] h-[60%] rounded-t-xl border-t border-l border-r border-white/20 bg-black shadow-2xl relative overflow-hidden transform -translate-y-4">
                   <div className="h-4 w-full bg-white/10 border-b border-white/10 flex items-center justify-center">
                     <div className="w-1 h-1 rounded-full bg-white/30" />
                   </div>
                   <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" alt="PC Mockup" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                 </div>
               )}
               {feat.id === 2 && (
                 // Mobile 剪影
                 <div className="w-[50%] h-[90%] rounded-[2rem] border-2 border-white/20 bg-black shadow-2xl relative overflow-hidden transform -rotate-2">
                   <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-black rounded-full z-10 border border-white/10" />
                   <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop" alt="Mobile Mockup" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                 </div>
               )}
            </div>

            {/* 移动端文案区 */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-black border border-white/10 shadow-inner">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-white/90">{feat.title}</h3>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                {feat.desc}
              </p>
            </div>
          </motion.div>
        ))}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          onClick={handleEnterSandbox}
          className="mt-4 group relative flex items-center justify-center gap-3 w-full py-5 rounded-2xl bg-white text-black font-bold text-lg overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          <span>{t('txt_86ef01')}</span>
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 桌面与大尺寸平板端：流体缩放设备矩阵 (2/3 区域) - 启用 Sticky 吸顶 */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden md:flex w-full xl:w-2/3 items-center justify-center pointer-events-none perspective-1000 z-10 sticky top-0 h-screen">
        
        {/* 核心响应式外壳：利用 CSS clamp 确保整体缩放，彻底抛弃绝对 px */}
        <div 
          className="relative flex items-center justify-center transform-style-3d"
          style={{
            // 基础视口计算，确保在大屏幕不过大，小屏幕不溢出
            width: "clamp(600px, 60vw, 1000px)",
            height: "clamp(600px, 60vw, 1000px)",
          }}
        >
          
          {/* 终极全屏无边框平板模拟器 (Latest Bezel-less Tablet) */}
          <motion.div
            animate={{
              scale: 1,
              z: 50,
            }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-10 rounded-[2rem] xl:rounded-[3rem] ring-1 ring-white/10 bg-black/80 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
            style={{
              width: "100%",        // 占满容器宽度
              height: "70%",        // 接近 iPad Pro 横屏比例 (如 1.43:1)
            }}
          >
            {/* 彻底去除边框和刘海，纯粹的玻璃屏幕感 */}
            <div className="flex-1 relative bg-black overflow-hidden">
              {/* 第一幕图 1 (showcase-1.png) - 仅在 activeFeature 0 且 heroCarouselIndex 0 时显示 */}
              <img 
                src="/showcase-1.png" 
                alt="Feature 1 - Part 1" 
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out", 
                  activeFeature === 0 && heroCarouselIndex === 0 ? "opacity-100" : "opacity-0"
                )}
              />
              {/* 第一幕图 2 (showcase-2.png) - 仅在 activeFeature 0 且 heroCarouselIndex 1 时显示 */}
              <img 
                src="/showcase-2.png" 
                alt="Feature 1 - Part 2" 
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out", 
                  activeFeature === 0 && heroCarouselIndex === 1 ? "opacity-100" : "opacity-0"
                )}
              />

              {/* 第二幕图 (由于你要的是日历图，而 showcase-4.png 是日历，showcase-3.png 是星系，所以这里改为 showcase-4.png) - 仅在 activeFeature 1 时定点狙击显示 */}
              <img 
                src="/showcase-4.png" 
                alt="Feature 2" 
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out", 
                  activeFeature === 1 ? "opacity-100" : "opacity-0"
                )}
              />
              
              {/* 第三幕图 (这里改为展示星系图 showcase-3.png) - 仅在 activeFeature 2 时定点狙击显示 */}
              <img 
                src="/showcase-3.png" 
                alt="Feature 3" 
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out", 
                  activeFeature === 2 ? "opacity-100" : "opacity-0"
                )}
              />
              
              {/* 高级屏幕反光与材质 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] via-transparent to-white/[0.08] pointer-events-none mix-blend-overlay" />
            </div>
          </motion.div>

        </div>
      </div>
    </main>
  );
}