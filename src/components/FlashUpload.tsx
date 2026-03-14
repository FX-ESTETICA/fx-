'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { canUploadMedia, MediaType } from '@/utils/media-permissions'
import { compressImage, generatePlaceholder } from '@/utils/media-processor'
import { uploadImageToBunny, uploadVideoToBunny, savePostToDb } from '@/app/actions/bunny-upload'

/**
 * GX⁺ 闪电上传引擎 (Flash Upload Engine)
 * 
 * 功能：
 * 1. 会员等级校验
 * 2. 客户端预压缩 (图片)
 * 3. 瞬时模糊占位符预览
 * 4. 视觉魔术：上传中的伪实时预览
 */

interface FlashUploadProps {
  onSuccess?: (data: { type: MediaType; url: string; videoId?: string }) => void
  onError?: (error: string) => void
  className?: string
}

export function FlashUpload({ onSuccess, onError, className }: FlashUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const type: MediaType = file.type.startsWith('video/') ? 'video' : 'image'
    setMediaType(type)

    // 1. 权限校验 (GX⁺ 会员逻辑)
    const { can, reason } = await canUploadMedia(type)
    if (!can) {
      setError(reason || '暂无上传权限')
      onError?.(reason || '暂无上传权限')
      return
    }

    setIsUploading(true)
    setProgress(10) // 视觉进度启动

    try {
      // 2. 视觉魔术：瞬时生成模糊占位符
      if (type === 'image') {
        const placeholder = await generatePlaceholder(file)
        setPreviewUrl(placeholder)
        setProgress(30) // 模拟处理中

        // 3. 客户端预压缩
        const compressedBlob = await compressImage(file)
        setProgress(50) // 压缩完成

        // 4. 执行真实上传 (Bunny Storage)
        const formData = new FormData()
        formData.append('file', new File([compressedBlob], file.name, { type: 'image/jpeg' }))
        
        const result = await uploadImageToBunny(formData)
        
        // 5. 存入数据库
        await savePostToDb({
          type: 'image', 
          media_url: result.url,
          title: '从 GX⁺ 闪电引擎上传的精彩瞬间'
        })
        
        // 6. 成功反馈
        setProgress(100)
        setTimeout(() => {
          setIsUploading(false)
          setPreviewUrl(null) // 清除模糊预览，让列表显示清晰图
          onSuccess?.({ 
            type: 'image', 
            url: result.url 
          })
        }, 1000)
      } else {
        // 视频逻辑：暂不进行客户端压缩，直接上传 (Bunny Stream)
        const videoPreview = URL.createObjectURL(file)
        setPreviewUrl(videoPreview)
        setProgress(30)
        
        const formData = new FormData()
        formData.append('file', file)
        
        const result = await uploadVideoToBunny(formData)
        
        // 5. 存入数据库
        await savePostToDb({
          type: 'video', 
          media_url: '',
          video_id: result.videoId,
          title: '优质会员专享：精彩 VLOG'
        })
        
        // 6. 成功反馈
        setProgress(100)
        setTimeout(() => {
          setIsUploading(false)
          onSuccess?.({ 
            type: 'video', 
            url: '', 
            videoId: result.videoId 
          })
        }, 500)
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || '上传失败，请重试')
      setIsUploading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-md mx-auto p-4 space-y-4", className)}>
      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "relative group cursor-pointer aspect-video rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden",
          isUploading ? "border-blue-500/50 bg-blue-500/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900",
          error ? "border-red-500/50 bg-red-500/5" : ""
        )}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,video/*"
        />

        <AnimatePresence mode="wait">
          {!previewUrl && !isUploading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-3 p-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                <Upload size={28} />
              </div>
              <div>
                <p className="text-zinc-100 font-black text-sm tracking-wide">上传媒体资产</p>
                <p className="text-zinc-500 text-[10px] mt-1 uppercase tracking-widest font-bold">
                  支持高清图片 & 15秒优质视频
                </p>
              </div>
            </motion.div>
          )}

          {previewUrl && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0"
            >
              {mediaType === 'image' ? (
                <img 
                  src={previewUrl} 
                  className={cn(
                    "w-full h-full object-cover transition-all duration-500",
                    isUploading ? "blur-md scale-110 opacity-50" : "blur-0 scale-100"
                  )}
                  alt="preview" 
                />
              ) : (
                <video 
                  src={previewUrl} 
                  className={cn(
                    "w-full h-full object-cover",
                    isUploading ? "opacity-30 blur-sm" : ""
                  )} 
                />
              )}

              {/* 上传进度遮罩 */}
              {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <Loader2 className="w-full h-full text-blue-500 animate-spin" />
                    <span className="absolute text-[10px] font-black text-white">{progress}%</span>
                  </div>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-white text-[10px] font-black mt-3 uppercase tracking-[0.2em] flex items-center gap-2"
                  >
                    <Sparkles size={12} className="text-blue-400" />
                    闪电引擎处理中
                  </motion.p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 错误覆盖层 */}
        {error && !isUploading && (
          <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <AlertCircle size={32} className="text-red-500 mb-3" />
            <p className="text-white text-xs font-black leading-relaxed">{error}</p>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setError(null)
                setPreviewUrl(null)
              }}
              className="mt-4 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/10"
            >
              重新选择
            </button>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-zinc-500">
          <ImageIcon size={14} />
          <span className="text-[10px] font-bold">图片已开启智能预压缩</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <Video size={14} />
          <span className="text-[10px] font-bold">视频由 Bunny Stream 加速</span>
        </div>
      </div>
    </div>
  )
}
