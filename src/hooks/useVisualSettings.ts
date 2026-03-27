import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

export type CyberThemeColor = 'cyan' | 'purple' | 'gold' | 'emerald' | 'rose' | 'silver' | 'platinum' | 'corelight' | 'white';

export interface VisualSettings {
  showNebula: boolean;
  showWallpaper: boolean;
  enableGlassShield: boolean;
  shieldOpacity: number; // 0 to 100
  shieldBlur: number; // 0 to 50
  timelineColorTheme: CyberThemeColor;
  staffNameColorTheme: CyberThemeColor;
  headerTitleColorTheme: CyberThemeColor;
}

const DEFAULT_SETTINGS: VisualSettings = {
  showNebula: true,
  showWallpaper: true,
  enableGlassShield: true,
  shieldOpacity: 40,
  shieldBlur: 10,
  timelineColorTheme: 'cyan',
  staffNameColorTheme: 'cyan',
  headerTitleColorTheme: 'platinum',
};

// ==========================================
// 核心架构升级：零依赖的原子状态引擎 (Pub/Sub)
// 彻底抛弃 CustomEvent，解决无限渲染卡死问题
// ==========================================

class VisualSettingsStore {
  private settings: VisualSettings = DEFAULT_SETTINGS;
  private listeners: Set<() => void> = new Set();
  private isLoaded: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gx_visual_settings');
        if (saved) {
          this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
      } catch (e) {
        console.error('Failed to parse visual settings from localStorage', e);
      }
      this.isLoaded = true;
    }
  }

  // 获取当前快照，供 useSyncExternalStore 使用
  getSnapshot = () => this.settings;
  
  // 获取加载状态
  getIsLoaded = () => this.isLoaded;

  // 订阅机制
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // 更新机制 (合并旧值并通知所有订阅者)
  update = (newSettings: Partial<VisualSettings>) => {
    const nextSettings = { ...this.settings, ...newSettings };
    
    // 深度对比拦截：如果值完全没变，拒绝广播，物理切断无限重绘！
    if (JSON.stringify(this.settings) === JSON.stringify(nextSettings)) {
      return;
    }

    this.settings = nextSettings;
    if (typeof window !== 'undefined') {
      localStorage.setItem('gx_visual_settings', JSON.stringify(this.settings));
    }
    
    // 通知所有正在监听的组件强制更新
    this.listeners.forEach(listener => listener());
  };
}

// 实例化全局单例 Store
const visualSettingsStore = new VisualSettingsStore();

export const CYBER_COLOR_DICTIONARY: Record<CyberThemeColor, { className: string; hex: string; label: string }> = {
  cyan: {
    className: "bg-gradient-to-b from-white via-cyan-200 to-cyan-600/80 drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] text-transparent bg-clip-text",
    hex: "#00f0ff",
    label: "赛博青"
  },
  purple: {
    className: "bg-gradient-to-b from-white via-purple-300 to-purple-600/80 drop-shadow-[0_0_10px_rgba(168,85,247,0.4)] text-transparent bg-clip-text",
    hex: "#a855f7",
    label: "霓虹紫"
  },
  gold: {
    className: "bg-gradient-to-b from-white via-amber-200 to-amber-600/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)] text-transparent bg-clip-text",
    hex: "#f59e0b",
    label: "黑金"
  },
  emerald: {
    className: "bg-gradient-to-b from-white via-emerald-200 to-emerald-600/80 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] text-transparent bg-clip-text",
    hex: "#10b981",
    label: "矩阵绿"
  },
  rose: {
    className: "bg-gradient-to-b from-white via-rose-200 to-rose-600/80 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)] text-transparent bg-clip-text",
    hex: "#f43f5e",
    label: "猩红"
  },
  silver: {
    className: "bg-gradient-to-br from-white via-slate-200 to-slate-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.7)] text-transparent bg-clip-text",
    hex: "#e2e8f0",
    label: "液态银"
  },
  platinum: {
    className: "bg-gradient-to-br from-white via-white to-slate-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] text-transparent bg-clip-text",
    hex: "#f8fafc",
    label: "高亮铂金"
  },
  corelight: {
    className: "text-white drop-shadow-[0_0_2px_rgba(255,255,255,1)] drop-shadow-[0_0_5px_rgba(200,240,255,0.8)] mix-blend-screen",
    hex: "#ffffff",
    label: "光源白"
  },
  white: {
    className: "bg-gradient-to-b from-white via-gray-100 to-gray-400/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] text-transparent bg-clip-text",
    hex: "#ffffff",
    label: "纯白"
  }
};

export function useVisualSettings() {
  // 使用 React 18 官方推荐的外部存储同步 Hook
  // 它能保证状态更新在并发模式下绝对一致，并且自动处理组件重渲染
  const settings = useSyncExternalStore(
    visualSettingsStore.subscribe,
    visualSettingsStore.getSnapshot,
    () => DEFAULT_SETTINGS // SSR 时的 fallback
  );

  const updateSettings = useCallback((newSettings: Partial<VisualSettings>) => {
    visualSettingsStore.update(newSettings);
  }, []);

  return {
    settings,
    updateSettings,
    isLoaded: visualSettingsStore.getIsLoaded()
  };
}
