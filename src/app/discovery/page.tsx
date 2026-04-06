"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/shared/GlassCard";
import { motion } from "framer-motion";
import { 
  Heart, 
  MessageCircle, 
  Play, 
  Flame,
  Clock,
  Navigation,
  Volume2,
  VolumeX,
  Plus,
  ExternalLink
} from "lucide-react";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { UGCUploadModal } from "@/features/discovery/components/UGCUploadModal";
import { useTranslations } from "next-intl";

const STREAM_BASE = process.env.NEXT_PUBLIC_BUNNY_STREAM_BASE || "";

type DiscoveryPost = {
  id: string;
  type: "video" | "image";
  title: string;
  author: string;
  avatar: string;
  cover: string;
  videoId?: string;
  likes: string;
  comments: string;
  tags: string[];
  merchantId: string;
};

// ==========================================
// VideoPlayer Component (Intersection Observer)
// ==========================================
const VideoPlayer = ({ videoId, coverUrl }: { videoId: string, coverUrl: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Element is in view, play the video
            videoRef.current?.play().catch(e => console.log("Auto-play prevented:", e));
            setIsPlaying(true);
          } else {
            // Element is out of view, pause the video
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 } // Play when 60% of the video is visible
    );

    const videoEl = videoRef.current;
    if (videoEl) {
      observer.observe(videoEl);
    }

    return () => {
      if (videoEl) {
        observer.unobserve(videoEl);
      }
    };
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="relative w-full aspect-[9/16] bg-black group/video cursor-pointer" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={`${STREAM_BASE}/${videoId}/play_720p.mp4`}
        poster={coverUrl}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
      />
      
      {/* Play/Pause Overlay Indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
            <Play className="w-6 h-6 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Mute/Unmute Toggle */}
      <button 
        onClick={toggleMute}
        className="absolute bottom-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-colors opacity-0 group-hover/video:opacity-100"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
};

export default function DiscoveryPage() {
    const t = useTranslations('discovery');
  const [filter, setFilter] = useState<"hot" | "new" | "near">("hot");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [posts, setPosts] = useState<DiscoveryPost[]>([]);

  // 核心拉取逻辑
  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ugc_posts')
        .select(`
          *,
          author:profiles(name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // 映射为前端所需的数据结构
      const formattedPosts: DiscoveryPost[] = (data || []).map((p: any) => ({
        id: p.id,
        type: p.media_type,
        title: p.title || "分享内容",
        author: p.author?.name || "匿名行者",
        avatar: p.author?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
        cover: p.media_type === "image" ? p.media_url : `${STREAM_BASE}/${p.video_id}/thumbnail.jpg`,
        videoId: p.video_id,
        likes: (p.likes_count || 0).toString(),
        comments: (p.comments_count || 0).toString(),
        tags: p.tags || [],
        merchantId: p.merchant_id || ""
      }));

      setPosts(formattedPosts);
    } catch (err) {
      console.error("Failed to fetch discovery posts:", err);
    }
  }, []);

  // 页面加载时自动拉取
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleUploadSuccess = () => {
    // 成功后重新拉取数据库最新内容，替代过去的伪造内存数据
    fetchPosts();
  };

  return (
    <main className="min-h-screen bg-transparent text-white relative overflow-x-hidden pb-32">
      
      <div className="max-w-7xl mx-auto px-6 pt-12 relative z-10 space-y-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tighter">DISCOVERY</h1>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">Explore the Grid_Culture</p>
          </div>

          <div className="flex items-center gap-4">
            {/* 发布按钮 */}
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gx-cyan text-black hover:bg-white hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            >
              <Plus className="w-5 h-5 font-bold" />
            </button>

            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md hidden md:flex">
              <button 
                onClick={() => setFilter("hot")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                  filter === "hot" ? "bg-white text-black" : "text-white/40 hover:text-white/60"
                )}
              >
                <Flame className="w-3 h-3" />
                {t('txt_4d2d97')}</button>
              <button 
                onClick={() => setFilter("new")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                  filter === "new" ? "bg-white text-black" : "text-white/40 hover:text-white/60"
                )}
              >
                <Clock className="w-3 h-3" />
                {t('txt_8818d4')}</button>
              <button 
                onClick={() => setFilter("near")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                  filter === "near" ? "bg-white text-black" : "text-white/40 hover:text-white/60"
                )}
              >
                <Navigation className="w-3 h-3" />
                {t('txt_6688f2')}</button>
            </div>
          </div>
        </header>

        {/* Masonry-like Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="break-inside-avoid"
            >
              <GlassCard className="p-0 overflow-hidden group border-white/5 hover:border-gx-cyan/30 transition-all duration-500">
                <div className="relative">
                  {post.type === "video" && post.videoId && STREAM_BASE ? (
                    <VideoPlayer videoId={post.videoId} coverUrl={post.cover} />
                  ) : (
                    <Image
                      src={post.cover}
                      alt={post.title}
                      width={1200}
                      height={800}
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  
                  {post.type === "video" && (!STREAM_BASE || !post.videoId) && (
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
                    {post.tags.map((tag: string) => (
                      <span key={tag} className="text-[9px] font-mono text-gx-cyan/60 uppercase tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <Image src={post.avatar} alt={post.author} width={20} height={20} className="rounded-full border border-white/20" />
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

      {/* 底部渐变遮罩 (防止滚动到底部时内容显得突兀) */}
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-20" />

      {/* UGC 发布弹窗 */}
      <UGCUploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </main>
  );
}
