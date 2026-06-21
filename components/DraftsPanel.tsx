'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Clock, Search, Edit, Trash2, Filter, X, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface Draft {
  id: string;
  to: string[];
  toHandles: string[];
  subject: string;
  nature: string;
  body: string;
  updated_at: string;
  created_at: string;
}

interface DraftsPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
  onEditDraft: (draft: any) => void;
}

const natureStyles: Record<string, string> = {
  fyi: 'bg-amber-100 text-amber-800 border-amber-200',
  decide: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  resolve: 'bg-rose-100 text-rose-800 border-rose-200',
  urgent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  broadcast: 'bg-pink-100 text-pink-800 border-pink-200',
};

const natureLabels: Record<string, string> = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
  broadcast: 'Broadcast',
};

const filterLabels: Record<string, string> = {
  all: 'All',
  recent: 'Recently Edited',
};

const DraftSkeleton = () => (
  <div className="flex flex-col h-full bg-memu-canvas p-6 md:p-10 animate-fadeIn">
    <div className="mb-8 space-y-3">
      <div className="w-48 h-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-xl animate-shimmer" />
      <div className="w-32 h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-md animate-shimmer" />
    </div>
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
          <div className="flex-1 space-y-3 py-1">
            <div className="w-3/4 h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
            <div className="w-full h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
            <div className="w-1/2 h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function DraftsPanel({ isGuest, requireAuth, onEditDraft }: DraftsPanelProps) {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<'all' | 'recent'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

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

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['drafts', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('user_id', currentUserId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUserId,
    staleTime: 60 * 1000,
  });

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this draft?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('drafts').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete draft', 'error');
    } else {
      queryClient.setQueryData(['drafts', currentUserId], (old: Draft[] | undefined) => {
        if (!old) return old;
        return old.filter(d => d.id !== id);
      });
      showToast('Draft deleted', 'success');
    }
  };

  const filteredDrafts = drafts.filter(d => {
    // Search filter
    const matchesSearch = !searchQuery || 
      (d.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (d.body || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.toHandles || []).some((h: string) => h.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter
    let matchesFilter = true;
    if (filter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchesFilter = new Date(d.updated_at) > sevenDaysAgo;
    }
    
    return matchesSearch && matchesFilter;
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

  const getInitial = (handles: string[]) => {
    if (!handles || handles.length === 0) return '?';
    return handles[0].charAt(0).toUpperCase();
  };

  const getDisplayRecipients = (handles: string[]) => {
    if (!handles || handles.length === 0) return 'No recipients';
    if (handles.length === 1) return handles[0];
    if (handles.length === 2) return handles.join(', ');
    return `${handles.slice(0, 2).join(', ')} +${handles.length - 2}`;
  };

  const clearFilters = () => {
    setFilter('all');
    setSearchQuery('');
    setShowSearch(false);
  };

  if (isLoading) {
    return <DraftSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-memu-canvas animate-page-enter">
      
      {/* Header Section */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <FileText size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">Drafts</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {filteredDrafts.length} {filteredDrafts.length === 1 ? 'draft' : 'drafts'}
              {filter !== 'all' && ` • ${filterLabels[filter]}`}
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
                  filter !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200'
                }`}
              >
                <Filter size={18} strokeWidth={2.5} />
              </button>

              {/* Filter Dropdown Menu */}
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale">
                  <div className="p-2">
                    <button
                      onClick={() => { setFilter('all'); setShowFilterMenu(false); }}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press ${
                        filter === 'all' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All Drafts
                    </button>
                    <button
                      onClick={() => { setFilter('recent'); setShowFilterMenu(false); }}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                        filter === 'recent' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Clock size={14} /> Recently Edited
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
                placeholder="Search by subject, content, or recipient..."
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
        {(filter !== 'all' || searchQuery) && (
          <div className="flex items-center gap-2 mb-4 animate-fadeIn">
            {filter !== 'all' && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {filterLabels[filter]}
                <button onClick={() => setFilter('all')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
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

      {/* Drafts List */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-24 custom-scroll">
        {filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in-scale">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-4">
              {drafts.length === 0 ? <Sparkles size={32} className="text-indigo-400" /> : <Filter size={32} className="text-indigo-400" />}
            </div>
            <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
              {drafts.length === 0 ? 'No drafts yet' : 'No drafts found'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {drafts.length === 0 
                ? 'Start writing a memu and save it as a draft.'
                : 'Try adjusting your filters or search query.'
              }
            </p>
            {(filter !== 'all' || searchQuery) && (
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
            {filteredDrafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => onEditDraft(draft)}
                className="group bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer btn-press animate-slide-up"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-sm">
                      {getInitial(draft.toHandles)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate text-base">
                        To: {getDisplayRecipients(draft.toHandles)}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(draft.updated_at)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-800 mb-2 truncate">
                      {draft.subject || '(No subject)'}
                    </p>

                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                      {draft.body || '(No content)'}
                    </p>

                    {/* Nature Badge & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${natureStyles[draft.nature] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {natureLabels[draft.nature] || draft.nature}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditDraft(draft); }} 
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all btn-press" 
                          title="Edit"
                        >
                          <Edit size={12} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteDraft(draft.id, e)} 
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-rose-600 transition-all btn-press" 
                          title="Delete"
                        >
                          <Trash2 size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}