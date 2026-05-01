import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { ShopProvider } from "@/features/shop/ShopContext";
import { AppShell } from "@/components/shared/AppShell";
import { NebulaBackground } from "@/components/shared/NebulaBackground";
import { NativeBridgeProvider } from "@/components/shared/NativeBridgeProvider";
import { WeChatBrowserGuard } from "@/components/shared/WeChatBrowserGuard";
import { PWAUpdater } from "@/components/shared/PWAUpdater";
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
  openGraph: {
    title: "✦ 欢迎使用 GX 专属服务",
    description: "点击进入专属聊天室，我们将即时为您服务。",
    type: "website",
    url: "https://fx-rapallo.vercel.app",
    siteName: "GX Core",
    images: [
      {
        url: "https://fx-rapallo.vercel.app/gx-car-cover-opt.jpg", // 完美解决方案：指向 Vercel 生产环境下的本地静态图片绝对路径，彻底粉碎 Github Raw 防盗链拦截
        width: 1200,
        height: 630,
        alt: "GX Core 专属服务通道",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "✦ 欢迎使用 GX 专属服务",
    description: "点击进入专属聊天室，我们将即时为您服务。",
    images: ["https://fx-rapallo.vercel.app/gx-car-cover-opt.jpg"],
  },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full subpixel-antialiased bg-black`}
    >
      <head>
        {/* 0毫秒瞬间注入原生壁纸，彻底消灭 React 渲染延迟与二次闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('gx_visual_settings');
                  var bgIndex = 1; // 默认前端 B3
                  var calBgIndex = 1; // 默认日历 B3
                  if (saved) {
                    var parsed = JSON.parse(saved);
                    if (parsed.frontendBgIndex !== undefined) bgIndex = parsed.frontendBgIndex;
                    if (parsed.calendarBgIndex !== undefined) calBgIndex = parsed.calendarBgIndex;
                  }
                  
                  var isCalendar = window.location.pathname.indexOf('/calendar') !== -1;
                  var activeIndex = isCalendar ? calBgIndex : bgIndex;
                  
                  var bgs = [
                    '/images/backgrounds/A1.jpg',
                    '/images/backgrounds/B3.jpg',
                    '/images/backgrounds/B4.jpg',
                    '/images/backgrounds/B6.jpg'
                  ];
                  var bgUrl = bgs[activeIndex] || bgs[1];
                  if (bgUrl === 'starry') bgUrl = '/images/backgrounds/A1.jpg';
                  
                  var style = document.createElement('style');
                  style.innerHTML = 'body { background-image: url("' + bgUrl + '"); background-size: cover; background-position: center; background-attachment: fixed; background-repeat: no-repeat; }';
                  document.head.appendChild(style);
                } catch(e) {}
              })();
            `
          }}
        />
        {/* 终极防线：0毫秒瞬间拦截 PWA 白屏/资源丢失的死锁状态 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 彻底放过本地开发环境，防止拦截 Next.js 的 Hot Reload 编译
                  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    // 绝对物理级毁灭：如果本地残留了之前的旧版 Service Worker，强行将其斩杀卸载，防止僵尸接管
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(function(registrations) {
                        for(let registration of registrations) {
                          registration.unregister();
                        }
                      });
                    }
                    // 清除可能导致死锁的自愈印记
                    sessionStorage.removeItem('gx_auto_healed');
                    return;
                  }

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
        <PWAUpdater />
        <NextIntlClientProvider messages={messages}>
          <WeChatBrowserGuard />
          {/* Native environment bridge */}
          <NativeBridgeProvider />
          <div className="fixed inset-0 z-[-1] pointer-events-none bg-transparent">
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
      </body>
    </html>
  );
}
