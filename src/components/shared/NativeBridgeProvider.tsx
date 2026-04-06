"use client";

import { useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useRouter } from "next/navigation";

import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

export function NativeBridgeProvider() {
  const router = useRouter();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 0. 初始化谷歌登录原生插件 (读取配置)
      try {
        GoogleAuth.initialize({
          clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
          scopes: ["profile", "email"],
          grantOfflineAccess: true,
        });
      } catch (e) {
        console.warn("GoogleAuth init warning (often ignored on mobile):", e);
      }

      // 1. 初始化原生状态栏（全透明沉浸式）
      const initNative = async () => {
        try {
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: Style.Dark });
        } catch (e) {
          console.warn("Status bar initialization failed:", e);
        }
      };
      initNative();

      // 2. 接管安卓物理返回键（防止闪退，实现平滑回退）
      CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          router.back();
        } else {
          CapacitorApp.exitApp();
        }
      });
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.removeAllListeners();
      }
    };
  }, [router]);

  return null;
}
