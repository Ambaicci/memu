'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Star, Mail, MessageSquare, Loader2, Search } from 'lucide-react';
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

export default function ConnectionsPanel({ isGuest, requireAuth }: ConnectionsPanelProps = {}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
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

  // Load favorites from localStorage
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

  // Fetch connections (Simplified: Just fetch all profiles)
  const fetchConnections = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    try {
      // Fetch all profiles except the current user
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, bio')
        .neq('id', currentUserId)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching profiles for connections:', error);
        showToast('Failed to load connections', 'error');
        return;
      }

      const fallbackConnections: Connection[] = (profilesData || []).map(p => ({
        id: p.id,
        user_id: currentUserId,
        connected_user_id: p.id,
        status: 'accepted',
        created_at: new Date().toISOString(),
        profile: p,
      }));

      setConnections(fallbackConnections);
    } catch (err: any) {
      console.error('Error fetching connections:', err);
      showToast('Failed to load connections', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    if (currentUserId) {
      fetchConnections();
    }
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
    return `hsl(${hue}, 60%, 70%)`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Connections</h1>
        <p className="text-[13px] text-[#777] mt-1">
          {connections.length} connections · {favorites.size} favorites
        </p>
      </div>

      {/* Search & Filter Tabs */}
      <div className="px-4 md:px-8 py-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2.5 bg-[#f2f1ee] border border-[#e8e7e3] rounded-md px-3.5 py-2">
          <Search size={15} className="text-[#777]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections..."
            className="flex-1 text-[13.5px] outline-none bg-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${
              filter === 'all' ? 'bg-[#0f0f0f] text-white' : 'bg-white border border-[#e8e7e3] text-[#777] hover:border-[#777]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition flex items-center gap-2 ${
              filter === 'favorites' ? 'bg-[#d97706] text-white' : 'bg-white border border-[#e8e7e3] text-[#777] hover:border-[#777]'
            }`}
          >
            <Star size={14} className={filter === 'favorites' ? 'fill-white' : ''} />
            Favorites
          </button>
        </div>
      </div>

      {/* Connections Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredConnections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Users size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">
              {filter === 'favorites' ? 'No favorite connections' : 'No connections found'}
            </h3>
            <p className="text-[13px] text-[#777]">
              {filter === 'favorites' ? 'Star some connections to see them here' : 'Try a different search'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnections.map((connection) => {
              const profile = connection.profile;
              const name = profile?.full_name || profile?.username || 'Unknown';
              const initials = getInitials(name);
              const color = stringToColor(connection.connected_user_id);

              return (
                <div
                  key={connection.id}
                  className="bg-white border border-[#e8e7e3] rounded-xl p-5 hover:shadow-md transition-all duration-200"
                >
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-base font-medium mb-3 shadow-sm"
                    style={{ background: color }}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-[14px] font-medium text-[#0f0f0f] mb-0.5">{name}</div>
                      {profile?.username && (
                        <div className="text-[12px] text-[#4f46e5] font-medium mb-2">@{profile.username}</div>
                      )}
                      {profile?.bio && (
                        <div className="text-[12px] text-[#777] line-clamp-2">{profile.bio}</div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleFavorite(connection.connected_user_id)}
                      className="p-1.5 rounded-md hover:bg-[#f2f1ee] transition flex-shrink-0"
                    >
                      <Star size={14} className={favorites.has(connection.connected_user_id) ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 bg-[#0f0f0f] text-white rounded-md py-2 text-[11.5px] font-medium hover:bg-[#2a2a2a] transition">
                      <Mail size={12} />
                      Write
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 bg-[#4f46e5] text-white rounded-md py-2 text-[11.5px] font-medium hover:bg-[#4338ca] transition">
                      <MessageSquare size={12} />
                      Memo
                    </button>
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