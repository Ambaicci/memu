'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Star, Mail, Users, UserPlus, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface Handle {
  id: string;
  name: string;
  handle: string;
  role: string;
  initials: string;
  color: string;
  textColor: string;
  isFavorite?: boolean;
}

interface HandlesPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
  onComposeToHandle?: (handle: string) => void;
}

export default function HandlesPanel({ isGuest, requireAuth, onComposeToHandle }: HandlesPanelProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [handles, setHandles] = useState<Handle[]>([]);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Load favorites from localStorage (Phase 2: move to Supabase user_stars table)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('memu_favorites');
      if (saved) {
        const ids = JSON.parse(saved) as string[];
        setFavorites(new Set(ids));
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((ids: Set<string>) => {
    try {
      localStorage.setItem('memu_favorites', JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  }, []);

  // Fetch handles from Supabase profiles table
  const fetchHandles = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    try {
      // Fetch only existing columns: id, full_name, username, bio (if exists)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, bio')
        .neq('id', currentUserId)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching handles:', error);
        showToast('Failed to load handles', 'error');
      } else {
        // Transform to Handle interface
        const transformed: Handle[] = (data || []).map(profile => ({
          id: profile.id,
          name: profile.full_name || profile.username || 'Unknown',
          handle: `@${profile.username}.memu`,
          // Use bio if exists, otherwise fallback
          role: profile.bio || 'memu user',
          initials: getInitials(profile.full_name || profile.username || 'U'),
          color: stringToColor(profile.id),
          textColor: '#1a1a1a',
          isFavorite: favorites.has(profile.id),
        }));
        setHandles(transformed);
      }
    } catch (err) {
      console.error('Unexpected error fetching handles:', err);
      showToast('Failed to load handles', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, favorites, showToast]);

  useEffect(() => {
    if (currentUserId) {
      fetchHandles();
    }
  }, [fetchHandles, currentUserId]);

  // Helper: generate initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper: generate consistent color from ID
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 70%)`;
  };

  const filteredHandles = handles.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = filterFavorites ? favorites.has(h.id) : true;
    return matchesSearch && matchesFavorite;
  });

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
      showToast('Removed from favorites', 'success');
    } else {
      newFavorites.add(id);
      showToast('Added to favorites', 'success');
    }
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
    // Update local handle list
    setHandles(prev => prev.map(h => 
      h.id === id ? { ...h, isFavorite: newFavorites.has(id) } : h
    ));
  };

  const handleCompose = (handle: string) => {
    if (isGuest && requireAuth) {
      requireAuth('compose memu', () => onComposeToHandle?.(handle));
    } else {
      onComposeToHandle?.(handle);
    }
  };

  const handleAddHandle = () => {
    showToast('Handle search coming soon! Type a name in the search bar to find users.', 'success');
  };

  const handleOpenCompose = () => {
    window.dispatchEvent(new CustomEvent('openCompose'));
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5]" />
      </div>
    );
  }

  // Empty State
  if (handles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Users size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">Your directory is empty</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          Add handles to build your network. Start by connecting with people you communicate with.
        </p>
        <button
          onClick={handleOpenCompose}
          className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition flex items-center gap-2 mx-auto"
        >
          <UserPlus size={16} />
          Write your first memu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Handles</h1>
        <p className="text-[13px] text-[#777] mt-1">
          {handles.length} contacts · {favorites.size} favorites
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-4 md:px-8 py-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 flex items-center gap-2.5 bg-[#f2f1ee] border border-[#e8e7e3] rounded-md px-3.5 py-2">
            <Search size={15} className="text-[#777]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search handles or names…"
              className="flex-1 text-[13.5px] outline-none bg-transparent"
            />
          </div>
          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-medium transition ${
              filterFavorites 
                ? 'bg-[#fef3c7] text-[#d97706] border border-[#fde68a]' 
                : 'bg-white border border-[#e8e7e3] text-[#3a3a3a] hover:border-[#777]'
            }`}
          >
            <Star size={14} className={filterFavorites ? 'fill-[#d97706]' : ''} />
            Favorites
          </button>
          <button
            onClick={handleAddHandle}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-medium bg-[#0f0f0f] text-white hover:bg-[#2a2a2a] transition"
          >
            <UserPlus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Handles Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredHandles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Search size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">No matching handles</h3>
            <p className="text-[13px] text-[#777]">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHandles.map((handle) => (
              <div
                key={handle.id}
                className="bg-white border border-[#e8e7e3] rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#d0cfc9]"
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-base font-medium mb-3 shadow-sm"
                  style={{ background: handle.color, color: handle.textColor }}
                >
                  {handle.initials}
                </div>

                {/* Info */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-[14px] font-medium text-[#0f0f0f] mb-0.5">{handle.name}</div>
                    <div className="text-[12px] text-[#4f46e5] font-medium mb-2">{handle.handle}</div>
                    <div className="text-[12px] text-[#777] mb-3">{handle.role}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(handle.id);
                    }}
                    className="p-1.5 rounded-md hover:bg-[#f2f1ee] transition flex-shrink-0"
                  >
                    <Star size={14} className={favorites.has(handle.id) ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleCompose(handle.handle)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#0f0f0f] text-white rounded-md py-2 text-[11.5px] font-medium hover:bg-[#2a2a2a] transition"
                  >
                    <Mail size={12} />
                    Write
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}