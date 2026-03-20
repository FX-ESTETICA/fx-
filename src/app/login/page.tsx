"use client";

import { LoginForm } from "@/features/auth/components/LoginForm";

/**
 * LoginPage - GX 系统登录入口
 * 极简赛博风格，极致流畅体验
 */
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Layer 1: Stylized Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gx-cyan/10 blur-[150px] rounded-full animate-pulse opacity-50" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-gx-purple/10 blur-[150px] rounded-full animate-pulse opacity-50" />
      </div>

      {/* Background Layer 2: Grid Lines (Cyberpunk feel) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 242, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Login Form Container */}
      <div className="relative z-10 w-full">
        <LoginForm />
      </div>

      {/* Floating System Status (Aesthetic Only) */}
      <div className="absolute bottom-10 left-10 hidden md:block">
        <div className="flex flex-col space-y-1 font-mono text-[9px] text-white/20 uppercase tracking-[0.2em]">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gx-cyan animate-pulse shadow-[0_0_5px_rgba(0,242,255,0.5)]" />
            <span>Core System Online</span>
          </div>
          <span>Status: IDLE // Vercel Edge Runtime</span>
          <span>Lat: 0.00ms // Global Acceleration</span>
        </div>
      </div>

      {/* System Version Footer */}
      <footer className="absolute bottom-8 right-10 text-[9px] font-mono text-white/20 uppercase tracking-[0.4em]">
        GX_PROJECT_IDENTITY // v2.0.0
      </footer>
    </main>
  );
}
