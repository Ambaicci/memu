'use client';

import { ReactNode } from 'react';

interface NavSectionProps {
  title: string;
  colorBar: string;
  children: ReactNode;
  isCollapsed?: boolean;
}

export default function NavSection({ title, colorBar, children, isCollapsed }: NavSectionProps) {
  return (
    <div>
      {!isCollapsed && (
        <div className="text-[11px] font-semibold tracking-wide text-[#8a8a8a] px-4 pb-2 uppercase flex items-center gap-2">
          <div className={`w-1 h-4 ${colorBar} rounded-full`}></div>
          {title}
        </div>
      )}
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}