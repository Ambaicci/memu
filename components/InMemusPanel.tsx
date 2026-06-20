'use client';

import { useState, useEffect, useRef } from 'react';
import { Inbox, Search, Filter, Clock, CheckCircle, AlertCircle, Mail, Sparkles, Loader2, X } from 'lucide-react';
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

const natureStyles: Record<string, string> = {
  fyi: 'bg-amber-100 text-amber-800 border-amber-200',
  decide: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  resolve: 'bg-rose-100 text-rose-800 border-rose-200',
  urgent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const natureLabels: Record<string, string> = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
};

export default function InMemusPanel({ isGuest, requireAuth }: InMemusPanelProps) {
  const [memus, setMemus] = useState<Memu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
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

  // Close filter menu when clicking outside
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

  // Filter and search logic
  const filteredMemus = memus.filter(memu => {
    if (activeFilter !== 'all' && memu.nature !== activeFilter) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const senderName = getDisplayName(memu.sender).toLowerCase();
      const subject = memu.subject.toLowerCase();
      const body = memu.body.toLowerCase();
      
      return senderName.includes(query) || subject.includes(query) || body.includes(query);
    }

    return true;
  });

  const handleFilterSelect = (filter: string) => {
    setActiveFilter(filter);
    setShowFilterMenu(false);
  };

  const clearFilters = () => {
    setActiveFilter('all');
    setSearchQuery('');
    setShowSearch(false);
  };

  // SKELETON LOADING STATE
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-memu-canvas p-6 md:p-10 animate-fadeIn">
        <div className="mb-8 space-y-3">
          <SkeletonLoader width="w-48" height="h-8" rounded="rounded-xl" />
          <SkeletonLoader width="w-32" height="h-4" />
        </div>
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Inbox size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">Inmemus</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {filteredMemus.length} {filteredMemus.length === 1 ? 'message' : 'messages'}
              {activeFilter !== 'all' && ` • ${natureLabels[activeFilter]}`}
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
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm btn-press ${
                showSearch ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200'
              }`}
            >
              <Search size={18} strokeWidth={2.5} />
            </button>

            {/* Filter Button with Dropdown */}
            <div className="relative" ref={filterMenuRef}>
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm btn-press ${
                  activeFilter !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200'
                }`}
              >
                <Filter size={18} strokeWidth={2.5} />
              </button>

              {/* Filter Dropdown Menu */}
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale">
                  <div className="p-2">
                    <button
                      onClick={() => handleFilterSelect('all')}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press ${
                        activeFilter === 'all' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All Messages
                    </button>
                    <button
                      onClick={() => handleFilterSelect('fyi')}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                        activeFilter === 'fyi' ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Mail size={14} /> FYI
                    </button>
                    <button
                      onClick={() => handleFilterSelect('decide')}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                        activeFilter === 'decide' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <CheckCircle size={14} /> Decide
                    </button>
                    <button
                      onClick={() => handleFilterSelect('resolve')}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                        activeFilter === 'resolve' ? 'bg-rose-50 text-rose-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <AlertCircle size={14} /> Resolve
                    </button>
                    <button
                      onClick={() => handleFilterSelect('urgent')}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                        activeFilter === 'urgent' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Sparkles size={14} /> Urgent
                    </button>
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
                className="w-full pl-12 pr-12 py-3 text-sm bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
        {(activeFilter !== 'all' || searchQuery) && (
          <div className="flex items-center gap-2 mb-4 animate-fadeIn">
            {activeFilter !== 'all' && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${natureStyles[activeFilter]}`}>
                {natureLabels[activeFilter]}
                <button onClick={() => setActiveFilter('all')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            {searchQuery && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 btn-press"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Memus List */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-24 custom-scroll">
        {filteredMemus.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in-scale">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-4">
              {memus.length === 0 ? <Sparkles size={32} className="text-indigo-400" /> : <Filter size={32} className="text-indigo-400" />}
            </div>
            <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
              {memus.length === 0 ? 'Your inbox is empty' : 'No messages found'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {memus.length === 0 
                ? 'When you receive memus, they will appear here with crystal clear progress tracking.'
                : 'Try adjusting your filters or search query.'
              }
            </p>
            {(activeFilter !== 'all' || searchQuery) && (
              <button
                onClick={clearFilters}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all btn-press"
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
                className="group bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer btn-press animate-slide-up"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-sm">
                      {getInitial(memu.sender)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
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
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${natureStyles[memu.nature] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {memu.nature === 'decide' && <CheckCircle size={10} strokeWidth={3} />}
                        {memu.nature === 'resolve' && <AlertCircle size={10} strokeWidth={3} />}
                        {memu.nature === 'urgent' && <Sparkles size={10} strokeWidth={3} />}
                        {memu.nature === 'fyi' && <Mail size={10} strokeWidth={3} />}
                        {memu.nature}
                      </span>

                      {memu.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
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
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-scale {
          animation: fadeInScale 0.2s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}