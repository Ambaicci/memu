'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Clock, Loader2, Search, Edit, Trash2, Filter, ChevronDown, Send, Inbox } from 'lucide-react';
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
  { id: 'all', label: 'All drafts', icon: <FileText size={12} /> },
  { id: 'recent', label: 'Recently edited', icon: <Clock size={12} /> },
];

const DraftSkeleton = () => (
  <div className="space-y-3 px-6 md:px-10">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white border border-[#e8e7e3] rounded-2xl p-5 animate-pulse">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-[#e8e7e3] rounded-full" />
              <div className="w-32 h-3 bg-[#e8e7e3] rounded" />
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

export default function DraftsPanel({ isGuest, requireAuth, onEditDraft }: DraftsPanelProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchDrafts = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('user_id', currentUserId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error('Error fetching drafts:', err);
      showToast('Failed to load drafts', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    if (currentUserId) fetchDrafts();
  }, [fetchDrafts, currentUserId]);

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this draft?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('drafts').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete draft', 'error');
    } else {
      setDrafts(prev => prev.filter(d => d.id !== id));
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

  const currentFilterLabel = filter === 'all' ? 'All drafts' : 'Recently edited';

  if (loading) {
    return <DraftSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-[#fafaf8]">
      <div className="px-6 md:px-10 pt-8 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="heading-gradient font-['Playfair_Display'] text-3xl md:text-4xl font-medium tracking-tight">Drafts</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs text-[#777]">{drafts.length} saved drafts</span>
            </div>
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-[#e8e7e3] rounded-full text-sm text-[#777] hover:border-[#4f46e5] transition shadow-sm"
            >
              <Filter size={12} />
              <span>{currentFilterLabel}</span>
              <ChevronDown size={10} />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-[#e8e7e3] overflow-hidden z-20 animate-fadeIn">
                <div className="py-1">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setFilter(opt.id as any); setIsFilterOpen(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition ${
                        filter === opt.id ? 'bg-[#ede9fe] text-[#4f46e5]' : 'text-[#777] hover:bg-[#fafaf8]'
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

        <div className="relative mt-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drafts..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#e8e7e3] rounded-full text-sm outline-none focus:border-[#4f46e5] transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
        {filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <FileText size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[17px] font-medium text-[#1a1a1a] mb-1">No drafts</h3>
            <p className="text-[13px] text-[#777]">Start writing a memu and save it as a draft</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDrafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => onEditDraft(draft)}
                className="group bg-white rounded-2xl border border-[#e8e7e3] p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <FileText size={14} className="text-[#4f46e5]" />
                      <span className="text-[13px] font-medium text-[#1a1a1a]">To: {draft.toHandles.slice(0, 2).join(', ')}{draft.toHandles.length > 2 && ` +${draft.toHandles.length - 2}`}</span>
                      {getNatureBadge(draft.nature)}
                    </div>
                    <div className="text-[15px] font-semibold text-[#1a1a1a] mb-1">{draft.subject || 'No subject'}</div>
                    <div className="flex items-center gap-2 text-meta text-[#777]"><Clock size={10} /> {formatDate(draft.updated_at)}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={(e) => { e.stopPropagation(); onEditDraft(draft); }} className="p-1.5 rounded-full hover:bg-[#f2f1ee] text-[#4f46e5]" title="Edit"><Edit size={14} /></button>
                    <button onClick={(e) => handleDeleteDraft(draft.id, e)} className="p-1.5 rounded-full hover:bg-[#fee2e2] text-[#777] hover:text-[#dc2626]" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="text-[13px] text-[#555] leading-relaxed line-clamp-2 bg-[#fafaf8] rounded-xl p-3">{draft.body || 'No content'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
        .text-meta { font-size: 11px; color: #777; }
      `}</style>
    </div>
  );
}