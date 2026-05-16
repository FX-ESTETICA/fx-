import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { ShopProvider } from "@/features/shop/ShopContext";
import { NativeBridgeProvider } from "@/components/shared/NativeBridgeProvider";
import { AppShell } from "@/components/shared/AppShell";
import { NebulaBackground } from "@/components/shared/NebulaBackground";
import { WeChatBrowserGuard } from "@/components/shared/WeChatBrowserGuard";
import { OTAUpdater } from "@/components/shared/OTAUpdater";
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
      </head>
      <body className="min-h-full flex flex-col bg-transparent relative text-white">
        <OTAUpdater />
        <NextIntlClientProvider messages={messages}>
          <WeChatBrowserGuard />
          {/* Native environment bridge */}
          <NativeBridgeProvider />
          <div className="fixed inset-0 z-[-1] pointer-events-none bg-transparent">
            <NebulaBackground />
          </div>
          <AuthProvider>
            <ShopProvider>
              <AppShell>{children}</AppShell>
            </ShopProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
