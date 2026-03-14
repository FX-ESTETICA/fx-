'use client'

import { useEffect } from 'react'

interface UseScrollLockProps {
  isLocked: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  showCheckoutPreview?: boolean
}

export function useScrollLock({ isLocked, containerRef, showCheckoutPreview }: UseScrollLockProps) {
  // Robust Mobile Scroll Locking & Gesture Prevention
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e: TouchEvent) => {
      // Only prevent default if we are in a locked state (modal or checkout preview)
      // and NOT in a scrollable area within the modal
      if (isLocked || showCheckoutPreview) {
        // Check if the target is within the scrollable items area
        const isScrollable = (e.target as HTMLElement).closest('.overflow-y-auto');
        if (!isScrollable) {
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    container.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      container.removeEventListener('touchmove', preventDefault);
    };
  }, [isLocked, showCheckoutPreview, containerRef]);

  // Handle body locking for iOS specifically (position: fixed approach)
  useEffect(() => {
    if (isLocked) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };
    }
  }, [isLocked]);
}
