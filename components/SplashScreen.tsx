'use client';

import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500); // Wait for fade animation
    }, 2000); // Show for 2 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ${
      fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]" />
      
      {/* Content */}
      <div className="relative z-10 text-center animate-pulse-slow">
        {/* Logo */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl shadow-2xl overflow-hidden bg-white/10 backdrop-blur-sm">
  <img 
    src="/svg.logo.png" 
    alt="memu" 
    className="w-full h-full object-contain p-2"
  />
</div>
        
        {/* App Name */}
        <h1 className="font-['Playfair_Display'] text-5xl font-medium tracking-tight text-white mb-2">
          memu
        </h1>
        
        {/* Tagline */}
        <p className="text-white/60 text-sm tracking-wide">
          communicate differently
        </p>
      </div>
    </div>
  );
}