'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Star, Mail, Users, UserPlus, Inbox, MessageSquare, Filter, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import DirectMemoComposer from './direct-memos/DirectMemoComposer';

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
  const [memoRecipient, setMemoRecipient] = useState<{ id: string; name: string } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('handles_favorites');
      if (saved) {
        const ids = JSON.parse(saved) as string[];
        setFavorites(new Set(ids));
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  }, []);

  const saveFavorites = useCallback((ids: Set<string>) => {
    try {
      localStorage.setItem('handles_favorites', JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  }, []);

  const fetchHandles = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, bio')
        .neq('id', currentUserId)
        .order('full_name', { ascending: true });

      if (error) throw error;

      const transformed: Handle[] = (data || []).map(profile => ({
        id: profile.id,
        name: profile.full_name || profile.username || 'Unknown',
        handle: `@${profile.username}.memu`,
        role: profile.bio || 'memu user',
        initials: getInitials(profile.full_name || profile.username || 'U'),
        color: stringToColor(profile.id),
        textColor: '#1a1a1a',
        isFavorite: favorites.has(profile.id),
      }));
      setHandles(transformed);
    } catch (err) {
      console.error('Error fetching handles:', err);
      showToast('Failed to load handles', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, favorites, showToast]);

  useEffect(() => {
    if (currentUserId) fetchHandles();
  }, [fetchHandles, currentUserId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 65%)`;
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

  const handleSendDirectMemo = (handle: Handle) => {
    if (isGuest && requireAuth) {
      requireAuth('send direct memo', () => {
        setMemoRecipient({ id: handle.id, name: handle.name });
      });
    } else {
      setMemoRecipient({ id: handle.id, name: handle.name });
    }
  };

  const handleAddHandle = () => {
    showToast('Handle search coming soon!', 'info');
  };

  const handleOpenCompose = () => {
    window.dispatchEvent(new CustomEvent('openCompose'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (handles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Users size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#1a1a1a] mb-2">Your directory is empty</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          Add handles to build your network. Start by connecting with people you communicate with.
        </p>
        <button
          onClick={handleOpenCompose}
          className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-full text-[13px] font-medium hover:shadow-lg transition flex items-center gap-2 mx-auto"
        >
          <UserPlus size={16} />
          Write your first memu
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-[#fafaf8]">
        <div className="px-6 md:px-10 pt-8 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <h1 className="heading-gradient font-['Playfair_Display'] text-3xl md:text-4xl font-medium tracking-tight">Handles</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs text-[#777]">{handles.length} contacts</span>
                <span className="text-xs text-[#777]">· {favorites.size} favorites</span>
              </div>
            </div>
            <button
              onClick={handleAddHandle}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-full text-sm font-medium hover:from-[#5b21b6] hover:to-[#06b6d4] transition shadow-sm"
            >
              <UserPlus size={14} />
              Add Handle
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search handles or names…"
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#e8e7e3] rounded-full text-sm outline-none focus:border-[#4f46e5] transition"
              />
            </div>
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition shadow-sm ${
                filterFavorites 
                  ? 'bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white' 
                  : 'bg-white border border-[#e8e7e3] text-[#777] hover:border-[#4f46e5] hover:text-[#4f46e5]'
              }`}
            >
              <Star size={14} className={filterFavorites ? 'fill-white' : ''} />
              Favorites
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
          {filteredHandles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
                <Search size={28} className="text-[#aaa]" />
              </div>
              <h3 className="text-[17px] font-medium text-[#1a1a1a] mb-1">No matching handles</h3>
              <p className="text-[13px] text-[#777]">Try a different search or filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHandles.map((handle) => (
                <div
                  key={handle.id}
                  className="group bg-white rounded-xl border border-[#e8e7e3] p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium shadow-sm flex-shrink-0"
                      style={{ background: handle.color }}
                    >
                      {handle.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-[#1a1a1a] text-sm truncate">{handle.name}</h3>
                          <p className="text-[11px] text-[#4f46e5] font-medium truncate">{handle.handle}</p>
                        </div>
                        <button
                          onClick={() => toggleFavorite(handle.id)}
                          className="p-1 rounded-md hover:bg-[#f2f1ee] transition flex-shrink-0"
                        >
                          <Star size={14} className={favorites.has(handle.id) ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#777] mt-1 line-clamp-2">{handle.role}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleCompose(handle.handle)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white rounded-full py-1.5 text-[11px] font-medium hover:from-[#5b21b6] hover:to-[#818cf8] transition"
                        >
                          <Mail size={11} />
                          Write
                        </button>
                        <button
                          onClick={() => handleSendDirectMemo(handle)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#0891b2] to-[#06b6d4] text-white rounded-full py-1.5 text-[11px] font-medium hover:from-[#0e7490] hover:to-[#0891b2] transition"
                        >
                          <MessageSquare size={11} />
                          Memo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {memoRecipient && (
        <DirectMemoComposer
          recipientId={memoRecipient.id}
          recipientName={memoRecipient.name}
          onClose={() => setMemoRecipient(null)}
          onSent={() => setMemoRecipient(null)}
        />
      )}
    </>
  );
}