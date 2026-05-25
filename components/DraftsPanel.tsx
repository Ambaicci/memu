'use client';

import { useState } from 'react';
import { Search, Filter, Trash2, Edit2, MoreHorizontal, FileText, Inbox } from 'lucide-react';

interface Draft {
  id: number;
  to: string[];
  toHandles: string[];
  subject: string;
  lastEdited: string;
  nature: string;
  preview: string;
  body: string;
}

// Demo data
const draftsData: Draft[] = [
  {
    id: 1,
    to: ['Maria Santos'],
    toHandles: ['@maria.memu'],
    subject: 'Partnership Proposal – Outline',
    lastEdited: 'Today',
    nature: 'decide',
    preview: 'We have been thinking about a potential synergy between our platforms. I believe a strategic partnership could benefit both...',
    body: '<p>Maria,</p><p>We have been thinking about a potential synergy between our platforms.</p>',
  },
  {
    id: 2,
    to: ['Kofi Mensah', 'Esther Wanjiku'],
    toHandles: ['@kofi.memu', '@esther.memu'],
    subject: 'Event Recap – Community Meetup',
    lastEdited: '3 days ago',
    nature: 'fyi',
    preview: 'Just wanted to drop a quick note about Thursday\'s community meetup. The turnout was incredible – over 50 people showed up...',
    body: '<p>Kofi, Esther,</p><p>Just wanted to drop a quick note about Thursday\'s community meetup.</p>',
  },
  {
    id: 3,
    to: ['Aisha Kimani'],
    toHandles: ['@aisha.memu'],
    subject: 'Q1 Financial Summary – Draft for Review',
    lastEdited: '5 days ago',
    nature: 'resolve',
    preview: 'Attached is the draft Q1 financial summary. Please review the numbers on page 4 – I want to make sure we\'re aligned before...',
    body: '<p>Aisha,</p><p>Attached is the draft Q1 financial summary.</p>',
  },
];

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
  const [drafts, setDrafts] = useState(draftsData);

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

  const handleDeleteDraft = (id: number) => {
    if (confirm('Delete this draft? It will be gone forever.')) {
      setDrafts(drafts.filter(d => d.id !== id));
    }
  };

  const handleOpenCompose = () => {
    window.dispatchEvent(new CustomEvent('openCompose'));
  };

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
      {/* Header - Consistent with In/Out Memus */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Drafts</h1>
        <p className="text-[13px] text-[#777] mt-1">{totalCount} unsent memus</p>
      </div>

      {/* Search Bar - Matching OutMemusPanel */}
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

      {/* Filter Pills - Matching OutMemusPanel */}
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
                    <span className={`text-[10.5px] font-medium px-2.5 py-0.5 rounded-full ${natureStyles[draft.nature].bg} ${natureStyles[draft.nature].text}`}>
                      {natureLabels[draft.nature]}
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

        {/* Empty filter state */}
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