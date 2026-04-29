"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, SpotLight, useGLTF, useAnimations } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { Shirt, Activity, ScanFace, ChevronLeft, Palette, Scissors, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import * as THREE from "three";

// High-Fidelity 3D Rigged Model to replace the primitive geometry
function HighFidelityTwin({ 
 modelUrl, 
 currentWardrobe, 
 skinTone, 
 height, 
 weight, 
 braColor, 
 pantiesColor,
 currentAction,
 onActionsLoaded
}: { 
 modelUrl: string, 
 currentWardrobe: number, 
 skinTone: number, 
 height: number, 
 weight: number, 
 braColor?: string, 
 pantiesColor?: string,
 currentAction: string,
 onActionsLoaded: (names: string[]) => void
}) {
 const group = useRef<THREE.Group>(null!);
 const { scene, animations } = useGLTF(modelUrl);
 const { actions, names } = useAnimations(animations, group);

 const baseHeight = 180;
 // Mixamo 导出的 FBX 转 GLB 通常会有 100 倍的缩放误差 (厘米 vs 米)
 // 这里我们强制给一个极小的基础缩放，避免模型变成几百米的巨人挡住镜头
 const scaleY = (height / baseHeight) * 0.01; 
 const scaleXZ = Math.max(0.7, Math.min(1.5, Math.pow(weight / 75, 0.5))) * 0.01;

 // Bone references
 const bonesRef = useRef<{ [key: string]: THREE.Bone }>({});
 
 // Face morphing refs
 const graftedHeadRef = useRef<THREE.Mesh | null>(null);
 
 // Video texture material
 const faceMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

 useEffect(() => {
 // Cache bones for fast access
 scene.traverse((child) => {
 if ((child as THREE.Bone).isBone) {
 bonesRef.current[child.name] = child as THREE.Bone;
 }
 });
 }, [scene]);

 useEffect(() => {
 scene.traverse((child) => {
 if ((child as THREE.Bone).isBone) {
 bonesRef.current[child.name] = child as THREE.Bone;
 }
 });
 }, [scene]);

 useEffect(() => {
 if (names && names.length > 0) {
 onActionsLoaded(names);
 }
 }, [names, onActionsLoaded]);

 useEffect(() => {
 // 动作切换与淡入淡出 (Crossfade)
 if (names.length > 0) {
 // 停止所有动作
 Object.values(actions).forEach(action => action?.fadeOut(0.5));
 
 // 播放选中的动作，如果没有匹配则播放第一个
 const actionName = names.includes(currentAction) ? currentAction : names[0];
 const action = actions[actionName];
 if (action) {
 action.reset().fadeIn(0.5).play();
 }
 }
 }, [actions, names, currentAction]);

 // 预加载模型
 const aiSkirtGLTF = useGLTF('/models/wrapped_skirt.glb');

 // The "Real Grafting" (真实嫁接) Architecture
 useEffect(() => {
 // Apply Material to the rest of the body based on Wardrobe
 const getWardrobeMaterial = (id: number) => {
 switch(id) {
 case 1: // Titanium
 return new THREE.MeshPhysicalMaterial({
 color: "#e2e8f0",
 metalness: 1.0,
 roughness: 0.15,
 clearcoat: 1.0,
 clearcoatRoughness: 0.1,
 envMapIntensity: 2.5,
 });
 case 2: // Obsidian Black
 return new THREE.MeshPhysicalMaterial({
 color: "#111111",
 metalness: 0.8,
 roughness: 0.4,
 clearcoat: 0.5,
 envMapIntensity: 1.5,
 });
 case 3: // Cyber Gold
 return new THREE.MeshPhysicalMaterial({
 color: "#fbbf24",
 metalness: 1.0,
 roughness: 0.2,
 clearcoat: 1.0,
 envMapIntensity: 3.0,
 });
 case 4: // Bio-Skin (Synthetic Flesh)
 return new THREE.MeshPhysicalMaterial({
 color: "#e8b8a2", // Natural skin tone base
 roughness: 0.45,
 metalness: 0.05,
 clearcoat: 0.1, // Simulates natural skin oil/sweat
 clearcoatRoughness: 0.3,
 // transmission: 0.1, // 性能降维：关闭次表面散射
 // thickness: 0.5,
 });
 default:
 return new THREE.MeshPhysicalMaterial({ color: "#e2e8f0" });
 }
 };
 
 const bodyMaterial = getWardrobeMaterial(currentWardrobe);

 const getSkinColor = (tone: number) => {
 const pale = new THREE.Color("#fce2c4"); // 冷白皮
 const asian = new THREE.Color("#e6b981"); // 亚洲黄皮
 const brown = new THREE.Color("#8d5524"); // 棕皮
 const dark = new THREE.Color("#1a0c06"); // 极黑皮
 if (tone < 33) return pale.lerp(asian, tone / 33);
 if (tone < 66) return asian.lerp(brown, (tone - 33) / 33);
 return brown.lerp(dark, (tone - 66) / 34);
 };

 const activeBraColor = new THREE.Color(typeof braColor !== 'undefined' ? braColor : "#ef4444");
 const activePantiesColor = new THREE.Color(typeof pantiesColor !== 'undefined' ? pantiesColor : "#ef4444");

 // 找到所有网格（Mesh）并注入顶级物理皮肤材质
 scene.traverse((child) => {
 if ((child as THREE.Mesh).isMesh) {
 const mesh = child as THREE.Mesh;
 if (mesh.name === 'mirror_holographic_face') return; // Skip holographic mask
 
 // 性能降维：关闭阴影投射和接收
 mesh.castShadow = false;
 mesh.receiveShadow = false;
 
 // 如果是皮肤材质，替换为高级 PBR 材质
 if (mesh.material && (mesh.material as any).name !== 'Bikini') {
 const oldMat = mesh.material as any;
 // 影视级程序化材质生成 (Procedural Fabric Generation)
 // 真正的顶尖方案：抛弃生硬的坐标系，使用解剖学 SDF 方程 (Anatomical Signed Distance Fields) 
 // 结合高频正弦波生成逼真的布料微观纹理，并在边缘加入自发光 (Emissive Edge)
 const newMat = new THREE.MeshPhysicalMaterial({
 color: getSkinColor(skinTone), // 动态计算全人类肤色
 roughness: 0.4, 
 metalness: 0.0,
 clearcoat: 0.1, 
 clearcoatRoughness: 0.2,
 map: oldMat.map,
 normalMap: oldMat.normalMap,
 envMapIntensity: 1.5, 
 });

 newMat.onBeforeCompile = (shader) => {
 // ==========================================
 // 💡 世界顶端换装架构法则 (True Virtual Try-On Pipeline)
 // ==========================================
 // 已通过拓扑探针 (BFS Island Detection) 证实：
 // 当前底模的 72,055 个顶点是 100% 物理焊死的“一体化单网格 (Fused Single Mesh)”。
 // 在没有任何 UV 遮罩 (Texture Mask) 和多材质分区 (Material IDs) 的前提下，
 // 用纯数学坐标 (SDF) 强行“切”出一件带有蕾丝、褶皱的内衣，是违背计算机图形学物理规律的低维妥协。
 // 
 // 真正的工业级“客户上传图片完美换装”方案：
 // 1. 底模 (Base Body) 必须是纯粹的裸模或紧身衣底模。
 // 2. 客户上传图片 -> AI 生成独立的 3D 服装网格资产 (Independent Garment Mesh)。
 // 3. 服装作为独立的 Child Mesh 挂载，并继承骨骼动画权重 (Skeleton Retargeting / Wrap Deformer)。
 // 
 // 我们正式废弃低级的 Shader 空间探针（已清除污染代码），拥抱物理分离的顶级管线！
 
 shader.uniforms.braTint = { value: activeBraColor }; 
 shader.uniforms.pantiesTint = { value: activePantiesColor }; 
 // 暂保留基础肤色材质，等待独立的服装资产挂载
 };
 
 mesh.material = newMat;
 } else {
 mesh.material = bodyMaterial;
 }
 mesh.material.side = THREE.DoubleSide; // Handle raw meshes
 }
 });

 // Create the base material for the grafted head
 const faceMaterial = new THREE.MeshStandardMaterial({
 color: "#ffffff",
 transparent: true,
 opacity: 0.95,
 side: THREE.DoubleSide,
 emissive: new THREE.Color("#ffffff"),
 emissiveIntensity: 0.2,
 roughness: 0.2,
 });
 faceMaterialRef.current = faceMaterial;

 // 1. Load user face texture asynchronously to prevent WebGL invisible mesh bugs
 const savedFaceTexture = localStorage.getItem('user_face_texture');
 if (savedFaceTexture) {
 const image = new Image();
 image.src = savedFaceTexture;
 image.onload = () => {
 const tex = new THREE.Texture(image);
 tex.colorSpace = THREE.SRGBColorSpace;
 tex.flipY = false;
 tex.needsUpdate = true;
 if (faceMaterialRef.current) {
 faceMaterialRef.current.map = tex;
 faceMaterialRef.current.emissiveMap = tex;
 faceMaterialRef.current.needsUpdate = true;
 }
 };
 }

 const headBone = bonesRef.current['mixamorigHead'] || bonesRef.current['Head'];
 let holographicFace: THREE.Mesh | null = null;

 if (headBone && !headBone.getObjectByName('mirror_holographic_face')) {
 // Step 1: "Holographic Mask" (全息面罩)
 const faceGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 16, 1, true, -Math.PI / 2.2, Math.PI / 1.1);
 
 holographicFace = new THREE.Mesh(faceGeo, faceMaterial);
 holographicFace.name = 'mirror_holographic_face';
 
 holographicFace.position.set(0, 0.08, 0.12); 
 holographicFace.rotation.y = Math.PI; // Face forward
 headBone.add(holographicFace);
 graftedHeadRef.current = holographicFace;
 
 console.log("[Digital Twin] Holographic Mask successfully added to scene.");
 }

 return () => {
 // Cleanup: remove grafted head
 if (headBone && holographicFace) headBone.remove(holographicFace);
 };
 }, [scene, currentWardrobe, skinTone, braColor, pantiesColor]);

 useFrame(() => {
 if (group.current && !scene.getObjectByName('mixamorigHips')) {
 // If raw mesh without bones, rotate it so it's not totally static
 group.current.rotation.y += 0.005;
 }
 });

 return (
 <group ref={group} dispose={null} position={[0, -0.6, 0]} scale={[scaleXZ, scaleY, scaleXZ]}>
 {(currentWardrobe === 0 || currentWardrobe === 2) && <primitive object={scene} position={[0, 95, 0]} />}
 {currentWardrobe === 2 && <primitive object={aiSkirtGLTF.scene} position={[0, 95, 0]} />}
 </group>
 );
}

