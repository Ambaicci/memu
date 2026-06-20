'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export const useSwipeBack = (enabled = true) => {
  const router = useRouter();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if swiping from the left edge (first 30px of the screen)
      if (e.touches[0].clientX < 30) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        isSwiping.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = Math.abs(touchEndY - touchStartY.current);

      // If swiped right by at least 100px, and didn't move much vertically
      if (deltaX > 100 && deltaY < 50) {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push('/');
        }
      }
      
      isSwiping.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, router]);
};