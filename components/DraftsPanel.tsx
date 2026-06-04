'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Trash2, Edit2, MoreHorizontal, FileText, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface Draft {
  id: string;
  to: string[];
  toHandles: string[];
  subject: string;
  lastEdited: string;
  nature: string;
  preview: string;
  body: string;
  sender_id: string;
  created_at: string;
  updated_at: string;
}

const natureLabels: Record<string, string> = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
};

const natureStyles: Record<string, { bg: string; text: string }> = {
  fyi: { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]' },
  decide: { bg: 'bg-[#ede9fe]', text: 'text-[#7c3aed]' },
  resolve: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]' },
  urgent: { bg: 'bg-[#d1fae5]', text: 'text-[#059669]' },
};

interface DraftsPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
  onEditDraft?: (draft: Draft) => void;
}

export default function DraftsPanel({ isGuest, requireAuth, onEditDraft }: DraftsPanelProps = {}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch drafts from Supabase
  const fetchDrafts = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    
    try {
      // First, try to fetch with status column
      let { data, error } = await supabase
        .from('memus')
        .select('*')
        .eq('sender_id', currentUserId)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      // If that fails, try without status filter (table might not have status column yet)
      if (error && error.message.includes('status')) {
        console.warn('Status column not found, fetching all memus for user');
        const fallback = await supabase
          .from('memus')
          .select('*')
          .eq('sender_id', currentUserId)
          .order('updated_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('Error fetching drafts:', error);
        setError(`Failed to load drafts: ${error.message}`);
        showToast('Failed to load drafts', 'error');
      } else {
        // Transform DB rows to Draft interface
        const transformed: Draft[] = (data || []).map(row => ({
          id: row.id,
          to: row.recipient_email ? [row.recipient_email] : [],
          toHandles: [],
          subject: row.subject || '(No subject)',
          lastEdited: formatLastEdited(row.updated_at || row.created_at),
          nature: row.nature?.toLowerCase() || 'decide',
          preview: stripHtml(row.body || '').slice(0, 100),
          body: row.body || '',
          sender_id: row.sender_id,
          created_at: row.created_at,
          updated_at: row.updated_at || row.created_at,
        }));
        setDrafts(transformed);
      }
    } catch (err) {
      console.error('Unexpected error fetching drafts:', err);
      setError('An unexpected error occurred while loading drafts');
      showToast('Failed to load drafts', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    if (currentUserId) {
      fetchDrafts();
    }
  }, [fetchDrafts, currentUserId]);

  // Helper: format "last edited" timestamp
  const formatLastEdited = (timestamp: string) => {
    const now = new Date();
    const edited = new Date(timestamp);
    const diffMs = now.getTime() - edited.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return edited.toLocaleDateString();
  };

  // Helper: strip HTML tags for preview
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

  const filteredDrafts = drafts.filter(d => {
    const matchesFilter = filter === 'all' || d.nature === filter;
    const matchesSearch = d.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.to.join(' ').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalCount = drafts.length;

  const handleFilter = (newFilter: string) => {
    setFilter(newFilter);
  };

  const handleEditDraft = (draft: Draft) => {
    if (isGuest && requireAuth) {
      requireAuth('edit draft', () => onEditDraft?.(draft));
    } else {
      onEditDraft?.(draft);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Delete this draft? It will be gone forever.')) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from('memus')
      .delete()
      .eq('id', id)
      .eq('sender_id', currentUserId);
    
    if (error) {
      console.error('Error deleting draft:', error);
      showToast('Failed to delete draft', 'error');
    } else {
      showToast('Draft deleted', 'success');
      fetchDrafts();
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

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-[#fee2e2] flex items-center justify-center mb-4">
          <FileText size={32} className="text-[#dc2626]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">Unable to load drafts</h3>
        <p className="text-[13px] text-[#777] max-w-md mb-4">{error}</p>
        <p className="text-[12px] text-[#aaa] mb-6">
          The memus table might be missing required columns. Run the database setup SQL to fix this.
        </p>
        <button
          onClick={() => fetchDrafts()}
          className="px-5 py-2.5 bg-[#4f46e5] text-white rounded-xl text-[13px] font-medium hover:bg-[#4338ca] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty State
  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <FileText size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">No drafts saved</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          Start writing a memu and save it as a draft to continue later.
        </p>
        <button
          onClick={handleOpenCompose}
          className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition"
        >
          ✏️ Write a new memu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Drafts</h1>
        <p className="text-[13px] text-[#777] mt-1">{totalCount} unsent memus</p>
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
              placeholder="Search drafts..."
              className="flex-1 text-[13.5px] outline-none bg-transparent"
            />
          </div>
          <button className="w-8.5 h-8.5 border border-[#e8e7e3] bg-white rounded-md flex items-center justify-center hover:border-[#777] transition">
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="px-4 md:px-8 py-4 flex gap-2 flex-wrap">
        <button
          onClick={() => handleFilter('all')}
          className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-200 ${
            filter === 'all'
              ? 'bg-[#0f0f0f] text-white shadow-md'
              : 'bg-[#f2f1ee] text-[#3a3a3a] hover:bg-[#e8e7e3]'
          }`}
        >
          All
        </button>
        {Object.entries(natureLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleFilter(key)}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-200 ${
              filter === key
                ? `${natureStyles[key].bg} ${natureStyles[key].text} shadow-md`
                : 'bg-[#f2f1ee] text-[#3a3a3a] hover:bg-[#e8e7e3]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Drafts List */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredDrafts.map((draft) => (
          <div
            key={draft.id}
            className="bg-white border border-[#e8e7e3] rounded-xl p-4 mb-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3.5">
              {/* Draft Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-medium bg-[#f0efea] text-[#777]">
                  <Edit2 size={16} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-medium text-[#0f0f0f]">
                      To: {draft.to.join(', ')}
                    </span>
                    {draft.toHandles.map(handle => (
                      <span key={handle} className="text-[11px] text-[#777]">{handle}</span>
                    ))}
                  </div>
                  <span className="text-[11.5px] text-[#777] flex-shrink-0">{draft.lastEdited}</span>
                </div>
                
                <div className="text-[13px] text-[#3a3a3a] font-medium mb-1 line-clamp-1">
                  {draft.subject}
                </div>
                
                <div className="text-[12.5px] text-[#777] line-clamp-1 mb-2">
                  {draft.preview}
                </div>
                
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10.5px] font-medium px-2.5 py-0.5 rounded-full ${natureStyles[draft.nature]?.bg || 'bg-[#f2f1ee]'} ${natureStyles[draft.nature]?.text || 'text-[#777]'}`}>
                      {natureLabels[draft.nature] || draft.nature}
                    </span>
                    <span className="text-[10.5px] font-medium px-2.5 py-0.5 rounded-full bg-[#f2f1ee] text-[#777]">
                      Draft
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditDraft(draft)}
                      className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777] hover:text-[#0f0f0f]"
                      title="Edit draft"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="p-2 rounded-lg hover:bg-[#fee2e2] transition text-[#777] hover:text-[#dc2626]"
                      title="Delete draft"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredDrafts.length === 0 && drafts.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Search size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">No matching drafts</h3>
            <p className="text-[13px] text-[#777]">Try a different search or filter</p>
          </div>
        )}
      </div>

      <style>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}