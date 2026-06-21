'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Handle } from './types';

interface HandleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (profile: Profile) => void;
  currentUserId: string | null;
  position?: 'left' | 'right';
}

export default function HandleSelector({ isOpen, onClose, onSelect, currentUserId, position = 'left' }: HandleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [savedHandlesList, setSavedHandlesList] = useState<Handle[]>([]);
  const [loadingHandles, setLoadingHandles] = useState(false);
  const [searching, setSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch saved handles when opened
  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchSavedHandles();
    }
  }, [isOpen, currentUserId]);

  const fetchSavedHandles = async () => {
    setLoadingHandles(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('handles')
      .select('*')
      .eq('user_id', currentUserId || '')
      .order('username', { ascending: true });
    if (!error && data) setSavedHandlesList(data);
    setLoadingHandles(false);
  };

  // Search handles with debounce
  useEffect(() => {
    if (!isOpen) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchHandles = async () => {
      setSearching(true);
      const supabase = createClient();
      
      // Filter saved handles locally
      const filteredSaved = savedHandlesList.filter(h =>
        h.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.full_name && h.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      // Search profiles in database
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .neq('id', currentUserId || '')
        .limit(10);

      if (!error && data) {
        // Merge results, avoiding duplicates
        const merged = [
          ...filteredSaved,
          ...data.filter(p => !filteredSaved.some(s => s.username === p.username))
        ];
        setSearchResults(merged as Profile[]);
      } else {
        setSearchResults(filteredSaved as Profile[]);
      }
      setSearching(false);
    };

    const debounce = setTimeout(searchHandles, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, isOpen, currentUserId, savedHandlesList]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  const handleSelect = (profile: Profile) => {
    onSelect(profile);
    onClose();
  };

  const displayList = searchQuery ? searchResults : savedHandlesList;

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute top-full ${position === 'left' ? 'left-0' : 'right-0'} mt-2 w-72 md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale`}
    >
      {/* Search Input */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search handles..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            autoFocus
          />
        </div>
      </div>

      {/* Results List */}
      <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scroll">
        {loadingHandles && (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        )}

        {!loadingHandles && !searchQuery && savedHandlesList.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-3">No saved handles</p>
        )}

        {searching && (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        )}

        {!searching && !loadingHandles && searchQuery && searchResults.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-3">No users found</p>
        )}

        {!searching && !loadingHandles && displayList.map((profile) => (
          <button
            key={profile.id || profile.username}
            onClick={() => handleSelect(profile as Profile)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-indigo-50 rounded-xl transition-all btn-press"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
              {(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">
                {profile.full_name || profile.username}
              </div>
              <div className="text-xs text-gray-500 truncate">@{profile.username}.memu</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}