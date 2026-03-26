import { useState, useEffect, useCallback, startTransition } from 'react';

export const BACKGROUND_IMAGES = [
  'starry', // 默认纯星空
  '/images/backgrounds/ChatGPT Image 2026年3月25日 00_06_27.png',
  '/images/backgrounds/p1.jpg'
];

export function useBackground() {
  const [bgIndex, setBgIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gx_theme_bg_index');
      if (saved !== null) {
        const parsedIndex = parseInt(saved, 10);
        if (parsedIndex >= 0 && parsedIndex < BACKGROUND_IMAGES.length) {
          return parsedIndex;
        } else {
          localStorage.setItem('gx_theme_bg_index', '1');
          return 1;
        }
      }
    }
    return 1;
  });

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
