'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface NavigationEntry {
  path: string;
  title: string;
  timestamp: number;
}

export function useNavigation() {
  const [history, setHistory] = useState<NavigationEntry[]>([{ path: '/?panel=inmemus', title: 'In-memus', timestamp: Date.now() }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const isInitialMount = useRef(true);

  // Add current path to history when it changes
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const title = document.title || 'memu';
    
    setHistory(prev => {
      // Don't add duplicate consecutive entries
      if (prev.length > 0 && prev[prev.length - 1].path === pathname + window.location.search) {
        return prev;
      }
      // Remove any forward history and add new entry
      const fullPath = pathname + window.location.search;
      const newHistory = [...prev.slice(0, currentIndex + 1), { path: fullPath, title, timestamp: Date.now() }];
      return newHistory;
    });
    
    setCurrentIndex(prev => prev + 1);
  }, [pathname]);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  const goBack = useCallback(() => {
    if (canGoBack) {
      const prev = history[currentIndex - 1];
      if (prev) {
        router.push(prev.path);
        setCurrentIndex(currentIndex - 1);
      }
    }
  }, [canGoBack, history, currentIndex, router]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      const next = history[currentIndex + 1];
      if (next) {
        router.push(next.path);
        setCurrentIndex(currentIndex + 1);
      }
    }
  }, [canGoForward, history, currentIndex, router]);

  const goHome = useCallback(() => {
    router.push('/?panel=inmemus');
    setHistory([{ path: '/?panel=inmemus', title: 'In-memus', timestamp: Date.now() }]);
    setCurrentIndex(0);
  }, [router]);

  return {
    history,
    currentIndex,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    goHome,
  };
}