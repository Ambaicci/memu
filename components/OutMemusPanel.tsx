'use client';

import { useState } from 'react';
import { Search, Filter, Send, Inbox } from 'lucide-react';
import StatusBar, { ReadStatus } from './StatusBar';

interface SentMemu {
  id: number;
  to: string;
  toHandle: string;
  toInitials: string;
  toColor: string;
  toTextColor: string;
  subject: string;
  time: string;
  nature: string;
  preview: string;
  body: string;
  status: ReadStatus;
  deliveredAt?: string;
  openedAt?: string;
  readAt?: string;
  isRead?: boolean;
}

// Demo data
const sentMemusData: SentMemu[] = [
  {
    id: 1,
    to: 'Aisha Kimani',
    toHandle: '@aisha.memu',
    toInitials: 'AK',
    toColor: '#e1f5ee',
    toTextColor: '#0f6e56',
    subject: 'Q4 Budget Projections — approved',
    time: 'Yesterday',
    nature: 'decide',
    preview: 'Aisha — I\'ve reviewed the numbers and given my sign-off...',
    body: '<p>Aisha,</p><p>I\'ve reviewed the Q4 projections and given my sign-off.</p><p>John</p>',
    status: 'fully_read',
    deliveredAt: 'Yesterday, 9:41 AM',
    openedAt: 'Yesterday, 10:15 AM',
    readAt: 'Yesterday, 10:23 AM',
    isRead: true,
  },
  {
    id: 2,
    to: 'David Osei',
    toHandle: '@david.memu',
    toInitials: 'DO',
    toColor: '#ede9fe',
    toTextColor: '#5b21b6',
    subject: 'memu design — my thoughts',
    time: 'Monday',
    nature: 'fyi',
    preview: 'David — your feedback on spaces is spot on...',
    body: '<p>David,</p><p>Your feedback on spaces is spot on.</p><p>John</p>',
    status: 'opened',
    deliveredAt: 'Monday, 2:30 PM',
    openedAt: 'Monday, 4:45 PM',
    readAt: undefined,
    isRead: false,
  },
  {
    id: 3,
    to: 'Tobias Nguyen',
    toHandle: '@tobias.memu',
    toInitials: 'TN',
    toColor: '#f0f9ff',
    toTextColor: '#0369a1',
    subject: 'Server issue — decision made',
    time: 'Monday',
    nature: 'resolve',
    preview: 'Tobias — let\'s patch forward rather than roll back...',
    body: '<p>Tobias,</p><p>Let\'s patch forward.</p><p>John</p>',
    status: 'fully_read',
    deliveredAt: 'Monday, 11:20 AM',
    openedAt: 'Monday, 11:35 AM',
    readAt: 'Monday, 11:42 AM',
    isRead: true,
  },
  {
    id: 4,
    to: 'Mum',
    toHandle: '@mum.memu',
    toInitials: 'MM',
    toColor: '#fce7f3',
    toTextColor: '#9d174d',
    subject: 'Christmas plans — yes, I\'m coming!',
    time: '2 days ago',
    nature: 'decide',
    preview: 'Mum — yes, I\'ll be there for Christmas...',
    body: '<p>Mum,</p><p>Yes, I\'ll be there!</p><p>John</p>',
    status: 'delivered',
    deliveredAt: '2 days ago, 8:15 AM',
    openedAt: undefined,
    readAt: undefined,
    isRead: false,
  },
  {
    id: 5,
    to: 'Amara Diallo',
    toHandle: '@amara.memu',
    toInitials: 'AD',
    toColor: '#fdf4ff',
    toTextColor: '#7e22ce',
    subject: 'Launch announcement — approved',
    time: 'Sunday',
    nature: 'urgent',
    preview: 'Amara — the press release looks good...',
    body: '<p>Amara,</p><p>The press release looks good.</p><p>John</p>',
    status: 'fully_read',
    deliveredAt: 'Sunday, 9:30 AM',
    openedAt: 'Sunday, 10:05 AM',
    readAt: 'Sunday, 10:12 AM',
    isRead: true,
  },
  {
    id: 6,
    to: 'Zara Ahmed',
    toHandle: '@zara.memu',
    toInitials: 'ZA',
    toColor: '#fef3c7',
    toTextColor: '#92400e',
    subject: 'Village broadband — congratulations!',
    time: 'Sunday',
    nature: 'fyi',
    preview: 'Zara — this is incredible news...',
    body: '<p>Zara,</p><p>This is incredible news!</p><p>John</p>',
    status: 'opened',
    deliveredAt: 'Sunday, 3:45 PM',
    openedAt: 'Sunday, 5:20 PM',
    readAt: undefined,
    isRead: false,
  },
  {
    id: 7,
    to: 'Nairobi Design Co.',
    toHandle: '@nairobi-design.memu',
    toInitials: 'ND',
    toColor: '#ecfdf5',
    toTextColor: '#065f46',
    subject: 'Invoice #2847 — payment sent',
    time: 'Friday',
    nature: 'fyi',
    preview: 'Thanks for the beautiful work...',
    body: '<p>Team,</p><p>Thanks for the beautiful work!</p><p>John</p>',
    status: 'delivered',
    deliveredAt: 'Friday, 1:15 PM',
    openedAt: undefined,
    readAt: undefined,
    isRead: false,
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

interface OutMemusPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

export default function OutMemusPanel({ isGuest, requireAuth }: OutMemusPanelProps = {}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentMemus, setSentMemus] = useState(sentMemusData);

  const filteredMemus = sentMemus.filter(m => {
    const matchesFilter = filter === 'all' || m.nature === filter;
    const matchesSearch = m.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalCount = sentMemus.length;

  const handleFilter = (newFilter: string) => {
    setFilter(newFilter);
  };

  const handleOpenCompose = () => {
    window.dispatchEvent(new CustomEvent('openCompose'));
  };

  // Empty State
  if (sentMemus.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Send size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">No sent memus yet</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          You haven't sent any memus yet. Write your first memu to start communicating.
        </p>
        <button
          onClick={handleOpenCompose}
          className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition"
        >
          ✏️ Write your first memu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Consistent with In-memus */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Out-memus</h1>
        <p className="text-[13px] text-[#777] mt-1">{totalCount} sent · {sentMemus.filter(m => !m.isRead).length} unread replies</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="px-4 md:px-8 py-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 flex items-center gap-2.5 bg-[#f2f1ee] border border-[#e8e7e3] rounded-md px-3.5 py-2">
            <Search size={15} className="text-[#777]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sent memus..."
              className="flex-1 text-[13.5px] outline-none bg-transparent"
            />
          </div>
          <button className="w-8.5 h-8.5 border border-[#e8e7e3] bg-white rounded-md flex items-center justify-center hover:border-[#777] transition">
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Filter Pills - Colorful Nature Tags */}
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

      {/* Sent Memus List */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredMemus.map((memu) => (
          <div
            key={memu.id}
            className="bg-white border border-[#e8e7e3] rounded-xl p-4 mb-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3.5">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-medium shadow-sm"
                  style={{ background: memu.toColor, color: memu.toTextColor }}
                >
                  {memu.toInitials}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-medium text-[#0f0f0f]">
                      To: {memu.to}
                    </span>
                    <span className="text-[11px] text-[#777]">{memu.toHandle}</span>
                  </div>
                  <span className="text-[11.5px] text-[#777] flex-shrink-0">{memu.time}</span>
                </div>
                
                <div className="text-[13px] text-[#3a3a3a] font-medium mb-1 line-clamp-1">
                  {memu.subject}
                </div>
                
                <div className="text-[12.5px] text-[#777] line-clamp-1 mb-2">
                  {memu.preview}
                </div>
                
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Nature Tag - Left side */}
                  <span className={`text-[10.5px] font-medium px-2.5 py-0.5 rounded-full ${natureStyles[memu.nature].bg} ${natureStyles[memu.nature].text}`}>
                    {natureLabels[memu.nature]}
                  </span>
                  
                  {/* Status Bar - Right side */}
                  <div className="flex-1 max-w-md">
                    <StatusBar 
                      status={memu.status}
                      deliveredAt={memu.deliveredAt}
                      openedAt={memu.openedAt}
                      readAt={memu.readAt}
                      size="sm"
                      showLabels={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty filter state */}
        {filteredMemus.length === 0 && sentMemus.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Search size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">No matching memus</h3>
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