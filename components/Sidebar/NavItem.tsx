'use client';

import { ReactNode } from 'react';

interface NavItemProps {
  icon: ReactNode;
  label: string;
  badge?: string | number;
  isActive?: boolean;
  onClick: () => void;
}

export default function NavItem({ icon, label, badge, isActive, onClick }: NavItemProps) {
  const activeClass = isActive
    ? 'bg-white/60 text-[#1a1a1a] shadow-sm'
    : 'text-[#686868] hover:bg-white/30 hover:text-[#1a1a1a]';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-medium rounded-lg transition-all duration-200 cursor-pointer ${activeClass}`}
    >
      <span className="opacity-70">{icon}</span>
      <span>{label}</span>
      {badge && (
        <span className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full ${
          isActive ? 'bg-white/25 text-white' : 'bg-white/50 text-[#1a1a1a]'
        }`}>
          {badge}
        </span>
      )}
    </div>
  );
}