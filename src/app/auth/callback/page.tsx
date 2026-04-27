"use client";

import { Suspense } from 'react';
import { AuthCallbackClient } from './client';

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-black flex items-center justify-center ">Loading...</div>}>
      <AuthCallbackClient />
    </Suspense>
  );
}
