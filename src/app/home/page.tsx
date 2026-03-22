"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { NebulaBackground } from "@/components/shared/NebulaBackground";
import { 
  Sparkles, 
  ShoppingBag, 
  Coffee, 
  Palmtree, 
  Search,
  MapPin,
  Building2,
  Zap,
  ArrowUpRight,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/cn";
import Link from "next/link";

const MOCK_MERCHANTS = [
  {
    id: "m1",
    name: "CYBER BEAUTY / 赛博美学",
    type: "merchant",
    category: "beauty",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop",
    status: "OPEN",
    distance: "0.8km",
    rating: "4.9",
    tags: ["专业护肤", "科技美容"]
  },
  {
    id: "m2",
    name: "NEON COFFEE / 霓虹咖啡",
    type: "merchant",
    category: "dining",
    image: "https://images.unsplash.com/photo-1501339819398-ee49a94b0169?q=80&w=800&auto=format&fit=crop",
    status: "BUSY",
    distance: "1.2km",
    rating: "4.8",
    tags: ["精品手冲", "赛博空间"]
  },
  {
    id: "s1",
    name: "GX 极速配送 / EXPRESS",
    type: "service",
    category: "lifestyle",
    image: "https://images.unsplash.com/photo-1580915411954-282cb1b0d780?q=80&w=800&auto=format&fit=crop",
    status: "OPEN",
    distance: "0.5km",
    rating: "5.0",
    tags: ["30分钟达", "全城覆盖"]
  },
  {
    id: "s2",
    name: "上门赛博美甲 / NAILS",
    type: "service",
    category: "beauty",
    image: "https://images.unsplash.com/photo-1604654894610-df490668711a?q=80&w=800&auto=format&fit=crop",
    status: "READY",
    distance: "1.8km",
    rating: "4.7",
    tags: ["预约上门", "持久显白"]
  }
];

const CATEGORIES = [
  { id: "all", label: "全部 / ALL", icon: Sparkles },
  { id: "beauty", label: "美妆 / BEAUTY", icon: ShoppingBag },
  { id: "dining", label: "美食 / DINING", icon: Coffee },
  { id: "hotel", label: "住宿 / HOTEL", icon: Palmtree },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"merchant" | "service">("merchant");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredItems = MOCK_MERCHANTS.filter(item => {
    const matchesTab = item.type === activeTab;
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesTab && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-black text-white relative overflow-x-hidden pb-32">
      <NebulaBackground rotation={0} />
      
      <div className="w-full max-w-[1400px] mx-auto px-4 pt-6 relative z-10 space-y-6">
        {/* Top Info Bar - Brand Identity & LBS Dual Wing */}
        <div className="flex justify-between items-end px-2">
          {/* Left Wing - Core Brand Display */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center select-none"
          >
            <h1 className="text-2xl font-black tracking-tight uppercase">
              <span className="text-white">GALAXY</span>
              <span className="text-gx-cyan ml-2 drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">HOME</span>
            </h1>
          </motion.div>

          {/* Right Wing - Location Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 group cursor-pointer pb-1"
          >
            <MapPin className="w-5 h-5 text-gx-cyan group-hover:text-gx-cyan transition-colors" />
            <span className="text-base font-bold text-white/60 group-hover:text-white transition-colors">
              Rapallo, Italy
            </span>
            <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
          </motion.div>
        </div>

        {/* Header - Functional Search Architecture */}
        <header className="flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full relative group"
          >
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full backdrop-blur-2xl shadow-2xl group-focus-within:border-gx-cyan/30 transition-all overflow-hidden py-1">
              <Search className="ml-6 w-5 h-5 text-white/20 group-focus-within:text-gx-cyan transition-colors" />
              <input 
                type="text" 
                placeholder="搜索商家、服务、景点" 
                className="flex-1 bg-transparent py-3 pl-4 pr-8 text-base font-mono focus:outline-none text-white placeholder:text-white/20"
              />
              <button className="mr-2 px-6 py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-white/90 transition-all active:scale-95">
                搜索
              </button>
            </div>
          </motion.div>
        </header>

        {/* 双轴切换器 - 对齐搜索栏宽度 */}
        <div className="flex flex-col items-center">
          <div className="w-full flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setActiveTab("merchant")}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500",
                activeTab === "merchant" 
                  ? "text-gx-cyan bg-white/5 shadow-[inset_0_0_20px_rgba(0,240,255,0.1)] border border-gx-cyan/20" 
                  : "text-white/20 hover:text-white/40"
              )}
            >
              {activeTab === "merchant" && (
                <motion.div layoutId="activeTab" className="absolute inset-0 bg-gx-cyan/5 rounded-xl -z-10" />
              )}
              <Building2 className="w-4 h-4" />
              附近商家 / Merchants
            </button>
            <button 
              onClick={() => setActiveTab("service")}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500",
                activeTab === "service" 
                  ? "text-gx-cyan bg-white/5 shadow-[inset_0_0_20px_rgba(0,240,255,0.1)] border border-gx-cyan/20" 
                  : "text-white/20 hover:text-white/40"
              )}
            >
              {activeTab === "service" && (
                <motion.div layoutId="activeTab" className="absolute inset-0 bg-gx-cyan/5 rounded-xl -z-10" />
              )}
              <Zap className="w-4 h-4" />
              生活服务 / Services
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-mono border transition-all duration-500 backdrop-blur-md",
                activeCategory === cat.id
                  ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  : "bg-white/5 text-white/40 border-white/10 hover:border-white/30 hover:text-white"
              )}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link href={`/booking?id=${item.id}`}>
                <GlassCard 
                  glowColor="none" 
                  className="group p-0 overflow-hidden border-white/5 hover:border-white/20 transition-all duration-500"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                    
                    <div className="absolute top-4 right-4 flex gap-2">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold tracking-widest backdrop-blur-md border",
                        item.status === "OPEN" || item.status === "READY" ? "bg-gx-cyan/20 border-gx-cyan/40 text-gx-cyan" : "bg-gx-gold/20 border-gx-gold/40 text-gx-gold"
                      )}>
                        {item.status}
                      </div>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-gx-cyan">
                          <MapPin className="w-3 h-3" />
                          <span>{item.distance}</span>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tighter uppercase">{item.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                        <span className="text-gx-gold text-xs font-bold">★ {item.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex gap-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="text-[9px] font-mono text-white/30 uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md border border-white/5">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-gx-cyan opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <span>EXPLORE</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer Footnote - 极致去中心化 */}
        <footer className="pt-32 pb-16 flex flex-col items-center space-y-8">
          {/* 元数据转移至此 */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-gx-cyan/20">
              <div className="w-1 h-1 rounded-full bg-gx-cyan/20" />
              <span className="text-[8px] font-mono uppercase tracking-[0.4em]">
                GX_PORTAL_V1 // 2026
              </span>
            </div>

            <Link href="/onboarding">
              <span className="text-[8px] font-mono text-white/10 hover:text-gx-cyan/40 transition-all uppercase tracking-widest border-b border-white/5 pb-0.5">
                Node_Access // 商家入驻
              </span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-4"
          >
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-gx-cyan/10 to-transparent" />
            <p className="text-[10px] font-mono text-white/5 tracking-[0.5em] uppercase">
              // Aesthetic Reduction Protocol
            </p>
          </motion.div>
        </footer>
      </div>
    </main>
  );
}