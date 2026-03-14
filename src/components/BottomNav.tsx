'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, User, LayoutGrid, Plus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { FlashUpload } from './FlashUpload'

export default function BottomNav() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<'user' | 'merchant'>('user')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [showPlusButton, setShowPlusButton] = useState(false)
  const touchStartX = useRef<number | null>(null)
  
  const SWIPE_THRESHOLD = 80 // 滑动超过此距离则显示/切换状态

  // 监听点击外部关闭 + 号
  useEffect(() => {
    if (!showPlusButton) return
    const handleClick = () => setShowPlusButton(false)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [showPlusButton])

  // In a real app, this would come from a global state or auth hook
  useEffect(() => {
    // Check local storage or cookie for role (for demo)
    const savedRole = localStorage.getItem('demo_user_role') as 'user' | 'merchant'
    if (savedRole) setUserRole(savedRole)
    
    // Listen for custom event to update role in real-time for the demo
    const handleRoleChange = () => {
      const newRole = localStorage.getItem('demo_user_role') as 'user' | 'merchant'
      if (newRole) setUserRole(newRole)
    }
    window.addEventListener('storage', handleRoleChange)
    return () => window.removeEventListener('storage', handleRoleChange)
  }, [])

  // Don't show bottom nav on admin pages or if we're not in the portal/shop area
  const isAdminPage = pathname?.startsWith('/admin')
  const isAuthPage = pathname?.startsWith('/auth')
  const isOnboardingPage = pathname?.startsWith('/merchant/onboarding')
  
  if (isAdminPage || isAuthPage || isOnboardingPage) return null

  const navItems = [
    {
      label: '首页',
      href: '/',
      icon: Home,
    },
    {
      label: '发现',
      href: '/explore',
      icon: Compass,
    },
    {
      label: '我的',
      href: '/me',
      icon: User,
    },
  ]

  // If merchant, optionally add/replace an item
  const finalNavItems = [...navItems]
  if (userRole === 'merchant') {
    // Insert "Dashboard" for merchants
    finalNavItems.splice(2, 0, {
      label: '工作台',
      href: '/admin',
      icon: LayoutGrid,
    })
  }

  // Swipe handlers for the bottom bar
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
    setIsSwiping(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const currentX = e.targetTouches[0].clientX
    const diff = currentX - touchStartX.current
    
    // 限制只能向右滑动，且有最大偏移量
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 120))
    }
  }

  const onTouchEnd = () => {
    if (swipeOffset > SWIPE_THRESHOLD) {
      // 触发上传面板或切换状态
      setShowPlusButton(!showPlusButton)
      
      // 如果滑动非常大，直接打开上传
      if (swipeOffset > 110) {
        setShowUploadModal(true)
      }
    }
    setSwipeOffset(0)
    setIsSwiping(false)
    touchStartX.current = null
  }

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-[150] bg-transparent pointer-events-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          className="max-w-md mx-auto flex items-center justify-around py-3 px-2 relative pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ 
            transform: `translateX(${swipeOffset}px)`,
          }}
        >
          {/* 背景模糊和发光效果 */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl rounded-t-[32px] border-t border-white/10 -z-10" />
          
          {/* 滑动提示指示器 / 动态 + 号 */}
          <AnimatePresence>
            {(swipeOffset > 20 || showPlusButton) && (
              <motion.div 
                initial={{ opacity: 0, x: -50, scale: 0.5 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  filter: swipeOffset > SWIPE_THRESHOLD ? 'drop-shadow(0 0 15px rgba(34,211,238,0.8))' : 'none'
                }}
                exit={{ opacity: 0, x: -50, scale: 0.5 }}
                className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 z-50"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowUploadModal(true)
                  }}
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 active:scale-90 shadow-2xl overflow-hidden group",
                    swipeOffset > SWIPE_THRESHOLD 
                      ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 border-2 border-white/40" 
                      : "bg-white/10 backdrop-blur-md border border-white/20"
                  )}
                >
                  <Plus 
                    size={28} 
                    className={cn(
                      "text-white transition-transform duration-500",
                      swipeOffset > SWIPE_THRESHOLD ? "rotate-90 scale-110" : "rotate-0",
                      "group-hover:rotate-180"
                    )} 
                  />
                  {/* 内部发光动画 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>
                
                {swipeOffset > 20 && swipeOffset <= SWIPE_THRESHOLD && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 animate-pulse whitespace-nowrap">
                    右滑开启
                  </span>
                )}
                {swipeOffset > SWIPE_THRESHOLD && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white animate-bounce whitespace-nowrap">
                    释放发布
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {finalNavItems.map((item, index) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <React.Fragment key={item.href}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    // 如果正在滑动，阻止跳转
                    if (swipeOffset > 10) e.preventDefault()
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 group relative px-4 transition-all duration-500",
                    (showPlusButton || swipeOffset > 40) ? "opacity-40 scale-90 translate-x-12" : "opacity-100"
                  )}
                >
                  {isActive && (
                    <>
                      {/* 选中态指示光 */}
                      <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,1)] z-20" />
                      <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 w-16 h-8 bg-cyan-400/20 blur-2xl rounded-full pointer-events-none" />
                    </>
                  )}
                  
                  <Icon 
                    size={20} 
                    className={cn(
                      "transition-all duration-300 relative z-10",
                      isActive 
                        ? "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" 
                        : "text-white/60 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-white"
                    )} 
                  />
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest transition-all duration-300 relative z-10",
                    isActive
                      ? "text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      : "text-white/60 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-white"
                  )}>
                    {item.label}
                  </span>
                </Link>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* 上传模态框 */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 rounded-[32px] border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-widest">发布媒体资产</h3>
                  <button 
                    onClick={() => setShowUploadModal(false)}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <FlashUpload 
                  onSuccess={() => {
                    setShowUploadModal(false)
                    // 可以在这里触发全局刷新
                    window.dispatchEvent(new CustomEvent('post-uploaded'))
                  }}
                  onError={(err) => console.error(err)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
