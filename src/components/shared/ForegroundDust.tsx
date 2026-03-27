"use client";

import { useEffect, useRef } from "react";

export const ForegroundDust = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const particles: {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      color: string;
    }[] = [];
    
    // 极少量的粒子，追求“大光圈虚化”的电影级前景感，性能消耗极低
    const particleCount = 40;
    
    // 色彩库：青色、紫色（与星空呼应），以及火星红/暗金（增加温度和视觉张力）
    const colors = [
      "0, 242, 255",   // Cyan
      "188, 19, 254",  // Purple
      "255, 45, 85",   // Admin Red (Neon)
      "255, 184, 0",   // Merchant Gold
    ];

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        // 20% 的概率生成极其巨大的“贴脸”虚化光斑，产生强烈的景深和空间感
        const isHuge = Math.random() > 0.8; 
        const baseSize = Math.random() * 4 + 1;
        const size = isHuge ? baseSize * 15 : baseSize * 3;
        
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: size,
          speedX: (Math.random() - 0.5) * 0.4,
          speedY: (Math.random() - 1) * 0.6 - 0.2, // 整体缓慢向上漂浮
          opacity: isHuge ? Math.random() * 0.15 + 0.05 : Math.random() * 0.4 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // 使用径向渐变模拟真实光学虚化 (Bokeh)，性能优于 shadowBlur
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `rgba(${p.color}, ${p.opacity})`);
        gradient.addColorStop(0.4, `rgba(${p.color}, ${p.opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(${p.color}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // 位置更新
        p.x += p.speedX;
        p.y += p.speedY;

        // 越界重置（无缝循环）
        if (p.y < -p.size * 2) {
          p.y = height + p.size * 2;
          p.x = Math.random() * width;
        }
        if (p.x < -p.size * 2) p.x = width + p.size * 2;
        if (p.x > width + p.size * 2) p.x = -p.size * 2;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener("resize", init);
    init();
    render();

    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // z-[9999] 确保它在整个 App 的最顶层（甚至在底部导航栏之上）
      // pointer-events-none 确保它绝对不拦截任何用户点击或滑动
      // mix-blend-screen 实现光学叠加效果
      className="fixed inset-0 z-[9999] pointer-events-none mix-blend-screen opacity-80"
    />
  );
};
