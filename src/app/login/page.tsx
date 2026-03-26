"use client";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { NebulaBackground } from "@/components/shared/NebulaBackground";

export default function LoginPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <NebulaBackground rotation={0} />
      <div className="relative z-10 w-full flex items-center justify-center p-6">
        <LoginForm />
      </div>
    </main>
  );
}
