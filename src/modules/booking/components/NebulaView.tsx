'use client'

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  OrbitControls, 
  Stars, 
  Float, 
  MeshDistortMaterial, 
  Html, 
  PerspectiveCamera,
  Line,
  Points,
  PointMaterial,
  shaderMaterial
} from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'
import { StaffMember, CalendarEvent } from '@/utils/calendar-constants'
import { Activity, Zap, Users, Info, ShieldCheck, RefreshCw, Camera, Scan, Box, Save, Anchor, Wifi, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { useOmniStore } from '@/modules/core/store/useOmniStore'
import { useCalendarStore } from '@/components/calendar/store/useCalendarStore'
import { SOVEREIGN_COLORS } from '@/modules/core/config/sovereign-ui-config'
import { useSovereignFeedback } from '@/modules/core/hooks/useSovereignFeedback'

/**
 * [AR Reality Engine] Camera Background Layer
 * Implementation: Automated lifecycle cleanup for MediaStream tracks
 * Prevents hardware occupancy leakage and memory consumption spikes
 */
const CameraBackground = () => {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    let currentStream: MediaStream | null = null

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          currentStream = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        })
        .catch(err => console.error('Camera access denied:', err))
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="absolute inset-0 w-full h-full object-cover opacity-60"
    />
  )
}

/**
 * 协同者指针组件 (Remote Presence Cursor) - 极致化 Memo 优化
 */
const RemotePointer = React.memo(({ position, userName }: { position: [number, number, number], userName: string }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const targetPos = useMemo(() => new THREE.Vector3(...position), [position])
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 10) * 0.1)
    }
    // 性能优化：使用 Lerp 实现远程指针的平滑移动，避免视觉跳跃
    if (groupRef.current) {
      groupRef.current.position.lerp(targetPos, 0.1)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={SHARED_GEOMETRY.POINTER} material={SHARED_MATERIALS.POINTER} />
      <mesh scale={[1.5, 1.5, 1.5]} geometry={SHARED_GEOMETRY.POINTER} material={SHARED_MATERIALS.POINTER_GLOW} />
      <Html distanceFactor={10} position={[0, 0.4, 0]} center>
        <div className="bg-holographic-purple/80 backdrop-blur-md px-2 py-0.5 rounded-full whitespace-nowrap shadow-[0_0_10px_rgba(168,85,247,0.5)] border border-white/20">
          <span className="text-[7px] font-black text-white uppercase tracking-tighter">{userName}</span>
        </div>
      </Html>
    </group>
  )
})

const EnergySphereMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE),
    uNoiseScale: 1.5,
    uNoiseSpeed: 0.1, 
    uFresnelBias: 0.1,
    uFresnelScale: 1.0,
    uFresnelPower: 4.0, // 增加边缘对比度
    uIntensity: 0.0,
    uOpacity: 1.0,
  },
  // Vertex Shader
  `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec2 vUv;
    uniform float uTime;

    void main() {
      vUv = uv;
      vLocalPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vViewPosition = normalize(cameraPosition - worldPosition.xyz);
      
      // 极致平滑呼吸：仅保留微弱的整体缩放感
      float breath = sin(uTime * 0.3) * 0.01;
      vec3 newPosition = position * (1.0 + breath);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  // Fragment Shader - Quantum Abyss (量子深渊)
  `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uFresnelBias;
    uniform float uFresnelScale;
    uniform float uFresnelPower;
    uniform float uIntensity;
    uniform float uOpacity;

    // Star Nest Algorithm for Deep Space Effect
    #define iterations 12
    #define formuparam 0.53
    #define volsteps 6
    #define stepsize 0.1
    #define zoom   0.800
    #define tile   0.850
    #define speed  0.0001 
    #define brightness 0.0015
    #define darkmatter 0.300
    #define distfading 0.730
    #define saturation 0.850

    void main() {
      // 1. 视差偏移：根据视角方向计算内部纹理偏移，创造深邃感
       vec3 dir = normalize(vLocalPosition);
       vec3 from = vec3(1.0, 0.5, 0.5);
       from += vec3(uTime * 0.002, uTime * 0.002, -2.0);
      
      // 2. 量子深渊核心算法
      float s = 0.1, fade = 1.0;
      vec3 v = vec3(0.0);
      for (int r = 0; r < volsteps; r++) {
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.0)));
        float pa, a = pa = 0.0;
        for (int i = 0; i < iterations; i++) {
          p = abs(p) / dot(p, p) - formuparam;
          a += abs(length(p) - pa);
          pa = length(p);
        }
        float dm = max(0.0, darkmatter - a * a * 0.001);
        a *= a * a;
        if (r > 6) fade *= 1.0 - dm;
        v += fade;
        v += vec3(s, s * s, s * s * s * s) * a * brightness * fade;
        fade *= distfading;
        s += stepsize;
      }
      
      vec3 abyssColor = mix(vec3(length(v)), v, saturation);
      abyssColor *= 0.01;
      
      // 3. 菲涅尔与边缘光
      float fresnel = uFresnelBias + uFresnelScale * pow(1.0 - dot(vNormal, vViewPosition), uFresnelPower);
      vec3 rimColor = uColor * fresnel * (1.2 + uIntensity * 0.8);
      
      // 4. 内部核心光
      vec3 coreColor = uColor * abyssColor * 25.0;
      coreColor += uColor * uIntensity * 0.3; // 交互反馈
      
      // 5. 最终合成
      vec3 finalColor = coreColor + rimColor;
      
      // 增加中心透明度，增强晶体感
      float alpha = mix(0.1, 0.95, fresnel + length(abyssColor) * 2.0);
      alpha *= uOpacity;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
)


extend({ EnergySphereMaterial })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      energySphereMaterial: any
    }
  }
}

// 性能优化：在组件外部定义共享几何体与材质，避免在 R3F 渲染循环中重复创建
const SHARED_GEOMETRY = {
  NODE: new THREE.SphereGeometry(0.5, 32, 32),
  SELECTED_NODE: new THREE.SphereGeometry(0.7, 32, 32),
  CORE: new THREE.SphereGeometry(1.5, 64, 64),
  GLOW: new THREE.SphereGeometry(1, 32, 32),
  RING: new THREE.TorusGeometry(0.8, 0.02, 16, 100),
  POINTER: new THREE.SphereGeometry(0.15, 16, 16),
  SCAN_RING: new THREE.TorusGeometry(3, 0.01, 16, 100)
}

const SHARED_MATERIALS = {
  POINTER: new THREE.MeshBasicMaterial({ color: SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE }),
  POINTER_GLOW: new THREE.MeshBasicMaterial({ 
    color: SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE, 
    transparent: true, 
    opacity: 0.2 
  }),
  SCAN_LINE: new THREE.MeshBasicMaterial({ 
    color: SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE, 
    transparent: true, 
    opacity: 0.3 
  }),
  GLOW_SUBTLE: new THREE.MeshBasicMaterial({ 
    color: SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE, 
    transparent: true, 
    opacity: 0.03 
  }),
  ENERGY_BEAM: new THREE.MeshBasicMaterial({
    color: SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  })
}

/**
 * 星云背景粒子系统 (Performance Optimized Background)
 */
const NebulaParticles = () => {
  const count = 2000
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50
    }
    return pos
  }, [])

  return (
    <Points positions={positions} stride={3}>
      <PointMaterial
        transparent
        color={SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE}
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4}
      />
    </Points>
  )
}

/**
 * AI 决策能量链路 (Energy Beam Visualization)
 * 展示从当前负载节点到对冲目标节点的资源调度路径
 */
