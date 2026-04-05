"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EmailOtpType = "signup" | "magiclink" | "recovery" | "invite" | "email_change";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>(["signup", "magiclink", "recovery", "invite", "email_change"]);

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // 获取 URL 中的 token hash 和 type
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const next = searchParams.get('next') || '/';

      const isValidEmailOtpType = type !== null && EMAIL_OTP_TYPES.has(type as EmailOtpType);
      if (token_hash && isValidEmailOtpType) {
        // 使用 verifyOtp 验证
        const { error } = await supabase.auth.verifyOtp({
          type: type as EmailOtpType,
          token_hash,
        });

        if (error) {
          setError(error.message);
          return;
        }

        // 验证成功，重定向
        router.push(next);
      } else {
        // 如果没有 token_hash，尝试从 hash (PKCE) 中获取 session
        const { error } = await supabase.auth.getSession();
        if (error) {
          setError(error.message);
          return;
        }
        
        try {
          localStorage.removeItem("gx_sandbox_session");
          localStorage.removeItem("gx_guest_mode");
        } catch {}
        
        router.push(next || "/home");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 bg-red-500/10 px-6 py-4 rounded-lg border border-red-500/20">
          认证失败: {error}
          <button 
            onClick={() => router.push('/login')}
            className="block mt-4 text-gx-cyan underline"
          >
            返回登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-gx-cyan border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-8 text-gx-cyan font-mono tracking-widest animate-pulse">
        VERIFYING IDENTITY...
      </p>
    </div>
  );
}
