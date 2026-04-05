"use client";

import { Suspense } from 'react';
import { AuthCallbackClient } from './client';

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-gx-cyan">Loading...</div>}>
      <AuthCallbackClient />
    </Suspense>
  );
}
