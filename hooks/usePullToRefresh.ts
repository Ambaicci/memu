'use client';

import { useState, useEffect, useRef } from 'react';

export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = (e: TouchEvent) => {
    // Only allow pull to refresh if the user is at the very top of the page
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    } else {
      isPulling.current = false;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.current) return;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    
    const pullDistance = touchCurrentY.current - touchStartY.current;
    
    // If pulled down more than 80px
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    isPulling.current = false;
  };

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, isRefreshing]);

  return { isRefreshing };
};