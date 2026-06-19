'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Star, Mail, MessageSquare, Search, Filter, ChevronDown } from 'lucide-react';
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
  { id: 'all', label: 'All connections', icon: <Users size={14} /> },
  { id: 'favorites', label: 'Favorites', icon: <Star size={14} /> },
];

const getBorderClass = (color: string) => {
  const match = color.match(/hsl\((\d+)/);
  if (!match) return 'border-gray-200/60';
  
  const hue = parseInt(match[1]);
  
  if (hue >= 0 && hue < 30) return 'border-rose-200/60';
  if (hue >= 30 && hue < 60) return 'border-amber-200/60';
  if (hue >= 60 && hue < 90) return 'border-yellow-200/60';
  if (hue >= 90 && hue < 150) return 'border-emerald-200/60';
  if (hue >= 150 && hue < 210) return 'border-cyan-200/60';
  if (hue >= 210 && hue < 270) return 'border-blue-200/60';
  if (hue >= 270 && hue < 330) return 'border-purple-200/60';
  return 'border-pink-200/60';
};

const getInitials = (name: string) => {
  return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
};

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 65%)`;
};

export default function ConnectionsPanel({ isGuest, requireAuth }: ConnectionsPanelProps = {}) {
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

  const saveFavorites = (ids: Set<string>) => {
    try {
      localStorage.setItem('connections_favorites', JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  };

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

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const supabase = createClient();
      
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

      return fallbackConnections;
    },
    enabled: !!currentUserId,
    staleTime: 60 * 1000,
  });

  const filteredConnections = connections.filter(c => {
    const matchesFilter = filter === 'all' ? true : favorites.has(c.connected_user_id);
    const profile = c.profile;
    const name = profile?.full_name || profile?.username || '';
    const matchesSearch = searchQuery === '' || 
                          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (profile?.bio || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const currentFilterLabel = filter === 'all' ? 'All connections' : 'Favorites';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-memu-canvas animate-page-enter">
      {/* Header Section */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Users size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Network</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">Connections</h1>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-sm text-gray-500 font-medium">{connections.length} connections</span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-amber-600 font-bold">{favorites.size} favorites</span>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..."
              className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-3 px-5 py-4 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 transition-all shadow-sm btn-press"
            >
              <Filter size={15} />
              <span>{currentFilterLabel}</span>
              <ChevronDown size={13} />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-20 animate-fadeIn">
                <div className="py-2">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setFilter(opt.id as any); setIsFilterOpen(false); }}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition ${
                        filter === opt.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connections Grid */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
        {filteredConnections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-scale">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl blur-2xl animate-pulse"></div>
              <div className="relative bg-white rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-gray-200">
                <Users size={48} className="text-indigo-500" strokeWidth={2} />
              </div>
            </div>
            <h3 className="font-serif text-xl font-semibold text-gray-900 mb-3">
              {filter === 'favorites' ? 'No favorite connections' : 'No connections found'}
            </h3>
            <p className="text-gray-500 text-sm max-w-md">
              {filter === 'favorites' ? 'Star some connections to see them here' : 'Try a different search'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnections.map((connection, idx) => {
              const profile = connection.profile;
              const name = profile?.full_name || profile?.username || 'Unknown';
              const initials = getInitials(name);
              const color = stringToColor(connection.connected_user_id);
              const borderClass = getBorderClass(color);
              const isFavorite = favorites.has(connection.connected_user_id);

              return (
                <div
                  key={connection.id}
                  className={`group relative bg-white rounded-2xl border-[1px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${borderClass} p-4 animate-slide-up btn-press`}
                  style={{ animationDelay: `${idx * 60}ms`, opacity: 0 }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 truncate">{name}</h3>
                          {profile?.username && (
                            <p className="text-[11px] text-indigo-600 font-semibold">@{profile.username}</p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleFavorite(connection.connected_user_id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-all flex-shrink-0 hover:scale-110 btn-press"
                        >
                          <Star size={14} strokeWidth={2.5} className={isFavorite ? 'fill-amber-500 text-amber-500' : 'text-gray-300'} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {profile?.bio && (
                    <p className="text-[13px] text-gray-500 mb-3 line-clamp-2 leading-relaxed">{profile.bio}</p>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-gray-100/50">
                    <button className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full py-2 text-xs font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md btn-press">
                      <Mail size={11} strokeWidth={2.5} />
                      Write
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full py-2 text-xs font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md btn-press">
                      <MessageSquare size={11} strokeWidth={2.5} />
                      Memo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}