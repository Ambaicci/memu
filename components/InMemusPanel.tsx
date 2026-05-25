'use client';

import { useState } from 'react';
import { Search, Filter, Eye, CheckCheck, Clock, BookOpen, CircleCheck, Inbox } from 'lucide-react';
import MemuReadPanel from './MemuReadPanel';

type StatusType = 'delivered' | 'opened' | 'partially_read' | 'fully_read';

interface InMemusPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const statusConfig: Record<StatusType, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  delivered: {
    label: 'Delivered',
    icon: <CheckCheck size={11} />,
    color: 'text-[#3b82f6]',
    bgColor: 'bg-[#eff6ff]',
  },
  opened: {
    label: 'Opened',
    icon: <Eye size={11} />,
    color: 'text-[#8b5cf6]',
    bgColor: 'bg-[#f5f3ff]',
  },
  partially_read: {
    label: 'Partially Read',
    icon: <BookOpen size={11} />,
    color: 'text-[#f59e0b]',
    bgColor: 'bg-[#fffbeb]',
  },
  fully_read: {
    label: 'Fully Read',
    icon: <CircleCheck size={11} />,
    color: 'text-[#10b981]',
    bgColor: 'bg-[#ecfdf5]',
  },
};

// Demo data
const memusData = [
  {
    id: 1,
    from: 'Aisha Kimani',
    handle: '@aisha.memu',
    initials: 'AK',
    color: '#e1f5ee',
    textColor: '#0f6e56',
    subject: 'Q4 Budget — need your sign-off',
    time: '9:41 AM',
    nature: 'decide',
    unread: true,
    status: 'delivered' as StatusType,
    preview: 'Hey John — the finance team has run the numbers and we need a decision by EOD Friday on the proposed allocation…',
    body: '<p>Hey John,</p><p>The finance team has run the projections and we land in a solid position — but we need your sign-off on two items before we can move to the board.</p><p>Aisha</p>',
  },
  {
    id: 2,
    from: 'David Osei',
    handle: '@david.memu',
    initials: 'DO',
    color: '#ede9fe',
    textColor: '#5b21b6',
    subject: 'memu design feedback — a few thoughts',
    time: '8:15 AM',
    nature: 'fyi',
    unread: false,
    status: 'fully_read' as StatusType,
    preview: 'Went through the prototype last night. The spaces feature is genuinely exciting…',
    body: '<p>David,</p><p>Your feedback on spaces is spot on.</p><p>John</p>',
  },
  {
    id: 3,
    from: 'Zara Ahmed',
    handle: '@zara.memu',
    initials: 'ZA',
    color: '#fef3c7',
    textColor: '#92400e',
    subject: 'Village broadband project update',
    time: 'Yesterday',
    nature: 'fyi',
    unread: false,
    status: 'opened' as StatusType,
    preview: 'The pilot in Machakos went better than expected. 94 households connected…',
    body: '<p>Zara,</p><p>This is incredible news.</p><p>John</p>',
  },
  {
    id: 4,
    from: 'Mum',
    handle: '@mum.memu',
    initials: 'MM',
    color: '#fce7f3',
    textColor: '#9d174d',
    subject: 'Christmas plans — are you coming?',
    time: 'Monday',
    nature: 'decide',
    unread: true,
    status: 'delivered' as StatusType,
    preview: 'Your father wants to know by end of the month…',
    body: '<p>Mum,</p><p>Yes, I\'ll be there!</p><p>John</p>',
  },
  {
    id: 5,
    from: 'Tobias Nguyen',
    handle: '@tobias.memu',
    initials: 'TN',
    color: '#f0f9ff',
    textColor: '#0369a1',
    subject: 'Server issue — needs resolution',
    time: 'Monday',
    nature: 'resolve',
    unread: false,
    status: 'partially_read' as StatusType,
    preview: 'The memu staging environment went down at 3AM…',
    body: '<p>Tobias,</p><p>Let\'s patch forward.</p><p>John</p>',
  },
  {
    id: 6,
    from: 'Nairobi Design Co.',
    handle: '@nairobi-design.memu',
    initials: 'ND',
    color: '#ecfdf5',
    textColor: '#065f46',
    subject: 'Invoice #2847 — project complete ✓',
    time: 'Sunday',
    nature: 'fyi',
    unread: false,
    status: 'fully_read' as StatusType,
    preview: 'Thanks for a brilliant collaboration…',
    body: '<p>Team,</p><p>Thank you!</p><p>John</p>',
  },
  {
    id: 7,
    from: 'Amara Diallo',
    handle: '@amara.memu',
    initials: 'AD',
    color: '#fdf4ff',
    textColor: '#7e22ce',
    subject: 'URGENT: Launch announcement needs approval',
    time: 'Sunday',
    nature: 'urgent',
    unread: true,
    status: 'delivered' as StatusType,
    preview: 'We go live in 48 hours…',
    body: '<p>Amara,</p><p>Approved!</p><p>John</p>',
  },
];

