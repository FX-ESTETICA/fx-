import { useState, useEffect, useCallback } from 'react';

export interface VisualSettings {
  showNebula: boolean;
  showWallpaper: boolean;
  enableGlassShield: boolean;
  shieldOpacity: number; // 0 to 100
  shieldBlur: number; // 0 to 50
}

const DEFAULT_SETTINGS: VisualSettings = {
  showNebula: true,
  showWallpaper: true,
  enableGlassShield: true,
  shieldOpacity: 40,
  shieldBlur: 10,
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
        setSettings(customEvent.detail);
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
