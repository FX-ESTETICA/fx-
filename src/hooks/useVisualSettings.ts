import { useCallback, useSyncExternalStore } from 'react';

export type CyberThemeColor = 'coreblack' | 'purewhite' | 'whitegold' | 'blackgold';

export interface VisualSettings {
  showNebula: boolean;
  wallpaperOpacity: number; // 0 to 100 (保留为了向下兼容，但界面已移除)
  calendarBgIndex: number; // 日历专属壁纸层
  frontendBgIndex: number; // 前端首页专属壁纸层
  timelineColorTheme: CyberThemeColor;
  staffNameColorTheme: CyberThemeColor;
  headerTitleColorTheme: CyberThemeColor;
}

const DEFAULT_SETTINGS: VisualSettings = {
  showNebula: true,
  wallpaperOpacity: 100, // 强制100%不透明
  calendarBgIndex: 1, // 默认浅色壁纸 B3
  frontendBgIndex: 0, // 前端默认深色跑车 A1
  timelineColorTheme: 'blackgold', // 默认跟随极简白主题的黑金线
  staffNameColorTheme: 'coreblack',
  headerTitleColorTheme: 'coreblack',
};

export const CYBER_COLOR_DICTIONARY: Record<CyberThemeColor, { className: string; hex: string; label: string }> = {
  coreblack: {
    className: "text-black font-medium tracking-widest",
    hex: "#000000",
    label: "光源黑"
  },
  purewhite: {
    className: "text-white font-medium tracking-widest",
    hex: "#ffffff",
    label: "极简白"
  },
  whitegold: {
    className: "text-[#FDF5E6] font-medium tracking-widest",
    hex: "#FDF5E6",
    label: "白金色"
  },
  blackgold: {
    className: "text-[#8B7355] font-medium tracking-widest",
    hex: "#8B7355",
    label: "黑金色"
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
          
          // 兼容性/降级处理：如果 localStorage 中存了已经被废弃的颜色（如 cyan，corelight），强制重置为 purewhite
          if (!CYBER_COLOR_DICTIONARY[parsed.timelineColorTheme as CyberThemeColor]) parsed.timelineColorTheme = 'whitegold';
          if (!CYBER_COLOR_DICTIONARY[parsed.staffNameColorTheme as CyberThemeColor]) parsed.staffNameColorTheme = 'purewhite';
          if (!CYBER_COLOR_DICTIONARY[parsed.headerTitleColorTheme as CyberThemeColor]) parsed.headerTitleColorTheme = 'purewhite';
          
          // 修正历史遗留问题：将主文本色与分界线色解绑映射
          if (parsed.timelineColorTheme === 'purewhite') parsed.timelineColorTheme = 'whitegold';
          if (parsed.timelineColorTheme === 'coreblack') parsed.timelineColorTheme = 'blackgold';
          if (parsed.calendarBgIndex === undefined) parsed.calendarBgIndex = 1; // 补充日历壁纸缓存为默认的 B3 (1)
          if (parsed.frontendBgIndex === undefined) parsed.frontendBgIndex = 0; // 补充前端壁纸缓存为默认的 A1 (0)
          if (parsed.wallpaperOpacity !== undefined) parsed.wallpaperOpacity = 100; // 强制100%不透明

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
