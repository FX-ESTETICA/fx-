import { useState, useEffect, useCallback } from 'react';

export const BACKGROUND_IMAGES = [
  'starry', // 默认纯星空
  '/images/backgrounds/_116c111f-18b8-455b-958d-9521004e83be.jpg',
  '/images/backgrounds/_353e804b-56f1-4cd7-93e5-55bd4d5fda92.jpg',
  '/images/backgrounds/_50a3c3a3-cead-484b-9593-d173d6508c67.jpg',
  '/images/backgrounds/_50feb067-f57b-4dbd-b45a-8e1b0b00481f.jpg',
  '/images/backgrounds/_56f6e923-f238-4a31-a8cf-d00e53d4d0eb.jpg',
  '/images/backgrounds/_76b78e68-2659-4846-93d2-d83df313f0c6.jpg',
  '/images/backgrounds/_af1b9e43-72d4-4e12-a2f0-80262c66470f.jpg',
  '/images/backgrounds/_b6307225-f3cf-45a8-8e52-961c917467b1.jpg',
  '/images/backgrounds/_c1f411cc-6308-47de-8b3b-c77202a28cb2.jpg',
  '/images/backgrounds/_c504f464-1a31-4d54-8df4-426d6f790604.jpg',
  '/images/backgrounds/_d335c96b-403e-441c-a17d-7a245828a38e.jpg',
  '/images/backgrounds/_e9238414-87bd-41cf-b317-eeea1d2aefad.jpg'
];

export function useBackground() {
  const [bgIndex, setBgIndex] = useState<number>(0);

  useEffect(() => {
    // 读取本地存储
    const saved = localStorage.getItem('gx_theme_bg_index');
    if (saved !== null) {
      setBgIndex(parseInt(saved, 10));
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