const natureLabels: Record<string, string> = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
};

const natureStyles: Record<string, { bg: string; text: string; border: string }> = {
  fyi: { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]', border: 'border-[#fde68a]' },
  decide: { bg: 'bg-[#ede9fe]', text: 'text-[#7c3aed]', border: 'border-[#c4b5fd]' },
  resolve: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]', border: 'border-[#fecaca]' },
  urgent: { bg: 'bg-[#d1fae5]', text: 'text-[#059669]', border: 'border-[#a7f3d0]' },
};

export default function InMemusPanel({ isGuest, requireAuth }: InMemusPanelProps = {}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [memus, setMemus] = useState(memusData);
  const [selectedMemu, setSelectedMemu] = useState<any>(null);

  const filteredMemus = memus.filter(m => {
    const matchesFilter = filter === 'all' || m.nature === filter;
    const matchesSearch = m.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = memus.filter(m => m.unread).length;
  const totalCount = memus.length;

  const handleFilter = (newFilter: string) => {
    setFilter(newFilter);
  };

  const handleReply = (replyText: string) => {
    console.log('Reply sent:', replyText);
    setSelectedMemu(null);
  };

  const handleMemuClick = (memu: any) => {
    if (isGuest && requireAuth) {
      requireAuth('read memu', () => setSelectedMemu(memu));
    } else {
      setSelectedMemu(memu);
    }
  };

  const handleOpenCompose = () => {
    window.dispatchEvent(new CustomEvent('openCompose'));
  };

  const getStatusConfig = (status: StatusType) => {
    return statusConfig[status] || statusConfig.delivered;
  };

  // Empty State
  if (memus.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Inbox size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">Your inbox is empty</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          When someone sends you a memu, it will appear here. Start the conversation by writing your first memu.
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
      {/* Header - Matching OutMemusPanel */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">In-memus</h1>
        <p className="text-[13px] text-[#777] mt-1">{unreadCount} unread · {totalCount} total</p>
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
              placeholder="Search memus..."
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

      {/* Memus List - Matching OutMemusPanel card style */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredMemus.map((memu) => {
          const status = getStatusConfig(memu.status);
          return (
             <div
  key={memu.id}
  onClick={() => handleMemuClick(memu)}
  className="bg-white border border-[#e8e7e3] rounded-xl p-4 mb-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
>             
<div className="flex items-start gap-3.5">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-medium shadow-sm"
                    style={{ background: memu.color, color: memu.textColor }}
                  >
                    {memu.initials}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[13.5px] ${memu.unread ? 'font-semibold text-[#0f0f0f]' : 'font-medium text-[#0f0f0f]'}`}>
                        {memu.from}
                      </span>
                      <span className="text-[11px] text-[#777]">{memu.handle}</span>
                    </div>
                    <span className="text-[11.5px] text-[#777] flex-shrink-0">{memu.time}</span>
                  </div>
                  
                  <div className="text-[13px] text-[#3a3a3a] font-medium mb-1 line-clamp-1">
                    {memu.subject}
                  </div>
                  
                  <div className="text-[12.5px] text-[#777] line-clamp-1 mb-2">
                    {memu.preview}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Nature Tag */}
                    <span className={`text-[10.5px] font-medium px-2.5 py-0.5 rounded-full ${natureStyles[memu.nature].bg} ${natureStyles[memu.nature].text}`}>
                      {natureLabels[memu.nature]}
                    </span>
                    
                    {/* Status Badge */}
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bgColor}`}>
                      {status.icon}
                      <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty filter state */}
        {filteredMemus.length === 0 && memus.length > 0 && (
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

      {/* Memu Read Panel */}
      {selectedMemu && (
        <MemuReadPanel
          memu={selectedMemu}
          onClose={() => setSelectedMemu(null)}
          onReply={handleReply}
        />
      )}
    </div>
  );
}