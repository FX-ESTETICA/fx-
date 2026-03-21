"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Float } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// --- 降维组件：Mobile-Safe 2D Background ---
function MobileNebulaFallback({ rotation }: { rotation: number }) {
  return (
    <div className="fixed inset-0 bg-[#020202] overflow-hidden">
      {/* 动态渐变云雾 - 提升移动端对比度 */}
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.6, 0.4],
          rotate: rotation * 0.05
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%]"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(0, 242, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 30% 30%, rgba(188, 19, 254, 0.1) 0%, transparent 40%)",
          filter: "blur(60px)",
        }}
      />
      {/* 增强星星层可见度 */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

// --- 极致 3D 组件 (原逻辑) ---
function NebulaParticles({ rotation }: { rotation: number }) {
  const ref = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const count = 4000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const theta = THREE.MathUtils.randFloatSpread(360);
      const phi = THREE.MathUtils.randFloatSpread(360);
      const distance = 8 + Math.random() * 20;
      
      positions[i * 3] = distance * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = distance * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = distance * Math.cos(theta);
      
      const mixedColor = new THREE.Color();
      mixedColor.lerpColors(
        new THREE.Color("#00f2ff"), 
        new THREE.Color("#bc13fe"), 
        Math.random()
      );
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.03 + rotation * 0.005;
    ref.current.rotation.z = state.clock.getElapsedTime() * 0.02;
  });

  return (
    <Points ref={ref} positions={particles.positions} colors={particles.colors} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        vertexColors
        size={0.08}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function OrbitalSpheroids({ rotation }: { rotation: number }) {
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
}

// --- 主入口：自适应保真控制器 ---
export function NebulaBackground({ rotation }: { rotation: number }) {
  const [isLowPowerDevice, setIsLowPowerDevice] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 基础性能检测：仅在极低性能设备下回退
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const hasHighPerformance = gl && (gl as WebGLRenderingContext).getExtension('WEBGL_draw_buffers');

    if (!hasHighPerformance) {
      setIsLowPowerDevice(true);
      console.log("GX_SYSTEM: Low-power device detected. Activating Aesthetic Reduction Mode.");
    }
    
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return <div className="fixed inset-0 bg-black z-0" />;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-black">
      <AnimatePresence mode="wait">
        {isLowPowerDevice ? (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MobileNebulaFallback rotation={rotation} />
          </motion.div>
        ) : (
          <motion.div
            key="3d-nebula"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full"
          >
            <Canvas
              camera={{ position: [0, 0, 20], fov: 60 }}
              gl={{ 
                antialias: true, 
                alpha: true,
                powerPreference: "high-performance" 
              }}
              onCreated={({ gl }) => {
                // 如果 Canvas 渲染失败（Shader 编译错误等），强制回退
                if (!gl) setIsLowPowerDevice(true);
              }}
            >
              <color attach="background" args={["#000000"]} />
              <ambientLight intensity={0.8} />
              <pointLight position={[15, 15, 15]} intensity={2} color="#00f2ff" />
              <pointLight position={[-15, -15, -15]} intensity={1.5} color="#bc13fe" />
              
              <NebulaParticles rotation={rotation} />
              <OrbitalSpheroids rotation={rotation} />
              
              <fog attach="fog" args={["#000000", 25, 45]} />
            </Canvas>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
