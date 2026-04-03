import { useState, useEffect, useCallback, startTransition } from 'react';

export const BACKGROUND_IMAGES = [
  'starry', // 默认纯星空
  '/images/backgrounds/p1.jpg'
];

export function useBackground() {
  // Hydration 安全原点：SSR 和初始挂载强制为 0 (纯代码星空)
  const [bgIndex, setBgIndex] = useState<number>(0); 

  useEffect(() => {
    // 客户端挂载后，再去读取真实的物理缓存
    const saved = localStorage.getItem('gx_theme_bg_index');
    if (saved !== null) {
      const parsedIndex = parseInt(saved, 10);
      if (parsedIndex >= 0 && parsedIndex < BACKGROUND_IMAGES.length) {
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