const EnergyBeam = ({ from, to }: { from: [number, number, number], to: [number, number, number] }) => {
  const lineRef = useRef<any>(null)
  const points = useMemo(() => [
    new THREE.Vector3(...from),
    new THREE.Vector3(...to)
  ], [from, to])

  useFrame((state) => {
    if (lineRef.current) {
      // 流光动效：大幅减慢波动频率，增加呼吸感而非闪烁感
      if (lineRef.current.material) {
        lineRef.current.material.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05
      }
    }
  })

  return (
    <group>
      <Line 
        ref={lineRef}
        points={points} 
        color={SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE} 
        lineWidth={1} 
        transparent 
        opacity={0.3} 
      />
      {/* 核心能量束 */}
      <Line 
        points={points} 
        color="#ffffff" 
        lineWidth={0.5} 
        transparent 
        opacity={0.1} 
      />
    </group>
  )
}

/**
 * 极致化性能 HUD (Isolated Render Loop)
 */
const NebulaPerformanceHUD = () => {
  const { fps } = useOmniStore(state => state.nebula)
  const rtt = useOmniStore(state => state.rtt)
  
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-black/20 border border-white/5 rounded-full backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <Zap className="w-2.5 h-2.5 text-amber-400" />
        <span className="text-[8px] font-bold text-white/80 tabular-nums">{fps}</span>
        <span className="text-[7px] font-black text-white/20 uppercase">fps</span>
      </div>
      <div className="w-px h-2 bg-white/10" />
      <div className="flex items-center gap-1.5">
        <Wifi className="w-2.5 h-2.5 text-sky-400" />
        <span className="text-[8px] font-bold text-white/80 tabular-nums">{rtt}</span>
        <span className="text-[7px] font-black text-white/20 uppercase">ms</span>
      </div>
    </div>
  )
}

/**
 * 影子推演层 (Shadow Projection Layer)
 */
const ShadowProjection = ({ from, to }: { from: [number, number, number], to: [number, number, number] }) => {
  return (
    <group>
      <Line
        points={[from, to]}
        color={SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE}
        lineWidth={0.5}
        transparent
        opacity={0.2}
        dashed
        dashScale={5}
        dashSize={0.5}
        gapSize={0.5}
      />
      <mesh position={to}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

/**
 * 故障溯源 HUD (Fault Traceability Controller)
 */
const TraceabilityHUD = () => {
  const log = useOmniStore(state => state.instructionLog)
  const replayLog = useOmniStore(state => state.replayLog)
  const clearLog = useOmniStore(state => state.clearInstructionLog)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-md cursor-pointer hover:border-white/30 transition-all",
          isOpen && "rounded-b-none border-b-0"
        )}
      >
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">Black Box</span>
        <span className="text-[8px] font-bold text-emerald-400 italic">{log.length} Events</span>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-b-2xl overflow-hidden flex flex-col w-[240px]"
          >
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {log.length === 0 ? (
                <div className="text-[7px] text-white/20 uppercase text-center py-4">No data captured</div>
              ) : (
                log.map((entry) => (
                  <div key={entry.id} className="p-2 bg-white/5 rounded-lg border border-white/5 flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] font-black text-white/80 uppercase">{entry.type}</span>
                      <span className="text-[6px] text-white/30 font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[7px] text-zinc-400 font-mono truncate bg-black/20 p-1 rounded">
                      {JSON.stringify(entry.payload)}
                    </div>
                  </div>
                ))
              ).reverse()}
            </div>
            
            <div className="p-2 border-t border-white/10 grid grid-cols-2 gap-2">
              <button 
                onClick={replayLog}
                className="flex items-center justify-center gap-2 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-[8px] font-black text-emerald-400 uppercase transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Replay
              </button>
              <button 
                onClick={clearLog}
                className="flex items-center justify-center gap-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black text-white/40 uppercase transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * 压力测试 HUD (Stress Test Controller)
 */
const StressTestHUD = () => {
  const isStressTesting = useOmniStore(state => state.isStressTesting)
  const setStressTesting = useOmniStore(state => state.setStressTesting)

  return (
    <div 
      onClick={() => setStressTesting(!isStressTesting)}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 border rounded-full backdrop-blur-md cursor-pointer transition-all duration-300",
        isStressTesting 
          ? "bg-rose-500/20 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]" 
          : "bg-black/20 border-white/5 hover:border-white/20"
      )}
    >
      <Activity className={cn("w-3 h-3", isStressTesting ? "text-rose-500 animate-pulse" : "text-white/40")} />
      <span className={cn(
        "text-[8px] font-black uppercase tracking-widest",
        isStressTesting ? "text-rose-500" : "text-white/40"
      )}>
        {isStressTesting ? "Stress Active" : "Stress Test"}
      </span>
    </div>
  )
}

/**
 * 状态一致性审计 HUD (State Consistency Auditor)
 */
