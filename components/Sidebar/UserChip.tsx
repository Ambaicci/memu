'use client';

import { Settings, Sparkles, ChevronRight } from 'lucide-react';

interface UserChipProps {
  user: any;
  isGuest: boolean;
  onSignIn: () => void;
  onOpenProfile: () => void;
}

export default function UserChip({ user, isGuest, onSignIn, onOpenProfile }: UserChipProps) {
  if (isGuest) {
    return (
      <button 
        onClick={onSignIn}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all group text-left"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
          <Sparkles size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-800">Guest Mode</div>
          <div className="text-xs text-gray-500">Click to sign in</div>
        </div>
        <ChevronRight size={16} className="text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }

  const fullName = user?.user_metadata?.full_name || 'User';
  const username = user?.user_metadata?.username || 'handle';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <button 
      onClick={onOpenProfile}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100/80 border border-transparent hover:border-gray-200 transition-all group text-left"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 truncate">{fullName}</div>
        <div className="text-xs text-gray-500 truncate">@{username}</div>
      </div>
      <Settings size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
    </button>
  );
}

