'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Clock, Search, Edit, Trash2, Filter, ChevronDown } from 'lucide-react';
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

const filterOptions = [
  { id: 'all', label: 'All drafts', icon: <FileText size={14} /> },
  { id: 'recent', label: 'Recently edited', icon: <Clock size={14} /> },
];

const DraftSkeleton = () => (
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

export default function DraftsPanel({ isGuest, requireAuth, onEditDraft }: DraftsPanelProps) {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent'>('all');
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
    if (searchQuery && !d.subject.toLowerCase().includes(searchQuery.toLowerCase()) && !d.body.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(d.updated_at) > sevenDaysAgo;
    }
    return true;
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

  const currentFilterLabel = filter === 'all' ? 'All drafts' : 'Recently edited';

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
              <span className="text-sm font-bold uppercase tracking-wider">Drafts</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">Saved Drafts</h1>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-sm text-gray-500 font-medium">{drafts.length} saved drafts</span>
            </div>
          </div>
          
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 transition-all shadow-sm btn-press"
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
        
        <div className="relative">
          <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drafts..."
            className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Drafts List */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
        {filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-scale">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl blur-2xl animate-pulse"></div>
              <div className="relative bg-white rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-gray-200">
                <FileText size={48} className="text-indigo-500" strokeWidth={2} />
              </div>
            </div>
            <h3 className="font-serif text-xl font-semibold text-gray-900 mb-3">No drafts</h3>
            <p className="text-gray-500 text-sm max-w-md">
              Start writing a memu and save it as a draft
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDrafts.map((draft, idx) => {
              const natureStyles = getNatureStyles(draft.nature);
              
              return (
                <div
                  key={draft.id}
                  onClick={() => onEditDraft(draft)}
                  className={`group relative bg-white rounded-2xl border-[1px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${natureStyles.border} p-4 cursor-pointer animate-slide-up btn-press`}
                  style={{ animationDelay: `${idx * 60}ms`, opacity: 0 }}
                >
                  {/* 1. Header: Recipients & Nature Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <FileText size={14} className="text-gray-500" strokeWidth={2.5} />
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        To: {draft.toHandles.slice(0, 2).join(', ')}{draft.toHandles.length > 2 && ` +${draft.toHandles.length - 2}`}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium">{formatDate(draft.updated_at)}</div>
                  </div>

                  {/* 2. Content: Subject & Body */}
                  <div className="mb-3">
                    <h3 className="font-serif text-[15px] font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {draft.subject || 'No subject'}
                    </h3>
                    <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                      {draft.body || 'No content'}
                    </p>
                  </div>

                  {/* 3. Footer: Nature Badge & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${natureStyles.badge}`}>
                        {draft.nature}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock size={10} strokeWidth={2.5} />
                        <span className="font-medium">Edited {formatDate(draft.updated_at)}</span>
                      </div>
                    </div>
                    
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
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}