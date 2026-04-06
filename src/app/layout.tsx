import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { ShopProvider } from "@/features/shop/ShopContext";
import { AppShell } from "@/components/shared/AppShell";
import { NebulaBackground } from "@/components/shared/NebulaBackground";
import { NativeBridgeProvider } from "@/components/shared/NativeBridgeProvider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

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
  const originalError = console.error;
  const shouldSwallow = (args: unknown[]) => {
    const first = args[0];
    return typeof first === 'string' && (
      first.includes('THREE.Clock') ||
      first.includes('Unable to preventDefault inside passive event listener') ||
      first.includes('[Intervention]')
    );
  };
  console.warn = (...args) => {
    if (shouldSwallow(args)) {
      return; // Swallow the warning
    }
    originalWarn.apply(console, args);
  };
  console.error = (...args) => {
    if (shouldSwallow(args)) {
      return;
    }
    originalError.apply(console, args);
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-black`}
    >
      <body className="min-h-full flex flex-col bg-transparent relative text-white">
        <NativeBridgeProvider />
        <NextIntlClientProvider messages={messages}>
          <div className="fixed inset-0 z-[-1] pointer-events-none bg-black">
            <NebulaBackground />
          </div>
          <AuthProvider>
            <ShopProvider>
              <AppShell>
                {children}
              </AppShell>
            </ShopProvider>
          </AuthProvider>
        </NextIntlClientProvider>
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
