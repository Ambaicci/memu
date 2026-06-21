'use client';

import { useState, useEffect, useRef } from 'react';
import { Inbox, Search, Filter, Clock, CheckCircle, AlertCircle, Mail, Zap, Loader2, X, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface Sender {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Memu {
  id: string;
  sender_id: string;
  subject: string;
  body: string;
  nature: string;
  status: string;
  created_at: string;
  sender?: Sender | null;
}

interface InMemusPanelProps {
  isGuest: boolean;
  requireAuth: (action: string, callback: () => void) => void;
}

const natureStyles: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  fyi: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Mail },
  decide: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: CheckCircle },
  resolve: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: AlertCircle },
  urgent: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Zap },
};

const natureLabels: Record<string, string> = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
};

const dateLabels: Record<string, string> = {
  all: 'All Time',
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};

export default function InMemusPanel({ isGuest, requireAuth }: InMemusPanelProps) {
  const [memus, setMemus] = useState<Memu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { showToast } = useToast();
  
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const fetchMemus = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: memusData, error: memusError } = await supabase
      .from('memus')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (memusError) {
      console.error('Error fetching memus:', memusError);
      setLoading(false);
      return;
    }

    if (!memusData || memusData.length === 0) {
      setMemus([]);
      setLoading(false);
      return;
    }

    const senderIds = [...new Set(memusData.map(m => m.sender_id).filter(Boolean))];
    let sendersMap: Record<string, Sender> = {};

    if (senderIds.length > 0) {
      const { data: sendersData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', senderIds);

      if (sendersData) {
        sendersData.forEach(s => { sendersMap[s.id] = s; });
      }
    }

    const merged: Memu[] = memusData.map(m => ({ ...m, sender: sendersMap[m.sender_id] || null }));
    setMemus(merged);
    setLoading(false);
  };

  useEffect(() => { fetchMemus(); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    if (showFilterMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  const { isRefreshing } = usePullToRefresh(fetchMemus);

  const isWithinDateRange = (dateStr: string, range: string) => {
    if (range === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    if (range === 'today') return date.toDateString() === now.toDateString();
    if (range === 'week') return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (range === 'month') return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return true;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitial = (sender: Sender | null | undefined) => {
    if (!sender) return '?';
    return (sender.full_name || sender.username || '?').charAt(0).toUpperCase();
  };

  const getDisplayName = (sender: Sender | null | undefined) => {
    if (!sender) return 'Unknown Sender';
    return sender.full_name || sender.username || 'Unknown Sender';
  };

  const filteredMemus = memus.filter(memu => {
    if (activeFilter !== 'all' && memu.nature !== activeFilter) return false;
    if (!isWithinDateRange(memu.created_at, filterDate)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return getDisplayName(memu.sender).toLowerCase().includes(query) || 
             memu.subject.toLowerCase().includes(query) || 
             memu.body.toLowerCase().includes(query);
    }
    return true;
  });

  const clearFilters = () => {
    setActiveFilter('all');
    setFilterDate('all');
    setSearchQuery('');
    setShowSearch(false);
  };

  const hasActiveFilters = activeFilter !== 'all' || filterDate !== 'all' || searchQuery;

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white p-6 md:p-10 animate-page-enter">
        <div className="mb-8 space-y-3">
          <SkeletonLoader width="w-48" height="h-8" rounded="rounded-xl" />
          <SkeletonLoader width="w-32" height="h-4" />
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-200/60">
              <SkeletonLoader width="w-12" height="h-12" circle />
              <div className="flex-1 space-y-3 py-1">
                <SkeletonLoader width="w-3/4" height="h-4" />
                <SkeletonLoader width="w-full" height="h-3" />
                <SkeletonLoader width="w-1/2" height="h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white animate-page-enter">
      {isRefreshing && (
        <div className="flex justify-center py-4 animate-fadeIn">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-indigo-600 animate-spin"></div>
        </div>
      )}

      <div className="px-6 md:px-10 pt-10 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
                <Inbox size={20} className="text-white" strokeWidth={2} />
              </div>
              <h1 className="font-['SF_Pro_Display'] text-3xl font-semibold text-gray-900 tracking-tight">InMemus</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {filteredMemus.length} {filteredMemus.length === 1 ? 'message' : 'messages'}
              {activeFilter !== 'all' && ` • ${natureLabels[activeFilter]}`}
              {filterDate !== 'all' && ` • ${dateLabels[filterDate]}`}
              {searchQuery && ` • Search: "${searchQuery}"`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all btn-press ${showSearch ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Search size={18} strokeWidth={2} />
            </button>

            <div className="relative" ref={filterMenuRef}>
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all btn-press ${hasActiveFilters ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <Filter size={18} strokeWidth={2} />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200/60 z-50 overflow-hidden animate-fade-in-scale">
                  <div className="p-2 max-h-96 overflow-y-auto no-scrollbar">
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Nature</div>
                    <button onClick={() => setActiveFilter('all')} className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all btn-press ${activeFilter === 'all' ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>All Messages</button>
                    {['fyi', 'decide', 'resolve', 'urgent'].map((nature) => {
                      const style = natureStyles[nature];
                      const Icon = style.icon;
                      return (
                        <button key={nature} onClick={() => setActiveFilter(nature)} className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${activeFilter === nature ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                          <Icon size={14} className={activeFilter === nature ? '' : style.text} />
                          {natureLabels[nature]}
                        </button>
                      );
                    })}
                    <div className="my-2 border-t border-gray-100" />
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Time Range</div>
                    {['all', 'today', 'week', 'month'].map((range) => (
                      <button key={range} onClick={() => setFilterDate(range)} className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${filterDate === range ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                        <Calendar size={14} /> {dateLabels[range]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar - Uses specific class to kill global focus ring */}
        {showSearch && (
          <div className="mb-6 animate-fadeIn w-full">
            <div className="relative w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="search-input-clean w-full pl-12 pr-12 py-3 text-sm bg-gray-50 rounded-xl border-0 outline-none transition-all"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 btn-press">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-6 animate-fadeIn">
            {activeFilter !== 'all' && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${natureStyles[activeFilter].bg} ${natureStyles[activeFilter].text} ${natureStyles[activeFilter].border}`}>
                {natureLabels[activeFilter]}
                <button onClick={() => setActiveFilter('all')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            {filterDate !== 'all' && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                {dateLabels[filterDate]}
                <button onClick={() => setFilterDate('all')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            {searchQuery && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            <button onClick={clearFilters} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 btn-press">Clear all</button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-24 custom-scroll">
        {filteredMemus.length === 0 ? (
          /* EMPTY STATE - Inline styles force width to prevent vertical stacking */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-scale w-full px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
              {memus.length === 0 ? <Inbox size={28} className="text-gray-400" /> : <Search size={28} className="text-gray-400" />}
            </div>
            <h3 className="font-['SF_Pro_Display'] text-xl font-semibold text-gray-900 mb-3">
              {memus.length === 0 ? 'Your inbox is empty' : 'No messages found'}
            </h3>
            <p 
              className="text-sm text-gray-500 leading-relaxed text-center"
              style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}
            >
              {memus.length === 0 
                ? 'When you receive memus, they will appear here with crystal clear progress tracking.'
                : 'Try adjusting your filters or search query.'
              }
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all btn-press">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMemus.map((memu) => (
              <div key={memu.id} className="group bg-white rounded-2xl p-5 border border-gray-200/60 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer btn-press animate-slide-up">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-semibold text-base">
                      {getInitial(memu.sender)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-['SF_Pro_Display'] font-semibold text-gray-900 truncate text-base">{getDisplayName(memu.sender)}</h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                        <Clock size={12} /> {formatDate(memu.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-2 truncate">{memu.subject || '(No subject)'}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{memu.body}</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                        memu.nature === 'fyi' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        memu.nature === 'decide' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        memu.nature === 'resolve' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {memu.nature === 'decide' && <CheckCircle size={10} strokeWidth={2.5} />}
                        {memu.nature === 'resolve' && <AlertCircle size={10} strokeWidth={2.5} />}
                        {memu.nature === 'urgent' && <Zap size={10} strokeWidth={2.5} />}
                        {memu.nature === 'fyi' && <Mail size={10} strokeWidth={2.5} />}
                        {natureLabels[memu.nature]}
                      </span>
                      {memu.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium border border-gray-200">
                          <Loader2 size={10} className="animate-spin" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* KILLS THE GLOBAL FOCUS RING FOR SEARCH BAR */
        .search-input-clean:focus,
        .search-input-clean:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
          ring: 0 !important;
        }
      `}</style>
    </div>
  );
}