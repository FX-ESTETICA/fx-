"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { CALENDAR_BACKGROUNDS, FRONTEND_BACKGROUNDS } from "@/hooks/useBackground";
import { useActiveTab } from "@/hooks/useActiveTab";

// 【物理级静音】拦截底层 R3F 引擎由于内部使用 THREE.Clock 产生的无意义警告，保持控制台绝对全绿。
if (typeof console !== "undefined") {
 const originalWarn = console.warn;
 console.warn = (...args) => {
 if (typeof args[0] === 'string' && args[0].includes('THREE.Clock')) return;
 originalWarn(...args);
 };
}

// --- 降维组件：Mobile-Safe 2D Background ---
function MobileNebulaFallback() {
 return (
 <div className="fixed inset-0 bg-[#020202] overflow-hidden">
 {/* 动态渐变云雾 - 提升移动端对比度 */}
 <motion.div 
 
 
 className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%]"
 style={{
 background: "radial-gradient(circle at 50% 50%, rgba(0, 242, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 30% 30%, rgba(188, 19, 254, 0.1) 0%, transparent 40%)",
 filter: "(60px)",
 }}
 />
 {/* 增强星星层可见度 */}
 <div 
 className="absolute inset-0 "
 style={{
 backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
 backgroundSize: '32px 32px',
 }}
 />
 </div>
 );
}

// --- 极致 3D 组件 (原逻辑) ---
const createSeededRandom = (seed: number) => {
 let t = seed;
 return () => {
 t += 0x6D2B79F5;
 let r = Math.imul(t ^ (t >>> 15), 1 | t);
 r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
 return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
 };
};

export function NebulaParticles({ rotation }: { rotation: number }) {
 const ref = useRef<THREE.Points>(null);
 
 const particles = useMemo(() => {
 // 1. 数量增加到 2000
 const count = 2000;
 const positions = new Float32Array(count * 3);
 const colors = new Float32Array(count * 3);
 const random = createSeededRandom(1337);
 const spread = (range: number) => (random() - 0.5) * range;
 
 for (let i = 0; i < count; i++) {
 const theta = spread(360);
 const phi = spread(360);
 // 2. 距离再拉近一点：从 (12 + 25) 改为 (10 + 20)
 const distance = 10 + random() * 20;
 
 positions[i * 3] = distance * Math.sin(theta) * Math.cos(phi);
 positions[i * 3 + 1] = distance * Math.sin(theta) * Math.sin(phi);
 positions[i * 3 + 2] = distance * Math.cos(theta);
 
 const mixedColor = new THREE.Color();
 mixedColor.lerpColors(
 new THREE.Color("#00f2ff"), 
 new THREE.Color("#bc13fe"), 
 random()
 );
 colors[i * 3] = mixedColor.r;
 colors[i * 3 + 1] = mixedColor.g;
 colors[i * 3 + 2] = mixedColor.b;
 }
 return { positions, colors };
 }, []);

 useFrame((state) => {
 if (!ref.current) return; 
 
 const time = state.clock.elapsedTime;
 
 // 稍微放慢旋转速度，让星空更宁静
 ref.current.rotation.y = time * 0.015 + rotation * 0.005;
 ref.current.rotation.z = time * 0.01;
 });

 return (
 <Points ref={ref} positions={particles.positions} colors={particles.colors} stride={3} frustumCulled={false}>
 <PointMaterial
 transparent
 vertexColors
 // 3. 尺寸微调：从隐形的 0.03 改为可见的 0.05
 size={0.05}
 sizeAttenuation={true}
 depthWrite={false}
 blending={THREE.AdditiveBlending}
 />
 </Points>
 );
}

/* function OrbitalSpheroids({ rotation }: { rotation: number }) {
 const groupRef = useRef<THREE.Group>(null);

 useFrame(() => {
 if (!groupRef.current) return;
 groupRef.current.rotation.y = -rotation * 0.005;
 });

 return (
 <group ref={groupRef}>
 <Float speed={2} rotationIntensity={1} floatIntensity={2}>
 <mesh position={[8, 2, -5]}>
 <sphereGeometry args={[0.8, 32, 32]} />
 <meshStandardMaterial 
 color="#00f2ff" 
 emissive="#00f2ff" 
 emissiveIntensity={2} 
 transparent 
 opacity={0.3} 
 />
 </mesh>
 </Float>
 <Float speed={3} rotationIntensity={2} floatIntensity={1}>
 <mesh position={[-10, -4, -8]}>
 <sphereGeometry args={[1.2, 32, 32]} />
 <meshStandardMaterial 
 color="#7000ff" 
 emissive="#7000ff" 
 emissiveIntensity={1.5} 
 transparent 
 opacity={0.2} 
 />
 </mesh>
 </Float>
 </group>
 );
} */

// --- 主入口：3D 星云控制器 ---
export function NebulaBackground({ rotation }: { rotation?: number }) {
 const [hasError, setHasError] = useState(false);
 const { settings } = useVisualSettings();
 const activeTab = useActiveTab();
 
 // 1. 世界顶端 SSR 同步架构：使用 useActiveTab 获得完美首帧
 const isCalendar = activeTab === 'calendar';

 const displayBgSource = isCalendar 
 ? CALENDAR_BACKGROUNDS[settings.calendarBgIndex] || CALENDAR_BACKGROUNDS[0]
 : FRONTEND_BACKGROUNDS[settings.frontendBgIndex] || FRONTEND_BACKGROUNDS[0];

 // 2. 动态同步 React 状态到原生 body 层，确保设置变更时壁纸实时更新
 useEffect(() => {
 if (typeof window !== 'undefined') {
 const actualSource = displayBgSource === 'starry' ? '/images/backgrounds/A1.jpg' : displayBgSource;
 document.body.style.backgroundImage = `url("${actualSource}")`;
 document.body.style.backgroundSize = 'cover';
 document.body.style.backgroundPosition = 'center';
 document.body.style.backgroundAttachment = 'fixed';
 document.body.style.backgroundRepeat = 'no-repeat';
 }
 }, [displayBgSource]);

 const rot = rotation || 0;

 return (
 <div className="fixed inset-0 z-0 pointer-events-none bg-transparent">
 {/* 3D 星云层 */}
 {settings.showNebula && (
 <AnimatePresence mode="wait">
 {hasError ? (
 <motion.div
 key="fallback"
 
 
 className="absolute inset-0 z-10"
 >
 <MobileNebulaFallback />
 </motion.div>
 ) : (
 <motion.div
 key="3d-nebula"
 
 
 className="absolute inset-0 h-full w-full z-10"
 >
 <Canvas
 camera={{ position: [0, 0, 20], fov: 60 }}
 frameloop="always" // Keep animation running but we handle time ourselves in useFrame
 gl={{ 
 antialias: true, 
 alpha: true,
 powerPreference: "high-performance" 
 }}
 onCreated={({ gl }) => {
 // 仅在 Canvas 渲染失败（极其罕见）时，静默回退
 if (!gl) setHasError(true);
 }}
 onError={() => setHasError(true)}
 style={{ pointerEvents: 'none' }}
 >
 
 <ambientLight intensity={0.8} />
 <pointLight position={[15, 15, 15]} intensity={2} color="#00f2ff" />
 <pointLight position={[-15, -15, -15]} intensity={1.5} color="#bc13fe" />
 
 <NebulaParticles rotation={rot} />
 
 <fog attach="fog" args={["#000000", 25, 45]} />
 </Canvas>
 </motion.div>
 )}
 </AnimatePresence>
 )}
 </div>
 );
}
