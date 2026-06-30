'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { Loader2 } from 'lucide-react';

interface LottieIllustrationProps {
  /** Path to the Lottie JSON file (e.g., '/animations/empty-inbox.json') */
  src: string;
  /** Width of the animation (default: 120) */
  width?: number;
  /** Height of the animation (default: 120) */
  height?: number;
  /** Additional className for the wrapper */
  className?: string;
  /** Whether to loop the animation (default: true) */
  loop?: boolean;
  /** Whether to autoplay (default: true) */
  autoplay?: boolean;
  /** Fallback icon to show while loading or if Lottie fails */
  fallback?: React.ReactNode;
}

export default function LottieIllustration({
  src,
  width = 120,
  height = 120,
  className = '',
  loop = true,
  autoplay = true,
  fallback,
}: LottieIllustrationProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Failed to load: ${src}`);
        const data = await response.json();
        setAnimationData(data);
      } catch (err) {
        console.error('Error loading Lottie animation:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (src) {
      loadAnimation();
    }
  }, [src]);

  // Loading state
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        {fallback ? (
          fallback
        ) : (
          <Loader2 size={24} className="animate-spin text-blue-500" />
        )}
      </div>
    );
  }

  // Error state — show fallback or the original icon
  if (error || !animationData) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        {fallback || (
          <div className="w-20 h-20 rounded-2xl bg-gray-100/80 flex items-center justify-center border border-gray-200/60">
            <span className="text-4xl text-gray-300">📭</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className} style={{ width, height }}>
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width, height }}
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid slice',
        }}
      />
    </div>
  );
}