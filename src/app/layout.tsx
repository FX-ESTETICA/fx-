import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, ZCOOL_KuaiLe, Noto_Sans_SC, Orbitron } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import GlobalAI from "@/components/GlobalAI";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const zcoolKuaiLe = ZCOOL_KuaiLe({
  variable: "--font-zcool-kuaile",
  subsets: ["latin"],
  weight: "400",
});
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400","700"],
});
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400","700"],
});
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "GX⁺ 私人管家",
  description: "您的专属私人管家系统",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GX⁺ 管家",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${zcoolKuaiLe.variable} ${notoSansSC.variable} ${orbitron.variable} antialiased`}
      >
        {children}
        <BottomNav />
        <GlobalAI />
      </body>
    </html>
  );
}
