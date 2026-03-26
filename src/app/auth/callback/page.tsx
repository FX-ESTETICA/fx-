"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    try {
      localStorage.removeItem("gx_sandbox_session");
      localStorage.removeItem("gx_guest_mode");
    } catch (_) {}
    const next = searchParams.get("next");
    router.replace(next || "/home");
  }, [router, searchParams]);
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white/60 text-xs font-mono tracking-widest">Redirecting...</div>
    </main>
  );
}
