"use client";

import { GlassCard } from "@/components/shared/GlassCard";
import { NebulaBackground } from "@/components/shared/NebulaBackground";
import { motion, useMotionValue, useTransform, useSpring, animate, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const NAVIGATION_LINKS = [
  { id: "01", name: "核心控制台 / CORE", path: "/", description: "全景驾驶舱，系统状态实时监控。", status: "ACTIVE", glow: "cyan" },
  { id: "02", name: "身份验证 / AUTH", path: "/login", description: "安全接入网关，支持 Mock 模式。", status: "READY", glow: "purple" },
  { id: "03", name: "管理看板 / DASHBOARD", path: "/dashboard", description: "多角色业务看板，数据可视化。", status: "READY", glow: "blue" },
  { id: "04", name: "预约系统 / BOOKING", path: "/booking", description: "全链路预约流，Mock 闭环测试。", status: "READY", glow: "emerald" },
  { id: "05", name: "发现广场 / DISCOVERY", path: "/discovery", description: "赛博内容分发，动态流展示。", status: "READY", glow: "amber" },
  { id: "06", name: "星云 UI / NEBULA", path: "/nebula", description: "WebGL 视觉引擎，沉浸式体验。", status: "INITIALIZING", glow: "pink" },
  { id: "07", name: "行业日历 / CALENDAR", path: "/calendar", description: "时间节点管理，行业动态追踪。", status: "READY", glow: "indigo" },
  { id: "08", name: "数据分析 / ANALYTICS", path: "/analytics", description: "性能指标分析，系统负载监控。", status: "READY", glow: "rose" },
];

export default function Home() {
  const [activeId, setActiveId] = useState("01");
  const [rotationValue, setRotationValue] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const carouselRotation = useMotionValue(0);

  // 响应式检测
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 经典丝滑弹簧配置
  const springRotation = useSpring(carouselRotation, { 
    stiffness: 150, 
    damping: 25, 
    mass: 1
  });
  
  useMotionValueEvent(springRotation, "change", (latest) => {
    setRotationValue(latest);
    
    // 实时计算当前激活的 ID
    const totalItems = NAVIGATION_LINKS.length;
    const rawIndex = Math.round(latest / 45);
    const normalizedIndex = ((rawIndex % totalItems) + totalItems) % totalItems;
    const activeIndex = (totalItems - normalizedIndex) % totalItems;
    if (NAVIGATION_LINKS[activeIndex].id !== activeId) {
      setActiveId(NAVIGATION_LINKS[activeIndex].id);
    }
  });

  const startRotationRef = useRef(0);
  
  const handleDragStart = () => {
    startRotationRef.current = carouselRotation.get();
  };

  const handleDrag = (_: any, info: { offset: { x: number } }) => {
    const sensitivity = isMobile ? 0.4 : 0.2; // 移动端提高灵敏度
    carouselRotation.set(startRotationRef.current + info.offset.x * sensitivity);
  };

  const handleDragEnd = (_: any, info: { offset: { x: number }, velocity: { x: number } }) => {
    const velocity = info.velocity.x;
    
    let targetRotation = carouselRotation.get();

    // 惯性吸附逻辑
    if (Math.abs(velocity) > 500) {
      const direction = velocity > 0 ? 1 : -1;
      targetRotation = Math.round((targetRotation + direction * 20) / 45) * 45;
    } else {
      targetRotation = Math.round(targetRotation / 45) * 45;
    }

    animate(carouselRotation, targetRotation, {
      type: "spring",
      stiffness: 200,
      damping: 30
    });
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center text-white p-6 md:p-12 overflow-hidden touch-none relative">
      <NebulaBackground rotation={rotationValue} />

      <div className="z-10 max-w-7xl w-full flex flex-col gap-6 md:gap-8 h-full flex-1">
        <header className="flex flex-col gap-4 shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-gx-cyan animate-pulse" />
            <span className="text-gx-cyan font-mono tracking-widest text-[10px] md:text-xs uppercase">
              空间驾驶舱 / SPATIAL COCKPIT
            </span>
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold tracking-tighter"
            >
              GX <span className="text-gradient-cyan">SPATIAL</span>
            </motion.h1>
          </div>
        </header>

        {/* Core 3D stage - 强制 60vh 物理高度锚定 */}
        <div className={`relative flex-1 ${isMobile ? 'h-[60vh] min-h-[400px]' : 'min-h-[500px]'} flex items-center justify-center ${isMobile ? 'perspective-[1200px]' : 'perspective-[2000px]'} [perspective-origin:center_40%]`}>
          {/* 旋转容器与交互层 */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            style={{ 
              transformStyle: "preserve-3d",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            {NAVIGATION_LINKS.map((index_link, index) => (
              <CardItem 
                key={index_link.id}
                link={index_link}
                index={index}
                total={NAVIGATION_LINKS.length}
                springRotation={springRotation}
                isActive={activeId === index_link.id}
                isMobile={isMobile}
              />
            ))}
          </motion.div>

          {/* 底部提示 */}
          <div className="absolute bottom-4 flex flex-col items-center gap-4">
            <div className="flex items-center gap-6 text-[10px] font-mono text-white/20 tracking-[0.5em]">
              <span>← SWIPE</span>
              <div className="w-12 h-[1px] bg-white/10" />
              <span>NAVIGATE →</span>
            </div>
            <div className="text-gx-cyan/60 font-mono text-xs tracking-widest">
              SYSTEM_INDEX: {activeId} / 08
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full max-w-7xl z-10 py-6 flex justify-between items-center text-zinc-600 font-mono text-[9px] tracking-widest border-t border-white/5">
        <div className="flex gap-8">
          <span>© 2026 GALAXY EXPERIENCE</span>
          <span className="hidden lg:inline text-zinc-800">GX_V1_LEGACY_RESTORED</span>
        </div>
        <div className="flex gap-6">
          <span className="hover:text-gx-cyan cursor-pointer transition-colors uppercase">SYSTEM_LOG</span>
          <span className="hover:text-gx-purple cursor-pointer transition-colors uppercase">SECURITY_VAULT</span>
        </div>
      </footer>
    </main>
  );
}

function CardItem({ link, index, total, springRotation, isActive, isMobile }: any) {
  const angleStep = 360 / total;
  const baseAngle = index * angleStep;
  
  // 计算卡片在圆环上的实时角度 (考虑整体旋转)
  const currentAngle = useTransform(springRotation, (r: number) => {
    return baseAngle + r;
  });

  // 将角度转换为弧度用于三角函数
  const radian = useTransform(currentAngle, (a: number) => (a * Math.PI) / 180);

  // Mathematical simulation of ring position: calculate X and Z coordinates
  const radius = isMobile ? 280 : 450; // 进一步减小移动端半径，防止超出视口
  const x = useTransform(radian, (r: number) => Math.sin(r) * radius);
  const z = useTransform(radian, (r: number) => Math.cos(r) * radius);

  // Offset relative to the center point (for visual feedback)
  const relativeOffset = useTransform(currentAngle, (a: number) => {
    const normalized = ((a % 360) + 360) % 360;
    return normalized > 180 ? normalized - 360 : normalized;
  });

  // Extreme visual feedback
  const scale = useTransform(relativeOffset, [-60, 0, 60], [isMobile ? 0.8 : 0.8, 1, isMobile ? 0.8 : 0.8]);
  const opacity = useTransform(relativeOffset, [-90, -45, 0, 45, 90], [0.1, 0.7, 1, 0.7, 0.1]); // 提高非激活卡片在移动端的可见度
  const blurValue = useTransform(relativeOffset, [-60, 0, 60], [isMobile ? 0 : 6, 0, isMobile ? 0 : 6]); // 移动端禁用卡片虚化

  return (
    <motion.div
      style={{
        position: "absolute",
        width: isMobile ? "180px" : "220px", // Smaller cards on mobile
        height: isMobile ? "240px" : "300px",
        x: x,
        z: z,
        // 关键：永远保持 rotateY 为 0，确保卡片永远正对屏幕平面
        rotateY: 0,
        scale: scale,
        opacity: opacity,
        zIndex: useTransform(z, (v) => Math.round(v + radius)),
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden", // 提升移动端渲染稳定性
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <motion.div
        style={{
          filter: useTransform(blurValue, (v) => `blur(${v}px)`),
          height: "100%",
          width: "100%"
        }}
      >
        <Link 
           href={link.path} 
           className={`${isActive ? "pointer-events-auto cursor-pointer" : "pointer-events-none"} block h-full w-full`}
         >
          <GlassCard 
            glowColor={link.glow as any} 
            className={`h-full flex flex-col gap-4 p-6 border-white/5 transition-all duration-500 ${
              isActive ? 'border-white/20 shadow-[0_0_40px_rgba(0,242,255,0.12)] ring-1 ring-white/20 group' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-3xl font-mono font-bold ${isActive ? 'text-white/20' : 'text-white/5'}`}>
                {link.id}
              </span>
              <div className={`w-6 h-6 rounded-full border border-white/10 flex items-center justify-center`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-gx-cyan shadow-[0_0_8px_#00f2ff]' : 'bg-white/10'}`} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className={`text-lg font-bold tracking-tight transition-colors ${isActive ? 'text-gx-cyan' : 'text-white/90'}`}>
                {link.name}
              </h2>
              <p className="text-zinc-500 text-[10px] leading-relaxed line-clamp-3">
                {link.description}
              </p>
            </div>

            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                {link.status}
              </span>
              {isActive && (
                <motion.span 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[8px] font-mono text-gx-cyan tracking-tighter flex items-center gap-1"
                >
                  OPEN / 建立连接 <span className="text-[10px]">→</span>
                </motion.span>
              )}
            </div>
          </GlassCard>
        </Link>
      </motion.div>
    </motion.div>
  );
}
