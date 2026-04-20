import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { ShopProvider } from "@/features/shop/ShopContext";
import { AppShell } from "@/components/shared/AppShell";
import { NebulaBackground } from "@/components/shared/NebulaBackground";
import { NativeBridgeProvider } from "@/components/shared/NativeBridgeProvider";
import { WeChatBrowserGuard } from "@/components/shared/WeChatBrowserGuard";
// import { WebDownloadPrompt } from "@/components/shared/WebDownloadPrompt";
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
    statusBarStyle: "black-translucent", // 虽然无法物理隐藏iOS网页顶栏，但保持沉浸透明
    capable: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes", // 强化 PWA 全屏沉浸宣告
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
      <head>
        {/* 终极防线：0毫秒瞬间拦截 PWA 白屏/资源丢失的死锁状态 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 陷阱1：拦截所有核心资源(JS/CSS) 加载失败的瞬间
                  window.addEventListener('error', function(e) {
                    if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
                      var isChunk = e.target.src && e.target.src.indexOf('_next/static') !== -1;
                      if (isChunk) {
                        if (!navigator.onLine) {
                          console.warn('[GX Offline] 网络断开，阻止资源重载自杀，触发离线降级');
                          window.dispatchEvent(new Event('gx_offline_mode_activated'));
                          return;
                        }
                        console.error('[GX Auto-Heal] 核心资源加载失败，可能为版本更新缓存冲突。0毫秒瞬间强制重载...');
                        // 种下自愈印记，防止无限刷新死循环
                        if (!sessionStorage.getItem('gx_auto_healed')) {
                          sessionStorage.setItem('gx_auto_healed', 'true');
                          window.location.reload(true);
                        }
                      }
                    }
                  }, true);

                  // 陷阱2：拦截 React 引擎内部的动态模块加载失败 (ChunkLoadError)
                  window.addEventListener('unhandledrejection', function(e) {
                    if (e.reason && e.reason.name === 'ChunkLoadError') {
                      if (!navigator.onLine) {
                        console.warn('[GX Offline] 网络断开，阻止 ChunkLoadError 重载自杀，触发离线降级');
                        window.dispatchEvent(new Event('gx_offline_mode_activated'));
                        return;
                      }
                      console.error('[GX Auto-Heal] 动态模块读取失败。0毫秒瞬间强制重载...');
                      if (!sessionStorage.getItem('gx_auto_healed')) {
                        sessionStorage.setItem('gx_auto_healed', 'true');
                        window.location.reload(true);
                      }
                    }
                  });

                  // 如果应用成功加载，清除自愈印记
                  window.addEventListener('load', function() {
                    setTimeout(function() {
                      sessionStorage.removeItem('gx_auto_healed');
                    }, 5000);
                  });
                } catch(err) {
                  // 防御自身报错
                }
              })();
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-transparent relative text-white">
        <NextIntlClientProvider messages={messages}>
          <WeChatBrowserGuard />
          {/* Native environment bridge */}
          <NativeBridgeProvider />
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
          {/* <WebDownloadPrompt /> */}
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
