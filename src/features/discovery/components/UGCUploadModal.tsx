"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, RefreshCw, ChevronLeft, Send } from "lucide-react";
import * as tus from "tus-js-client";
import { cn } from "@/utils/cn";
import { Button } from "@/components/shared/Button";
import Image from "next/image";

interface UGCUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (type: "video" | "image", url: string, videoId?: string) => void;
}

export const UGCUploadModal = ({ isOpen, onClose, onSuccess }: UGCUploadModalProps) => {
  const [step, setStep] = useState<"camera" | "review">("camera");
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [isRecording, setIsRecording] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable", err);
      // fallback to just letting user pick from gallery
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen && step === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, step]);

  // Handle Modal Close
  const handleClose = () => {
    stopCamera();
    setStep("camera");
    setFile(null);
    setPreviewUrl(null);
    setTitle("");
    setError("");
    setUploading(false);
    setProgress(0);
    onClose();
  };

  // Gallery Selection
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

  // Capture Photo
  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1080;
    canvas.height = videoRef.current.videoHeight || 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setStep("review");
    }, "image/jpeg", 0.9);
  };

  // Record Video
  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/mp4" });
      const f = new File([blob], "record.mp4", { type: "video/mp4" });
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setStep("review");
      setIsRecording(false);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleShutterClick = () => {
    if (mode === "photo") {
      takePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
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
      onSuccess: () => {
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
          {/* Step 1: Camera Pod */}
          {step === "camera" && (
            <div className="relative w-full h-full flex flex-col bg-black">
              {/* Camera Feed */}
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Overlay Gradients */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

              {/* Top Bar */}
              <div className="relative z-10 flex justify-between items-center p-6 pt-12">
                <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white/80 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex gap-4">
                  <button className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white/80 hover:text-white transition-colors">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 pb-12 pt-20 px-8 flex flex-col items-center gap-8 z-10">
                
                {/* Mode Switcher */}
                <div className="flex items-center gap-8 text-[12px] font-mono tracking-widest uppercase bg-black/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                  <button 
                    onClick={() => setMode("photo")}
                    className={cn("transition-colors", mode === "photo" ? "text-gx-cyan font-bold drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" : "text-white/50")}
                  >
                    拍照 / Photo
                  </button>
                  <button 
                    onClick={() => setMode("video")}
                    className={cn("transition-colors", mode === "video" ? "text-gx-cyan font-bold drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" : "text-white/50")}
                  >
                    录像 / Video
                  </button>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between w-full max-w-sm">
                  {/* Left Spacer */}
                  <div className="w-12 h-12" />

                  {/* Center: Shutter */}
                  <button 
                    onClick={handleShutterClick}
                    className="relative w-20 h-20 flex items-center justify-center rounded-full border-4 border-white/30 hover:border-white/60 transition-all group"
                  >
                    <div className={cn(
                      "w-16 h-16 bg-white rounded-full transition-all duration-300 group-hover:scale-95",
                      isRecording && "bg-red-500 scale-50 rounded-lg"
                    )} />
                    {/* Recording Ring Indicator */}
                    {isRecording && (
                      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle cx="36" cy="36" r="34" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="213" strokeDashoffset="0" className="animate-[spin_15s_linear_forwards]" />
                      </svg>
                    )}
                  </button>

                  {/* Right: Gallery Portal */}
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden hover:border-gx-cyan/50 transition-colors"
                    >
                      <ImageIcon className="w-5 h-5 text-white/80" />
                    </button>
                  </div>
                  
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="video/mp4,video/quicktime,video/x-m4v,image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                </div>
              </div>
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
                    placeholder="写句标题吸引人吧..."
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
                        发布 / Publish <Send className="w-4 h-4" />
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
