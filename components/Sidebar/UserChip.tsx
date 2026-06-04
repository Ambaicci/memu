'use client';

import { LogIn, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserChipProps {
  isGuest: boolean;
  user?: any;
  onSignIn: () => void;
  isCollapsed: boolean;
}

export default function UserChip({ isGuest, user, onSignIn, isCollapsed }: UserChipProps) {
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (isGuest) {
    return (
      <button
        onClick={onSignIn}
        className={`flex items-center gap-2 w-full rounded-lg transition-all duration-200 ${
          isCollapsed ? 'justify-center p-2' : 'px-3 py-2 justify-start'
        } bg-gradient-to-r from-indigo-50 to-cyan-50 hover:from-indigo-100 hover:to-cyan-100 text-indigo-700`}
      >
        <LogIn size={18} />
        {!isCollapsed && <span className="text-sm font-medium">Sign in</span>}
      </button>
    );
  }

  if (!user) return null;

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const username = user.user_metadata?.username || user.email;

  return (
    <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : 'justify-between'} w-full`}>
      <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : 'flex-1'}`}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-medium text-sm shadow-sm">
          {fullName.charAt(0).toUpperCase()}
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{fullName}</p>
            <p className="text-xs text-gray-500 truncate">{username}</p>
          </div>
        )}
      </div>
      {!isCollapsed && (
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      )}
    </div>
  );
}