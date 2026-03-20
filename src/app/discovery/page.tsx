"use client";

import { useState } from "react";
import { DiscoveryWaterfall } from "@/features/discovery/components/DiscoveryWaterfall";
import { DiscoveryItem } from "@/features/discovery/types";
import { Button } from "@/components/shared/Button";
import { LayoutGrid, Search, Filter, Camera, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";

const MOCK_ITEMS: DiscoveryItem[] = [
  {
    id: "1",
    title: "赛博简约风：2026 探店视觉指南",
    mediaUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1000",
    mediaType: "image",
    author: { id: "a1", name: "Visual_Nomad" },
    stats: { likes: 1204, comments: 85, shares: 42 },
    tags: ["cyberpunk", "minimalism"],
    category: "lifestyle",
    aspectRatio: 0.8
  },
  {
    id: "2",
    title: "顶级和牛烧肉：火影级刀法展示",
    mediaUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000",
    mediaType: "video",
    author: { id: "a2", name: "Gourmet_Master" },
    stats: { likes: 3502, comments: 210, shares: 156 },
    tags: ["wagyu", "dining"],
    category: "dining",
    aspectRatio: 1.2
  },
  {
    id: "3",
    title: "未来发艺：极光染发技术解析",
    mediaUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=1000",
    mediaType: "image",
    author: { id: "a3", name: "Stylist_Neo" },
    stats: { likes: 890, comments: 45, shares: 12 },
    tags: ["hair", "beauty"],
    category: "beauty",
    aspectRatio: 0.75
  },
  {
    id: "4",
    title: "全息光影酒店：体验沉浸式睡眠",
    mediaUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000",
    mediaType: "image",
    author: { id: "a4", name: "Travel_Explorer" },
    stats: { likes: 2100, comments: 134, shares: 89 },
    tags: ["hotel", "future"],
    category: "hotel",
    aspectRatio: 1.5
  },
  {
    id: "5",
    title: "深夜食堂：寻找那口失传的味道",
    mediaUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000",
    mediaType: "video",
    author: { id: "a5", name: "Night_Owl" },
    stats: { likes: 5600, comments: 430, shares: 245 },
    tags: ["food", "vlog"],
    category: "dining",
    aspectRatio: 0.9
  },
  {
    id: "6",
    title: "极致护肤：多肽导入技术实测",
    mediaUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1000",
    mediaType: "image",
    author: { id: "a6", name: "Skin_Expert" },
    stats: { likes: 720, comments: 32, shares: 8 },
    tags: ["skincare", "beauty"],
    category: "beauty",
    aspectRatio: 1.1
  }
];

export default function DiscoveryPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "全部 / ALL", icon: Sparkles },
    { id: "beauty", label: "美妆 / BEAUTY", icon: Camera },
    { id: "dining", label: "美食 / DINING", icon: TrendingUp },
    { id: "hotel", label: "酒店 / HOTEL", icon: LayoutGrid },
  ];

  const filteredItems = activeCategory === "all" 
    ? MOCK_ITEMS 
    : MOCK_ITEMS.filter(item => item.category === activeCategory);

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-gx-purple/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-gx-cyan/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto space-y-12 relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-gx-cyan">
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-mono uppercase tracking-[0.4em]">DISCOVERY_STREAM // 发现</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter">探索 / Discovery</h1>
            <p className="text-white/40 text-sm max-w-xl">
              基于 Bunny.net CDN 全球加速，为您呈现全网最新、最热的本地生活动态与视觉盛宴。
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-gx-cyan transition-colors" />
              <input 
                type="text" 
                placeholder="搜索动态 / Explore..." 
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-gx-cyan/50 transition-all w-48 focus:w-64"
              />
            </div>
            <Button variant="ghost" size="sm" className="gap-2 text-white/40 border-white/10">
              <Filter className="w-3 h-3" />
              筛选 / Filter
            </Button>
          </div>
        </header>

        {/* 分类切换器 */}
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-mono border transition-all duration-300",
                activeCategory === cat.id
                  ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  : "bg-white/5 text-white/40 border-white/10 hover:border-white/30 hover:text-white"
              )}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* 瀑布流容器 */}
        <div className="min-h-[600px]">
          <DiscoveryWaterfall items={filteredItems} />
        </div>

        {/* 底部导航 */}
        <footer className="pt-12 flex justify-between items-center text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
          <Link href="/dashboard" className="hover:text-gx-cyan transition-colors flex items-center gap-2">
            <LayoutGrid className="w-3 h-3" />
            返回仪表盘 / Dashboard
          </Link>
          <div className="flex gap-4">
            <span>Powered by Bunny.net CDN</span>
            <span>GX_DISCOVERY_V1 // 2026</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
