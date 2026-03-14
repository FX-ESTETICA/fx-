'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getBunnyImageUrl, BunnyImageOptions } from '@/lib/bunny'

/**
 * 核心媒体渲染组件 (支持图片优化与视频播放)
 * 
 * 功能：
 * 1. 自动处理 Bunny Optimizer 图片缩放与压缩。
 * 2. 懒加载 (Lazy Loading) 提高首页响应速度。
 * 3. 渐进式加载 (渐入动画) 提升体感速度。
 * 4. 支持模糊占位图。
 * 5. 未来支持 Bunny Stream 视频流。
 */

interface MediaRendererProps {
  src: string
  alt?: string
  className?: string
  priority?: boolean // 是否优先加载 (首页 Banner 使用)
  options?: BunnyImageOptions
  type?: 'image' | 'video'
  videoId?: string // 如果是视频，提供 Bunny Stream 的视频 ID
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto'
  isActive?: boolean // 用于控制视频是否激活播放
}

export function MediaRenderer({
  src,
  alt = '',
  className,
  priority = false,
  options = {},
  type = 'image',
  videoId,
  aspectRatio = 'auto',
  isActive = false
}: MediaRendererProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  // 处理比例类名
  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: ''
  }[aspectRatio]

  // 生成优化后的 URL (默认 WebP 且质量 80)
  const optimizedSrc = type === 'image' 
    ? getBunnyImageUrl(src, { quality: 80, format: 'webp', ...options })
    : '';

  if (type === 'video' && videoId) {
    // 动态构建视频 URL，根据 isActive 控制 autoplay
    const videoUrl = `https://iframe.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID}/${videoId}?autoplay=${isActive}&loop=true&muted=true&preload=true&responsive=true`

    return (
      <div className={cn("relative overflow-hidden bg-zinc-900", aspectRatioClass, className)}>
        {/* 视频加载时的封面图 */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-zinc-800 animate-pulse"
            />
          )}
        </AnimatePresence>
        
        <iframe
          src={videoUrl}
          loading="lazy"
          className="w-full h-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen={true}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden bg-zinc-100 dark:bg-zinc-800", aspectRatioClass, className)}>
      {/* 加载占位符 (模糊效果) */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700"
          >
            <div className="w-8 h-8 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 实际图片 */}
      <motion.img
        src={optimizedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ 
          opacity: isLoading ? 0 : 1, 
          scale: isLoading ? 1.05 : 1 
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setError(true)
        }}
        className={cn(
          "w-full h-full object-cover transition-all duration-300",
          isLoading ? "blur-sm" : "blur-0"
        )}
      />

      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 text-zinc-400 text-xs">
          加载失败
        </div>
      )}
    </div>
  )
}
