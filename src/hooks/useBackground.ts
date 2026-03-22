import { useState, useEffect, useCallback } from 'react';

export const BACKGROUND_IMAGES = [
  'starry', // 默认纯星空
  '/images/backgrounds/ChatGPT Image 2026年3月22日 21_25_49.png'
];

export function useBackground() {
  const [bgIndex, setBgIndex] = useState<number>(0);

  useEffect(() => {
    // 读取本地存储
    const saved = localStorage.getItem('gx_theme_bg_index');
    if (saved !== null) {
      const parsedIndex = parseInt(saved, 10);
      if (parsedIndex >= 0 && parsedIndex < BACKGROUND_IMAGES.length) {
        setBgIndex(parsedIndex);
      } else {
        setBgIndex(0);
        localStorage.setItem('gx_theme_bg_index', '0');
      }
    }

    // 监听其他组件触发的切换事件
    const handleBgChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        setBgIndex(customEvent.detail);
      }
    };

    window.addEventListener('gx-bg-change', handleBgChange);
    return () => window.removeEventListener('gx-bg-change', handleBgChange);
  }, []);

  const cycleBackground = useCallback(() => {
    const nextIndex = (bgIndex + 1) % BACKGROUND_IMAGES.length;
    localStorage.setItem('gx_theme_bg_index', nextIndex.toString());
    window.dispatchEvent(new CustomEvent('gx-bg-change', { detail: nextIndex }));
  }, [bgIndex]);

  return {
    bgIndex,
    currentBg: BACKGROUND_IMAGES[bgIndex],
    cycleBackground
  };
}
