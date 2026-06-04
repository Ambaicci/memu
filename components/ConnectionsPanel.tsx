'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Star, MessageCircle, Clock, ArrowRight, Users, Sparkles, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface Connection {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  textColor: string;
  memuCount: number;
  lastMemuDate: string;
  lastMemuPreview: string;
  status: 'active' | 'quiet' | 'new';
  isStarred?: boolean;
  userId: string; // The other party's user ID
}

const statusConfig = {
  active: { label: 'Active', color: 'text-[#059669]', bg: 'bg-[#d1fae5]', dot: 'bg-[#059669]' },
  quiet: { label: 'Quiet', color: 'text-[#d97706]', bg: 'bg-[#fef3c7]', dot: 'bg-[#d97706]' },
  new: { label: 'New', color: 'text-[#4f46e5]', bg: 'bg-[#ede9fe]', dot: 'bg-[#4f46e5]' },
};

interface ConnectionsPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

export default function ConnectionsPanel({ isGuest, requireAuth }: ConnectionsPanelProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

  // Fetch connections from Supabase (derived from memus table)
  const fetchConnections = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    try {
      // Fetch all memus where current user is sender OR recipient
      const { data: memus, error } = await supabase
        .from('memus')
        .select(`
          id,
          sender_id,
          recipient_id,
          recipient_email,
          subject,
          body,
          created_at,
          status,
          sender:sender_id!inner(full_name, username),
          recipient:recipient_id(full_name, username)
        `)
        .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching connections:', error);
        showToast('Failed to load connections', 'error');
        setLoading(false);
        return;
      }

      // Group memus by the other party (not current user)
      const connectionMap = new Map<string, {
        userId: string;
        name: string;
        username: string;
        memus: any[];
      }>();

      for (const memu of memus || []) {
        // Determine the other party
        const isSender = memu.sender_id === currentUserId;
        const otherParty = isSender ? memu.recipient : memu.sender;
        
        if (!otherParty || !otherParty.username) continue; // Skip external emails for now

        const userId = isSender ? memu.recipient_id : memu.sender_id;
        const key = userId || otherParty.username; // Fallback to username if no ID

        if (!connectionMap.has(key)) {
          connectionMap.set(key, {
            userId: userId || key,
            name: otherParty.full_name || otherParty.username,
            username: otherParty.username,
            memus: [],
          });
        }
        connectionMap.get(key)!.memus.push(memu);
      }

      // Transform to Connection interface
      const transformed: Connection[] = Array.from(connectionMap.values()).map(conn => {
        const memus = conn.memus;
        const lastMemu = memus[0]; // Most recent first due to order
        const memuCount = memus.length;
        
        // Determine status based on activity
        let status: 'active' | 'quiet' | 'new' = 'quiet';
        const lastDate = new Date(lastMemu.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - lastDate.getTime()) / 3600000;
        
        if (diffHours < 24) status = 'active';
        if (memuCount === 1 && diffHours < 48) status = 'new';

        return {
          id: conn.userId,
          name: conn.name,
          handle: `@${conn.username}.memu`,
          initials: getInitials(conn.name),
          color: stringToColor(conn.userId),
          textColor: '#1a1a1a',
          memuCount,
          lastMemuDate: formatLastMemuDate(lastMemu.created_at),
          lastMemuPreview: stripHtml(lastMemu.body || '').slice(0, 100),
          status,
          isStarred: false, // Would load from user_stars table in Phase 2
          userId: conn.userId,
        };
      });

      setConnections(transformed);
    } catch (err) {
      console.error('Unexpected error fetching connections:', err);
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

  // Helper: format last memu date
  const formatLastMemuDate = (timestamp: string) => {
    const now = new Date();
    const last = new Date(timestamp);
    const diffMs = now.getTime() - last.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return last.toLocaleDateString();
  };

  // Helper: strip HTML tags
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

  const filteredConnections = connections.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.handle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = filterFavorites ? c.isStarred : true;
    return matchesSearch && matchesFavorite;
  });

  const toggleFavorite = async (id: string) => {
    // In Phase 2: save to user_stars table
    // For now: just toggle local state
    setConnections(prev => prev.map(c => 
      c.id === id ? { ...c, isStarred: !c.isStarred } : c
    ));
    showToast('Favorite updated', 'success');
  };

  const openConnection = (connection: Connection) => {
    if (isGuest && requireAuth) {
      requireAuth('view conversation', () => {
        showToast(`Opening conversation with ${connection.name}`, 'success');
        // In Phase 2: navigate to conversation view
      });
    } else {
      showToast(`Opening conversation with ${connection.name}`, 'success');
      // In Phase 2: navigate to conversation view
    }
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
  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Users size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">No connections yet</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          Start a conversation and exchange 4+ memus with someone to build a connection.
        </p>
        <button
          onClick={handleOpenCompose}
          className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition"
        >
          ✏️ Write your first memu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Connections</h1>
        <p className="text-[13px] text-[#777] mt-1">
          {connections.length} active correspondences · {connections.filter(c => c.memuCount >= 10).length} with 10+ memus
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
              placeholder="Search connections..."
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
        </div>
      </div>

      {/* Connections Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredConnections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Search size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">No matching connections</h3>
            <p className="text-[13px] text-[#777]">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredConnections.map((connection) => (
              <div
                key={connection.id}
                onClick={() => openConnection(connection)}
                className="bg-white border border-[#e8e7e3] rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#d0cfc9]"
              >
                {/* Header with Avatar and Name */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-medium shadow-sm flex-shrink-0"
                    style={{ background: connection.color, color: connection.textColor }}
                  >
                    {connection.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-semibold text-[#0f0f0f]">{connection.name}</h3>
                      {connection.isStarred && (
                        <Star size={12} className="fill-[#d97706] text-[#d97706]" />
                      )}
                    </div>
                    <p className="text-[12px] text-[#4f46e5] font-medium">{connection.handle}</p>
                  </div>
                </div>

                {/* Memu Stats */}
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#f2f1ee]">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle size={12} className="text-[#777]" />
                    <span className="text-[13px] font-medium text-[#0f0f0f]">{connection.memuCount}</span>
                    <span className="text-[11px] text-[#777]">memus</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-[#ddd]" />
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-[#777]" />
                    <span className="text-[11px] text-[#777]">{connection.lastMemuDate}</span>
                  </div>
                </div>

                {/* Last Memu Preview */}
                <div className="mb-3">
                  <p className="text-[12px] text-[#777] line-clamp-2 italic">
                    "{connection.lastMemuPreview}"
                  </p>
                </div>

                {/* Footer with Status and Action */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusConfig[connection.status].bg}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusConfig[connection.status].dot}`} />
                    <span className={`text-[10px] font-medium ${statusConfig[connection.status].color}`}>
                      {statusConfig[connection.status].label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(connection.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-[#f2f1ee] transition"
                    >
                      <Star size={14} className={connection.isStarred ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConnection(connection);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#4f46e5] hover:gap-2 transition-all"
                    >
                      View Conversation
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}