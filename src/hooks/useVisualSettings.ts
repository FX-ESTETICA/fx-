import { useState, useEffect, useCallback } from 'react';

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
  const [settings, setSettings] = useState<VisualSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 读取本地存储
    const saved = localStorage.getItem('gx_visual_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error("Failed to parse visual settings", e);
      }
    }
    setIsLoaded(true);

    // 监听跨组件的设置更新事件
    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        // 使用 setTimeout 将 setState 移出当前的 render 循环，防止跨组件更新冲突
        setTimeout(() => {
          setSettings(customEvent.detail);
        }, 0);
      }
    };

    window.addEventListener('gx-visual-settings-change', handleSettingsChange);
    return () => window.removeEventListener('gx-visual-settings-change', handleSettingsChange);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<VisualSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('gx_visual_settings', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('gx-visual-settings-change', { detail: updated }));
      return updated;
    });
  }, []);

  return {
    settings,
    updateSettings,
    isLoaded
  };
}
