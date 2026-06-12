'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Inbox, Mail, Clock, Loader2, Star, Search, Eye, Sparkles, CheckCircle, BookOpen, Reply, Filter, ChevronDown, Paperclip } from 'lucide-react';
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
  is_read: boolean;
  delivered_at?: string | null;
  opened_at?: string | null;
  read_completely_at?: string | null;
  replied_at?: string | null;
  attachments?: any[];
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

const filterOptions = [
  { id: 'all', label: 'All memus', icon: <Inbox size={12} /> },
  { id: 'unread', label: 'Unread', icon: <Sparkles size={12} /> },
  { id: 'starred', label: 'Starred', icon: <Star size={12} /> },
];

const InboxSkeleton = () => (
  <div className="space-y-3 px-6 md:px-10">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white border border-[#e8e7e3] rounded-2xl p-5 animate-pulse">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-[#e8e7e3] rounded-full" />
              <div className="w-32 h-3 bg-[#e8e7e3] rounded" />
              <div className="w-12 h-4 bg-[#e8e7e3] rounded-full" />
            </div>
            <div className="w-3/4 h-4 bg-[#e8e7e3] rounded mb-2" />
            <div className="w-20 h-3 bg-[#e8e7e3] rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="w-full h-3 bg-[#e8e7e3] rounded" />
          <div className="w-5/6 h-3 bg-[#e8e7e3] rounded" />
        </div>
      </div>
    ))}
  </div>
);

