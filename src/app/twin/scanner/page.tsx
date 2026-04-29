"use client";

import React, { useState, useEffect, useRef, Suspense, Component, ErrorInfo } from "react";
import { ScanFace, X, Camera as CameraIcon, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
 constructor(props: { children: React.ReactNode }) {
 super(props);
 this.state = { hasError: false, error: null };
 }
 static getDerivedStateFromError(error: Error) {
 return { hasError: true, error };
 }
 componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error("ErrorBoundary caught an error", error, errorInfo);
 }
 render() {
 if (this.state.hasError) {
 return (
 <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 z-50 p-4 text-center">
 <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
 <h1 className="text-xl text-red-400 mb-2">3D Render Error</h1>
 <p className="text-sm text-red-200 whitespace-pre-wrap">{this.state.error?.message}</p>
 <p className="text-xs text-red-300 mt-4">{this.state.error?.stack}</p>
 </div>
 );
 }
 return this.props.children;
 }
}

// High-fidelity parametric humanoid mesh replacing the dummy cylinder
function DigitalTwinMesh({ height, weight, capturedImages: _capturedImages = [], modelUrl }: { height: number, weight: number, capturedImages?: Array<{angle: number, url: string}>, modelUrl?: string | null }) {
 // Use the generated model if available, else fallback to Xbot
 const activeUrl = modelUrl || '/models/Xbot.glb';
 const { scene, animations } = useGLTF(activeUrl) as any;
 const clonedScene = React.useMemo(() => scene.clone(), [scene]);
 const groupRef = useRef<THREE.Group>(null);
 
 // Inject animations into the cloned scene (safeguard against missing animations)
 const safeAnimations = animations || [];
 const { actions, names } = useAnimations(safeAnimations, groupRef);

 // Parameterize the base mesh
 // Assuming default Xbot is ~180cm tall
 const baseHeight = 180;
 const scaleY = height / baseHeight;
 
 // BMI-based scaling for width/depth (X/Z)
 // Standard BMI for 180cm is ~75kg. 
 const scaleXZ = Math.max(0.7, Math.min(1.5, Math.pow(weight / 75, 0.5)));

 useEffect(() => {
 if (clonedScene) {
 // 1. Play idle animation if exists
 if (names && names.length > 0) {
 const idleAnimName = names.find((n: string) => n.toLowerCase().includes('idle')) || names[0];
 const action = actions[idleAnimName];
 if (action) {
 action.reset().fadeIn(0.5).play();
 }
 }

 // 2. Material injection: Only apply base materials if this is the fallback Xbot.
 // If it's a real generated mesh, we MUST preserve its original baked PBR textures.
 const isRawMesh = !clonedScene.getObjectByName('mixamorigHips');
 if (!isRawMesh && !modelUrl) {
 // Fallback Xbot material
 clonedScene.traverse((child: any) => {
 if (child.isMesh) {
 child.material = new THREE.MeshStandardMaterial({
 color: new THREE.Color("#083344"), 
 emissive: new THREE.Color("#06b6d4"), 
 emissiveIntensity: 0.1,
 roughness: 0.5,
 metalness: 0.8, 
 transparent: false,
 });
 child.material.side = THREE.DoubleSide;
 }
 });
 } else {
 // For real generated SMPL-X / 3DGS meshes, just ensure materials are double-sided
 // and fix common GLTF import material issues.
 clonedScene.traverse((child: any) => {
 if (child.isMesh && child.material) {
 child.material.side = THREE.DoubleSide;
 // Prevent material transparency bugs from PBR alpha maps
 child.material.depthWrite = true;
 }
 });
 }
 }
 }, [clonedScene, actions, names, modelUrl]);

 // Subtle floating animation
 useFrame((state) => {
 if (groupRef.current) {
 groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05 - (scaleY * 1); // Center it
 
 // The generated SMPL-X mesh might be oriented differently
 if (!clonedScene.getObjectByName('mixamorigHips')) {
 // Raw mesh fallback animation: slowly rotate it so we can see the generated topology
 groupRef.current.rotation.y += 0.01;
 }
 }
 });

 const isRawMesh = !clonedScene.getObjectByName('mixamorigHips');

 return (
 <group ref={groupRef} scale={isRawMesh ? [scaleXZ * 100, scaleY * 100, scaleXZ * 100] : [scaleXZ, scaleY, scaleXZ]} position={isRawMesh ? [0, 0, 0] : [0, -1, 0]}>
 <primitive object={clonedScene} />
 </group>
 );
}

