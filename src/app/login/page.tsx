"use client";

import { Suspense } from 'react';
import { LoginForm } from "@/features/auth/components/LoginForm";
import { Fingerprint } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("Index");

  return (
    <main className="min-h-screen bg-transparent text-white relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=2074&auto=format&fit=crop"
          alt="GX Private Access"
          fill
          className="object-cover opacity-60 mix-blend-overlay"
          priority // 【LCP 性能极致优化：强制首屏预加载】
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* 顶部 Brand Identity */}
      <div className="absolute top-8 w-full flex justify-center z-10 pointer-events-none">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold tracking-tighter">
              GX<span className="align-super text-2xl text-gx-cyan">⁺</span>
            </span>
            <span className="text-3xl font-bold tracking-tighter drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">私人管家</span>
          </div>
          <p className="text-[10px] font-mono tracking-[0.2em] text-white/40">SUPREME LIFE CONCIERGE</p>
        </div>
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 mt-16">
        <div className="py-8 px-4 sm:px-10">
          <div className="flex flex-col items-center mb-12">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 relative group">
              <div className="absolute inset-0 rounded-full border border-gx-cyan/30 scale-110 opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-700" />
              <Fingerprint className="w-8 h-8 text-gx-cyan opacity-80" />
            </div>
            <h2 className="text-center text-xl font-bold tracking-tight uppercase">
              {t("title")}
            </h2>
            <p className="mt-2 text-center text-[11px] text-white/40 font-mono">
              {t("description")}
            </p>
          </div>
          
          <Suspense fallback={<div className="text-center text-white/50 text-sm font-mono">Loading authentication module...</div>}>
            <LoginForm />
          </Suspense>
          
        </div>
      </div>

      {/* 底部 Footer */}
      <div className="absolute bottom-8 w-full flex flex-col items-center gap-4 z-10">
        <div className="flex items-center gap-6 text-[10px] text-white/30 font-mono tracking-widest">
          <a href="#" className="hover:text-gx-cyan transition-colors">PRIVACY</a>
          <span>/</span>
          <a href="#" className="hover:text-gx-cyan transition-colors">TERMS</a>
          <span>/</span>
          <a href="#" className="hover:text-gx-cyan transition-colors">CONTACT</a>
        </div>
        <p className="text-[9px] text-white/20 font-mono">
          © 2026 GX CONCIERGE. ALL RIGHTS RESERVED.
        </p>
      </div>
    </main>
  );
}
