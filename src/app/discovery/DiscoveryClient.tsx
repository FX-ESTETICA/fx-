"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
 Heart, 
 MessageCircle, 
 Play, 
 Navigation,
 Volume2,
 VolumeX,
 Plus,
 ChevronLeft,
 ArrowRight,
 Loader2
} from "lucide-react";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { UGCUploadModal } from "@/features/discovery/components/UGCUploadModal";
import { useTranslations } from "next-intl";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useAuth } from "@/features/auth/hooks/useAuth";
import useSWR from "swr";

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
 <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 pointer-events-none">
 <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center border border-white/20 text-white">
 <Play className="w-8 h-8 ml-1 fill-white " />
 </div>
 </div>
 )}

 {/* Mute/Unmute Toggle - moved higher to avoid bottom UI overlap */}
 <button 
 onClick={toggleMute}
 className="absolute top-1/2 right-4 -translate-y-1/2 p-3 rounded-full bg-black/40 border border-white/10 text-white hover:bg-black/60 opacity-0 group-hover/video:opacity-100 z-20"
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

 // 【Local-First 引擎】：从本地硬盘光速读取缓存，实现物理级冷启动秒开
 const getCachedPosts = () => {
 if (typeof window === 'undefined') return undefined;
 try {
 const cached = localStorage.getItem('gx_discovery_posts_hot');
 return cached ? JSON.parse(cached) : undefined;
 } catch (e) {
 return undefined;
 }
 };

 // 引入 useAuth 确保客户端状态被正确初始化
 useAuth();

 const registerBack = useHardwareBack(state => state.register);
 const unregisterBack = useHardwareBack(state => state.unregister);

 useEffect(() => {
 if (isUploadOpen) {
 registerBack('discovery-upload', () => {
 setIsUploadOpen(false);
 return true;
 }, 30);
 } else {
 unregisterBack('discovery-upload');
 }
 return () => unregisterBack('discovery-upload');
 }, [isUploadOpen, registerBack, unregisterBack]);

 // 引入 SWR 实现缓存秒开，并挂载 Local-First 硬盘备份引擎
 const { data: swrPosts, isLoading, mutate } = useSWR(
 'discovery_posts_hot', // 暂时写死热点
 async () => {
 const { data, error } = await supabase
 .from('ugc_posts')
 .select(`
 *,
 author:profiles(name, avatar_url)
 `)
 .order('created_at', { ascending: false })
 .limit(20);

 if (error) {
 // 断网防御：如果报错是因为网络问题，且本地有缓存，直接抛出错误让 SWR 保留 fallbackData
 if (error.message?.includes('Failed to fetch') || error.message?.includes('AbortError')) {
 throw error;
 }
 throw error;
 }

 // 映射为前端所需的数据结构
 return (data || []).map((p: any) => ({
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
 })) as DiscoveryPost[];
 },
 {
 revalidateOnFocus: true,
 dedupingInterval: 10000,
 keepPreviousData: true,
 fallbackData: getCachedPosts(), // 物理秒开：0毫秒同步灌入上次硬盘缓存
 onSuccess: (data) => {
 // 成功拉取到最新数据后，静默覆写到本地硬盘，供下次秒开
 if (typeof window !== 'undefined' && data && data.length > 0) {
 localStorage.setItem('gx_discovery_posts_hot', JSON.stringify(data));
 }
 }
 }
 );

 useEffect(() => {
 if (swrPosts) {
 setPosts(swrPosts);
 }
 }, [swrPosts]);

 const handleUploadSuccess = () => {
 // 成功后触发 SWR 重新验证
 mutate();
 };

 return (
 <main className="relative w-full h-full z-40 bg-black md:bg-transparent text-white overflow-hidden">
 
 {/* 顶部悬浮导航 (Overlay) */}
 <div className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between p-4 pt-safe md:pt-8 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none">
 
 {/* 左上角: 逃生舱按钮 (返回大厅) */}
 <div className="pointer-events-auto mt-2">
 <button 
 onClick={() => window.dispatchEvent(new Event('gx-return-home'))}
 className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white hover:text-white hover:bg-white/10 active:scale-95"
 >
 <ChevronLeft className="w-6 h-6" />
 </button>
 </div>

 {/* 居中 Tab 切换 */}
 <div className="absolute left-1/2 -translate-x-1/2 top-4 pt-safe md:pt-8 flex items-center gap-6 pointer-events-auto mt-2">
 <button 
 onClick={() => setFilter("near")}
 className={cn("text-[17px] text-white", filter === "near" ? "scale-110" : "")}
 >
 {t('txt_6688f2')}
 </button>
 <div className="w-[1px] h-3 bg-white/30" />
 <button 
 onClick={() => setFilter("hot")}
 className={cn("text-[17px] text-white", filter === "hot" ? "scale-110" : "")}
 >
 {t('txt_4d2d97')}
 </button>
 </div>

 {/* 右上角发布按钮 */}
 <button 
 onClick={() => setIsUploadOpen(true)}
 className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center mr-2 md:mr-8 mt-1 bg-white text-black"
 >
 <Plus className="w-6 h-6" />
 </button>
 </div>

 {/* 沉浸式滑动容器 */}
 <div className="w-full h-full snap-y snap-mandatory overflow-y-scroll overflow-x-hidden no-scrollbar flex flex-col items-center">
 {isLoading && posts.length === 0 ? (
 <div className="flex justify-center items-center h-full w-full">
 <Loader2 className="w-8 h-8 animate-spin text-white" />
 </div>
 ) : (
 posts.map((post) => (
 <div 
 key={post.id} 
 className="w-full h-full snap-start snap-always relative shrink-0 flex justify-center items-center"
 >
 {/* 手机端100%全屏 / 平板与PC端双栏剧场模式 (Fluid Morphing) */}
 <div className="relative w-full h-full md:max-w-4xl lg:max-w-5xl md:h-[calc(100vh-80px)] md:my-10 md:rounded-[2.5rem] md:overflow-hidden md:border md:border-white/10 bg-black group/item flex flex-col md:flex-row">
 
 {/* 左侧：媒体内容区 (手机端100%，宽屏端60%) */}
 <div className="relative w-full h-full md:w-[60%] shrink-0">
 {post.type === "video" && post.videoId && STREAM_BASE ? (
 <VideoPlayer videoId={post.videoId} coverUrl={post.cover} />
 ) : (
 <Image 
 src={post.cover} 
 alt={post.title} 
 fill 
 sizes="(max-width: 768px) 100vw, 60vw"
 className="object-cover" 
 priority
 />
 )}

 {/* 底部暗场渐变 (仅手机端需要，宽屏端文字移到右侧了) - 极简黑色遮罩 */}
 <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-10 md:hidden" />

 {/* 左下角：作者信息与描述 (仅手机端显示) */}
 <div className="absolute bottom-6 left-4 right-16 z-20 pointer-events-auto md:hidden">
 <div className="flex items-center gap-3 mb-3">
 <h3 className=" text-[17px] text-white">@{post.author}</h3>
 {post.merchantId && (
 <button className="flex items-center gap-1 px-2.5 py-1 bg-black/40 border border-white/10 rounded-full text-[11px] text-white hover:bg-black/60 ">
 <Navigation className="w-3 h-3 text-white" />
 {t('txt_5cd3c9')}</button>
 )}
 </div>
 <p className="text-[14px] leading-relaxed text-white line-clamp-3 mb-3">
 {post.title}
 </p>
 {post.tags && post.tags.length > 0 && (
 <div className="flex flex-wrap gap-2">
 {post.tags.map((tag: string) => (
 <span key={tag} className="text-[13px] text-white">
 {tag}
 </span>
 ))}
 </div>
 )}
 </div>

 {/* 右下角：悬浮交互控件 (头像、点赞、评论) - 仅手机端显示 */}
 <div className="absolute bottom-6 right-3 z-20 flex flex-col items-center gap-6 pointer-events-auto md:hidden">
 {/* 悬浮头像 */}
 <div className="relative w-12 h-12 rounded-full border-2 border-white/80 overflow-visible mb-2 cursor-pointer ">
 <Image src={post.avatar} alt={post.author} fill sizes="48px" className="object-cover rounded-full" />
 <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center font-black text-sm border-2 bg-black text-white border-white/20">
 <Plus className="w-3 h-3" />
 </div>
 </div>

 {/* 悬浮点赞 */}
 <button className="flex flex-col items-center gap-1 group/btn active:scale-90">
 <div className="p-3 bg-black/40 border border-white/10 rounded-full group-hover/btn:bg-black/60 ">
 <Heart className="w-7 h-7 text-white" />
 </div>
 <span className="text-[12px] text-white">{post.likes}</span>
 </button>

 {/* 悬浮评论 */}
 <button className="flex flex-col items-center gap-1 group/btn active:scale-90">
 <div className="p-3 bg-black/40 border border-white/10 rounded-full group-hover/btn:bg-black/60 ">
 <MessageCircle className="w-7 h-7 text-white" />
 </div>
 <span className="text-[12px] text-white">{post.comments}</span>
 </button>
 </div>
 </div>

 {/* 右侧：信息舱与互动控制台 (宽屏端独占显示) */}
 <div className="hidden md:flex flex-col flex-1 h-full bg-[#0a0a0a] border-l border-white/5 p-6 relative">
 {/* 作者信息头 */}
 <div className="flex items-center justify-between pb-4 border-b border-white/5">
 <div className="flex items-center gap-3">
 <div className="relative w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden">
 <Image src={post.avatar} alt={post.author} fill sizes="48px" className="object-cover" />
 </div>
 <div>
 <h3 className=" text-lg text-white">@{post.author}</h3>
 <p className="text-xs text-white ">GX verified</p>
 </div>
 </div>
 <button className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm text-white ">
 {t('txt_4c0a3a')}</button>
 </div>

 {/* 描述流 */}
 <div className="py-4 space-y-3 flex-1 overflow-y-auto no-scrollbar">
 <p className="text-[15px] leading-relaxed text-white">
 {post.title}
 </p>
 {post.tags && post.tags.length > 0 && (
 <div className="flex flex-wrap gap-2 pt-2">
 {post.tags.map((tag: string) => (
 <span key={tag} className="text-[12px] px-2 py-1 rounded text-white bg-white/10">
 {tag}
 </span>
 ))}
 </div>
 )}
 {post.merchantId && (
 <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/10 ">
 <div className="flex items-center gap-2 text-white">
 <Navigation className="w-4 h-4 text-white" />
 <span className="text-sm ">{t('txt_342d42')}</span>
 </div>
 <ArrowRight className="w-4 h-4 text-white group-hover:text-white " />
 </div>
 )}
 </div>

 {/* 互动底座 */}
 <div className="pt-4 border-t border-white/5 flex items-center justify-around shrink-0">
 <button className="flex flex-col items-center gap-1 group active:scale-95">
 <div className="p-3 bg-white/5 rounded-full group-hover:bg-white/10 ">
 <Heart className="w-6 h-6 text-white" />
 </div>
 <span className="text-[11px] text-white">{post.likes}</span>
 </button>
 <button className="flex flex-col items-center gap-1 group active:scale-95">
 <div className="p-3 bg-white/5 rounded-full group-hover:bg-white/10 ">
 <MessageCircle className="w-6 h-6 text-white" />
 </div>
 <span className="text-[11px] text-white">{post.comments}</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 )))}
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
