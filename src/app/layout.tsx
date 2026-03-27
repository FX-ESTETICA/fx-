import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { AppShell } from "@/components/shared/AppShell";
import { ForegroundDust } from "@/components/shared/ForegroundDust";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// === Global Console Warning Suppressor ===
// To achieve absolute perfection and zero warnings in the console:
// Three.js r165+ triggers a deprecation warning for THREE.Clock, but @react-three/fiber heavily relies on it internally.
// We intercept and swallow this specific warning to keep the console pristine.
if (typeof console !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) {
      return; // Swallow the warning
    }
    originalWarn.apply(console, args);
  };
}

export const metadata: Metadata = {
  title: "GX Core - Galaxy Experience Access System",
  description: "极致简洁的赛博风格局部生活服务平台",
  appleWebApp: {
    title: "GX Core",
    statusBarStyle: "black-translucent",
    capable: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">
        <ForegroundDust />
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('GX SW: Registered with scope:', registration.scope);
                  }, function(err) {
                    console.log('GX SW: Registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
