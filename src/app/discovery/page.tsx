"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Heart, 
  MessageCircle, 
  Play, 
  Navigation,
  Volume2,
  VolumeX,
  Plus
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
    <div className="absolute inset-0 bg-black cursor-pointer group/video" onClick={togglePlay}>
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
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300 z-10 pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
            <Play className="w-8 h-8 ml-1 fill-white opacity-80" />
          </div>
        </div>
      )}

      {/* Mute/Unmute Toggle - moved higher to avoid bottom UI overlap */}
      <button 
        onClick={toggleMute}
        className="absolute top-1/2 right-4 -translate-y-1/2 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-colors opacity-0 group-hover/video:opacity-100 z-20"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
    <main className="fixed inset-0 z-40 bg-black md:bg-transparent text-white overflow-hidden">
      
      {/* 顶部悬浮导航 (Overlay) */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between p-4 pt-safe md:pt-8 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none">
        
        {/* 左上角/居中 Tab 切换 */}
        <div className="flex items-center gap-6 pointer-events-auto ml-2 md:ml-8 mt-2">
          <button 
            onClick={() => setFilter("near")}
            className={cn("text-[17px] font-bold transition-all drop-shadow-md", filter === "near" ? "text-white" : "text-white/50")}
          >
            {t('txt_6688f2')}
          </button>
          <div className="w-[1px] h-3 bg-white/30" />
          <button 
            onClick={() => setFilter("hot")}
            className={cn("text-[17px] font-bold transition-all drop-shadow-md", filter === "hot" ? "text-white" : "text-white/50")}
          >
            {t('txt_4d2d97')}
          </button>
        </div>

        {/* 右上角发布按钮 */}
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="pointer-events-auto w-10 h-10 rounded-full bg-gx-cyan text-black flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,240,255,0.4)] mr-2 md:mr-8 mt-1"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* 沉浸式滑动容器 */}
      <div className="w-full h-full snap-y snap-mandatory overflow-y-scroll overflow-x-hidden no-scrollbar flex flex-col items-center">
        {posts.map((post) => (
          <div 
            key={post.id} 
            className="w-full h-full snap-start snap-always relative shrink-0 flex justify-center items-center"
          >
            {/* PC端全息居中剧场模式 / 手机端100%全屏 */}
            <div className="relative w-full h-full md:max-w-[420px] md:h-[calc(100vh-80px)] md:my-10 md:rounded-[2.5rem] md:overflow-hidden md:border md:border-white/10 md:shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black group/item">
              
              {/* 媒体内容 */}
              {post.type === "video" && post.videoId && STREAM_BASE ? (
                <VideoPlayer videoId={post.videoId} coverUrl={post.cover} />
              ) : (
                <Image 
                  src={post.cover} 
                  alt={post.title} 
                  fill 
                  className="object-cover" 
                  priority
                />
              )}

              {/* 底部暗场渐变 (确保文字清晰) */}
              <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-10" />

              {/* 左下角：作者信息与描述 */}
              <div className="absolute bottom-6 md:bottom-8 left-4 right-16 z-20 pointer-events-auto">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-bold text-[17px] drop-shadow-md">@{post.author}</h3>
                  {post.merchantId && (
                    <button className="flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-gx-cyan hover:bg-white/30 transition-colors shadow-lg">
                      <Navigation className="w-3 h-3" />
                      去这家店
                    </button>
                  )}
                </div>
                <p className="text-[14px] leading-relaxed text-white/90 drop-shadow-md line-clamp-3 mb-3">
                  {post.title}
                </p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag: string) => (
                      <span key={tag} className="text-[13px] font-bold text-white/60 drop-shadow-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 右下角：悬浮交互控件 (头像、点赞、评论) */}
              <div className="absolute bottom-6 md:bottom-8 right-3 z-20 flex flex-col items-center gap-6 pointer-events-auto">
                
                {/* 悬浮头像 */}
                <div className="relative w-12 h-12 rounded-full border-2 border-white/80 overflow-visible mb-2 cursor-pointer hover:scale-105 transition-transform shadow-lg">
                  <Image src={post.avatar} alt={post.author} fill className="object-cover rounded-full" />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-gx-cyan rounded-full flex items-center justify-center text-black font-black text-sm border-2 border-black">
                    <Plus className="w-3 h-3" />
                  </div>
                </div>

                {/* 悬浮点赞 */}
                <button className="flex flex-col items-center gap-1 group/btn transition-transform active:scale-90">
                  <div className="p-3 bg-black/20 backdrop-blur-md rounded-full group-hover/btn:bg-white/10 transition-colors border border-white/5 shadow-lg">
                    <Heart className="w-7 h-7 text-white drop-shadow-md" />
                  </div>
                  <span className="text-[12px] font-bold drop-shadow-md">{post.likes}</span>
                </button>

                {/* 悬浮评论 */}
                <button className="flex flex-col items-center gap-1 group/btn transition-transform active:scale-90">
                  <div className="p-3 bg-black/20 backdrop-blur-md rounded-full group-hover/btn:bg-white/10 transition-colors border border-white/5 shadow-lg">
                    <MessageCircle className="w-7 h-7 text-white drop-shadow-md" />
                  </div>
                  <span className="text-[12px] font-bold drop-shadow-md">{post.comments}</span>
                </button>
                
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* UGC 发布弹窗 */}
      <UGCUploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </main>
  );
}
