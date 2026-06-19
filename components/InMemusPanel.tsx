'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Mail, Clock, Star, Search, Eye, Layers, CheckCircle, BookOpen, Reply, Filter, ChevronDown, Paperclip } from 'lucide-react';
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
  { id: 'all', label: 'All memus', icon: <Inbox size={14} /> },
  { id: 'unread', label: 'Unread', icon: <Layers size={14} /> },
  { id: 'starred', label: 'Starred', icon: <Star size={14} /> },
];

const InboxSkeleton = () => (
  <div className="space-y-3 px-6 md:px-10 pt-8">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white border border-gray-200/60 rounded-2xl p-4 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg" />
            <div className="w-24 h-3 bg-gray-100 rounded" />
          </div>
          <div className="w-12 h-3 bg-gray-100 rounded" />
        </div>
        <div className="w-3/4 h-4 bg-gray-100 rounded mb-2" />
        <div className="w-full h-3 bg-gray-100 rounded" />
      </div>
    ))}
  </div>
);

const getNatureStyles = (nature: string) => {
  switch (nature) {
    case 'fyi': return { border: 'border-amber-200/60', badge: 'bg-amber-50 text-amber-700 border border-amber-100' };
    case 'decide': return { border: 'border-indigo-200/60', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-100' };
    case 'resolve': return { border: 'border-rose-200/60', badge: 'bg-rose-50 text-rose-700 border border-rose-100' };
    case 'urgent': return { border: 'border-emerald-200/60', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    case 'broadcast': return { border: 'border-pink-200/60', badge: 'bg-pink-50 text-pink-700 border border-pink-100' };
    default: return { border: 'border-gray-200/60', badge: 'bg-gray-50 text-gray-700 border border-gray-100' };
  }
};

const getInitials = (name: string) => name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 65%, 55%)`;
};

export default function InMemusPanel({ isGuest, requireAuth }: InMemusPanelProps = {}) {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { showToast } = useToast();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
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
      if (saved) setFavorites(new Set(JSON.parse(saved) as string[]));
    } catch (err) { console.error('Failed to load favorites:', err); }
  }, []);

  const saveFavorites = useCallback((ids: Set<string>) => {
    try { localStorage.setItem('memu_favorites', JSON.stringify(Array.from(ids))); } 
    catch (err) { console.error('Failed to save favorites:', err); }
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) { newFavorites.delete(id); showToast('Removed from favorites', 'success'); } 
    else { newFavorites.add(id); showToast('Added to favorites', 'success'); }
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const { data: memus = [], isLoading } = useQuery({
    queryKey: ['inmemus', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const supabase = createClient();
      const { data: memusData, error } = await supabase.from('memus').select('*').eq('recipient_id', currentUserId).order('created_at', { ascending: false });
      if (error) throw error;
      
      const senderIds = [...new Set((memusData || []).map(m => m.sender_id).filter(id => id))];
      let profilesMap: Record<string, any> = {};
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, username').in('id', senderIds);
        if (profilesData) profilesMap = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }
      
      return (memusData || []).map(m => ({
        ...m, is_read: m.is_read || false, attachments: m.attachments || [],
        sender_profile: m.sender_id ? profilesMap[m.sender_id] || null : null,
      })) as Memu[];
    },
    enabled: !!currentUserId,
    staleTime: 60 * 1000,
  });

  const markAsRead = useCallback(async (memu: Memu) => {
    if (!currentUserId) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase.from('memus').update({ is_read: true, opened_at: now }).eq('id', memu.id).eq('recipient_id', currentUserId);
    queryClient.setQueryData(['inmemus', currentUserId], (old: Memu[] | undefined) => {
      if (!old) return old;
      return old.map(m => m.id === memu.id ? { ...m, is_read: true, opened_at: now } : m);
    });
  }, [currentUserId, queryClient]);

  const markFullyRead = useCallback(async (memu: Memu) => {
    if (!currentUserId || memu.read_completely_at) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase.from('memus').update({ read_completely_at: now }).eq('id', memu.id).eq('recipient_id', currentUserId);
    queryClient.setQueryData(['inmemus', currentUserId], (old: Memu[] | undefined) => {
      if (!old) return old;
      return old.map(m => m.id === memu.id ? { ...m, read_completely_at: now } : m);
    });
  }, [currentUserId, queryClient]);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase.channel('inmemus-realtime').on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'memus', filter: `recipient_id=eq.${currentUserId}`,
    }, async (payload) => {
      const newMemu = payload.new as Memu;
      let senderProfile = null;
      if (newMemu.sender_id) {
        const { data } = await supabase.from('profiles').select('id, full_name, username').eq('id', newMemu.sender_id).single();
        senderProfile = data;
      }
      const enriched = { ...newMemu, is_read: false, attachments: newMemu.attachments || [], sender_profile: senderProfile };
      queryClient.setQueryData(['inmemus', currentUserId], (old: Memu[] | undefined) => old ? [enriched as Memu, ...old] : [enriched as Memu]);
      showToast(`New memu from ${senderProfile?.full_name || 'someone'}`, 'info');
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, showToast, queryClient]);

  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const memuId = entry.target.getAttribute('data-memu-id');
            const memu = memus.find(m => m.id === memuId);
            if (memu && !memu.read_completely_at) { markFullyRead(memu); observerRef.current?.unobserve(entry.target); }
          }
        });
      }, { threshold: 0.8 });
    }
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [memus, markFullyRead]);

  useEffect(() => {
    if (!observerRef.current) return;
    contentRefs.current.forEach((element, memuId) => { if (element) observerRef.current?.observe(element); });
    return () => { contentRefs.current.forEach((element) => { if (element) observerRef.current?.unobserve(element); }); };
  }, [memus]);

  const filteredMemus = memus.filter(m => {
    const matchesFilter = filter === 'all' ? true : filter === 'unread' ? !m.is_read : filter === 'starred' ? favorites.has(m.id) : true;
    const matchesSearch = searchQuery === '' || m.subject.toLowerCase().includes(searchQuery.toLowerCase()) || m.body.toLowerCase().includes(searchQuery.toLowerCase()) || (m.sender_profile?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
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

  const getSenderName = (memu: Memu) => memu.sender_profile?.full_name || memu.sender_profile?.username || 'Unknown Sender';

  const getReadStatus = (memu: Memu) => {
    if (memu.replied_at) return { label: 'Replied', icon: Reply, color: 'text-purple-600' };
    if (memu.read_completely_at) return { label: 'Fully read', icon: BookOpen, color: 'text-emerald-600' };
    if (memu.opened_at) return { label: 'Opened', icon: Eye, color: 'text-blue-600' };
    if (memu.is_read) return { label: 'Read', icon: CheckCircle, color: 'text-indigo-600' };
    return { label: 'Unread', icon: Layers, color: 'text-gray-400' };
  };

  const unreadCount = memus.filter(m => !m.is_read).length;
  const currentFilterLabel = filterOptions.find(f => f.id === filter)?.label || 'All memus';

  const setContentRef = (element: HTMLDivElement | null, memuId: string) => {
    if (element) { contentRefs.current.set(memuId, element); if (observerRef.current) observerRef.current.observe(element); } 
    else { const el = contentRefs.current.get(memuId); if (el && observerRef.current) observerRef.current.unobserve(el); contentRefs.current.delete(memuId); }
  };

  if (isLoading) return <InboxSkeleton />;

  return (
    <>
      <div className="flex flex-col h-full bg-memu-canvas animate-page-enter">
        {/* Header Section */}
        <div className="px-6 md:px-10 pt-8 pb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-indigo-600">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <Inbox size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-bold uppercase tracking-wider">Inbox</span>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">In-memus</h1>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="text-sm text-gray-500 font-medium">{memus.length} received</span>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-500 font-medium">{favorites.size} starred</span>
                {unreadCount > 0 && (<><span className="text-gray-300">·</span><span className="text-sm text-indigo-600 font-bold">{unreadCount} unread</span></>)}
              </div>
            </div>
            
            <div className="relative" ref={filterRef}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 transition-all shadow-sm btn-press">
                <Filter size={15} /><span>{currentFilterLabel}</span><ChevronDown size={13} />
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-20 animate-fadeIn">
                  <div className="py-2">
                    {filterOptions.map((opt) => (
                      <button key={opt.id} onClick={() => { setFilter(opt.id as any); setIsFilterOpen(false); }} className={`w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition ${filter === opt.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search memus..." className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400" />
          </div>
        </div>

        {/* Memus List */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
          {filteredMemus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-scale">
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl blur-2xl animate-pulse"></div>
                <div className="relative bg-white rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-gray-200">
                  <Inbox size={48} className="text-indigo-500" strokeWidth={2} />
                </div>
              </div>
              <h3 className="font-serif text-xl font-semibold text-gray-900 mb-3">
                {filter === 'unread' ? 'No unread memus' : filter === 'starred' ? 'No starred memus' : 'Your inbox is empty'}
              </h3>
              <p className="text-gray-500 text-sm max-w-md">
                {filter === 'starred' ? 'Star important memus to see them here' : 'Write a memu to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemus.map((memu, idx) => {
                const readStatus = getReadStatus(memu);
                const ReadIcon = readStatus.icon;
                const senderName = getSenderName(memu);
                const initials = getInitials(senderName);
                const avatarColor = stringToColor(memu.sender_id || senderName);
                const natureStyles = getNatureStyles(memu.nature);
                
                return (
                  <div 
                    key={memu.id} 
                    onClick={() => !memu.is_read && markAsRead(memu)} 
                    className={`group relative bg-white rounded-2xl border-[1px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${natureStyles.border} p-4 cursor-pointer animate-slide-up btn-press`}
                    style={{ animationDelay: `${idx * 60}ms`, opacity: 0 }}
                  >
                    {/* Unread Indicator */}
                    {!memu.is_read && <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                    
                    {/* 1. Header: Sender & Time */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shadow-sm" style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}>
                          {initials}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{senderName}</div>
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium">{formatDate(memu.created_at)}</div>
                    </div>

                    {/* 2. Content: Subject & Body */}
                    <div className="mb-3">
                      <h3 className="font-serif text-[15px] font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {memu.subject}
                      </h3>
                      <div ref={(el) => setContentRef(el, memu.id)} data-memu-id={memu.id} className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                        {memu.body}
                      </div>
                    </div>

                    {/* 3. Footer: Nature, Status, Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${natureStyles.badge}`}>
                          {memu.nature}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${readStatus.color}`}>
                          <ReadIcon size={10} strokeWidth={2.5} /> {readStatus.label}
                        </span>
                        {memu.attachments && memu.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Paperclip size={10} /> {memu.attachments.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('replyToMemu', { detail: { memuId: memu.id, senderHandle: memu.sender_profile?.username } })); }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all btn-press" title="Reply">
                          <Reply size={12} strokeWidth={2.5} />
                        </button>
                        <button onClick={(e) => toggleFavorite(memu.id, e)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-amber-500 transition-all btn-press" title="Star">
                          <Star size={12} strokeWidth={2.5} className={favorites.has(memu.id) ? 'fill-amber-500 text-amber-500' : ''} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </>
  );
}