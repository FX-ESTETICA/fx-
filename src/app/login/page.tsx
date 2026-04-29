"use client";

import { Suspense } from 'react';
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
 return (
 <main className="min-h-[100dvh] bg-transparent text-white relative overflow-hidden flex flex-col justify-center py-12">
 
 <div className="absolute inset-0 z-0 pointer-events-none">
 <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
 </div>

 {/* 顶部 Brand Identity */}
 <div className="absolute top-8 left-0 right-0 flex justify-center z-10 pointer-events-none">
 <div className="flex flex-col items-center gap-2">
 <div className="flex items-center gap-2">
 <span className="text-4xl tracking-tighter">
 GX<span className="align-super text-2xl ">⁺</span>
 </span>
 <span className="text-3xl tracking-tighter ">私人管家</span>
 </div>
 <p className="text-[11px] tracking-[0.2em] text-white">至臻生活管家</p>
 </div>
 </div>
 
 <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 mt-16">
 <div className="py-8 px-4 sm:px-10">
 <Suspense fallback={<div className="text-center text-white text-sm ">Loading authentication module...</div>}>
 <LoginForm />
 </Suspense>
 
 </div>
 </div>

 {/* 底部 Footer */}
 <div className="absolute bottom-8 w-full flex flex-col items-center gap-4 z-10">
 <div className="flex items-center gap-6 text-[11px] text-white tracking-widest">
 <a href="#" className=" ">隐私政策</a>
 <span>/</span>
 <a href="#" className=" ">服务条款</a>
 <span>/</span>
 <a href="#" className=" ">联系我们</a>
 </div>
 <p className="text-[11px] text-white ">
 © 2026 GX CONCIERGE. ALL RIGHTS RESERVED.
 </p>
 </div>
 </main>
 );
}