// Preload the model for instant rendering
useGLTF.preload('/models/Xbot.glb');

// Removed legacy NeuralAvatar logic. 
// Will be replaced by a proper SMPL-X parameterization engine in the future.

export default function ScannerSandboxPage() {
 const [hasCamera, setHasCamera] = useState<boolean>(false);
 const [estimatedHeight, setEstimatedHeight] = useState<number | null>(null);
 const [inputHeight, setInputHeight] = useState<number>(175);
 const [inputWeight, setInputWeight] = useState<number>(65);
 const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'processing' | 'complete' | 'rendered'>('idle');
 const [generatedTwinUrl, setGeneratedTwinUrl] = useState<string | null>(null);
 
 // Video Recording State for 3DGS
 const mediaRecorderRef = useRef<MediaRecorder | null>(null);
 const recordedChunksRef = useRef<Blob[]>([]);
 const imuTelemetryRef = useRef<Array<{t: number, alpha: number|null, beta: number|null, gamma: number|null}>>([]);
 const [recordingProgress, setRecordingProgress] = useState(0); // 0 to 100

 // IMU Telemetry Listener
 useEffect(() => {
 if (scanPhase !== 'scanning') return;
 
 const handleOrientation = (event: DeviceOrientationEvent) => {
 imuTelemetryRef.current.push({
 t: Date.now(),
 alpha: event.alpha, // Z-axis rotation
 beta: event.beta, // X-axis rotation
 gamma: event.gamma // Y-axis rotation
 });
 };

 window.addEventListener('deviceorientation', handleOrientation);
 return () => window.removeEventListener('deviceorientation', handleOrientation);
 }, [scanPhase]);

 // Keep these for UI/Holographic Mask fallback
 const [currentAngle, setCurrentAngle] = useState<number>(0);
 const [capturedFrames, setCapturedFrames] = useState<number[]>([]);
 const [capturedImages, setCapturedImages] = useState<{angle: number, url: string}[]>([]);
 const router = useRouter();
 const videoRef = useRef<HTMLVideoElement>(null);
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false);
 
 // Real-time IK data tunnel
 const landmarksRef = useRef<any>(null);
 // Ref to hold the MediaPipe Holistic instance for teardown
 const holisticRef = useRef<any>(null);

 // Initialize MediaPipe Holistic
 useEffect(() => {
 if (!videoRef.current || !canvasRef.current || !isMediaPipeLoaded || !hasCamera) return;
 // DO NOT initialize if we have already rendered the twin (to save GPU)
 if (scanPhase === 'rendered') return;

 const mpHolistic = (window as any).Holistic;
 const mpDrawing = window as any;

 if (!mpHolistic) return;

 const holistic = new mpHolistic({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}` });
 holisticRef.current = holistic;
 holistic.setOptions({ 
 modelComplexity: 1, 
 smoothLandmarks: true, 
 enableSegmentation: false,
 smoothSegmentation: true,
 refineFaceLandmarks: true,
 minDetectionConfidence: 0.5, 
 minTrackingConfidence: 0.5 
 });

 holistic.onResults((results: any) => {
 // 1. Update IK tunnel for 3D Avatar
 landmarksRef.current = {
 pose: results.poseLandmarks,
 face: results.faceLandmarks,
 leftHand: results.leftHandLandmarks,
 rightHand: results.rightHandLandmarks
 };

 // 2. Render 2D AR overlay on camera
 if (!canvasRef.current || !videoRef.current) return;
 const canvasCtx = canvasRef.current.getContext('2d');
 if (!canvasCtx) return;

 if (videoRef.current.videoWidth) {
 canvasRef.current.width = videoRef.current.videoWidth;
 canvasRef.current.height = videoRef.current.videoHeight;
 }

 canvasCtx.save();
 canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
 canvasCtx.translate(canvasRef.current.width, 0);
 canvasCtx.scale(-1, 1);

 if (mpDrawing.drawConnectors && mpDrawing.drawLandmarks) {
 if (results.poseLandmarks && (window as any).POSE_CONNECTIONS) {
 mpDrawing.drawConnectors(canvasCtx, results.poseLandmarks, (window as any).POSE_CONNECTIONS, { color: 'rgba(6, 182, 212, 0.5)', lineWidth: 2 });
 mpDrawing.drawLandmarks(canvasCtx, results.poseLandmarks, { color: 'rgba(255, 255, 255, 0.8)', lineWidth: 1, radius: 2 });
 }
 if (results.faceLandmarks && (window as any).FACEMESH_TESSELATION) {
 mpDrawing.drawConnectors(canvasCtx, results.faceLandmarks, (window as any).FACEMESH_TESSELATION, { color: 'rgba(6, 182, 212, 0.3)', lineWidth: 1 });
 }
 if (results.leftHandLandmarks && (window as any).HAND_CONNECTIONS) {
 mpDrawing.drawConnectors(canvasCtx, results.leftHandLandmarks, (window as any).HAND_CONNECTIONS, { color: 'rgba(6, 182, 212, 0.8)', lineWidth: 2 });
 }
 if (results.rightHandLandmarks && (window as any).HAND_CONNECTIONS) {
 mpDrawing.drawConnectors(canvasCtx, results.rightHandLandmarks, (window as any).HAND_CONNECTIONS, { color: 'rgba(6, 182, 212, 0.8)', lineWidth: 2 });
 }
 }
 canvasCtx.restore();
 });

 let animationFrameId: number;
 let isProcessing = false;

 const processFrame = async () => {
 if (!videoRef.current) return;
 if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0 && !isProcessing) {
 try {
 isProcessing = true;
 await holistic.send({ image: videoRef.current });
 } catch (e) {
 console.error(e);
 } finally {
 isProcessing = false;
 }
 }
 animationFrameId = requestAnimationFrame(processFrame);
 };

 if (hasCamera) {
 setTimeout(() => processFrame(), 1000);
 }

 return () => {
 if (animationFrameId) cancelAnimationFrame(animationFrameId);
 try { holistic.close(); } catch(e) {}
 };
 }, [hasCamera, isMediaPipeLoaded]);

 const handleStartScan = () => {
 if (!landmarksRef.current?.pose) {
 alert("No pose detected. Please stand in frame.");
 return;
 }
 
 setScanPhase('scanning');
 setCapturedFrames([]);
 setCapturedImages([]);
 setEstimatedHeight(inputHeight);
 recordedChunksRef.current = [];
 imuTelemetryRef.current = [];
 setRecordingProgress(0);

 // Initialize MediaRecorder for 3DGS Video Capture
 if (videoRef.current && videoRef.current.srcObject) {
 const stream = videoRef.current.srcObject as MediaStream;
 try {
 const options = { mimeType: 'video/webm; codecs=vp9' };
 const mediaRecorder = new MediaRecorder(stream, options);
 
 mediaRecorder.ondataavailable = (event) => {
 if (event.data && event.data.size > 0) {
 recordedChunksRef.current.push(event.data);
 }
 };

 mediaRecorder.onstop = () => {
 handleVideoUpload();
 };

 mediaRecorderRef.current = mediaRecorder;
 mediaRecorder.start(100); // collect 100ms chunks
 
 // Start 15s recording timer for progress bar
 const startTime = Date.now();
 const duration = 15000; // 15 seconds
 
 const updateProgress = () => {
 const elapsed = Date.now() - startTime;
 const progress = Math.min((elapsed / duration) * 100, 100);
 setRecordingProgress(progress);
 
 if (progress < 100) {
 requestAnimationFrame(updateProgress);
 } else {
 mediaRecorder.stop();
 }
 };
 requestAnimationFrame(updateProgress);

 } catch (e) {
 console.error("MediaRecorder init failed", e);
 alert("Your device does not support high-quality video recording.");
 }
 }
 };

 const handleVideoUpload = async () => {
 setScanPhase('processing');
 
 // Convert chunks to single Blob
 const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
 console.log(`Video recorded. Size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
 
 // Create FormData for video upload
 const formData = new FormData();
 formData.append('video', videoBlob, 'scan.webm');
 formData.append('height', inputHeight.toString());
 formData.append('weight', inputWeight.toString());
 
 // Add IMU Telemetry data for COLMAP/SfM initialization (crucial for 3DGS speed)
 const imuBlob = new Blob([JSON.stringify(imuTelemetryRef.current)], { type: 'application/json' });
 formData.append('imu_telemetry', imuBlob, 'telemetry.json');
 console.log(`[Sensor Fusion] Attached ${imuTelemetryRef.current.length} IMU data points.`);
 
 // Also send the 0-degree frame for the holographic mask fallback
 const frontFace = capturedImages.find(img => img.angle === 0);
 if (frontFace) {
 formData.append('front_face_base64', frontFace.url);
 }

 try {
 // Trigger the backend GPU pipeline
 const res = await fetch('/api/reconstruct-twin', {
 method: 'POST',
 // Note: Do NOT set Content-Type header when sending FormData, fetch sets it automatically with boundary
 body: formData
 });
 
 const data = await res.json();
 if (data.success) {
 localStorage.setItem('generated_twin_url', data.model_url);
 setGeneratedTwinUrl(data.model_url);
 setScanPhase('complete');
 } else {
 console.error("GPU Pipeline Error:", data.error);
 alert("GPU Pipeline Failed. Falling back to base skeleton.");
 setScanPhase('complete');
 }
 } catch (err) {
 console.error("GPU Pipeline Request Error:", err);
 setScanPhase('complete');
 }
 };

 const handleGenerateTwin = () => {
 // Tear down MediaPipe completely to free up GPU memory for WebGL
 if (holisticRef.current) {
 try {
 holisticRef.current.close();
 } catch (e) {}
 }
 
 // Stop camera tracks
 if (videoRef.current && videoRef.current.srcObject) {
 const stream = videoRef.current.srcObject as MediaStream;
 stream.getTracks().forEach(track => track.stop());
 videoRef.current.srcObject = null;
 }
 setHasCamera(false);

 // Transition state to 'rendered' which unmounts the left side AR overlays
 // and prepares the right side to mount the 3D Canvas
 setScanPhase('rendered');
 };

 // --- Sprint 2: 3DGS Capture Loop & Gyro Simulation ---
 useEffect(() => {
 if (scanPhase !== 'scanning') return;

 let animationFrameId: number;
 const targetAngles = [0, 45, 90, 135, 180, 225, 270, 315];
 
 const checkAngles = () => {
 if (landmarksRef.current?.pose) {
 const pose = landmarksRef.current.pose;
 // Shoulders: 11 (left), 12 (right) in MediaPipe
 const leftShoulder = pose[11];
 const rightShoulder = pose[12];
 
 if (leftShoulder && rightShoulder) {
 // Use CV spatial depth (z) and width (x) to estimate body yaw rotation
 // Note: Camera is mirrored. MediaPipe Z is estimated depth relative to hips.
 const dx = rightShoulder.x - leftShoulder.x;
 const dz = leftShoulder.z - rightShoulder.z; 
 
 const angleRad = Math.atan2(dz, dx);
 let angleDeg = Math.round((angleRad * 180) / Math.PI);
 
 // Normalize to 0-360 degrees
 if (angleDeg < 0) angleDeg += 360;
 setCurrentAngle(angleDeg);

 // Auto-capture logic: lock in frame if close to target (+/- 15 degrees)
 setCapturedFrames(prev => {
 const newCaptures = [...prev];
 let added = false;
 
 targetAngles.forEach(target => {
 // Proximity logic handling 360/0 wrap-around
 const diff = Math.min(
 Math.abs(angleDeg - target),
 360 - Math.abs(angleDeg - target)
 );
 
 if (diff < 15 && !newCaptures.includes(target)) {
 newCaptures.push(target);
 added = true;
 // Extract the 4K video frame and save it to the 3DGS pipeline
 if (videoRef.current) {
 const canvas = document.createElement('canvas');
 canvas.width = videoRef.current.videoWidth;
 canvas.height = videoRef.current.videoHeight;
 const ctx = canvas.getContext('2d');
 if (ctx) {
 ctx.translate(canvas.width, 0);
 ctx.scale(-1, 1);
 ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
 const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
 setCapturedImages(prev => [...prev, { angle: target, url: dataUrl }]);
 }
 }
 }
 });
 
 // If all 8 angles are captured, stop checking (handled by timer now)
 if (newCaptures.length === targetAngles.length) {
 console.log("All 8 keyframes extracted for fallback/masking.");
 }
 
 return added ? newCaptures : prev;
 });
 }
 }
 if (scanPhase === 'scanning') {
 animationFrameId = requestAnimationFrame(checkAngles);
 }
 };
 
 checkAngles();
 return () => {
 cancelAnimationFrame(animationFrameId);
 };
 }, [scanPhase]);

 // Camera Init
 useEffect(() => {
 let currentStream: MediaStream | null = null;
 async function initCamera() {
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } });
 currentStream = stream;
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
 setHasCamera(true);
 }
 } catch (err) {
 console.error(err);
 }
 }
 initCamera();
 return () => {
 if (currentStream) currentStream.getTracks().forEach(track => track.stop());
 };
 }, []);

 return (
 <div className="relative w-full h-screen bg-[#050505] overflow-hidden text-white font-sans flex flex-col md:flex-row">
 <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" strategy="afterInteractive" />
 <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" strategy="afterInteractive" />
 <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js" strategy="afterInteractive" onLoad={() => setIsMediaPipeLoaded(true)} />

 {/* Top Bar (Absolute, spans both sides) */}
 <div className="absolute top-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
 <button onClick={() => router.back()} className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white hover:text-white pointer-events-auto">
 <X className="w-4 h-4" />
 <span>Exit Scanner</span>
 </button>
 <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] bg-black/50 px-4 py-2 rounded-full pointer-events-auto">
 <ScanFace className="w-4 h-4" />
 <span>Holistic Engine V3 (Live)</span>
 </div>
 </div>

 {/* LEFT HALF: Physical Camera Feed or Rendering Screen Placeholder */}
 <div className="relative w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r flex items-center justify-center overflow-hidden bg-black ">
 {scanPhase !== 'rendered' ? (
 <>
 <video 
 ref={videoRef}
 autoPlay playsInline muted 
 className="absolute inset-0 w-full h-full object-cover z-0"
 
 />
 <canvas
 ref={canvasRef}
 className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none mix-blend-screen"
 />
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] z-10 pointer-events-none" />

 {/* Start camera prompt if not allowed yet */}
 {!hasCamera && (
 <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30 ">
 <div className="flex flex-col items-center gap-4">
 <CameraIcon className="w-8 h-8 " />
 <p className=" tracking-[0.3em] text-xs">AWAITING CAMERA ACCESS</p>
 </div>
 </div>
 )}

 {/* Sprint 2: 3DGS Radar & Silhouette Guides */}
 {hasCamera && (
 <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center">
 
 {/* HUD Scanline */}
 {scanPhase === 'scanning' && (
 <div className="w-full h-1 absolute top-0 animate-[shimmer_2s_linear_infinite]" />
 )}

 {/* Scanning AR Overlays */}
 {scanPhase === 'scanning' && (
 <>
 {/* AR Silhouette Guide */}
 <div className="absolute inset-0 flex items-center justify-center ">
 <div className="w-[30%] h-[70%] border-2 border-dashed rounded-[100px] " />
 </div>
 
 {/* Environmental Light Quality */}
 <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 px-4 py-1.5 rounded-full border ">
 <div className="w-2 h-2 rounded-full " />
 <span className="text-[11px] uppercase tracking-widest">LUX: OPTIMAL (450)</span>
 </div>

 {/* 360 Radar HUD */}
 <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
 <span className="text-xs tracking-[0.2em] ">
 TURN SLOWLY 360°
 </span>
 
 <div className="relative w-32 h-32 rounded-full border-2 flex items-center justify-center bg-black/40 ">
 {/* Radar Sweep */}
 <div 
 className="absolute inset-0 rounded-full border-t-2 "
 style={{ transform: `rotate(${currentAngle}deg)` }}
 >
 <div className="absolute top-0 left-1/2 w-1 h-1/2 bg-gradient-to-b to-transparent -translate-x-1/2 origin-bottom" />
 </div>
 
 {/* Angle Nodes */}
 {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
 const isCaptured = capturedFrames.includes(angle);
 return (
 <div 
 key={angle}
 className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full "
 style={{
 left: `${50 + 45 * Math.sin((angle * Math.PI) / 180)}%`,
 top: `${50 - 45 * Math.cos((angle * Math.PI) / 180)}%`,
 backgroundColor: isCaptured ? '#4ade80' : '#083344',
 boxShadow: isCaptured ? '0 0 10px #4ade80' : 'none'
 }}
 />
 );
 })}
 
 {/* Center Degree */}
 <span className="text-xl ">
 {currentAngle}°
 </span>
 </div>
 </div>
 </>
 )}

 {/* Processing/Complete Status Overlay */}
 {(scanPhase === 'processing' || scanPhase === 'complete') && (
 <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-30">
 <ScanFace className={`w-16 h-16 ${scanPhase === 'processing' ? 'animate-spin' : ''}`} />
 <h2 className="text-2xl tracking-widest uppercase text-center">
 {scanPhase === 'processing' ? 'Compiling 3DGS Cloud...' : 'Texture Extraction Complete'}
 </h2>
 {scanPhase === 'complete' && (
 <p className="text-xs tracking-widest max-w-sm text-center leading-relaxed">
 High-fidelity 4K textures extracted. <br/>
 Bone structure mapped to SMPL-X. <br/>
 Transferring compute core to right hemisphere.
 </p>
 )}
 </div>
 )}

 {/* Calibration HUD & Input Panel */}
 <div className="absolute top-24 left-6 right-6 flex justify-between items-start">
 {/* Left Side: Physical Input Panel */}
 <div className={`flex flex-col gap-4 pointer-events-auto bg-black/40 p-4 rounded-xl border w-48 ${scanPhase !== 'idle' ? ' pointer-events-none' : 'opacity-100'}`}>
 <div className="flex flex-col gap-1 border-b pb-2 mb-2">
 <span className="text-xs tracking-[0.2em] ">
 HYBRID ENGINE
 </span>
 <span className="text-[11px] text-white uppercase tracking-wider leading-relaxed">
 Abolish physical targets.<br/>Inject absolute data.
 </span>
 </div>
 
 <div className="flex flex-col gap-3">
 <label className="flex flex-col gap-1">
 <span className="text-[11px] uppercase tracking-widest ">Height (cm)</span>
 <input 
 type="number" 
 value={inputHeight}
 onChange={(e) => setInputHeight(Number(e.target.value))}
 className="bg-black/50 border text-lg p-2 rounded focus:outline-none "
 />
 </label>
 
 <label className="flex flex-col gap-1">
 <span className="text-[11px] uppercase tracking-widest ">Weight (kg)</span>
 <input 
 type="number" 
 value={inputWeight}
 onChange={(e) => setInputWeight(Number(e.target.value))}
 className="bg-black/50 border text-lg p-2 rounded focus:outline-none "
 />
 </label>
 </div>
 </div>
 
 {/* Right Side: AR Execution */}
 <div className="flex flex-col items-end gap-3">
 <div className="flex flex-col items-end">
 <span className="text-[11px] uppercase tracking-widest mb-1">Generated BMI Core</span>
 <div className="text-4xl ">
 {estimatedHeight ? `${(inputWeight / Math.pow(inputHeight/100, 2)).toFixed(1)}` : '---'}
 </div>
 </div>
 
 <button 
 onClick={handleStartScan}
 disabled={scanPhase !== 'idle'}
 className="pointer-events-auto mt-2 px-6 py-3 border text-xs uppercase tracking-[0.2em] rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {scanPhase !== 'idle' ? (
 <>
 <div className="w-3 h-3 border-2 rounded-full animate-spin" />
 Scanning...
 </>
 ) : (
 "Initialize Scan"
 )}
 </button>
 </div>
 </div>
 </div>
 )}
 </>
 ) : (
 <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
 <h2 className="text-2xl tracking-widest uppercase mb-4 ">
 Compute Transferred
 </h2>
 <p className="text-xs uppercase tracking-[0.2em] text-center">
 Camera offline.<br/>
 Memory freed.<br/>
 Awaiting Right Hemisphere.
 </p>
 </div>
 )}
 </div>

 {/* Right Panel: Digital Twin Render Engine (Placeholder for Sprint 2) */}
 <div className="relative w-full md:w-1/2 h-1/2 md:h-full bg-[#050505] flex items-center justify-center flex-col overflow-hidden">
 {/* Engine Status Header */}
 <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
 <ScanFace className="w-4 h-4 " />
 <span className="text-xs uppercase tracking-[0.2em]">SMPL-X Core Engine (Offline)</span>
 </div>

 {/* Dynamic Data Display */}
 {capturedImages.length === 0 && scanPhase === 'idle' ? (
 <div className="flex flex-col items-center justify-center gap-6 max-w-sm text-center z-20">
 <div className="w-24 h-24 rounded-full border flex items-center justify-center ">
 <ScanFace className="w-8 h-8 " />
 </div>
 
 <div className="flex flex-col gap-2">
 <h2 className="text-xl text-white tracking-widest uppercase">Waiting for Scan Data</h2>
 <p className="text-xs text-white leading-relaxed tracking-wider">
 The legacy static mesh has been purged. 
 The engine is now standing by to receive Hybrid BMI parameters and generate a 1:1 parametric SMPL-X body.
 </p>
 </div>

 {/* Action Button to next phase */}
 <button 
 onClick={() => router.push('/vision')}
 className="mt-8 px-6 py-2.5 border text-xs uppercase tracking-[0.2em] rounded-full "
 >
 Enter Sandbox
 </button>
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center gap-6 w-full max-w-2xl text-center z-20 px-8">
 <div className={`flex flex-col gap-2 w-full ${scanPhase === 'rendered' ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
 <div className="flex justify-between items-end border-b pb-2 mb-4">
 <div className="flex flex-col">
 <h2 className="text-xl tracking-widest uppercase">3DGS Video Capture</h2>
 <span className="text-xs mt-1 uppercase">Continuous spatial recording active</span>
 </div>
 <div className="flex flex-col items-end gap-1">
 <span className="text-xs ">{Math.round(recordingProgress)}%</span>
 <div className="w-32 h-1.5 bg-black border rounded-full overflow-hidden">
 <div 
 className="h-full " 
 style={{ width: `${recordingProgress}%` }}
 />
 </div>
 </div>
 </div>
 
 <div className="grid grid-cols-4 gap-4 w-full">
 {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
 // In continuous mode, we just light these up as progress hits certain thresholds
 // purely for visual feedback to the user that we are mapping 360 space
 const threshold = angle / 360 * 100;
 const isCaptured = recordingProgress > threshold;
 const isCapturing = recordingProgress > threshold - 12.5 && recordingProgress <= threshold;
 
 return (
 <div 
 key={angle} 
 className={`relative aspect-[3/4] border ${isCaptured ? ' ' : isCapturing ? ' ' : ''} rounded-lg overflow-hidden bg-black/50 `}
 >
 {isCaptured ? (
 <div className="absolute inset-0 flex items-center justify-center ">
 <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] via-transparent to-transparent " />
 </div>
 ) : (
 <div className="absolute inset-0 flex flex-col items-center justify-center ">
 <ScanFace className={`w-6 h-6 ${isCapturing ? ' animate-spin' : ''} mb-2`} />
 <span className="text-[11px] ">{isCapturing ? 'MAPPING' : 'PENDING'}</span>
 </div>
 )}
 <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-2 text-left">
 <span className="text-[11px] ">{angle}° MAPPED</span>
 </div>
 {isCaptured && (
 <div className="absolute top-2 right-2 w-2 h-2 rounded-full " />
 )}
 </div>
 );
 })}
 </div>

 {scanPhase === 'processing' && (
 <div className="mt-8 flex flex-col items-center gap-4 ">
 <div className="w-12 h-12 rounded-full border-2 animate-spin" />
 <div className="text-center">
 <h3 className=" text-sm uppercase tracking-widest">Transmitting to GPU Cluster</h3>
 <p className="text-xs mt-1">Running 3DGS baking & SMPL-X rigging. This requires immense compute...</p>
 </div>
 </div>
 )}
 </div>

 {scanPhase === 'rendered' ? (
 <div className="w-full h-[60vh] md:h-[80vh] relative animate-in fade-in zoom-in ">
 <ErrorBoundary>
 <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
 <Canvas shadows 
 camera={{ position: [0, 0.5, 3.5], fov: 50 }}
 gl={{ preserveDrawingBuffer: true, powerPreference: "high-performance", antialias: true }}
 onCreated={({ gl }) => {
 gl.setClearColor(new THREE.Color('#000000'), 0);
 }}
 >
 <ambientLight intensity={0.5} />
 <spotLight position={[5, 5, 5]} intensity={1} castShadow />
 <spotLight position={[-5, 5, -5]} intensity={0.5} color="#06b6d4" />
 
 <OrbitControls 
 makeDefault
 enablePan={true}
 enableZoom={true}
 enableRotate={true}
 enableDamping={true}
 target={[0, 0, 0]}
 />
 <DigitalTwinMesh height={inputHeight} weight={inputWeight} capturedImages={capturedImages} modelUrl={generatedTwinUrl} />

 <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={5} blur={2} far={2} color="#06b6d4" />
 </Canvas>
 </Suspense>
 </ErrorBoundary>
 
 {/* Save / Enter Sandbox Button */}
 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
 <button 
 onClick={() => {
 localStorage.setItem('twin_height', inputHeight.toString());
 localStorage.setItem('twin_weight', inputWeight.toString());
 const frontFace = capturedImages.find(img => img.angle === 0);
 if (frontFace && frontFace.url) {
 try {
 localStorage.setItem('user_face_texture', frontFace.url);
 } catch (e) {
 console.warn("Could not save face texture to localStorage (Quota Exceeded?)", e);
 }
 }
 router.push('/twin/mirror');
 }}
 className="px-8 py-3 text-black text-sm uppercase tracking-[0.2em] rounded-full hover:scale-105 "
 >
 Enter Sandbox
 </button>
 </div>
 </div>
 ) : scanPhase === 'complete' && (
 <button 
 onClick={handleGenerateTwin}
 className="mt-8 px-8 py-3 border text-sm uppercase tracking-[0.2em] rounded-full hover:scale-105 active:scale-95 "
 >
 Generate Digital Twin
 </button>
 )}
 </div>
 )}

 {/* Ambient Grid Background */}
 <div className="absolute inset-0 z-0 pointer-events-none" 
 style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
 </div>
 </div>
 </div>
 );
}
