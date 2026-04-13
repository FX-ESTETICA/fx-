import { useCallback, useSyncExternalStore } from 'react';

export type CyberThemeColor = 'corelight';

export interface VisualSettings {
  showNebula: boolean;
  showWallpaper: boolean;
  wallpaperOpacity: number; // 0 to 100
  timelineColorTheme: CyberThemeColor;
  staffNameColorTheme: CyberThemeColor;
  headerTitleColorTheme: CyberThemeColor;
}

const DEFAULT_SETTINGS: VisualSettings = {
  showNebula: true,
  showWallpaper: true,
  wallpaperOpacity: 40,
  timelineColorTheme: 'corelight',
  staffNameColorTheme: 'corelight',
  headerTitleColorTheme: 'corelight',
};

export const CYBER_COLOR_DICTIONARY: Record<CyberThemeColor, { className: string; hex: string; label: string }> = {
  corelight: {
    className: "text-white drop-shadow-[0_0_2px_rgba(255,255,255,1)] drop-shadow-[0_0_5px_rgba(200,240,255,0.8)] mix-blend-screen",
    hex: "#ffffff",
    label: "光源白"
  }
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
          const parsed = JSON.parse(saved);
          
          // 兼容性/降级处理：如果 localStorage 中存了已经被废弃的颜色（如 cyan），强制重置为 corelight
          if (!CYBER_COLOR_DICTIONARY[parsed.timelineColorTheme as CyberThemeColor]) parsed.timelineColorTheme = 'corelight';
          if (!CYBER_COLOR_DICTIONARY[parsed.staffNameColorTheme as CyberThemeColor]) parsed.staffNameColorTheme = 'corelight';
          if (!CYBER_COLOR_DICTIONARY[parsed.headerTitleColorTheme as CyberThemeColor]) parsed.headerTitleColorTheme = 'corelight';

          this.settings = { ...DEFAULT_SETTINGS, ...parsed };
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
