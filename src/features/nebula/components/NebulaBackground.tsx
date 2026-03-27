"use client";

import { useEffect, useRef } from "react";

export const NebulaBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const particles: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
    const particleCount = 150;

    // Use performance.now() directly to avoid any three.js clock deprecation warnings
    let startTime = performance.now();
    let lastTime = startTime;

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.5,
          speed: Math.random() * 0.2 + 0.1,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    };

    const drawCircles = () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.max(width, height) * 0.8;

      ctx.strokeStyle = "rgba(0, 242, 255, 0.03)";
      ctx.lineWidth = 1;

      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (maxRadius / 5) * i, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw concentric circles
      drawCircles();

      // Draw particles
      particles.forEach((p) => {
        ctx.fillStyle = `rgba(0, 242, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        p.y -= p.speed;
        if (p.y < 0) p.y = height;
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
      className="fixed inset-0 z-0 pointer-events-none opacity-60"
    />
  );
};
