"use client";

import { useState } from "react";
import { NebulaBackground } from "@/components/shared/NebulaBackground";
import { GlassCard } from "@/components/shared/GlassCard";
import { motion } from "framer-motion";
import { 
  Heart, 
  MessageCircle, 
  Play, 
  ExternalLink,
  Flame,
  Clock,
  Navigation
} from "lucide-react";
import { cn } from "@/utils/cn";

const MOCK_POSTS = [
  {
    id: "p1",
    type: "video",
    title: "赛博下午茶的最佳去处 ☕️",
    author: "@NeonExplorer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
    cover: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=800&auto=format&fit=crop",
    likes: "12.4k",
    comments: "856",
    tags: ["#氛围感", "#探店"],
    merchantId: "m2"
  },
  {
    id: "p2",
    type: "image",
    title: "这家的美学设计真的绝了，出片率 100%",
    author: "@AestheticSoul",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
    cover: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop",
    likes: "8.2k",
    comments: "432",
    tags: ["#赛博美学", "#周末去哪儿"],
    merchantId: "m1"
  },
  {
    id: "p3",
    type: "image",
    title: "深夜跑腿服务体验，真的快！",
    author: "@FastLife",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
    cover: "https://images.unsplash.com/photo-1580915411954-282cb1b0d780?q=80&w=800&auto=format&fit=crop",
    likes: "3.1k",
    comments: "128",
    tags: ["#生活服务", "#效率"],
    merchantId: "s1"
  },
  {
    id: "p4",
    type: "video",
    title: "沉浸式美甲过程，治愈预警 ✨",
    author: "@NailArtist",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
    cover: "https://images.unsplash.com/photo-1604654894610-df490668711a?q=80&w=800&auto=format&fit=crop",
    likes: "15.9k",
    comments: "1.2k",
    tags: ["#美甲", "#上门服务"],
    merchantId: "s2"
  }
];

export default function DiscoveryPage() {
  const [filter, setFilter] = useState<"hot" | "new" | "near">("hot");

  return (
    <main className="min-h-screen bg-black text-white relative overflow-x-hidden pb-32">
      <NebulaBackground rotation={0} />
      
      <div className="max-w-7xl mx-auto px-6 pt-12 relative z-10 space-y-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tighter">DISCOVERY</h1>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">Explore the Grid_Culture</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setFilter("hot")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === "hot" ? "bg-gx-cyan text-black" : "text-white/40 hover:text-white/60"
              )}
            >
              <Flame className="w-3 h-3" />
              最热
            </button>
            <button 
              onClick={() => setFilter("new")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === "new" ? "bg-gx-cyan text-black" : "text-white/40 hover:text-white/60"
              )}
            >
              <Clock className="w-3 h-3" />
              最新
            </button>
            <button 
              onClick={() => setFilter("near")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === "near" ? "bg-gx-cyan text-black" : "text-white/40 hover:text-white/60"
              )}
            >
              <Navigation className="w-3 h-3" />
              附近
            </button>
          </div>
        </header>

        {/* Masonry-like Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {MOCK_POSTS.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="break-inside-avoid"
            >
              <GlassCard className="p-0 overflow-hidden group border-white/5 hover:border-gx-cyan/30 transition-all duration-500">
                <div className="relative">
                  <img 
                    src={post.cover} 
                    alt={post.title}
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {post.type === "video" && (
                    <div className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                  
                  {/* Action Bar */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex gap-3">
                      <button className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-gx-cyan/20 transition-colors">
                        <Heart className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-gx-cyan/20 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-gx-cyan text-black rounded-full text-[9px] font-bold uppercase tracking-tighter">
                      GET THERE <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <h3 className="font-bold text-sm leading-snug group-hover:text-gx-cyan transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-mono text-gx-cyan/60 uppercase tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <img src={post.avatar} alt={post.author} className="w-5 h-5 rounded-full border border-white/20" />
                      <span className="text-[10px] font-mono text-white/40">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-white/20">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comments}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
