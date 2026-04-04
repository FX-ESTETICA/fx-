"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { cn } from "@/utils/cn";

// 模拟 5 条顶级推荐数据 (符合 10 家以内的人工精选徽章机制，避免硬性排名)
const CAROUSEL_ITEMS = [
  {
    id: "item-1",
    title: "午夜霓虹赛博酒馆",
    subtitle: "MIDNIGHT NEON BAR / 沉浸式微醺体验",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop",
    tag: "GX PRO 官方认证",
  },
  {
    id: "item-2",
    title: "Lumina 医美中心",
    subtitle: "LUMINA CLINIC / 全息抗衰塑形",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2068&auto=format&fit=crop",
    tag: "GX 首发特权",
  },
  {
    id: "item-3",
    title: "星穹之巅米其林",
    subtitle: "STELLAR DINING / 云端分子料理",
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070&auto=format&fit=crop",
    tag: "黑珍珠三钻",
  },
  {
    id: "item-4",
    title: "深渊潜水俱乐部",
    subtitle: "ABYSS DIVE CLUB / 极限深海探索",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070&auto=format&fit=crop",
    tag: "星空甄选节点",
  },
  {
    id: "item-5",
    title: "量子跃迁电竞馆",
    subtitle: "QUANTUM ESPORTS / 全息沉浸竞技",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
    tag: "GX 极客推荐",
  },
];

const DRAG_RANGE = 250; // 物理滑动阈值基准

const CarouselCard = ({ item, offset, dragX }: { item: any; offset: number; dragX: any }) => {
  // 核心公式：将物理像素位移 (dragX) 映射为归一化进度 (-1 到 1)
  const progress = useTransform(dragX, (v: number) => v / DRAG_RANGE);

  // 虚拟偏移量：基础偏移量加上实时的拖拽进度，实现绝对连续的 TikTok 级跟手感
  const virtualOffset = useTransform(progress, (p) => offset + p);

  // 1. X 轴位移：基于 60% 的基础间距实时平移
  const x = useTransform(virtualOffset, (vo) => `calc(${vo * 60}%)`);

  // 2. 缩放景深：越靠近中心 (vo=0) 越大，越远越小
  const scale = useTransform(virtualOffset, (vo) => 1 - Math.min(Math.abs(vo), 1) * 0.15);

  // 3. 层级控制：中心层级最高，平滑过渡防止突变
  const zIndexFloat = useTransform(virtualOffset, (vo) => 30 - Math.abs(vo) * 20);
  const zIndex = useTransform(zIndexFloat, Math.round);

  // 4. 黑场模糊：远离中心时加深遮罩，中心完全清透
  const blurOpacity = useTransform(virtualOffset, (vo) => Math.min(Math.abs(vo), 1) * 0.8);

  // 5. 内容可见度：仅在中心时显示文字和徽章
  const contentOpacity = useTransform(virtualOffset, (vo) => 1 - Math.min(Math.abs(vo), 1) * 1.5);

  return (
    <motion.div
      style={{
        x,
        scale,
        zIndex,
        transformOrigin: "center center",
        WebkitFontSmoothing: "antialiased",
        backfaceVisibility: "hidden",
      }}
      className={cn(
        "absolute h-full aspect-[16/9] sm:aspect-[21/9] max-w-[80vw] rounded-[clamp(16px,2vw,24px)] overflow-hidden",
        "ring-1 ring-white/5 border border-white/5 bg-gx-dark-800 shadow-2xl"
      )}
    >
      <Image
        src={item.image}
        alt={item.title}
        fill
        sizes="(max-width: 768px) 100vw, 80vw"
        className="object-cover"
        priority={offset === 0}
      />

      <motion.div
        style={{ opacity: blurOpacity }}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
      />

      <motion.div style={{ opacity: contentOpacity }} className="absolute inset-0 flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded border border-yellow-500/30 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-[10px] font-black text-yellow-500 tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]">
            {item.tag}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 z-10">
          <div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,1)] uppercase tracking-tighter mb-1 line-clamp-1">
              {item.title}
            </h2>
            <p className="text-[9px] sm:text-[10px] font-mono text-white/70 tracking-widest line-clamp-1">
              {item.subtitle}
            </p>
          </div>
          <div className="hidden md:flex shrink-0 items-center gap-1.5 text-yellow-400 font-bold text-xs bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20 backdrop-blur-md hover:bg-yellow-500/20 transition-colors cursor-pointer shadow-[0_0_10px_rgba(255,215,0,0.1)]">
            <span>立即预约</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </motion.div>

      <motion.div
        style={{ opacity: contentOpacity }}
        className="absolute inset-0 rounded-[clamp(16px,2vw,24px)] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] ring-1 ring-white/20 pointer-events-none"
      />
    </motion.div>
  );
};

export const HolographicCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragX = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (_: any, { offset }: any) => {
    setIsDragging(false);
    const swipe = offset.x;
    const swipeThreshold = 50;

    if (swipe < -swipeThreshold) {
      animate(dragX, -DRAG_RANGE, {
        type: "spring",
        stiffness: 400,
        damping: 40,
        onComplete: () => {
          setActiveIndex((prev) => prev + 1);
          dragX.set(0);
        },
      });
    } else if (swipe > swipeThreshold) {
      animate(dragX, DRAG_RANGE, {
        type: "spring",
        stiffness: 400,
        damping: 40,
        onComplete: () => {
          setActiveIndex((prev) => prev - 1);
          dragX.set(0);
        },
      });
    } else {
      animate(dragX, 0, { type: "spring", stiffness: 400, damping: 40 });
    }
  };

  return (
    <div className="relative w-full h-[clamp(200px,25vh,280px)] flex items-center justify-center overflow-hidden py-2 perspective-1000">
      <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
        {CAROUSEL_ITEMS.map((item, index) => {
          const length = CAROUSEL_ITEMS.length;
          const normalizedActiveIndex = ((activeIndex % length) + length) % length;

          let offset = index - normalizedActiveIndex;
          if (offset > Math.floor(length / 2)) offset -= length;
          if (offset < -Math.floor(length / 2)) offset += length;

          if (Math.abs(offset) > 2) return null;

          return <CarouselCard key={item.id} item={item} offset={offset} dragX={dragX} />;
        })}

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          style={{ x: dragX }}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          className={cn(
            "absolute inset-0 z-50 touch-none",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        />
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 pointer-events-none">
        {CAROUSEL_ITEMS.map((_, idx) => {
          const length = CAROUSEL_ITEMS.length;
          const normalizedActiveIndex = ((activeIndex % length) + length) % length;
          return (
            <div
              key={idx}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                normalizedActiveIndex === idx
                  ? "w-6 bg-gx-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]"
                  : "w-1.5 bg-white/20"
              )}
            />
          );
        })}
      </div>
    </div>
  );
};
