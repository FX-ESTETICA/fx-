'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, Cpu, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'ai'
  content: string
}

interface AISmartBallProps {
  withChat?: boolean
  className?: string
  initialMessages?: Message[]
  onSendMessage?: (message: string) => Promise<string>
  disabled?: boolean
}

export default function AISmartBall({ 
  withChat = false, 
  className, 
  initialMessages = [
    { role: 'ai', content: "系统就绪。我是您的 Rapallo AI 助手，请问有什么可以帮您？" }
  ],
  onSendMessage,
  disabled = false
}: AISmartBallProps) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isAILoading, setIsAILoading] = useState(false)
  const [isHappy, setIsHappy] = useState(true)
  const [isSurprised, setIsSurprised] = useState(false)
  const [isAngry, setIsAngry] = useState(false)
  const isAngryRef = useRef(false)
  
  // Sync ref with state
  useEffect(() => {
    isAngryRef.current = isAngry
  }, [isAngry])

  const [isMouseOver, setIsMouseOver] = useState(false)
  const [chatHistory, setChatHistory] = useState<Message[]>(initialMessages)
  
  // 机器人状态
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isIdle, setIsIdle] = useState(false)
  const [idleMessage, setIdleMessage] = useState<string | null>(null)
  const robotRef = useRef<HTMLDivElement>(null)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 处理鼠标跟随逻辑
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!robotRef.current) return
      
      const rect = robotRef.current.getBoundingClientRect()
      const robotCenterX = rect.left + rect.width / 2
      const robotCenterY = rect.top + rect.height / 2
      
      // 计算相对位置 (-1 到 1)
      const dx = (e.clientX - robotCenterX) / (window.innerWidth / 2)
      const dy = (e.clientY - robotCenterY) / (window.innerHeight / 2)
      
      setMousePos({ x: dx, y: dy })
      
      // 重置空闲计时器
      if (!isAngryRef.current) {
        setIsIdle(false)
        setIdleMessage(null)
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true)
        const messages = ["主人怎么还不理我呀...", "正在扫描工作信号...", "好无聊啊...", "Rapallo 的天气真不错。"]
        setIdleMessage(messages[Math.floor(Math.random() * messages.length)])
      }, 30000) // 30秒无操作进入空闲模式
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    // 监听预约删除事件
    const handleAppointmentDeleted = () => {
      setIsAngry(true)
      setIsIdle(false)
      setIdleMessage("这个客人真讨厌！主人不要生气，我帮你把他吃掉啦！哼！")
      
      // 3秒后恢复正常
      setTimeout(() => {
        setIsAngry(false)
        setIdleMessage("搞定！心情好点了吗？")
        setTimeout(() => setIdleMessage(null), 3000)
      }, 4000)
    }

    window.addEventListener('appointment_deleted', handleAppointmentDeleted)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('appointment_deleted', handleAppointmentDeleted)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isAILoading || !onSendMessage) return
    
    const userMsg = chatMessage
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
    setChatMessage('')
    setIsAILoading(true)
    
    try {
      const response = await onSendMessage(userMsg)
      setChatHistory(prev => [...prev, { role: 'ai', content: response }])
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "系统连接波动，请重试指令。" }])
    } finally {
      setIsAILoading(false)
    }
  }

  const toggleChat = () => {
    if (disabled || isAngry) return
    // 点击时露出惊讶表情，不再打开窗口
    setIsSurprised(true)
    setTimeout(() => setIsSurprised(false), 800)
    
    // 随机说一句话
    if (!idleMessage) {
      const messages = ["主人有什么吩咐？", "我在听呢！", "Rapallo 系统运行正常。", "今天也要加油哦！"]
      setIdleMessage(messages[Math.floor(Math.random() * messages.length)])
      setTimeout(() => setIdleMessage(null), 3000)
    }
  }

  // 动态核心发光色
  const getGlowColor = () => {
    if (isAngry) return "red" // 愤怒/护主: 亮红色
    if (isAILoading) return "amber" // 思考中/提供帮助: 明亮黄/琥珀色
    if (isSurprised || isIdle) return "pink" // 惊讶/撒娇/求关注: 柔和粉红色
    if (isMouseOver || isAIChatOpen) return "cyan" // 活跃/鼠标移入: 温暖青色
    return "blue" // 待机/冷静: 淡淡蓝色
  }

  const glowColor = getGlowColor()

  const glowClasses = {
    red: {
      eye: "bg-red-400 shadow-[0_0_15px_rgba(248,113,113,0.8),0_0_30px_rgba(248,113,113,0.4)]",
      gradient: "from-red-600 via-red-500 to-red-300",
      mouth: "bg-red-500/60",
      shadow: "bg-red-500/10"
    },
    amber: {
      eye: "bg-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.8),0_0_30px_rgba(251,191,36,0.4)]",
      gradient: "from-amber-500 via-amber-400 to-amber-200",
      mouth: "bg-amber-400/40",
      shadow: "bg-amber-400/10"
    },
    pink: {
      eye: "bg-pink-300 shadow-[0_0_15px_rgba(244,114,182,0.8),0_0_30px_rgba(244,114,182,0.4)]",
      gradient: "from-pink-500 via-pink-400 to-pink-200",
      mouth: "bg-pink-400/40",
      shadow: "bg-pink-400/10"
    },
    blue: {
      eye: "bg-blue-300 shadow-[0_0_15px_rgba(96,165,250,0.8),0_0_30px_rgba(96,165,250,0.4)]",
      gradient: "from-blue-500 via-blue-400 to-blue-200",
      mouth: "bg-blue-400/40",
      shadow: "bg-blue-400/10"
    },
    cyan: {
      eye: "bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.8),0_0_30px_rgba(34,211,238,0.4)]",
      gradient: "from-cyan-500 via-cyan-400 to-cyan-200",
      mouth: "bg-cyan-400/40",
      shadow: "bg-cyan-400/10"
    }
  }[glowColor]

  const handleMouseEnter = () => {
    if (disabled) return
    setIsMouseOver(true)
    setIsHappy(true)
    // 鼠标进入时，如果正处于待机，立即恢复
    if (isIdle) {
      setIsIdle(false)
      setIdleMessage(null)
    }
  }

  const handleMouseLeave = () => {
    setIsMouseOver(false)
    // 移除鼠标位置跟随，重置为中心 (或者保持在边缘)
    setMousePos({ x: 0, y: 0 })
    // 不再重置 isHappy，保持开心
    // setIsHappy(false)
  }

  return (
    <div 
      ref={robotRef}
      className={cn(
        "fixed z-[200] flex flex-col items-end gap-4 mb-2 transition-all duration-500 animate-bounce-in", 
        className || "bottom-24 right-6"
      )}
    >
      {/* 气泡对话 (空闲时或对话时) */}
      {idleMessage && (
        <div className={cn(
          "absolute bottom-full right-0 mb-6 w-max max-w-[240px] animate-fade-in z-[210]",
          isAngry ? "scale-110" : "scale-100"
        )}>
          <div className={cn(
            "backdrop-blur-xl border rounded-[1.5rem] px-5 py-2.5 text-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 font-medium tracking-wide leading-relaxed",
            isAngry 
              ? "bg-red-500/10 border-red-500/30 text-red-50 shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
              : "bg-zinc-900/80 border-white/10 text-zinc-100"
          )}>
            {idleMessage}
            <div className={cn(
              "absolute top-full right-6 w-3 h-3 border-r border-b rotate-45 -translate-y-1.5",
              isAngry ? "bg-red-500/10 border-red-500/30" : "bg-zinc-900/80 border-white/10"
            )} />
          </div>
        </div>
      )}

      {/* 机器人主体 (进化后) */}
      <button 
        onClick={toggleChat}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative w-20 h-20 group transition-all duration-700 animate-float-slow outline-none",
          isAIChatOpen ? "scale-110" : "hover:scale-110",
          isAngry && "animate-shake",
          disabled && "cursor-default"
        )}
      >
        {/* 机器人球体主体 (全息幻彩银 - 极致未来感) */}
        <div 
          className="absolute top-0 left-0 w-20 h-20 rounded-full border border-white/20 overflow-hidden shadow-[inset_-5px_-7px_15px_rgba(0,0,0,0.5),inset_2px_2px_8px_rgba(255,255,255,0.2),0_12px_24px_rgba(0,0,0,0.4)] flex flex-col items-center group transition-all duration-700"
          style={{ 
            background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 40%, #475569 70%, #1e293b 100%)',
            transform: `rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 8}deg)`
          }}
        >
          {/* 全息光谱层 (随视角流动的虹彩效果) */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
            style={{ 
              background: `conic-gradient(from ${mousePos.x * 45}deg at 50% 50%, #ff0000, #ff00ff, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)`,
              filter: 'blur(12px)',
            }}
          />
          
          {/* 纳米级金属质感 (微细纹理) */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]" />
          
          {/* 极致镜面高光 (随鼠标精准偏转) */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              background: `radial-gradient(circle at ${30 + mousePos.x * 15}% ${30 + mousePos.y * 15}%, rgba(255,255,255,0.25) 0%, transparent 40%)`,
            }}
          />
          
          {/* 边缘虹彩光晕 (Rim Light) */}
          <div className="absolute inset-0 rounded-full border-[1px] border-white/5 pointer-events-none shadow-[inset_0_0_8px_rgba(255,255,255,0.05)]" />
          
          {/* 底部环境反射光 (动态跟随核心色) */}
          <div className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-6 blur-[20px] rounded-full opacity-20 transition-all duration-1000",
            glowColor === 'red' && "bg-red-500 opacity-40",
            glowColor === 'amber' && "bg-amber-400",
            glowColor === 'pink' && "bg-pink-400",
            glowColor === 'cyan' && "bg-cyan-400",
            glowColor === 'blue' && "bg-blue-400"
          )} />
          
          {/* 1. 物理插槽 (The Socket) - 模拟金属切割出的深度 */}
          <div 
            className="relative mt-3 w-[94%] h-[3rem] rounded-full flex items-center justify-center transition-all duration-300 ease-out overflow-visible"
            style={{ 
              transform: `translate(${mousePos.x * 6}px, ${mousePos.y * 4}px) rotateX(${mousePos.y * -12}deg) rotateY(${mousePos.x * 12}deg)`,
              transformStyle: 'preserve-3d',
              perspective: '150px'
            }}
          >
            {/* 槽位边缘阴影 (Ambient Occlusion) - 模拟缝隙深度 */}
            <div 
              className="absolute inset-[-1px] rounded-full shadow-[0_0_4px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(0,0,0,0.4)] pointer-events-none"
              style={{ 
                clipPath: 'path("M 15 5 C 30 2, 45 2, 60 5 C 75 9, 75 39, 60 43 C 45 47, 30 47, 15 43 C 0 39, 0 9, 15 5 Z")',
              }}
            />

            {/* 2. 凸面玻璃罩 (The Lens) - 具有厚度和反射感的材质 */}
            <div 
              className="absolute inset-0 bg-zinc-950/90 rounded-full shadow-[inset_0_-1px_6px_rgba(0,0,0,0.8),inset_0_1px_4px_rgba(255,255,255,0.05)] border border-white/5 backdrop-blur-[0.5px] overflow-hidden"
              style={{ 
                clipPath: 'path("M 15 5 C 30 2, 45 2, 60 5 C 75 9, 75 39, 60 43 C 45 47, 30 47, 15 43 C 0 39, 0 9, 15 5 Z")',
              }}
            >
              {/* 玻璃球面反射 (Spherical Reflection) - 弯曲的高光 */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-25 mix-blend-screen"
                style={{
                  background: `radial-gradient(ellipse at ${50 + mousePos.x * 20}% ${20 + mousePos.y * 10}%, rgba(255,255,255,0.15) 0%, transparent 60%), 
                               radial-gradient(circle at ${30 - mousePos.x * 15}% ${70 - mousePos.y * 15}%, rgba(255,255,255,0.02) 0%, transparent 40%)`,
                }}
              />

              {/* 边缘折射光 (Rim Light) */}
              <div className="absolute inset-0 border border-white/5 rounded-full pointer-events-none" />

              {/* 3. 内部显示屏层 (The Internal Display) - 带有视差深度感 */}
              <div 
                className="relative w-full h-full flex items-center justify-center"
                style={{ 
                  transform: `translate(${mousePos.x * -2}px, ${mousePos.y * -1}px) scale(0.95)`,
                }}
              >
                {/* 眼睛区域 (圆角椭圆形发光) */}
                <div className="flex gap-4 z-10 -mt-1 h-6 items-center">
                  {/* 左眼 */}
                  <div className={cn(
                    "relative transition-all duration-300 overflow-hidden",
                    glowClasses.eye,
                    isAngry
                      ? "w-5 h-2.5" 
                      : (isHappy || isAIChatOpen) 
                        ? "w-4 h-2.5" 
                        : "w-2.5 h-6 rounded-full",
                    glowColor === 'blue' && "animate-pulse"
                  )}
                  style={{
                    ...isAngry ? { clipPath: 'polygon(0% 0%, 100% 40%, 100% 100%, 0% 100%)' } : 
                    (isHappy || isAIChatOpen) ? { clipPath: 'polygon(50% 0%, 100% 100%, 75% 100%, 50% 40%, 25% 100%, 0% 100%)' } : {},
                    transform: `translate(${mousePos.x * 2}px, ${mousePos.y * 1}px)`
                  }}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-t", glowClasses.gradient)} />
                    {!(isHappy || isAIChatOpen || isAngry) && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                    {!(isHappy || isAIChatOpen || isAngry) && <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-white/40 rounded-full blur-[0.5px]" />}
                  </div>
                  {/* 右眼 */}
                  <div className={cn(
                    "relative transition-all duration-300 overflow-hidden",
                    glowClasses.eye,
                    isAngry
                      ? "w-5 h-2.5" 
                      : (isHappy || isAIChatOpen) 
                        ? "w-4 h-2.5" 
                        : "w-2.5 h-6 rounded-full",
                    glowColor === 'blue' && "animate-pulse"
                  )}
                  style={{
                    ...isAngry ? { clipPath: 'polygon(100% 0%, 0% 40%, 0% 100%, 100% 100%)' } :
                    (isHappy || isAIChatOpen) ? { clipPath: 'polygon(50% 0%, 100% 100%, 75% 100%, 50% 40%, 25% 100%, 0% 100%)' } : {},
                    transform: `translate(${mousePos.x * 2}px, ${mousePos.y * 1}px)`
                  }}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-t", glowClasses.gradient)} />
                    {!(isHappy || isAIChatOpen || isAngry) && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                    {!(isHappy || isAIChatOpen || isAngry) && <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-white/40 rounded-full blur-[0.5px]" />}
                  </div>
                </div>

                {/* 腮红区域 */}
                <div className="absolute bottom-2 flex gap-10 pointer-events-none">
                  <div className={cn(
                    "w-3 h-1.5 rounded-full blur-[3px] animate-pulse transition-all duration-500",
                    glowColor === 'pink' ? "bg-pink-400/60" : "bg-pink-400/40"
                  )} 
                  style={{ transform: `translate(${mousePos.x * 3}px, ${mousePos.y * 1.5}px)` }}
                  />
                  <div className={cn(
                    "w-3 h-1.5 rounded-full blur-[3px] animate-pulse [animation-delay:0.5s] transition-all duration-500",
                    glowColor === 'pink' ? "bg-pink-400/60" : "bg-pink-400/40"
                  )} 
                  style={{ transform: `translate(${mousePos.x * 3}px, ${mousePos.y * 1.5}px)` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 动态表情小嘴巴 */}
          <div 
            className={cn(
              "mt-0.5 transition-all duration-300 ease-out flex items-center justify-center relative overflow-hidden bg-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]",
              isAngry
                ? "w-5 h-1 ml-1"
                : isSurprised 
                  ? "w-2.5 h-2.5 rounded-full ml-1" 
                  : isAILoading 
                    ? "w-6 h-2 ml-1.5 animate-pulse" 
                    : "w-4 h-3 ml-1 -rotate-[12deg]" 
            )}
            style={{ 
              transform: (isSurprised || isAngry) ? `translate(${mousePos.x * 2}px, ${mousePos.y * 1.5}px)` : `translate(${mousePos.x * 2}px, ${mousePos.y * 1.5}px) rotate(-12deg)`,
              clipPath: (isSurprised || isAngry)
                ? 'none' 
                : isAILoading 
                  ? 'path("M 0 2.5 Q 12 7.5 24 2.5 Q 12 12.5 0 2.5 Z")' 
                  : 'path("M 0 3.5 Q 8 8.5 16 3.5 Q 8 13.5 0 3.5 Z")' 
            }}
          >
            {/* 嘴内微光 */}
            <div className={cn(
              "absolute inset-x-0 bottom-0.5 h-0.5 blur-[1px] animate-pulse transition-all duration-500",
              glowClasses.mouth,
              isAILoading && "h-0.5 blur-[1.5px]"
            )} />
          </div>

          {/* 底部微弱反光和环境光 */}
          <div className={cn("absolute bottom-0.5 w-12 h-3 blur-md rounded-full transition-all duration-500", glowClasses.shadow)} />
          <div className="absolute bottom-1 w-10 h-2 bg-zinc-400/10 blur-sm rounded-full" />
        </div>

        {/* 底部阴影 (地面投影) */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-14 h-3 bg-black/10 blur-lg rounded-full" />
      </button>
    </div>
  )
}