export default function InMemusPanel({ isGuest, requireAuth }: InMemusPanelProps = {}) {
  const [memus, setMemus] = useState<Memu[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemu, setSelectedMemu] = useState<Memu | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
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
      const saved = localStorage.getItem('memu_favorites');
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
      localStorage.setItem('memu_favorites', JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const markAsRead = useCallback(async (memu: Memu) => {
    if (!currentUserId) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('memus')
      .update({ is_read: true, opened_at: now })
      .eq('id', memu.id)
      .eq('recipient_id', currentUserId);
    if (!error) {
      setMemus(prev => prev.map(m => m.id === memu.id ? { ...m, is_read: true, opened_at: now } : m));
      if (memu.sender_id) {
        await supabase.channel(`user-notifications:${memu.sender_id}`).send({
          type: 'broadcast',
          event: 'memu_opened',
          payload: { memuId: memu.id, subject: memu.subject, timestamp: now }
        });
      }
    }
  }, [currentUserId]);

  const markFullyRead = useCallback(async (memu: Memu) => {
    if (!currentUserId) return;
    if (memu.read_completely_at) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('memus')
      .update({ read_completely_at: now })
      .eq('id', memu.id)
      .eq('recipient_id', currentUserId);
    if (!error) {
      setMemus(prev => prev.map(m => m.id === memu.id ? { ...m, read_completely_at: now } : m));
      if (memu.sender_id) {
        await supabase.channel(`user-notifications:${memu.sender_id}`).send({
          type: 'broadcast',
          event: 'memu_fully_read',
          payload: { memuId: memu.id, subject: memu.subject, timestamp: now }
        });
      }
    }
  }, [currentUserId]);

  const fetchMemus = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: memusData, error } = await supabase
        .from('memus')
        .select('*')
        .eq('recipient_id', currentUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
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
      const enrichedMemus = (memusData || []).map(m => ({
        ...m,
        is_read: m.is_read || false,
        delivered_at: m.delivered_at || null,
        opened_at: m.opened_at || null,
        read_completely_at: m.read_completely_at || null,
        replied_at: m.replied_at || null,
        attachments: m.attachments || [],
        sender_profile: m.sender_id ? profilesMap[m.sender_id] || null : null,
      }));
      setMemus(enrichedMemus as Memu[]);
    } catch (err) {
      console.error('Error fetching memus:', err);
      showToast('Failed to load memus', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('inmemus-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'memus',
        filter: `recipient_id=eq.${currentUserId}`,
      }, async (payload) => {
        const newMemu = payload.new as Memu;
        let senderProfile = null;
        if (newMemu.sender_id) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .eq('id', newMemu.sender_id)
            .single();
          senderProfile = data;
        }
        const enriched = { ...newMemu, is_read: false, attachments: newMemu.attachments || [], sender_profile: senderProfile };
        setMemus(prev => [enriched as Memu, ...prev]);
        showToast(`New memu from ${senderProfile?.full_name || 'someone'}`, 'info');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, showToast]);

  useEffect(() => {
    if (currentUserId) fetchMemus();
  }, [fetchMemus, currentUserId]);

  // IntersectionObserver for fully read detection
  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const memuId = entry.target.getAttribute('data-memu-id');
              const memu = memus.find(m => m.id === memuId);
              if (memu && !memu.read_completely_at) {
                markFullyRead(memu);
                observerRef.current?.unobserve(entry.target);
              }
            }
          });
        },
        { threshold: 0.8 }
      );
    }
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [memus, markFullyRead]);

  useEffect(() => {
    if (!observerRef.current) return;
    contentRefs.current.forEach((element, memuId) => {
      if (element) observerRef.current?.observe(element);
    });
    return () => {
      contentRefs.current.forEach((element) => {
        if (element) observerRef.current?.unobserve(element);
      });
    };
  }, [memus]);

  const filteredMemus = memus.filter(m => {
    const matchesFilter = filter === 'all' ? true 
                        : filter === 'unread' ? !m.is_read
                        : filter === 'starred' ? favorites.has(m.id) : true;
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
    return memu.sender_profile?.full_name || memu.sender_profile?.username || 'Unknown Sender';
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

  const getReadStatus = (memu: Memu) => {
    if (memu.replied_at) return { label: 'Replied', icon: Reply, color: 'text-[#8b5cf6]', bg: 'bg-[#ede9fe]/50' };
    if (memu.read_completely_at) return { label: 'Fully read', icon: BookOpen, color: 'text-[#059669]', bg: 'bg-[#d1fae5]/50' };
    if (memu.opened_at) return { label: 'Partially read', icon: Eye, color: 'text-[#d97706]', bg: 'bg-[#fef3c7]/50' };
    if (memu.is_read) return { label: 'Read', icon: CheckCircle, color: 'text-[#4f46e5]', bg: 'bg-[#ede9fe]/50' };
    return { label: 'Unread', icon: Sparkles, color: 'text-[#4f46e5]', bg: 'bg-[#ede9fe]/50' };
  };

  const unreadCount = memus.filter(m => !m.is_read).length;
  const currentFilterLabel = filterOptions.find(f => f.id === filter)?.label || 'All memus';

  const setContentRef = (element: HTMLDivElement | null, memuId: string) => {
    if (element) {
      contentRefs.current.set(memuId, element);
      if (observerRef.current) observerRef.current.observe(element);
    } else {
      const el = contentRefs.current.get(memuId);
      if (el && observerRef.current) observerRef.current.unobserve(el);
      contentRefs.current.delete(memuId);
    }
  };

  if (loading) return <InboxSkeleton />;

  return (
    <>
      <div className="flex flex-col h-full bg-[#fafaf8]">
        <div className="px-6 md:px-10 pt-8 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
            <div>
              <h1 className="heading-gradient font-['Playfair_Display'] text-3xl md:text-4xl font-medium tracking-tight">In-memus</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs text-[#777]">{memus.length} received</span>
                <span className="text-xs text-[#777]">· {favorites.size} starred</span>
                {unreadCount > 0 && <span className="text-xs text-[#777]">· {unreadCount} unread</span>}
              </div>
            </div>
            <div className="relative" ref={filterRef}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-[#e8e7e3] rounded-full text-sm text-[#777] hover:border-[#4f46e5] transition shadow-sm">
                <Filter size={12} />
                <span>{currentFilterLabel}</span>
                <ChevronDown size={10} />
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-[#e8e7e3] overflow-hidden z-20 animate-fadeIn">
                  <div className="py-1">
                    {filterOptions.map((opt) => (
                      <button key={opt.id} onClick={() => { setFilter(opt.id as any); setIsFilterOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition ${filter === opt.id ? 'bg-[#ede9fe] text-[#4f46e5]' : 'text-[#777] hover:bg-[#fafaf8]'}`}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search memus..." className="w-full pl-9 pr-4 py-2 bg-white border border-[#e8e7e3] rounded-full text-sm outline-none focus:border-[#4f46e5] transition" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
          {filteredMemus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4"><Inbox size={28} className="text-[#aaa]" /></div>
              <h3 className="text-[17px] font-medium text-[#1a1a1a] mb-1">{filter === 'unread' ? 'No unread memus' : filter === 'starred' ? 'No starred memus' : 'Your inbox is empty'}</h3>
              <p className="text-[13px] text-[#777]">{filter === 'starred' ? 'Star important memus to see them here' : 'Write a memu to get started'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMemus.map((memu) => {
                const readStatus = getReadStatus(memu);
                const ReadIcon = readStatus.icon;
                return (
                  <div key={memu.id} onClick={() => !memu.is_read && markAsRead(memu)} className={`group bg-white rounded-2xl border border-[#e8e7e3] p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${!memu.is_read ? 'border-l-4 border-l-[#4f46e5]' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Mail size={14} className="text-[#4f46e5]" />
                          <span className="text-[13px] font-medium text-[#1a1a1a]">From: {getSenderName(memu)}</span>
                          {getNatureBadge(memu.nature)}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${readStatus.bg} ${readStatus.color} backdrop-blur-sm`}>
                            <ReadIcon size={11} /> {readStatus.label}
                          </span>
                        </div>
                        <div className="text-[15px] font-semibold text-[#1a1a1a] mb-1">{memu.subject}</div>
                        <div className="flex items-center gap-2 text-meta text-[#777]"><Clock size={10} />{formatDate(memu.created_at)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('replyToMemu', { detail: { memuId: memu.id, senderHandle: memu.sender_profile?.username } })); }} className="p-1.5 rounded-full hover:bg-[#f2f1ee] text-[#777] hover:text-[#4f46e5] transition" title="Reply"><Reply size={12} /></button>
                        <button onClick={(e) => toggleFavorite(memu.id, e)} className="p-1.5 rounded-full hover:bg-[#f2f1ee] transition flex-shrink-0"><Star size={14} className={favorites.has(memu.id) ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} /></button>
                      </div>
                    </div>
                    <div ref={(el) => setContentRef(el, memu.id)} data-memu-id={memu.id} className="text-[13px] text-[#555] leading-relaxed line-clamp-3 bg-[#fafaf8] rounded-xl p-3">
                      {memu.body}
                    </div>
                    {/* Attachments */}
                    {memu.attachments && memu.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {memu.attachments.map((att: any, idx: number) => (
                          <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-[#4f46e5] hover:underline bg-[#f2f1ee] rounded-full px-2.5 py-1 transition hover:bg-[#e8e7e3]">
                            <Paperclip size={10} /> {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
        .text-meta { font-size: 11px; color: #777; }
      `}</style>
    </>
  );
}