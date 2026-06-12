'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Star, Mail, MessageSquare, Loader2, Search, Filter, ChevronDown, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: string;
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    username: string | null;
    bio: string | null;
  };
}

interface ConnectionsPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const filterOptions = [
  { id: 'all', label: 'All connections', icon: <Users size={12} /> },
  { id: 'favorites', label: 'Favorites', icon: <Star size={12} /> },
];

export default function ConnectionsPanel({ isGuest, requireAuth }: ConnectionsPanelProps = {}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const saved = localStorage.getItem('connections_favorites');
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
      localStorage.setItem('connections_favorites', JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  }, []);

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
  };

  const fetchConnections = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, bio')
        .neq('id', currentUserId)
        .order('full_name', { ascending: true });

      if (error) throw error;

      const fallbackConnections: Connection[] = (profilesData || []).map(p => ({
        id: p.id,
        user_id: currentUserId,
        connected_user_id: p.id,
        status: 'accepted',
        created_at: new Date().toISOString(),
        profile: p,
      }));

      setConnections(fallbackConnections);
    } catch (err) {
      console.error('Error fetching connections:', err);
      showToast('Failed to load connections', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    if (currentUserId) fetchConnections();
  }, [fetchConnections, currentUserId]);

  const filteredConnections = connections.filter(c => {
    const matchesFilter = filter === 'all' ? true : favorites.has(c.connected_user_id);
    const profile = c.profile;
    const name = profile?.full_name || profile?.username || '';
    const matchesSearch = searchQuery === '' || 
                          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (profile?.bio || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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

  const currentFilterLabel = filter === 'all' ? 'All connections' : 'Favorites';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fafaf8]">
      <div className="px-6 md:px-10 pt-8 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <h1 className="heading-gradient font-['Playfair_Display'] text-3xl md:text-4xl font-medium tracking-tight">Connections</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs text-[#777]">{connections.length} connections</span>
              <span className="text-xs text-[#777]">· {favorites.size} favorites</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#e8e7e3] rounded-full text-sm outline-none focus:border-[#4f46e5] transition"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e8e7e3] rounded-full text-sm text-[#777] hover:border-[#4f46e5] transition"
            >
              <Filter size={12} />
              {currentFilterLabel}
              <ChevronDown size={10} />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-[#e8e7e3] overflow-hidden z-20">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setFilter(opt.id as any); setIsFilterOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition ${
                      filter === opt.id ? 'bg-[#ede9fe] text-[#4f46e5]' : 'text-[#777] hover:bg-[#fafaf8]'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
        {filteredConnections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Users size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[17px] font-medium text-[#1a1a1a] mb-1">
              {filter === 'favorites' ? 'No favorite connections' : 'No connections found'}
            </h3>
            <p className="text-[13px] text-[#777]">
              {filter === 'favorites' ? 'Star some connections to see them here' : 'Try a different search'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnections.map((connection) => {
              const profile = connection.profile;
              const name = profile?.full_name || profile?.username || 'Unknown';
              const initials = getInitials(name);
              const color = stringToColor(connection.connected_user_id);
              const isFavorite = favorites.has(connection.connected_user_id);

              return (
                <div
                  key={connection.id}
                  className="group bg-white rounded-xl border border-[#e8e7e3] p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium shadow-sm flex-shrink-0"
                      style={{ background: color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-[#1a1a1a] text-sm truncate">{name}</h3>
                          {profile?.username && (
                            <p className="text-[11px] text-[#4f46e5] font-medium">@{profile.username}</p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleFavorite(connection.connected_user_id)}
                          className="p-1 rounded-md hover:bg-[#f2f1ee] transition flex-shrink-0"
                        >
                          <Star size={14} className={isFavorite ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} />
                        </button>
                      </div>
                      {profile?.bio && (
                        <p className="text-[11px] text-[#777] mt-1 line-clamp-2">{profile.bio}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white rounded-full py-1.5 text-[11px] font-medium hover:from-[#5b21b6] hover:to-[#818cf8] transition">
                          <Mail size={11} />
                          Write
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#0891b2] to-[#06b6d4] text-white rounded-full py-1.5 text-[11px] font-medium hover:from-[#0e7490] hover:to-[#0891b2] transition">
                          <MessageSquare size={11} />
                          Memo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}