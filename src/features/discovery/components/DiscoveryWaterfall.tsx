"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { Heart, MessageCircle, Play, Image as ImageIcon } from "lucide-react";
import { DiscoveryItem } from "../types";
import { cn } from "@/utils/cn";
import Image from "next/image";

interface DiscoveryWaterfallProps {
  items: DiscoveryItem[];
  onItemClick?: (item: DiscoveryItem) => void;
}

// 虚拟卡片包裹器：通过 IntersectionObserver 动态卸载屏幕外的重型 DOM
const VirtualCardWrapper = ({ item, children }: { item: DiscoveryItem, children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // 扩大缓冲区域，提前加载，防止滑动过快出现白块
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: "600px" } 
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="break-inside-avoid mb-4" style={{ minHeight: `${(1 / item.aspectRatio) * 100 + 100}px` }}>
      {isVisible ? children : null}
    </div>
  );
};

export const DiscoveryWaterfall = ({ 
  items, 
  onItemClick 
}: DiscoveryWaterfallProps) => {
  const [mounted] = useState(() => typeof window !== "undefined");

  if (!mounted) return null;

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {items.map((item, index) => (
        <VirtualCardWrapper key={item.id} item={item}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.5) }} // 限制最大延迟时间
          >
            <DiscoveryCard item={item} onClick={() => onItemClick?.(item)} />
          </motion.div>
        </VirtualCardWrapper>
      ))}
    </div>
  );
};

const DiscoveryCard = ({ item, onClick }: { item: DiscoveryItem; onClick?: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isAuthorAvatarLocal = item.author.avatarUrl?.startsWith("data:") || item.author.avatarUrl?.startsWith("blob:");

  return (
    <GlassCard
      glowColor="none"
      hoverGlow={false}
      className="p-0 overflow-hidden cursor-pointer group mb-4 border-white/5 bg-white/[0.03]"
    >
      <div 
        className="relative overflow-hidden bg-white/5"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {/* 媒体占位符 - 模拟加载中或 CDN 链接 */}
        <div 
          style={{ paddingBottom: `${(1 / item.aspectRatio) * 100}%` }}
          className="w-full relative"
        >
          <Image
            src={item.mediaUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-transform duration-700",
              isHovered ? "scale-110" : "scale-100"
            )}
          />
          
          {/* 媒体类型标识 */}
          <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            {item.mediaType === 'video' ? (
              <Play className="w-3 h-3 text-white fill-white" />
            ) : (
              <ImageIcon className="w-3 h-3 text-white" />
            )}
          </div>

          {/* 覆盖层信息 (Hover) */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 flex flex-col justify-end p-4",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full border border-white/20 overflow-hidden bg-gx-cyan/20">
                {item.author.avatarUrl ? (
                  <Image
                    src={item.author.avatarUrl}
                    alt={item.author.name}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                    unoptimized={isAuthorAvatarLocal}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gx-cyan">
                    {item.author.name[0]}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-white/80">{item.author.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 基础信息 */}
      <div className="p-3 space-y-2">
        <h4 className="text-xs font-bold leading-snug line-clamp-2 text-white/90 group-hover:text-gx-cyan transition-colors">
          {item.title}
        </h4>
        
        <div className="flex items-center justify-between text-[10px] font-mono text-white/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 hover:text-red-400 transition-colors">
              <Heart className="w-3 h-3" />
              <span>{item.stats.likes}</span>
            </div>
            <div className="flex items-center gap-1 hover:text-gx-cyan transition-colors">
              <MessageCircle className="w-3 h-3" />
              <span>{item.stats.comments}</span>
            </div>
          </div>
          <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase tracking-tighter text-[8px]">
            {item.category}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
