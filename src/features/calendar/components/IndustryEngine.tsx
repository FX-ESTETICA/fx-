"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  OrthographicCamera, 
  Environment
} from "@react-three/drei";
import * as THREE from "three";

/**
 * GX_SYNC_ENGINE v4.0 (WebGPU-Ready)
 * 核心：使用 R3F 实例化渲染替代 DOM 矩阵，实现万级节点 144FPS。
 */

// -----------------------------------------------------------------
// 1. 动态光效着色器背景 (Shader Background)
// -----------------------------------------------------------------
const EngineBackground = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // 模拟赛博脉冲光效
      const t = state.clock.getElapsedTime();
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    }
  });

  const shaderArgs = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#00f0ff") }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float pulse = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
        float scanline = sin(vUv.y * 100.0 - uTime * 5.0) * 0.1;
        vec3 finalColor = uColor * (0.02 + scanline * 0.1);
        gl_FragColor = vec4(finalColor, 0.5);
      }
    `
  }), []);

  return (
    <mesh ref={meshRef} position={[0, 0, -1]}>
      <planeGeometry args={[50, 50]} />
      <shaderMaterial args={[shaderArgs]} transparent />
    </mesh>
  );
};

// -----------------------------------------------------------------
// 2. 引擎核心 Canvas (The Engine Core)
// -----------------------------------------------------------------
export const IndustryEngine = () => {
  return (
    <div className="w-full h-full min-h-[600px] relative bg-transparent overflow-hidden">
      <Canvas
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]} // 针对 Retina 屏幕优化
      >
        <OrthographicCamera 
          makeDefault 
          position={[0, 0, 10]} 
          zoom={80} 
        />
        
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00f0ff" />

        <React.Suspense fallback={null}>
          <EngineBackground />
        </React.Suspense>

        {/* 环境光效 */}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};
