'use client';

import { useState, useEffect, useRef } from 'react';
import { Inbox, Search, Filter, Clock, CheckCircle, AlertCircle, Mail, Sparkles, Loader2, X, Calendar } from 'lucide-react';
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
        sendersData.forEach(s => {
          sendersMap[s.id] = s;
        });
      }
    }

    const merged: Memu[] = memusData.map(m => ({
      ...m,
      sender: sendersMap[m.sender_id] || null,
    }));

    setMemus(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchMemus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu]);

  const { isRefreshing } = usePullToRefresh(fetchMemus);

  const isWithinDateRange = (dateStr: string, range: string) => {
    if (range === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    
    if (range === 'today') {
      return date.toDateString() === now.toDateString();
    }
    if (range === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    }
    if (range === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return date >= monthAgo;
    }
    return true;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitial = (sender: Sender | null | undefined) => {
    if (!sender) return '?';
    if (sender.full_name) return sender.full_name.charAt(0).toUpperCase();
    if (sender.username) return sender.username.charAt(0).toUpperCase();
    return '?';
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
      const senderName = getDisplayName(memu.sender).toLowerCase();
      const subject = memu.subject.toLowerCase();
      const body = memu.body.toLowerCase();
      
      return senderName.includes(query) || subject.includes(query) || body.includes(query);
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

  // SKELETON LOADING STATE
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-memu-canvas p-6 md:p-10 animate-page-enter">
        <div className="mb-8 space-y-3">
          <SkeletonLoader width="w-48" height="h-8" rounded="rounded-xl" />
          <SkeletonLoader width="w-32" height="h-4" />
        </div>
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-xs">
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
    <div className="flex flex-col h-full bg-memu-canvas animate-page-enter">

      {/* PULL TO REFRESH SPINNER */}
      {isRefreshing && (
        <div className="flex justify-center py-4 animate-fadeIn">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin"></div>
        </div>
      )}

      {/* Header Section */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="avatar">
                <Inbox size={24} strokeWidth={2.5} />
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">Inmemus</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {filteredMemus.length} {filteredMemus.length === 1 ? 'message' : 'messages'}
              {activeFilter !== 'all' && ` • ${natureLabels[activeFilter]}`}
              {filterDate !== 'all' && ` • ${dateLabels[filterDate]}`}
              {searchQuery && ` • Search: "${searchQuery}"`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Button */}
            <button 
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              className={`btn-icon ${showSearch ? 'border-purple text-purple bg-purple/5' : ''}`}
            >
              <Search size={18} strokeWidth={2.5} />
            </button>

            {/* Filter Button with Dropdown */}
            <div className="relative" ref={filterMenuRef}>
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`btn-icon ${hasActiveFilters ? 'border-purple text-purple bg-purple/5' : ''}`}
              >
                <Filter size={18} strokeWidth={2.5} />
              </button>

              {/* Filter Dropdown Menu */}
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale">
                  <div className="p-2 max-h-96 overflow-y-auto">
                    {/* Nature Section */}
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Nature</div>
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all btn-press ${
                        activeFilter === 'all' ? 'bg-purple/5 text-purple font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All Messages
                    </button>
                    {['fyi', 'decide', 'resolve', 'urgent'].map((nature) => (
                      <button
                        key={nature}
                        onClick={() => setActiveFilter(nature)}
                        className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                          activeFilter === nature ? `bg-${nature === 'fyi' ? 'amber' : nature === 'decide' ? 'indigo' : nature === 'resolve' ? 'rose' : 'emerald'}-50 text-${nature === 'fyi' ? 'amber' : nature === 'decide' ? 'indigo' : nature === 'resolve' ? 'rose' : 'emerald'}-700 font-semibold` : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {nature === 'fyi' && <Mail size={14} />}
                        {nature === 'decide' && <CheckCircle size={14} />}
                        {nature === 'resolve' && <AlertCircle size={14} />}
                        {nature === 'urgent' && <Sparkles size={14} />}
                        {natureLabels[nature]}
                      </button>
                    ))}

                    {/* Divider */}
                    <div className="my-2 border-t border-gray-100" />

                    {/* Date Range Section */}
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Time Range</div>
                    {['all', 'today', 'week', 'month'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setFilterDate(range)}
                        className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                          filterDate === range ? 'bg-purple/5 text-purple font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Calendar size={14} />
                        {dateLabels[range]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mb-4 animate-fadeIn">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by sender, subject, or content..."
                className="w-full pl-12 pr-12 py-3 text-sm bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 btn-press"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-4 animate-fadeIn">
            {activeFilter !== 'all' && (
              <div className={`badge badge-${activeFilter}`}>
                {natureLabels[activeFilter]}
                <button onClick={() => setActiveFilter('all')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            {filterDate !== 'all' && (
              <div className="badge" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', borderColor: 'rgba(79, 70, 229, 0.2)' }}>
                {dateLabels[filterDate]}
                <button onClick={() => setFilterDate('all')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            {searchQuery && (
              <div className="badge" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748B', borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-purple hover:text-purple-light btn-press"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Memus List */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-24 custom-scroll">
        {filteredMemus.length === 0 ? (
          <div className="empty-state animate-fade-in-scale">
            <div className="empty-state-icon">
              {memus.length === 0 ? <Sparkles size={32} className="text-purple" /> : <Filter size={32} className="text-purple" />}
            </div>
            <h3 className="empty-state-title">
              {memus.length === 0 ? 'Your inbox is empty' : 'No messages found'}
            </h3>
            <p className="empty-state-description">
              {memus.length === 0 
                ? 'When you receive memus, they will appear here with crystal clear progress tracking.'
                : 'Try adjusting your filters or search query.'
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-6 btn-primary"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMemus.map((memu) => (
              <div
                key={memu.id}
                className="card-premium p-5 animate-slide-up"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="avatar">
                      {getInitial(memu.sender)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate text-base">
                        {getDisplayName(memu.sender)}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(memu.created_at)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-800 mb-2 truncate">
                      {memu.subject || '(No subject)'}
                    </p>

                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                      {memu.body}
                    </p>

                    {/* Nature Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`badge badge-${memu.nature}`}>
                        {memu.nature === 'decide' && <CheckCircle size={10} strokeWidth={3} />}
                        {memu.nature === 'resolve' && <AlertCircle size={10} strokeWidth={3} />}
                        {memu.nature === 'urgent' && <Sparkles size={10} strokeWidth={3} />}
                        {memu.nature === 'fyi' && <Mail size={10} strokeWidth={3} />}
                        {natureLabels[memu.nature]}
                      </span>

                      {memu.status === 'pending' && (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#D97706', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
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
    </div>
  );
}