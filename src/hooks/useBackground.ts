import { useState, useEffect, useCallback, startTransition } from 'react';

export const GLOBAL_BACKGROUNDS = [
  '/images/backgrounds/A1.jpg' // 仅保留深色跑车
];

export const FRONTEND_BACKGROUNDS = [
  '/images/backgrounds/A1.jpg', // 深色跑车
  '/images/backgrounds/B3.jpg', // 浅色壁纸3
  '/images/backgrounds/B4.jpg', // 浅色壁纸4
  '/images/backgrounds/B6.jpg'  // 浅色壁纸6
];

export const CALENDAR_BACKGROUNDS = [
  '/images/backgrounds/A1.jpg', // 深色跑车
  '/images/backgrounds/B3.jpg', // 浅色壁纸3
  '/images/backgrounds/B4.jpg', // 浅色壁纸4
  '/images/backgrounds/B6.jpg'  // 浅色壁纸6
];

// 兼容老代码的导出（后续可以在 NebulaConfigHub 里分发使用）
export const BACKGROUND_IMAGES = GLOBAL_BACKGROUNDS;

export function useBackground() {
  const [bgIndex, setBgIndex] = useState<number>(0); 

  useEffect(() => {
    const saved = localStorage.getItem('gx_theme_bg_index');
    if (saved !== null) {
      const parsedIndex = parseInt(saved, 10);
      if (parsedIndex >= 0 && parsedIndex < GLOBAL_BACKGROUNDS.length) {
        setBgIndex(parsedIndex);
      } else {
        localStorage.setItem('gx_theme_bg_index', '0');
        setBgIndex(0);
      }
    }
  }, []);

  useEffect(() => {
    const handleBgChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        startTransition(() => {
          setBgIndex(customEvent.detail as number);
        });
      }
    };

    window.addEventListener('gx-bg-change', handleBgChange);
    return () => window.removeEventListener('gx-bg-change', handleBgChange);
  }, []);

  const cycleBackground = useCallback(() => {
    const nextIndex = (bgIndex + 1) % GLOBAL_BACKGROUNDS.length;
    localStorage.setItem('gx_theme_bg_index', nextIndex.toString());
    window.dispatchEvent(new CustomEvent('gx-bg-change', { detail: nextIndex }));
  }, [bgIndex]);

  const setSpecificBackground = useCallback((index: number) => {
    if (index >= 0 && index < GLOBAL_BACKGROUNDS.length) {
      const saved = localStorage.getItem('gx_theme_bg_index');
      if (saved !== index.toString()) {
        localStorage.setItem('gx_theme_bg_index', index.toString());
        window.dispatchEvent(new CustomEvent('gx-bg-change', { detail: index }));
      }
    }
  }, []);

  return {
    bgIndex,
    currentBg: GLOBAL_BACKGROUNDS[bgIndex],
    cycleBackground,
    setSpecificBackground
  };
}