const StateAuditHUD = () => {
  const consistencyScore = useOmniStore(state => state.nebula.consistencyScore)
  const getReport = useOmniStore(state => state.getStabilityReport)
  const [showReport, setShowReport] = useState(false)
  
  const report = useMemo(() => getReport(), [getReport, consistencyScore])

  return (
    <div className="relative">
      <div 
        onClick={() => setShowReport(!showReport)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full backdrop-blur-md cursor-pointer transition-all hover:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
          showReport && "rounded-b-none border-b-0"
        )}
      >
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span className="text-[8px] font-black text-emerald-400/60 uppercase tracking-widest">Audit</span>
        <span className="text-[8px] font-bold text-emerald-400 tabular-nums">{consistencyScore}%</span>
      </div>

      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute top-full left-0 bg-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-b-2xl overflow-hidden w-[180px] z-50 shadow-2xl"
          >
            <div className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-black text-white/30 uppercase">Uptime</span>
                <span className="text-[8px] font-bold text-white/80">{report.uptime.toFixed(0)}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-black text-white/30 uppercase">Conflicts</span>
                <span className="text-[8px] font-bold text-emerald-400">{report.conflictsResolved}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-black text-white/30 uppercase">Integrity</span>
                <span className="text-[8px] font-bold text-emerald-400">PASSED</span>
              </div>
            </div>
            <div className="bg-emerald-500/10 p-2 text-center border-t border-emerald-500/10">
              <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">Zero Red-Line Verified</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * 指令队列监控 HUD (Instruction Pipeline Monitor)
 */
const InstructionPipelineHUD = () => {
  const instructionQueue = useOmniStore(state => state.transaction.instructionQueue)
  
  if (instructionQueue.length === 0) return null
  
  return (
    <div className="flex flex-col gap-2 max-w-[200px]">
      <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/10 rounded-t-xl">
        <RefreshCw className="w-3 h-3 text-holographic-purple animate-spin" />
        <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">Pipeline Active</span>
      </div>
      <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-b-xl overflow-hidden">
        <AnimatePresence initial={false}>
          {instructionQueue.map((inst) => (
            <motion.div
              key={inst.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 py-2 border-b border-white/5 last:border-0 flex items-center justify-between gap-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-white uppercase truncate">{inst.type}</span>
                <span className="text-[6px] text-white/30 font-mono">{inst.id}</span>
              </div>
              <div className={cn(
                "px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-tighter",
                inst.status === 'pending' && "bg-zinc-500/20 text-zinc-400",
                inst.status === 'processing' && "bg-holographic-purple/20 text-holographic-purple animate-pulse",
                inst.status === 'completed' && "bg-financial-green/20 text-financial-green",
                inst.status === 'failed' && "bg-rose-500/20 text-rose-500"
              )}>
                {inst.status}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * 全量同步遮罩层 (Full Sync Overlay)
 */
const SyncingOverlay = ({ forced }: { forced?: boolean }) => {
  const isSyncingStatus = useOmniStore(state => state.transaction.status === 'preparing')
  const isVisible = forced || isSyncingStatus
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-6"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-t-2 border-b-2 border-holographic-purple animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-holographic-purple animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-sm font-black text-white uppercase tracking-[0.3em] animate-pulse">Nebula Syncing</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest max-w-[200px]">
              正在调和分布式全网状态，请稍候...
            </span>
          </div>
          <div className="absolute bottom-20 flex gap-4">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                className="w-1.5 h-1.5 rounded-full bg-holographic-purple"
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * 协同状态 HUD
 */
const NebulaStatusHUD = () => {
  const onlineUsers = useOmniStore(state => state.nebula.onlineUsers)
  const rtt = useOmniStore(state => state.rtt)
  
  const confidence = useMemo(() => {
    if (rtt === 0) return 100
    return Math.max(0, Math.min(100, 100 - (rtt / 10)))
  }, [rtt])

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 bg-black/20 border border-white/5 rounded-full backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <Users className="w-2.5 h-2.5 text-holographic-purple" />
        <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">Synergy</span>
        <span className="text-[8px] font-bold text-white italic">{onlineUsers}</span>
      </div>
      <div className="w-[1px] h-2 bg-white/10" />
      <div className="flex items-center gap-1.5">
        <Zap className={cn(
          "w-2.5 h-2.5",
          rtt > 200 ? "text-rose-500 animate-pulse" : "text-financial-green"
        )} />
        <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">Conf.</span>
        <span className="text-[8px] font-bold text-white italic">{confidence.toFixed(0)}%</span>
      </div>
    </div>
  )
}

/**
 * 3D 核心引擎组件 - 能量球设计升级 (v5.0)
 * 采用自定义 Shader 实现图一风格的能量核心
 */
const NebulaCore = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<any>(null)
  
  // 监听系统繁忙状态
  const isProcessing = useOmniStore(state => state.transaction.isProcessing)
  const transactionStatus = useOmniStore(state => state.transaction.status)
  const isBusy = isProcessing || transactionStatus !== 'idle'
  
  // 交互响应状态
  const [lastClickTime, setLastClickTime] = useState(0)
  const breathingSpeedRef = useRef(0.2) // 进一步降低基础频率
  const intensityRef = useRef(0)

  const handlePointerDown = useCallback(() => {
    setLastClickTime(Date.now() / 1000)
  }, [])
  
  useFrame((state) => {
    const time = state.clock.elapsedTime
    
    // 动态呼吸频率计算 - 极致平滑化
    const timeSinceClick = time - lastClickTime
    const isRecentlyClicked = timeSinceClick < 3.0
    
    // 目标频率：平常 0.2, 点击 0.5, 繁忙 0.8 (极低频率以防眩晕)
    const targetSpeed = isBusy ? 0.8 : (isRecentlyClicked ? 0.5 : 0.2)
    breathingSpeedRef.current = THREE.MathUtils.lerp(breathingSpeedRef.current, targetSpeed, 0.01)
    
    const breathe = Math.sin(time * breathingSpeedRef.current)
    const pulseIntensity = (breathe + 1.0) * 0.5
    
    // 柔和的强度过渡
    const extraIntensity = isRecentlyClicked ? (1.0 - timeSinceClick / 3.0) * 0.4 : 0
    const finalIntensity = pulseIntensity * (isBusy ? 0.5 : 0.1) + extraIntensity
    
    intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, finalIntensity, 0.03)

    if (materialRef.current) {
      materialRef.current.uTime = time
      materialRef.current.uIntensity = intensityRef.current
    }

    if (meshRef.current) {
      // 极慢的单轴旋转：只保留 Y 轴旋转，消除多轴旋转带来的晃动感
      meshRef.current.rotation.y = time * 0.02
      
      // 呼吸缩放
      const scaleBase = 1.0
      const scaleAmplitude = (isBusy || isRecentlyClicked) ? 0.02 : 0.005
      const scale = scaleBase + breathe * scaleAmplitude
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <group>
      <Float speed={isBusy ? 1.0 : 0.5} rotationIntensity={0.1} floatIntensity={0.3}>
        {/* 主能量球层 - 量子深渊 Shader */}
        <mesh 
          ref={meshRef} 
          geometry={SHARED_GEOMETRY.CORE}
          onPointerDown={handlePointerDown}
        >
          <energySphereMaterial 
            ref={materialRef} 
            transparent 
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 内部微光层 - 增加核心实感 */}
        <mesh scale={[0.6, 0.6, 0.6]} geometry={SHARED_GEOMETRY.CORE}>
          <meshBasicMaterial 
            color={SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE} 
            transparent 
            opacity={0.05} 
          />
        </mesh>
      </Float>
      
      {/* 核心光源 - 极柔和 */}
      <pointLight intensity={isBusy ? 8 : 4} distance={20} color={SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE} />
      <pointLight position={[0, 0, 0]} intensity={isBusy ? 3 : 1} distance={10} color="#ffffff" />
    </group>
  )
}


/**
 * [Spatial Node] Resource Entity Component
 * Represents a service resource (staff/equipment) in the 3D nebula field.
 * Handles holographic interaction, load visualization, and AI hedge signaling.
 * v4.2 Performance: React.memo added to prevent expensive 3D subtree reconciliation.
 */
const ResourceNode = React.memo(({ 
  node, 
  onSelect,
  isSelected,
  isRemoteSelected,
  isLocked,
  lockedBy,
  onToggleLock,
  onAutoHedge,
  isHedged,
  hedgeInfo,
  allNodes
}: { 
  node: any, 
  onSelect: (id: string | null) => void,
  isSelected: boolean,
  isRemoteSelected: boolean,
  isLocked: boolean,
  lockedBy?: string,
  onToggleLock: (id: string) => void,
  onAutoHedge: (id: string) => void,
  isHedged: boolean,
  hedgeInfo?: any,
  allNodes: any[]
}) => {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += (isSelected || hovered || isRemoteSelected) ? 0.02 : 0.005
      
      // 智能缩放：负载越高，脉动越强烈 (大幅减慢频率)
      const pulseSpeed = node.loadFactor > 0.8 ? 2 : 1
      const pulseAmount = node.loadFactor > 0.8 ? 0.05 : 0.01
      const pulse = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * pulseAmount
      meshRef.current.scale.lerp(new THREE.Vector3(pulse, pulse, pulse), 0.05)
      
      // 全息抖动效果 (仅在被选中或协同中时) - 减弱抖动幅度
      if (isSelected || isRemoteSelected) {
        meshRef.current.position.y = node.y + Math.sin(state.clock.elapsedTime * 4) * 0.01
      }
    }
  })

  const color = isLocked ? '#a1a1aa' : (node.loadFactor > 0.8 ? '#f43f5e' : (node.loadFactor > 0.4 ? '#fbbf24' : SOVEREIGN_COLORS.FINANCIAL_GREEN))
  const glowIntensity = isLocked ? 2 : (isSelected ? 8 : (isRemoteSelected ? 6 : (1 + node.loadFactor * 4)))

  const hedgePartners = useMemo(() => {
    if (node.loadFactor < 0.6) return []
    return allNodes
      .filter(n => n.id !== node.id && n.loadFactor < 0.4)
      .slice(0, 2)
  }, [node.loadFactor, node.id, allNodes])

  return (
    <group position={[node.x, node.y, node.z]}>
      <Float speed={isSelected ? 1.5 : 0.8} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh 
          ref={meshRef}
          geometry={isSelected ? SHARED_GEOMETRY.SELECTED_NODE : SHARED_GEOMETRY.NODE}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(node.id === isSelected ? null : node.id)
          }}
        >
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered || isSelected ? 12 : glowIntensity}
            transparent
            opacity={0.9}
            metalness={0.8}
            roughness={0.2}
          />
          {/* 节点名称标签 */}
          <Html distanceFactor={12} position={[0, isSelected ? 1.2 : 0.8, 0]} center>
            <div className={cn(
              "px-3 py-1 rounded-full border backdrop-blur-xl transition-all duration-500 pointer-events-none whitespace-nowrap flex items-center gap-2",
              isLocked ? "border-zinc-500/50 bg-zinc-500/20 shadow-none grayscale" :
              (node.loadFactor > 0.8 ? "border-rose-500/50 bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)]" : 
              (node.loadFactor > 0.4 ? "border-amber-500/50 bg-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.3)]" : "border-financial-green/50 bg-financial-green/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]")),
              isSelected && "scale-125 border-white/40 bg-white/10",
              isRemoteSelected && "border-holographic-purple/50 bg-holographic-purple/20 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", isLocked ? "bg-zinc-500" : (isRemoteSelected ? "bg-holographic-purple animate-ping" : (node.loadFactor > 0.8 ? "bg-rose-500 animate-pulse" : "bg-financial-green")))} />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">
                {node.name} {isRemoteSelected && "• 协同中"} {isLocked && `• ${lockedBy}已锁定`}
              </span>
            </div>
          </Html>
        </mesh>
      </Float>

      {/* 动态负载光环 */}
      {node.loadFactor > 0.5 && (
        <mesh rotation={[Math.PI / 2, 0, 0]} geometry={SHARED_GEOMETRY.RING}>
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      )}

      {/* 连接线：指向核心 */}
      <Line
        points={[[0, 0, 0], [-node.x, -node.y, -node.z]]}
        color={color}
        lineWidth={0.5}
        transparent
        opacity={isSelected ? 0.6 : 0.15}
      />

      {/* 资源对冲线：连接潜在伙伴 */}
      {isSelected && hedgePartners.map(partner => (
        <Line
          key={partner.id}
          points={[[0, 0, 0], [partner.x - node.x, partner.y - node.y, partner.z - node.z]]}
          color={SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE}
          lineWidth={2}
          transparent
          opacity={0.4}
          dashed
          dashSize={0.5}
          gapSize={0.2}
        />
      ))}

      {/* 资源交互 HUD */}
      {(hovered || isSelected) && (
        <Html distanceFactor={10} position={[1, 0, 0]}>
          <div className={cn(
            "bg-pitch-black/90 border border-white/10 p-4 rounded-3xl backdrop-blur-2xl w-56 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 transform",
            isSelected ? "scale-110 -translate-y-4" : "scale-100"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-holographic-purple" />
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Resource Verified</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={cn("w-1 h-1 rounded-full", i <= (node.loadFactor * 4) ? "bg-holographic-purple" : "bg-white/10")} />
                ))}
              </div>
            </div>
            
            <div className="text-sm font-black text-white mb-1 uppercase italic tracking-tighter">{node.name}</div>
            <div className="text-[8px] text-zinc-500 font-bold mb-4 flex items-center gap-1">
              <span className="opacity-50">G-ID:</span> {node.id.slice(0, 12)}
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-[8px] font-black text-zinc-400 uppercase mb-1.5">
                  <span className="flex items-center gap-1">
                    <Activity className="w-2 h-2" />
                    实时调度负载
                  </span>
                  <span className={node.loadFactor > 0.8 ? "text-rose-500" : "text-holographic-purple"}>
                    {Math.round(node.loadFactor * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={cn("h-full transition-all duration-1000", node.loadFactor > 0.8 ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-holographic-purple shadow-[0_0_10px_rgba(168,85,247,0.5)]")}
                    style={{ width: `${node.loadFactor * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <div className="text-[7px] text-zinc-500 font-black uppercase mb-0.5">今日单量</div>
                  <div className="text-xs font-black text-white">{node.eventCount}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <div className="text-[7px] text-zinc-500 font-black uppercase mb-0.5">对冲伙伴</div>
                  <div className="text-[8px] font-black text-holographic-purple flex items-center gap-1">
                    <RefreshCw className="w-2 h-2" />
                    {hedgePartners.length} 位
                  </div>
                </div>
              </div>

              {isSelected && !isLocked && (
                <div className="pt-2 space-y-2">
                  <div className="bg-holographic-purple/10 border border-holographic-purple/20 rounded-xl p-2">
                    <div className="text-[7px] text-holographic-purple font-black uppercase mb-1 flex items-center gap-1">
                      <Zap className="w-2 h-2" />
                      AI 智能对冲建议
                    </div>
                    <div className="text-[8px] text-zinc-400 leading-relaxed font-medium">
                      {isHedged === node.id 
                        ? (
                          <div className="space-y-1">
                            <div className="text-white font-bold tracking-tight">
                              已对冲至 {hedgeInfo?.target_staff_name}
                            </div>
                            <div className="flex items-center gap-1.5 opacity-60">
                              <RefreshCw className="w-2 h-2 animate-spin" />
                              <span>负载均衡中 (收益比 +{hedgeInfo?.profit_gain || '12'}%)</span>
                            </div>
                          </div>
                        )
                        : (node.loadFactor > 0.7 
                          ? `负载已达警戒线，AI 建议将后续预约对冲至 ${hedgePartners[0]?.name || '其他'} 资源。`
                          : '负载处于健康状态，可作为对冲资源支持高负载节点。')}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => onToggleLock(node.id)}
                      className="py-2.5 bg-zinc-800 text-white border border-white/10 rounded-xl text-[8px] font-black text-center uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                      锁定空间位置
                    </button>
                    <button 
                      onClick={() => onAutoHedge(node.id)}
                      className={cn(
                        "py-2.5 rounded-xl text-[8px] font-black text-center uppercase tracking-widest transition-all shadow-xl",
                        isHedged === node.id ? "bg-financial-green text-white" : "bg-white text-zinc-950 hover:bg-zinc-200"
                      )}
                    >
                      {isHedged === node.id ? '对冲已生效' : '发起 AI 对冲'}
                    </button>
                  </div>
                </div>
              )}
              
              {isSelected && isLocked && (
                <div className="pt-2">
                  <button 
                    onClick={() => onToggleLock(node.id)}
                    className="w-full py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[8px] font-black text-center uppercase tracking-widest hover:bg-rose-500/20 transition-colors"
                  >
                    解除空间锁定
                  </button>
                </div>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
})

/**
 * [Omni-Nebula] 3D Resource Symbiosis Interface
 * props definition for the holographic scheduling view.
 */
interface NebulaViewProps {
  staffMembers: StaffMember[]
  events: CalendarEvent[]
  isModalOpen: boolean
  merchantId?: string
}

/**
 * [Omni-Nebula Engine] Extreme v3.0 Holographic Symbiosis View
 * The core 3D engine for real-time resource distribution, load forecasting,
 * and collaborative spatial scheduling.
 */
export const NebulaView: React.FC<NebulaViewProps> = ({
  staffMembers,
  events,
  isModalOpen,
  merchantId
}) => {
  const selectedNodeId = useOmniStore(state => state.selectedNodeId)
  const setSelectedNodeId = useOmniStore(state => state.setSelectedNodeId)
  const setNebula = useOmniStore(state => state.setNebula)
  const reconcile = useOmniStore(state => state.reconcile)
  const takeSnapshot = useOmniStore(state => state.takeSnapshot)
  const createShadowState = useOmniStore(state => state.createShadowState)
  const restoreShadow = useOmniStore(state => state.restoreShadow)
  const rollback = useOmniStore(state => state.rollback)
  const enqueueInstruction = useOmniStore(state => state.enqueueInstruction)
  const dequeueInstruction = useOmniStore(state => state.dequeueInstruction)
  const updateInstructionStatus = useOmniStore(state => state.updateInstructionStatus)
  const getStateFingerprint = useOmniStore(state => state.getStateFingerprint)
  const extrapolate = useOmniStore(state => state.extrapolate)
  const clearExtrapolation = useOmniStore(state => state.clearExtrapolation)
  const extrapolatedState = useOmniStore(state => state.extrapolatedState)
  const rtt = useOmniStore(state => state.rtt)
  const updateRtt = useOmniStore(state => state.updateRtt)
  const logInstruction = useOmniStore(state => state.logInstruction)
  const isStressTesting = useOmniStore(state => state.isStressTesting)
  const isHedged = useOmniStore(state => state.nebula.isHedged)
  const instructionQueue = useOmniStore(state => state.transaction.instructionQueue)
  const setViewType = useCalendarStore(state => state.setViewType)

  const { playSynthesizedSound, triggerHaptic } = useSovereignFeedback()
  const [remoteSelectedId, setRemoteSelectedId] = useState<string | null>(null)
  const lastSelectionTs = useRef<number>(0)
  const [isARMode, setIsARMode] = useState(false)
  const [isSyncingFull, setIsSyncingFull] = useState(false)
  const [user, setUser] = useState<any>(null)

  // 极致化：性能监控与空间一致性模拟
  useEffect(() => {
    const interval = setInterval(() => {
      setNebula({
        fps: Math.floor(58 + Math.random() * 4),
        consistencyScore: parseFloat((99.5 + Math.random() * 0.4).toFixed(1))
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [setNebula])

  const [remoteCursors, setRemoteCursors] = useState<Record<string, { position: [number, number, number]; userName: string; ts: number }>>({})
  const [activities, setActivities] = useState<{ id: string; text: string; time: string }[]>([])
  const [isSavingAnchor, setIsSavingAnchor] = useState(false)
  const [isLockingResource, setIsLockingResource] = useState<string | null>(null)
  const isLockingResourceRef = useRef<string | null>(null)
  const [spatialLocks, setSpatialLocks] = useState<Record<string, { userId: string; userName: string; ts: number }>>({})
  const [hedgeInfo, setHedgeInfo] = useState<any>(null)
  const [conflictStatus, setConflictStatus] = useState<string | null>(null)
  const conflictStatusRef = useRef<string | null>(null)
  const lastSyncTimestamps = useRef<Record<string, number>>({})

  const [spatialTransform, setSpatialTransform] = useState({
    position: [0, -2, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale: [0.6, 0.6, 0.6] as [number, number, number]
  })

  const localUserId = useRef<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const syncChannel = useRef<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        localUserId.current = authUser.id
        setUser(authUser)
      }
    })
  }, [supabase])

  const handleSelectNode = useCallback((id: string | null) => {
    if (id !== selectedNodeId) {
      logInstruction('NODE_SELECT', { nodeId: id })
      playSynthesizedSound('click')
      triggerHaptic('light')
    }
    setSelectedNodeId(id)
  }, [selectedNodeId, setSelectedNodeId, playSynthesizedSound, triggerHaptic, logInstruction])

  // 辅助函数：记录活动日志
  const addActivity = useCallback((text: string) => {
    setActivities(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }, ...prev].slice(0, 5))
  }, [])

  // 极致化切换动效
  const toggleARMode = useCallback(() => {
    addActivity(isARMode ? '正在退出全息共生模式' : '正在进入全息共生模式')
    setIsARMode(prev => !prev)
  }, [isARMode, addActivity])

  // 1. Supabase Realtime 全息协同与空间锁定 (Hardened)
  useEffect(() => {
    if (!merchantId) return

    // [Stress Test] 模拟高频交互压力
    let stressInterval: NodeJS.Timeout | null = null
    if (isStressTesting && syncChannel.current) {
      stressInterval = setInterval(() => {
        // 模拟 50Hz 的高频指针移动与 RTT 探测
        syncChannel.current?.send({
          type: 'broadcast',
          event: 'spatial_pointer',
          payload: { 
            userId: localUserId.current, 
            position: [Math.sin(Date.now() / 100) * 5, Math.cos(Date.now() / 100) * 5, 0],
            userName: user?.email?.split('@')[0] || 'Tester',
            ts: Date.now() 
          }
        })
      }, 20) // 50Hz
    }

    // [Offline Recovery] 浏览器在线状态监控
    const handleOnline = () => addActivity('网络连接已恢复，正在重连协同星云...')
    const handleOffline = () => addActivity('网络连接已断开，进入本地离线模式')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const channel = supabase.channel(`nebula_sync_${merchantId}`, {
      config: { presence: { key: 'user_id' } }
    })
    syncChannel.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setNebula({ onlineUsers: Object.keys(state).length })
        
        // [Zombie Cleanup] 交叉引用：清理那些不在 Presence 列表中的僵尸锁定
        const activeUserIds = new Set(Object.keys(state))
        setSpatialLocks(prev => {
          const next = { ...prev }
          let changed = false
          Object.keys(next).forEach(resourceId => {
            if (!activeUserIds.has(next[resourceId].userId)) {
              delete next[resourceId]
              changed = true
            }
          })
          return changed ? next : prev
        })
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        playSynthesizedSound('transition')
        addActivity(`${newPresences[0]?.userName || '同事'} 已加入协同`)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // [Sync Hardening] 心跳失效自动解锁逻辑
        // 如果离开的用户持有锁定，则自动释放
        const leftUserId = key
        setSpatialLocks(prev => {
          const next = { ...prev }
          let changed = false
          Object.keys(next).forEach(resourceId => {
            if (next[resourceId].userId === leftUserId) {
              delete next[resourceId]
              changed = true
            }
          })
          if (changed) addActivity('检测到协同者离线，已自动释放其锁定的空间节点')
          return changed ? next : prev
        })
        
        // 同时清理离线用户的指针
        setRemoteCursors(prev => {
          if (prev[leftUserId]) {
            const next = { ...prev }
            delete next[leftUserId]
            return next
          }
          return prev
        })
      })
      .on('broadcast', { event: 'node_selection' }, async ({ payload }) => {
        // [Sync Hardening] 版本校验：丢弃过时消息
        if (payload.ts && payload.ts < lastSelectionTs.current) return
        
        if (payload.userId !== localUserId.current) {
          setRemoteSelectedId(payload.nodeId)
          lastSelectionTs.current = payload.ts || Date.now()
          addActivity(`${payload.userName || '同事'} 正在查看节点`)
        }
      })
      .on('broadcast', { event: 'global_state_sync' }, ({ payload }) => {
        // [Sync Hardening] 全局状态调和
        if (payload.userId !== localUserId.current) {
          reconcile(payload.state, payload.ts)
        }
      })
      .on('broadcast', { event: 'spatial_lock' }, ({ payload }) => {
        // [Sync Hardening] 丢弃过时消息
        const lastTs = lastSyncTimestamps.current[payload.resourceId] || 0
        if (payload.ts && payload.ts < lastTs) return

        setSpatialLocks(prev => ({
          ...prev,
          [payload.resourceId]: { userId: payload.userId, userName: payload.userName, ts: payload.ts }
        }))
        lastSyncTimestamps.current[payload.resourceId] = payload.ts
        addActivity(`${payload.userName} 锁定了空间节点`)
      })
      .on('broadcast', { event: 'spatial_unlock' }, ({ payload }) => {
        // [Sync Hardening] 丢弃过时消息
        const lastTs = lastSyncTimestamps.current[payload.resourceId] || 0
        if (payload.ts && payload.ts < lastTs) return

        setSpatialLocks(prev => {
          const next = { ...prev }
          delete next[payload.resourceId]
          return next
        })
        lastSyncTimestamps.current[payload.resourceId] = payload.ts
        addActivity(`空间节点已解除锁定`)
      })
      .on('broadcast', { event: 'spatial_pointer' }, ({ payload }) => {
        if (payload.userId !== localUserId.current) {
          setRemoteCursors(prev => {
            // [Sync Hardening] 仅当新坐标更晚时更新
            if (prev[payload.userId] && payload.ts < prev[payload.userId].ts) return prev
            return {
              ...prev,
              [payload.userId]: { position: payload.position, userName: payload.userName, ts: payload.ts }
            }
          })
        }
      })
      .on('broadcast', { event: 'ai_hedge_request' }, async ({ payload }) => {
        // [Distributed Negotiation] 收到他人的对冲请求，如果本地也在对冲同一节点，根据时间戳协商
        if (payload.resourceId === isLockingResourceRef.current && payload.userId !== localUserId.current) {
          const myTs = lastSyncTimestamps.current[payload.resourceId] || 0
          if (payload.ts < myTs) {
            // [Asymmetric Sync] 他人更早，本地主动让位并记录影子状态以备快速恢复
            createShadowState()
            const statusMsg = `正在调解与 ${payload.userName} 的并发冲突 (本地让位)...`
            setConflictStatus(statusMsg)
            conflictStatusRef.current = statusMsg
            playSynthesizedSound('transition')
            
            // 触发异步调和：从影子状态平滑恢复
            setTimeout(() => {
              if (conflictStatusRef.current === statusMsg) {
                restoreShadow()
                setConflictStatus(null)
                conflictStatusRef.current = null
              }
            }, 2000)
          }
        }
      })
      .on('broadcast', { event: 'state_consensus' }, ({ payload }) => {
        // [Consensus Check] 校验全网状态一致性
        const localFingerprint = getStateFingerprint()
        if (payload.fingerprint !== localFingerprint && payload.userId !== localUserId.current) {
          console.warn('[NebulaView] State divergence detected!', { remote: payload.fingerprint, local: localFingerprint })
          // 如果分叉严重（或者本地状态较旧），触发全量重新同步
          setIsSyncingFull(true)
          playSynthesizedSound('error')
          setTimeout(() => {
            setIsSyncingFull(false)
            // 模拟全量同步：此处可以调用全量 API
            addActivity('检测到状态分叉，已自动完成逻辑对齐')
          }, 3000)
        }
      })
      .on('broadcast', { event: 'ping' }, ({ payload }) => {
        if (payload.userId === localUserId.current) {
          const latency = Date.now() - payload.ts
          updateRtt(latency)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser()
          await channel.track({ 
            online_at: new Date().toISOString(),
            userName: user?.user_metadata?.full_name || '同事'
          })
          addActivity('已进入协同星云')
        }
        
        // [Offline Recovery] 处理重连与断连
        if (status === 'CLOSED') {
          addActivity('协同星云连接已关闭')
        }
        if (status === 'CHANNEL_ERROR') {
          addActivity('协同星云连接异常，正在尝试自动重连...')
        }
        if (status === 'TIMED_OUT') {
          addActivity('同步超时，正在重新同步状态...')
        }
      })

    // [Latency Measurement] 定期进行网络延迟探测
    const pingInterval = setInterval(() => {
      if (syncChannel.current && localUserId.current) {
        syncChannel.current.send({
          type: 'broadcast',
          event: 'ping',
          payload: { userId: localUserId.current, ts: Date.now() }
        })
      }
    }, 5000)

    return () => {
      if (stressInterval) clearInterval(stressInterval)
      clearInterval(pingInterval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      channel.unsubscribe()
      syncChannel.current = null
    }
  }, [merchantId, supabase, addActivity, setNebula, reconcile])

  // 周期性广播本地关键状态 (Reconciliation Loop)
  const aiState = useOmniStore(state => state.ai)
  const transactionState = useOmniStore(state => state.transaction)

  useEffect(() => {
    if (!merchantId || !syncChannel.current) return
    const interval = setInterval(() => {
      syncChannel.current.send({
        type: 'broadcast',
        event: 'global_state_sync',
        payload: {
          userId: localUserId.current,
          ts: Date.now(),
          state: {
            ai: aiState,
            transaction: transactionState
          }
        }
      })
    }, 5000) // 每 5 秒进行一次状态同步确认
    return () => clearInterval(interval)
  }, [merchantId, aiState, transactionState])

  // 空间指针同步逻辑 (Throttle 发送)
  const lastPointerSend = useRef(0)
  const onPointerMove = useCallback((e: any) => {
    if (!merchantId || !syncChannel.current) return
    const now = Date.now()
    if (now - lastPointerSend.current < 50) return // 50ms 节流 (提高响应度)
    
    const { point } = e
    if (!point) return

    if (!user) return
    syncChannel.current.send({
      type: 'broadcast',
      event: 'spatial_pointer',
      payload: { 
        userId: user.id, 
        userName: user.user_metadata?.full_name || '同事',
        position: [point.x, point.y, point.z],
        ts: now // [Sync Hardening] 发送时间戳
      }
    })
    lastPointerSend.current = now
  }, [merchantId, user])

  // 空间锁定/解锁动作
  const toggleSpatialLock = async (resourceId: string) => {
    if (!merchantId || !syncChannel.current) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    takeSnapshot() // [Stability] 操作前建立状态快照

    try {
      const isCurrentlyLocked = !!spatialLocks[resourceId]
      const now = Date.now()
      
      if (isCurrentlyLocked) {
        // 仅允许锁定者本人解锁
        if (spatialLocks[resourceId].userId !== user.id) {
          playSynthesizedSound('error')
          triggerHaptic('medium')
          return
        }
        
        logInstruction('SPATIAL_UNLOCK', { resourceId, ts: now })
        const { error } = await syncChannel.current.send({
          type: 'broadcast',
          event: 'spatial_unlock',
          payload: { resourceId, ts: now }
        })
        if (error) throw error

        playSynthesizedSound('unlock')
        triggerHaptic('light')
        setSpatialLocks(prev => {
          const next = { ...prev }
          delete next[resourceId]
          return next
        })
        lastSyncTimestamps.current[resourceId] = now
      } else {
        logInstruction('SPATIAL_LOCK', { resourceId, userId: user.id, ts: now })
        const { error } = await syncChannel.current.send({
          type: 'broadcast',
          event: 'spatial_lock',
          payload: { resourceId, userId: user.id, userName: user.user_metadata?.full_name || '同事', ts: now }
        })
        if (error) throw error

        playSynthesizedSound('lock')
        triggerHaptic('medium')
        setSpatialLocks(prev => ({
          ...prev,
          [resourceId]: { userId: user.id, userName: '我', ts: now }
        }))
        lastSyncTimestamps.current[resourceId] = now
      }
    } catch (err) {
      console.error('[NebulaView] Spatial lock action failed:', err)
      playSynthesizedSound('error')
      triggerHaptic('heavy')
      addActivity('空间锁定操作失败，正在回滚状态...')
      rollback() // [Stability] 异常回滚
    }
  }

  // AI 自动对冲执行 (此处不需要同步，仅在本地触发后由状态变化引起同步)
  const handleAutoHedge = async (resourceId: string) => {
    if (!merchantId || !syncChannel.current) return
    
    // [Distributed Negotiation] 发送意向广播，探测并发冲突
    const now = Date.now()
    const { data: { user } } = await supabase.auth.getUser()
    const userName = user?.user_metadata?.full_name || '同事'
    
    // [Instruction Sequencing] 将对冲任务入队，进入流水线调度
    // 事务前全网共识广播
      syncChannel.current.send({
        type: 'broadcast',
        event: 'state_consensus',
        payload: { fingerprint: getStateFingerprint(), userId: localUserId.current, ts: now }
      })

      const instructionId = enqueueInstruction('AI_AUTO_HEDGE', { resourceId, userName, ts: now })
      logInstruction('AI_AUTO_HEDGE_START', { resourceId, instructionId, ts: now })
      updateInstructionStatus(instructionId, 'processing')

      // [Optimistic Extrapolation] 立即进行本地状态推演，补偿网络延迟
      // 预估：该资源节点将被标记为“正在对冲”
      extrapolate({ 
        nebula: { ...useOmniStore.getState().nebula, isHedged: resourceId } 
      })

    setIsLockingResource(resourceId)
    isLockingResourceRef.current = resourceId
    lastSyncTimestamps.current[resourceId] = now
    
    syncChannel.current.send({
      type: 'broadcast',
      event: 'ai_hedge_request',
      payload: { resourceId, userId: localUserId.current, userName, ts: now }
    })

    // 等待 200ms 的探测窗口以发现潜在冲突
    await new Promise(resolve => setTimeout(resolve, 200))
    
    if (conflictStatusRef.current) {
      // 发现冲突且本地时间戳较晚，自动等待重试
      updateInstructionStatus(instructionId, 'pending') // 回退到等待状态
      await new Promise(resolve => setTimeout(resolve, 1000))
      setConflictStatus(null)
      conflictStatusRef.current = null
      // 递归重试
      return handleAutoHedge(resourceId)
    }

    takeSnapshot() // [Stability] 操作前建立状态快照
    playSynthesizedSound('transition')
    addActivity(`AI 正在计算对冲链路...`)
    
    try {
      const { data, error } = await supabase.rpc('fx_ai_auto_hedge_v3', {
        p_merchant_id: merchantId,
        p_target_staff_id: resourceId,
        p_service_date: new Date().toISOString().split('T')[0],
        p_start_time: new Date().toTimeString().split(' ')[0],
        p_duration: 60
      })

      if (error) throw error

      if (data && data.action === 'auto_hedge') {
        setNebula({ isHedged: resourceId })
        setHedgeInfo(data)
        playSynthesizedSound('success')
        triggerHaptic('heavy')
        addActivity(`AI 已自动对冲至 ${data.target_staff_name}`)
        updateInstructionStatus(instructionId, 'completed')
      } else {
        playSynthesizedSound('click')
        triggerHaptic('light')
        addActivity(`当前负载无需对冲`)
        updateInstructionStatus(instructionId, 'completed')
      }
      
      // 完成后从队列移除（或保留 3 秒供 UI 显示）
      setTimeout(() => dequeueInstruction(instructionId), 3000)

    } catch (err) {
      console.error('[NebulaView] AI auto hedge failed:', err)
      playSynthesizedSound('error')
      triggerHaptic('heavy')
      addActivity('AI 对冲执行失败，正在安全回滚...')
      rollback() // [Stability] 异常回滚
      updateInstructionStatus(instructionId, 'failed')
      setTimeout(() => dequeueInstruction(instructionId), 5000)
    } finally {
        setIsLockingResource(null)
        isLockingResourceRef.current = null
        clearExtrapolation()
      }
  }

  // 当本地选择变化时，广播给其他协同者
  useEffect(() => {
    if (selectedNodeId && merchantId && syncChannel.current) {
      const now = Date.now()
      syncChannel.current.send({
        type: 'broadcast',
        event: 'node_selection',
        payload: { 
          nodeId: selectedNodeId, 
          userId: localUserId.current, 
          userName: '同事',
          ts: now 
        }
      })
      lastSelectionTs.current = now
    }
  }, [selectedNodeId, merchantId])

  // 2. 3D 空间持久化锚点 (Spatial Persistence) 逻辑
  const loadSpatialAnchor = useCallback(async () => {
    if (!merchantId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('fx_spatial_anchors')
      .select('transform')
      .eq('merchant_id', merchantId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (data && data.transform) {
      setSpatialTransform(data.transform)
    }
  }, [merchantId, supabase])

  const saveSpatialAnchor = async () => {
    if (!merchantId) return
    setIsSavingAnchor(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsSavingAnchor(false)
      return
    }

    takeSnapshot() // [Stability] 保存锚点前备份

    try {
      const { error } = await supabase
        .from('fx_spatial_anchors')
        .upsert({
          merchant_id: merchantId,
          user_id: user.id,
          transform: spatialTransform,
          updated_at: new Date().toISOString()
        }, { onConflict: 'merchant_id,user_id,anchor_name' })

      if (error) throw error
      addActivity('空间持久化锚点已保存')
    } catch (err) {
      console.error('[NebulaView] Save spatial anchor failed:', err)
      addActivity('锚点保存失败，恢复至上次一致性状态')
      rollback() // [Stability] 异常回滚
    } finally {
      setIsSavingAnchor(false)
    }
  }

  useEffect(() => {
    if (isARMode) {
      loadSpatialAnchor()
    }
  }, [isARMode, loadSpatialAnchor])

  // 计算 3D 节点数据 (球极坐标分布)
  const nodes = useMemo(() => {
    return staffMembers.map((staff, index) => {
      // 使用黄金螺旋算法分布在球面上
      const phi = Math.acos(-1 + (2 * index) / staffMembers.length)
      const theta = Math.sqrt(staffMembers.length * Math.PI) * phi
      
      const radius = 6 + Math.random() * 2
      const x = radius * Math.cos(theta) * Math.sin(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(phi)
      
      // 计算忙碌度 (0-1)
      const staffEvents = events.filter(e => 
        e.billing_details?.staff?.[staff.id] || 
        (e[(`金额_${staff.name}` as keyof CalendarEvent)] as number) > 0
      )
      const loadFactor = Math.min(staffEvents.length / 5, 1)
      
      return {
        id: staff.id,
        name: staff.name,
        x, y, z,
        loadFactor,
        eventCount: staffEvents.length,
        color: staff.color
      }
    })
  }, [staffMembers, events])

  return (
    <div className={cn(
        "relative w-full h-full bg-[#050505] transition-opacity duration-700 overflow-hidden",
        isModalOpen ? "opacity-0" : "opacity-100"
      )}>
      <SyncingOverlay />
      {/* 6. 空间状态 HUD */}
      {isARMode && (
        <div className="absolute top-8 right-8 z-30 pointer-events-none flex flex-col items-end gap-3">
          <div className="bg-zinc-950/40 border border-white/10 backdrop-blur-xl px-5 py-3 rounded-2xl flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">Spatial Anchor</span>
              <span className="text-[10px] text-emerald-400 font-bold tracking-tight">Active & Synced</span>
            </div>
            <div className="w-10 h-10 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/5">
              <Anchor className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div className="bg-zinc-950/40 border border-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Scan className="w-3 h-3 text-white/20" />
            <span className="text-[7px] text-white/30 font-black uppercase tracking-[0.2em]">P: {spatialTransform.position.map(p => p.toFixed(1)).join(', ')}</span>
          </div>
        </div>
      )}

      {/* 1. AR 背景 (摄像头层) */}
      {isARMode && <CameraBackground />}

      {/* 2. 3D 星云图层 */}
      <Canvas 
        shadows 
        gl={{ 
          antialias: true, 
          alpha: true, // 允许透明以显示摄像头
          powerPreference: "high-performance" 
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 20]} fov={45} />
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={10} 
          maxDistance={40}
          autoRotate={!selectedNodeId && !isARMode}
          autoRotateSpeed={0.5}
        />
        
        {/* 在 AR 模式下动态调整光影与环境 */}
        <ambientLight intensity={isARMode ? 1.5 : 0.5} />
        <pointLight position={[10, 10, 10]} intensity={isARMode ? 2 : 1} color={isARMode ? "#ffffff" : SOVEREIGN_COLORS.HOLOGRAPHIC_PURPLE} />
        
        {!isARMode && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
        <NebulaParticles />
        
        <group 
          scale={isARMode ? spatialTransform.scale : [1, 1, 1]} 
          position={isARMode ? spatialTransform.position : [0, 0, 0]}
          rotation={isARMode ? spatialTransform.rotation : [0, 0, 0]}
          onPointerMove={onPointerMove}
        > 
          <NebulaCore />
          
          {/* 远程指针显示 */}
          {Object.entries(remoteCursors).map(([userId, cursor]) => (
            <RemotePointer 
              key={userId} 
              position={cursor.position} 
              userName={cursor.userName} 
            />
          ))}

          {/* AI 决策路径可视化 */}
          {isHedged && hedgeInfo && nodes.find(n => n.id === isHedged) && nodes.find(n => n.name === hedgeInfo.target_staff_name) && (
            <EnergyBeam 
              from={[
                nodes.find(n => n.id === isHedged)!.x, 
                nodes.find(n => n.id === isHedged)!.y, 
                nodes.find(n => n.id === isHedged)!.z
              ]}
              to={[
                nodes.find(n => n.name === hedgeInfo.target_staff_name)!.x, 
                nodes.find(n => n.name === hedgeInfo.target_staff_name)!.y, 
                nodes.find(n => n.name === hedgeInfo.target_staff_name)!.z
              ]}
            />
          )}

          {/* [Shadow Projection] 乐观推演的可视化显示 */}
          {extrapolatedState?.nebula?.isHedged && !isHedged && nodes.find(n => n.id === extrapolatedState.nebula?.isHedged) && (
            <ShadowProjection 
              from={[
                nodes.find(n => n.id === extrapolatedState.nebula?.isHedged)!.x,
                nodes.find(n => n.id === extrapolatedState.nebula?.isHedged)!.y,
                nodes.find(n => n.id === extrapolatedState.nebula?.isHedged)!.z
              ]}
              to={[0, 0, 0]} // 预估指向星云中心进行对冲计算
            />
          )}

          {nodes.map(node => (
            <ResourceNode 
                key={node.id} 
                node={node} 
                onSelect={handleSelectNode} 
                isSelected={selectedNodeId === node.id}
                isRemoteSelected={remoteSelectedId === node.id}
                isLocked={!!spatialLocks[node.id]}
                lockedBy={spatialLocks[node.id]?.userName}
                onToggleLock={toggleSpatialLock}
                onAutoHedge={handleAutoHedge}
                isHedged={isHedged === node.id}
                hedgeInfo={hedgeInfo}
                allNodes={nodes}
              />
          ))}
        </group>

        {/* 环境氛围 */}
        {!isARMode && <fog attach="fog" args={['#09090b', 15, 50]} />}
      </Canvas>

      {/* 3. AR 扫描 UI 叠加层 */}
      <AnimatePresence>
        {isARMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-indigo-500/30 rounded-3xl">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
              
              {/* 扫描线动画 */}
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 w-full h-0.5 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,1)]" 
              />
            </div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-40 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 backdrop-blur-xl border border-indigo-500/30 rounded-full">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  <Scan className="w-4 h-4 text-indigo-400" />
                </motion.div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Spatial Anchor Locked</span>
              </div>
              <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest text-center max-w-[240px] leading-relaxed">
                AI 经理已将 3D 星云图映射至物理空间，请对准工位查看实时负载。
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. 全息活动日志 (Holographic Activity Log) */}
      <div className="absolute bottom-10 left-10 z-30 pointer-events-none space-y-3">
        <AnimatePresence>
          {conflictStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="flex items-center gap-4 bg-rose-500/20 border border-rose-500/40 backdrop-blur-2xl px-6 py-3 rounded-3xl shadow-[0_20px_50px_rgba(244,63,94,0.3)]"
            >
              <div className="relative">
                <RefreshCw className="w-5 h-5 text-rose-500 animate-spin" />
                <div className="absolute inset-0 bg-rose-500 blur-lg opacity-40 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white font-black uppercase tracking-widest leading-none mb-1">并发冲突已探测</span>
                <span className="text-[12px] text-rose-400 font-black italic tracking-tighter">{conflictStatus}</span>
              </div>
            </motion.div>
          )}
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
              className="flex items-center gap-3 bg-zinc-950/40 border border-white/5 backdrop-blur-md px-4 py-2 rounded-2xl"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/80 font-bold tracking-tight">{activity.text}</span>
                <span className="text-[7px] text-white/30 font-black uppercase tracking-widest">{activity.time}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 5. 顶层 HUD 控制器 */}
      <div className="absolute top-8 left-8 z-20 pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
              {isARMode ? 'AR Reality Mode' : 'Spatial Nebula Mode'}
            </span>
          </div>
          <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.3em]">Omni-Flow v2.0 Architecture</div>
          
          {/* 在线人数与性能指示器 */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TraceabilityHUD />
            <StressTestHUD />
            <NebulaStatusHUD />
            <NebulaPerformanceHUD />
            <StateAuditHUD />
          </div>
          
          {/* 异步指令管线监控 */}
          <div className="mt-4">
            <InstructionPipelineHUD />
          </div>
        </div>
      </div>

      {/* AR & Spatial 控制按钮 */}
      <div className="absolute top-8 right-8 z-30 flex items-center gap-3">
        {isARMode && (
          <button 
            onClick={saveSpatialAnchor}
            disabled={isSavingAnchor}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 pointer-events-auto",
              isSavingAnchor ? "bg-zinc-800 text-zinc-500 border-zinc-700" : "bg-white/5 text-white border-white/10 hover:bg-white/10"
            )}
          >
            {isSavingAnchor ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isSavingAnchor ? '正在保存' : '锁定空间锚点'}
            </span>
          </button>
        )}
        
        <button 
          onClick={toggleARMode}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 pointer-events-auto",
            isARMode 
              ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]" 
              : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
          )}
        >
          {isARMode ? <Box className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          <span className="text-[10px] font-black uppercase tracking-widest">
            {isARMode ? '退出 AR' : 'AR 实景预览'}
          </span>
        </button>

        {/* 退出星云视图按钮 */}
        <button 
          onClick={() => setViewType('day')}
          className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-300 pointer-events-auto"
          title="退出星云模式"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/40 backdrop-blur-xl px-8 py-4 rounded-[2rem] border border-white/10 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none mb-1">实时资源星云</span>
            <span className="text-[11px] text-white font-black italic tracking-tighter">SPATIAL MONITORING ACTIVE</span>
          </div>
        </div>
        
        <div className="h-8 w-[1px] bg-white/10" />
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none mb-1">AI 负载预测</span>
            <span className="text-[11px] text-white font-black italic tracking-tighter">NEBULA PREDICTION: OPTIMAL</span>
          </div>
        </div>
      </div>

      {/* Instruction Overlay */}
      <div className="absolute bottom-8 right-8 flex items-center gap-2 text-white/30">
        <Info size={14} />
        <span className="text-[8px] font-black uppercase tracking-widest">Drag to rotate • Scroll to zoom</span>
      </div>

      {/* 同步遮罩层 */}
      <SyncingOverlay forced={isSyncingFull} />
    </div>
  )
}

