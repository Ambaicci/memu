'use client';

import { LogIn } from 'lucide-react';

interface UserChipProps {
  isGuest: boolean;
  user?: {
    name?: string;
    handle?: string;
    avatar?: string;
  };
  onSignIn: () => void;
  isCollapsed?: boolean;
}

export default function UserChip({ isGuest, user, onSignIn, isCollapsed }: UserChipProps) {
  if (isGuest) {
    if (isCollapsed) {
      return (
        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white hover:shadow-md transition"
          title="Sign In"
        >
          <LogIn size={16} />
        </button>
      );
    }
    return (
      <button
        onClick={onSignIn}
        className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white hover:shadow-md transition"
      >
        <LogIn size={16} />
        <span className="text-[13px] font-medium">Sign In / Sign Up</span>
      </button>
    );
  }

  if (isCollapsed) {
    return (
      <div 
        onClick={() => {
          window.dispatchEvent(new CustomEvent('openProfile'));
        }}
        className="flex justify-center cursor-pointer"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-[#1a1a1a] to-[#333] rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm hover:scale-105 transition-transform">
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            user?.name?.charAt(0) || 'U'
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => {
        window.dispatchEvent(new CustomEvent('openProfile'));
      }}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/30 transition-all duration-200 cursor-pointer group"
    >
      <div className="w-9 h-9 bg-gradient-to-br from-[#1a1a1a] to-[#333] rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm group-hover:scale-105 transition-transform">
        {user?.avatar ? (
          <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
        ) : (
          user?.name?.charAt(0) || 'U'
        )}
      </div>
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold text-[#1a1a1a]">{user?.name || 'User'}</div>
        <div className="text-[11.5px] text-[#8a8a8a]">{user?.handle || '@user.memu'}</div>
      </div>
    </div>
  );
}