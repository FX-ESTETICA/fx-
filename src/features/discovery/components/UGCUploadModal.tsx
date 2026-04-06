"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, RefreshCw, ChevronLeft, Send } from "lucide-react";
import * as tus from "tus-js-client";
import { Button } from "@/components/shared/Button";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface UGCUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (type: "video" | "image", url: string, videoId?: string) => void;
}

export const UGCUploadModal = ({ isOpen, onClose, onSuccess }: UGCUploadModalProps) => {
  const t = useTranslations('UGCUploadModal');
  const { user } = useAuth();
  const [step, setStep] = useState<"camera" | "review">("camera");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Handle Modal Close
  const handleClose = () => {
    setStep("camera");
    setFile(null);
    setPreviewUrl(null);
    setTitle("");
    setError("");
    setUploading(false);
    setProgress(0);
    onClose();
  };

  // Generic File Selection Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate
    const isVideo = selectedFile.type.startsWith("video/");
    const isImage = selectedFile.type.startsWith("image/");
    if (!isVideo && !isImage) {
      setError("仅支持视频或图片格式");
      return;
    }
    if (isVideo && selectedFile.size > 100 * 1024 * 1024) {
      setError("视频不能超过100MB");
      return;
    }
    if (isImage && selectedFile.size > 20 * 1024 * 1024) {
      setError("图片不能超过20MB");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setStep("review");
    setError("");
  };

  // Original Upload Logic
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    setProgress(0);

    try {
      if (file.type.startsWith("video/")) {
        await uploadVideo(file);
      } else {
        await uploadImage(file);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传失败，请重试";
      setError(message);
      setUploading(false);
    }
  };

  const uploadImage = async (imageFile: File) => {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("path", "ugc/discovery");

    const res = await fetch("/api/upload/image", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // 真正入库逻辑：向 Supabase 写入动态记录
    if (user?.id) {
      await supabase.from("ugc_posts").insert({
        author_id: user.id,
        media_type: "image",
        media_url: data.url,
        title: title || "分享了一张照片",
      });
    }

    setUploading(false);
    onSuccess?.("image", data.url);
    handleClose();
  };

  const uploadVideo = async (videoFile: File) => {
    const tokenRes = await fetch("/api/upload/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || videoFile.name }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error);

    const upload = new tus.Upload(videoFile, {
      endpoint: tokenData.uploadUrl,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: tokenData.authorizationSignature,
        AuthorizationExpire: tokenData.authorizationExpire.toString(),
        VideoId: tokenData.videoId,
        LibraryId: tokenData.libraryId,
      },
      metadata: {
        filename: videoFile.name,
        filetype: videoFile.type,
      },
      onError: (err) => {
        console.error("TUS Upload Error:", err);
        setError("视频断点续传失败: " + err.message);
        setUploading(false);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(0);
        setProgress(Number(percentage));
      },
      onSuccess: async () => {
        // 真正入库逻辑：向 Supabase 写入动态记录
        if (user?.id) {
          await supabase.from("ugc_posts").insert({
            author_id: user.id,
            media_type: "video",
            media_url: "", // 视频暂无直接 url，使用 video_id 拼接
            video_id: tokenData.videoId,
            title: title || "分享了一段视频",
          });
        }
        setUploading(false);
        onSuccess?.("video", "", tokenData.videoId);
        handleClose();
      },
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "10%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "10%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col"
        >
          {/* Step 1: Selection Pod (Native Camera Access) */}
          {step === "camera" && (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black gap-12 p-8">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  {t('txt_fb8804')} / {t('txt_4b9210')}
                </h2>
                <p className="text-sm text-white/40 font-mono">HIGH_RES_CAPTURE_MODE</p>
              </div>

              <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
                {/* 隐藏的原生输入框 */}
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={handleFileChange}
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={galleryInputRef}
                  onChange={handleFileChange}
                  accept="video/mp4,video/quicktime,video/x-m4v,image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                <button 
                  onClick={() => photoInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-4 aspect-square rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gx-cyan/50 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8 text-white/80 group-hover:text-gx-cyan" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-white/60 group-hover:text-white uppercase">{t('txt_fb8804')}</span>
                </button>

                <button 
                  onClick={() => videoInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-4 aspect-square rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-red-500/50 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-6 h-6 rounded-full border-2 border-white/80 group-hover:border-red-500 group-hover:bg-red-500/20" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-white/60 group-hover:text-white uppercase">{t('txt_4b9210')}</span>
                </button>
              </div>

              <button 
                onClick={() => galleryInputRef.current?.click()}
                className="mt-8 px-8 py-3 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-xs font-bold tracking-widest uppercase transition-all"
              >
                从相册选择 / Gallery
              </button>

              {/* Close Button */}
              <button 
                onClick={handleClose} 
                className="absolute top-12 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Review & Publish Pod */}
          {step === "review" && file && previewUrl && (
            <div className="relative w-full h-full flex flex-col bg-black">
              {/* Preview Media */}
              <div className="absolute inset-0 flex items-center justify-center">
                {file.type.startsWith("video/") ? (
                  <video src={previewUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    sizes="100vw"
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                )}
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50 pointer-events-none" />

              {/* Top Bar */}
              <div className="relative z-10 flex justify-between items-center p-6 pt-12">
                <button 
                  onClick={() => { setStep("camera"); setFile(null); setPreviewUrl(null); }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white/80 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </div>

              {/* Bottom Input Area */}
              <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 flex flex-col gap-6 z-10">
                <div className="relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('txt_e4205f')}
                    disabled={uploading}
                    className="w-full bg-transparent border-b border-white/20 pb-4 text-xl font-bold text-white placeholder:text-white/40 focus:outline-none focus:border-gx-cyan transition-colors"
                  />
                </div>

                {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                    <span className="px-2 py-1 bg-white/10 rounded-md backdrop-blur-md uppercase">
                      {file.type.startsWith("video/") ? "VIDEO" : "PHOTO"}
                    </span>
                    <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>

                  <Button
                    variant="cyan"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-8 py-4 rounded-full font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {progress}%
                      </>
                    ) : (
                      <>
                        {t('txt_920460')}<Send className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