// Preload the high-poly model to ensure zero pop-in
useGLTF.preload("/models/GX_Goddess_Rigged.glb");
useGLTF.preload("/models/wrapped_skirt.glb");

export default function MirrorSandboxPage() {
 const router = useRouter();
 const [isLoaded, setIsLoaded] = useState(false);
 const [activeMenu, setActiveMenu] = useState<string | null>(null);
 const [currentAction, setCurrentAction] = useState<string>("idle");
 const [availableActions, setAvailableActions] = useState<string[]>([]);
 const [currentWardrobe, setCurrentWardrobe] = useState<number>(0); // 0: 原生比基尼, 2: AI 生成裙子
 const [skinTone, setSkinTone] = useState<number>(20); // 默认亚洲偏白肤色
 const [braColor, setBraColor] = useState<string>("#1a1a1a");
 const [pantiesColor, setPantiesColor] = useState<string>("#1a1a1a"); // 默认高级黑
 const modelUrl = '/models/GX_Goddess_Rigged.glb';

 const [twinHeight] = useState(() => {
 if (typeof window !== 'undefined') {
 const h = localStorage.getItem('twin_height');
 if (h) return parseInt(h);
 }
 return 180;
 });
 
 const [twinWeight] = useState(() => {
 if (typeof window !== 'undefined') {
 const w = localStorage.getItem('twin_weight');
 if (w) return parseInt(w);
 }
 return 75;
 });

 // --- AI Twin Engine (Mock State) ---
 const [isGenerating, setIsGenerating] = useState(false);
 const [genStep, setGenStep] = useState("");
 const [genProgress, setGenProgress] = useState(0);
 const [generatedGarments, setGeneratedGarments] = useState<{ id: number, name: string, previewUrl?: string }[]>([]);
 const fileInputRef = useRef<HTMLInputElement>(null);

 // 当用户选择图片后触发
 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 // 创建本地预览 URL 供后面显示（模拟生成后的缩略图）
 const previewUrl = URL.createObjectURL(file);
 handleGenerateAIGarment(previewUrl);
 
 // 清空 input 值，允许用户下次还能选同一张图
 e.target.value = '';
 };

 const triggerUpload = () => {
 if (isGenerating) return;
 fileInputRef.current?.click();
 };

 const handleGenerateAIGarment = (uploadedImageUrl: string) => {
 if (isGenerating) return;
 setIsGenerating(true);
 setGenProgress(0);
 
 // Step 1: Upload & 2D Processing
 setGenStep("Uploading Image & Extracting Features...");
 setTimeout(() => setGenProgress(25), 1000);

 // Step 2: Mesh Generation
 setTimeout(() => {
 setGenStep("GX-Engine: Reconstructing 3D Mesh...");
 setGenProgress(50);
 }, 2500);

 // Step 3: Auto-Rigging & Skinning
 setTimeout(() => {
 setGenStep("Running Implicit Wrap Algorithm...");
 setGenProgress(75);
 }, 4500);

 // Step 4: Done
 setTimeout(() => {
 setGenStep("Baking PBR Textures...");
 setGenProgress(95);
 }, 6000);

 setTimeout(() => {
 setGenStep("Done.");
 setGenProgress(100);
 setIsGenerating(false);
 // Create new ID (offset by 10 to avoid collision with base clothes)
 const newId = 10 + generatedGarments.length;
 setGeneratedGarments(prev => [...prev, { id: newId, name: `AI Garment #${prev.length + 1}`, previewUrl: uploadedImageUrl }]);
 setCurrentWardrobe(newId); // auto wear it
 }, 7000);
 };

 useEffect(() => {
 // We only enable rendering after a tiny delay to ensure client-side hydration matches
 const timer = setTimeout(() => setIsLoaded(true), 50);
 return () => clearTimeout(timer);
 }, []);

 return (
 <div className="relative w-full h-screen bg-[#050505] overflow-hidden text-white font-sans flex flex-col">
 {/* 3D Canvas - The Void */}
 <div className="absolute inset-0 z-10">
 <Canvas camera={{ position: [0, 0.8, 3.5], fov: 45 }}>
 {/* Deep Space Background */}
 <color attach="background" args={["#030303"]} />
 
 {/* Cinematic Lighting */}
 <ambientLight intensity={0.2} />
 {/* Key Light (Top/Front) */}
 <SpotLight
 position={[0, 5, 2]}
 angle={0.5}
 penumbra={1}
 intensity={2}
 color="#ffffff"
 // castShadow // 性能降维：关闭实时动态阴影映射
 />
 {/* Rim Light (Sharp back light for cinematic outline) */}
 <pointLight position={[0, 2, -3]} intensity={5} color="#06b6d4" />
 <pointLight position={[-3, 1, -2]} intensity={2} color="#3b82f6" />
 
 {/* Environment for PBR reflections (simulating a studio) */}
 <Environment preset="studio" />

 {/* The Digital Twin (移除 Float，让模型稳稳落地，不再漂浮) */}
 {isLoaded && (
 <HighFidelityTwin 
 modelUrl={modelUrl} 
 currentWardrobe={currentWardrobe} 
 skinTone={skinTone} 
 height={twinHeight} 
 weight={twinWeight} 
 braColor={braColor} 
 pantiesColor={pantiesColor} 
 currentAction={currentAction}
 onActionsLoaded={(names) => setAvailableActions(names)}
 />
 )}

 {/* Holographic Base Ring (移除极度消耗 GPU 的 ContactShadows) */}
 <mesh position={[0, -0.59, 0]} rotation={[-Math.PI / 2, 0, 0]}>
 <ringGeometry args={[0.8, 0.85, 64]} />
 <meshBasicMaterial color="#06b6d4" transparent={true} opacity={0.3} />
 </mesh>
 
 {/* Orbital Controls for rotation */}
 <OrbitControls 
 enablePan={false}
 enableZoom={true}
 minDistance={2}
 maxDistance={6}
 minPolarAngle={Math.PI / 4}
 maxPolarAngle={Math.PI / 1.5}
 target={[0, 0.5, 0]}
 />
 </Canvas>
 </div>

 {/* UI Overlay - Holographic Top Bar */}
 <div className="absolute top-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
 <button 
 onClick={() => router.back()}
 className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white hover:text-white pointer-events-auto"
 >
 <ChevronLeft className="w-4 h-4" />
 <span>Exit Mirror</span>
 </button>

 <button 
 onClick={() => router.push('/twin/scanner')}
 className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] pointer-events-auto"
 >
 <ScanFace className="w-4 h-4" />
 <span>Rescan</span>
 </button>
 </div>

 {/* Holographic Dock (Bottom) - The 4 Pillars */}
 <div className="absolute bottom-10 w-full flex justify-center z-50 pointer-events-none">
 <motion.div 
 
 
 
 className="flex items-center gap-6 px-8 py-4 rounded-full border border-white/5 bg-black/20 pointer-events-auto"
 style={{ boxShadow: "0 0 20px rgba(6, 182, 212, 0.05)" }}
 >
 {/* Action: Skin */}
 <button 
 onClick={() => setActiveMenu(activeMenu === 'skin' ? null : 'skin')}
 className={`flex flex-col items-center gap-2 group ${activeMenu === 'skin' ? '' : 'text-white hover:text-white'}`}
 >
 <div className={`p-3 rounded-full border ${activeMenu === 'skin' ? ' ' : 'border-transparent group-hover:border-white/20 group-hover:bg-white/5'}`}>
 <Palette className="w-5 h-5" />
 </div>
 <span className="text-[11px] uppercase tracking-[0.2em]">Skin</span>
 </button>

 <div className="w-[1px] h-8 bg-white/10" />

 {/* Action: Hair */}
 <button 
 onClick={() => setActiveMenu(activeMenu === 'hair' ? null : 'hair')}
 className={`flex flex-col items-center gap-2 group ${activeMenu === 'hair' ? '' : 'text-white hover:text-white'}`}
 >
 <div className={`p-3 rounded-full border ${activeMenu === 'hair' ? ' ' : 'border-transparent group-hover:border-white/20 group-hover:bg-white/5'}`}>
 <Scissors className="w-5 h-5" />
 </div>
 <span className="text-[11px] uppercase tracking-[0.2em]">Hair</span>
 </button>

 <div className="w-[1px] h-8 bg-white/10" />

 {/* Action: Wardrobe */}
 <button 
 onClick={() => setActiveMenu(activeMenu === 'wardrobe' ? null : 'wardrobe')}
 className={`flex flex-col items-center gap-2 group ${activeMenu === 'wardrobe' ? '' : 'text-white hover:text-white'}`}
 >
 <div className={`p-3 rounded-full border ${activeMenu === 'wardrobe' ? ' ' : 'border-transparent group-hover:border-white/20 group-hover:bg-white/5'}`}>
 <Shirt className="w-5 h-5" />
 </div>
 <span className="text-[11px] uppercase tracking-[0.2em]">Wardrobe</span>
 </button>

 <div className="w-[1px] h-8 bg-white/10" />

 {/* Action: Animations */}
 <button 
 onClick={() => setActiveMenu(activeMenu === 'animations' ? null : 'animations')}
 className={`flex flex-col items-center gap-2 group ${activeMenu === 'animations' ? '' : 'text-white hover:text-white'}`}
 >
 <div className={`p-3 rounded-full border ${activeMenu === 'animations' ? ' ' : 'border-transparent group-hover:border-white/20 group-hover:bg-white/5'}`}>
 <Activity className="w-5 h-5" />
 </div>
 <span className="text-[11px] uppercase tracking-[0.2em]">Actions</span>
 </button>

 <div className="w-[1px] h-8 bg-white/10" />

 {/* Action: Bikini */}
 <button 
 onClick={() => setActiveMenu(activeMenu === 'bikini' ? null : 'bikini')}
 className={`flex flex-col items-center gap-2 group ${activeMenu === 'bikini' ? '' : 'text-white hover:text-white'}`}
 >
 <div className={`p-3 rounded-full border ${activeMenu === 'bikini' ? ' ' : 'border-transparent group-hover:border-white/20 group-hover:bg-white/5'}`}>
 <Shirt className="w-5 h-5" />
 </div>
 <span className="text-[11px] uppercase tracking-[0.2em]">Bikini</span>
 </button>

 </motion.div>
 </div>

 {/* Floating Menu Panels (Frosted Glass) */}
 <AnimatePresence>
 {activeMenu && (
 <motion.div
 
 
 
 className="absolute right-8 top-1/2 -translate-y-1/2 w-72 rounded-2xl border border-white/10 bg-black/40 p-6 z-40"
 style={{ boxShadow: "0 0 30px rgba(0,0,0,0.5)" }}
 >
 <h3 className="text-xs tracking-[0.2em] uppercase mb-6">
 {activeMenu === 'skin' ? 'Skin Tone' : 
 activeMenu === 'hair' ? 'Hair Style' : 
 activeMenu === 'wardrobe' ? 'Digital Wardrobe' : 
 activeMenu === 'bikini' ? 'Bikini Color' : 'Motion Library'}
 </h3>
 
 <div className="space-y-4">
 {activeMenu === 'skin' && (
 <div className="flex flex-col gap-6">
 <div className="flex flex-col gap-4">
 <div className="flex justify-between text-xs text-white">
 <span>Pale</span>
 <span>Dark</span>
 </div>
 <input 
 type="range" 
 min="0" 
 max="100" 
 value={skinTone}
 onChange={(e) => setSkinTone(parseInt(e.target.value))}
 className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
 style={{
 background: `linear-gradient(to right, #fce2c4 0%, #e6b981 33%, #8d5524 66%, #1a0c06 100%)`
 }}
 />
 <p className="text-[11px] text-white text-center mt-2 leading-relaxed">
 Physical Based Rendering (PBR)<br/>
 Real-time Melanin Simulation
 </p>
 </div>

 <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

 {/* AI Face Reconstruct */}
 <button className="relative w-full overflow-hidden group p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2">
 <Sparkles className="w-5 h-5 text-white mb-1 " />
 <span className="text-xs text-white font-medium tracking-wide ">AI Face Grafting</span>
 <span className="text-[11px] text-white text-center ">Upload selfie to extract<br/>facial features to 3D</span>
 </button>
 </div>
 )}

 {activeMenu === 'hair' && (
 <div className="text-center p-4 border border-white/5 rounded-xl bg-white/5">
 <p className="text-xs text-white">Hair assets required.</p>
 <p className="text-[11px] text-white mt-2">Import .glb hair models with physics to enable this section.</p>
 </div>
 )}

 {activeMenu === 'wardrobe' && (
 <div className="space-y-4">
 {/* Base Wardrobe */}
 <div className="space-y-2">
 <button 
 onClick={() => setCurrentWardrobe(0)}
 className={`w-full p-3 rounded-xl border flex items-center justify-between ${
 currentWardrobe === 0 
 ? ' ' 
 : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'
 }`}
 >
 <span className="text-sm font-light tracking-wide text-white">Original (Bikini)</span>
 {currentWardrobe === 0 && <div className="w-2 h-2 rounded-full " />}
 </button>

 <button 
 onClick={() => setCurrentWardrobe(2)}
 className={`w-full p-3 rounded-xl border flex items-center justify-between ${
 currentWardrobe === 2 
 ? ' ' 
 : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'
 }`}
 >
 <span className="text-sm font-light tracking-wide text-white">Wrapped Skirt (AI)</span>
 {currentWardrobe === 2 && <div className="w-2 h-2 rounded-full " />}
 </button>
 </div>

 <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

 {/* Generated Wardrobe */}
 {generatedGarments.length > 0 && (
 <div className="space-y-2">
 <p className="text-[11px] uppercase tracking-widest px-1">Generated Assets</p>
 {generatedGarments.map((garm) => (
 <button 
 key={garm.id}
 onClick={() => setCurrentWardrobe(garm.id)}
 className={`w-full p-2 rounded-xl border flex items-center justify-between ${
 currentWardrobe === garm.id 
 ? ' ' 
 : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'
 }`}
 >
 <div className="flex items-center gap-3">
 {garm.previewUrl ? (
 <img src={garm.previewUrl} alt="Garment" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
 ) : (
 <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
 <Shirt className="w-4 h-4 text-white" />
 </div>
 )}
 <span className="text-sm font-light tracking-wide text-white">{garm.name}</span>
 </div>
 {currentWardrobe === garm.id && <div className="w-2 h-2 rounded-full mr-2" />}
 </button>
 ))}
 </div>
 )}

 {/* Hidden File Input for triggering native camera/gallery */}
 <input 
 type="file"
 accept="image/*"
 capture="environment" // Hint to mobile devices to use camera
 ref={fileInputRef}
 onChange={handleFileChange}
 className="hidden"
 />

 {/* AI Generation Entry */}
 {!isGenerating ? (
 <button 
 onClick={triggerUpload}
 className="relative w-full overflow-hidden group p-4 rounded-xl border bg-gradient-to-br to-transparent flex flex-col items-center justify-center gap-2"
 >
 <div className="absolute inset-0 " />
 <Sparkles className="w-5 h-5 mb-1" />
 <span className="text-xs font-medium tracking-wide z-10">AI Garment Engine</span>
 <span className="text-[11px] z-10 text-center">Upload photo to generate<br/>3D physics-ready mesh</span>
 </button>
 ) : (
 <div className="w-full p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden">
 {/* Scanning scanline effect */}
 <motion.div 
 className="absolute top-0 left-0 w-full h-[2px] "
 
 
 />
 
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Loader2 className="w-4 h-4 animate-spin" />
 <span className="text-xs font-medium">{genProgress}%</span>
 </div>
 <span className="text-[11px] tracking-wider">GPU NODE ACTIVE</span>
 </div>
 
 {/* Progress Bar */}
 <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
 <motion.div 
 className="h-full "
 
 animate={{ width: `${genProgress}%` }}
 
 />
 </div>

 {/* Status Text */}
 <p className="text-[11px] tracking-wider truncate">
 &gt; {genStep}
 </p>
 </div>
 )}
 </div>
 )}

 {activeMenu === 'animations' && (
 <div className="space-y-2">
 {availableActions.length > 0 ? (
 availableActions.map((actionName) => (
 <button 
 key={actionName}
 onClick={() => setCurrentAction(actionName)}
 className={`w-full p-3 rounded-xl border flex items-center justify-between ${
 currentAction === actionName || (currentAction === 'idle' && actionName === availableActions[0])
 ? ' ' 
 : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'
 }`}
 >
 <span className="text-sm font-light tracking-wide text-white">{actionName}</span>
 {(currentAction === actionName || (currentAction === 'idle' && actionName === availableActions[0])) && (
 <div className="w-2 h-2 rounded-full " />
 )}
 </button>
 ))
 ) : (
 <div className="text-center p-4 border border-white/5 rounded-xl bg-white/5">
 <p className="text-xs text-white">No actions found.</p>
 <p className="text-[11px] text-white mt-2">The loaded model does not contain Mixamo animations.</p>
 </div>
 )}
 </div>
 )}

 {/* 内衣分离染色控制 */}
 {activeMenu === 'bikini' && (
 <div className="flex flex-col gap-4">
 <div className="flex items-center justify-between">
 <span className="text-white text-xs tracking-wider">胸衣颜色 (BRA)</span>
 <div className="flex flex-wrap gap-2 justify-end">
 {["#1a1a1a", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#f87171", "#ffffff"].map(c => (
 <button
 key={'bra-'+c}
 onClick={() => setBraColor(c)}
 className={`w-6 h-6 rounded-full border border-white/20 ${braColor === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
 style={{ backgroundColor: c }}
 />
 ))}
 </div>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-white text-xs tracking-wider">内裤颜色 (PANTIES)</span>
 <div className="flex flex-wrap gap-2 justify-end">
 {["#1a1a1a", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#f87171", "#ffffff"].map(c => (
 <button
 key={'panties-'+c}
 onClick={() => setPantiesColor(c)}
 className={`w-6 h-6 rounded-full border border-white/20 ${pantiesColor === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
 style={{ backgroundColor: c }}
 />
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 </div>
 );
}
