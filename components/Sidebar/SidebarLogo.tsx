'use client';

import { X } from 'lucide-react';

interface SidebarLogoProps {
  onMobileClose?: () => void;
}

export default function SidebarLogo({ onMobileClose }: SidebarLogoProps) {
  return (
    <div className="px-5 pt-8 pb-4 flex items-center justify-between gap-2.5 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        {/* Test with a colored square first */}
        <div className="w-8 h-8 rounded-xl bg-red-500"></div>
        <span className="font-['Playfair_Display'] text-[22px] font-medium tracking-tight bg-gradient-to-r from-[#1a1a1a] to-[#555] bg-clip-text text-transparent">
          memu
        </span>
      </div>
      {onMobileClose && (
        <button 
          onClick={onMobileClose}
          className="lg:hidden p-2 rounded-lg hover:bg-white/30"
        >
          <X size={20} className="text-[#686868]" />
        </button>
      )}
    </div>
  );
}