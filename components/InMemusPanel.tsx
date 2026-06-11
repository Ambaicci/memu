'use client';

import { useState, useEffect, useCallback } from 'react';
import { Inbox, Mail, Calendar, Clock, Loader2, Star, Trash2, CheckCircle, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface Memu {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  recipient_email: string | null;
  subject: string;
  body: string;
  nature: string;
  status: string;
  created_at: string;
  sender_profile?: {
    id: string;
    full_name: string | null;
    username: string | null;
  } | null;
}

interface InMemusPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

export default function InMemusPanel({ isGuest, requireAuth }: InMemusPanelProps = {}) {
  const [memus, setMemus] = useState<Memu[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'starred'>('all');
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

  // Fetch received memus (Fixed: No direct FK join)
  const fetchMemus = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const supabase = createClient();
    
    try {
      // 1. Fetch received memus
      const { data: memusData, error } = await supabase
        .from('memus')
        .select('*')
        .eq('recipient_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memus:', error);
        showToast('Failed to load memus', 'error');
        setLoading(false);
        return;
      }

      // 2. Fetch sender profiles separately
      const senderIds = [...new Set((memusData || []).map(m => m.sender_id).filter(id => id))];
      let profilesMap: Record<string, any> = {};
      
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', senderIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        }
      }

      // 3. Enrich memus with sender info
      const enrichedMemus = (memusData || []).map(m => ({
        ...m,
        sender_profile: m.sender_id ? profilesMap[m.sender_id] || null : null,
      }));

      setMemus(enrichedMemus as Memu[]);
    } catch (err) {
      console.error('Unexpected error fetching memus:', err);
      showToast('Failed to load memus', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    if (currentUserId) {
      fetchMemus();
    }
  }, [fetchMemus, currentUserId]);

  const filteredMemus = memus.filter(m => {
    const matchesFilter = filter === 'all' ? true : favorites.has(m.id);
    const matchesSearch = searchQuery === '' || 
                          m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.sender_profile?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getSenderName = (memu: Memu) => {
    if (memu.sender_profile) {
      return memu.sender_profile.full_name || memu.sender_profile.username || 'Unknown Sender';
    }
    return 'Unknown Sender';
  };

  const getNatureBadge = (nature: string) => {
    const colors: Record<string, string> = {
      fyi: 'bg-[#fef3c7] text-[#d97706]',
      decide: 'bg-[#ede9fe] text-[#7c3aed]',
      resolve: 'bg-[#fee2e2] text-[#dc2626]',
      urgent: 'bg-[#d1fae5] text-[#059669]',
      broadcast: 'bg-[#fce7f3] text-[#be185d]',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[nature] || 'bg-[#f2f1ee] text-[#777]'}`}>
        {nature.toUpperCase()}
      </span>
    );
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
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">In-memus</h1>
        <p className="text-[13px] text-[#777] mt-1">
          {memus.length} received · {favorites.size} starred
        </p>
      </div>

      {/* Search & Filters */}
      <div className="px-4 md:px-8 py-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2.5 bg-[#f2f1ee] border border-[#e8e7e3] rounded-md px-3.5 py-2">
          <Search size={15} className="text-[#777]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memus..."
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
            onClick={() => setFilter('starred')}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition flex items-center gap-2 ${
              filter === 'starred' ? 'bg-[#d97706] text-white' : 'bg-white border border-[#e8e7e3] text-[#777] hover:border-[#777]'
            }`}
          >
            <Star size={14} className={filter === 'starred' ? 'fill-white' : ''} />
            Starred
          </button>
        </div>
      </div>

      {/* Memus List */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredMemus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Inbox size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">
              {filter === 'starred' ? 'No starred memus' : 'Your inbox is empty'}
            </h3>
            <p className="text-[13px] text-[#777]">
              {filter === 'starred' ? 'Star important memus to see them here' : 'Write a memu to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMemus.map((memu) => (
              <div
                key={memu.id}
                className="bg-white border border-[#e8e7e3] rounded-xl p-5 hover:shadow-md transition-all duration-200 group"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail size={14} className="text-[#4f46e5]" />
                      <span className="text-[13px] font-medium text-[#0f0f0f]">
                        From: {getSenderName(memu)}
                      </span>
                      {getNatureBadge(memu.nature)}
                    </div>
                    <div className="text-[14px] font-semibold text-[#0f0f0f] mb-1">
                      {memu.subject}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#777]">
                      <Clock size={10} />
                      {formatDate(memu.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(memu.id)}
                    className="p-1.5 rounded-md hover:bg-[#f2f1ee] transition flex-shrink-0"
                  >
                    <Star size={14} className={favorites.has(memu.id) ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} />
                  </button>
                </div>

                {/* Body Preview */}
                <div className="text-[13px] text-[#555] leading-relaxed line-clamp-3 bg-[#fafaf8] rounded-lg p-3">
                  {memu.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}