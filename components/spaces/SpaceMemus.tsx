'use client';

import { useState } from 'react';
import { Send, Eye, CheckCheck, Clock, BookOpen, CircleCheck, Inbox, Search, Filter } from 'lucide-react';
import MemuReadPanel from '../MemuReadPanel';

interface Memu {
  id: number;
  from: string;
  handle: string;
  initials: string;
  color: string;
  textColor: string;
  subject: string;
  time: string;
  nature: 'fyi' | 'decide' | 'resolve' | 'urgent';
  preview: string;
  body: string;
  unread: boolean;
  status: 'delivered' | 'opened' | 'partially_read' | 'fully_read';
}

interface SpaceMemusProps {
  spaceId: string;
  spaceName: string;
}

const natureLabels = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
};

const natureStyles = {
  fyi: 'bg-[#fef3c7] text-[#d97706]',
  decide: 'bg-[#ede9fe] text-[#7c3aed]',
  resolve: 'bg-[#fee2e2] text-[#dc2626]',
  urgent: 'bg-[#d1fae5] text-[#059669]',
};

const statusConfig = {
  delivered: { label: 'Delivered', icon: <CheckCheck size={11} />, color: 'text-[#3b82f6]', bg: 'bg-[#eff6ff]' },
  opened: { label: 'Opened', icon: <Eye size={11} />, color: 'text-[#8b5cf6]', bg: 'bg-[#f5f3ff]' },
  partially_read: { label: 'Partially Read', icon: <BookOpen size={11} />, color: 'text-[#f59e0b]', bg: 'bg-[#fffbeb]' },
  fully_read: { label: 'Fully Read', icon: <CircleCheck size={11} />, color: 'text-[#10b981]', bg: 'bg-[#ecfdf5]' },
};

// Demo memus for space
const demoMemus: Memu[] = [
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
    preview: 'The finance team has run the numbers and we need a decision by EOD Friday...',
    body: '<p>Hey John,</p><p>The finance team has run the projections and we need your sign-off on two items.</p>',
    unread: true,
    status: 'delivered',
  },
  {
    id: 2,
    from: 'David Osei',
    handle: '@david.memu',
    initials: 'DO',
    color: '#ede9fe',
    textColor: '#5b21b6',
    subject: 'Design feedback — a few thoughts',
    time: '8:15 AM',
    nature: 'fyi',
    preview: 'Went through the prototype last night. The spaces feature is genuinely exciting...',
    body: '<p>David,</p><p>Your feedback on spaces is spot on.</p>',
    unread: false,
    status: 'fully_read',
  },
  {
    id: 3,
    from: 'Tobias Nguyen',
    handle: '@tobias.memu',
    initials: 'TN',
    color: '#f0f9ff',
    textColor: '#0369a1',
    subject: 'Server issue — needs resolution',
    time: 'Yesterday',
    nature: 'resolve',
    preview: 'The staging environment went down at 3AM. Logs point to a config drift...',
    body: '<p>Tobias,</p><p>Let\'s patch forward.</p>',
    unread: false,
    status: 'opened',
  },
];

export default function SpaceMemus({ spaceId, spaceName }: SpaceMemusProps) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [memus, setMemus] = useState<Memu[]>(demoMemus);
  const [selectedMemu, setSelectedMemu] = useState<Memu | null>(null);

  const filteredMemus = memus.filter(m => {
    const matchesFilter = filter === 'all' || m.nature === filter;
    const matchesSearch = m.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = memus.filter(m => m.unread).length;
  const totalCount = memus.length;

  const handleMemuClick = (memu: Memu) => {
    setSelectedMemu(memu);
    if (memu.unread) {
      setMemus(memus.map(m => m.id === memu.id ? { ...m, unread: false } : m));
    }
  };

  const handleReply = (replyText: string) => {
    console.log('Reply sent:', replyText);
    setSelectedMemu(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-[18px] font-medium text-[#0f0f0f]">Memus</h2>
        <p className="text-[12px] text-[#777]">{unreadCount} unread · {totalCount} total</p>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#f2f1ee] border border-[#e8e7e3] rounded-lg px-3 py-1.5">
            <Search size={14} className="text-[#777]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memus..."
              className="flex-1 text-[13px] outline-none bg-transparent"
            />
          </div>
          <button className="p-2 border border-[#e8e7e3] rounded-lg hover:border-[#777] transition">
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-[12px] font-medium transition ${
            filter === 'all' ? 'bg-[#0f0f0f] text-white' : 'bg-[#f2f1ee] text-[#777] hover:bg-[#e8e7e3]'
          }`}
        >
          All
        </button>
        {Object.entries(natureLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium transition ${
              filter === key ? natureStyles[key as keyof typeof natureStyles] : 'bg-[#f2f1ee] text-[#777] hover:bg-[#e8e7e3]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Memus List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredMemus.map((memu) => {
          const status = statusConfig[memu.status];
          return (
            <div
              key={memu.id}
              onClick={() => handleMemuClick(memu)}
              className={`bg-white border rounded-xl p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                memu.unread ? 'border-l-4 border-l-[#4f46e5]' : 'border-[#e8e7e3] hover:border-[#d0cfc9]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shadow-sm" style={{ background: memu.color, color: memu.textColor }}>
                    {memu.initials}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[13px] ${memu.unread ? 'font-semibold' : 'font-medium'}`}>{memu.from}</span>
                      <span className="text-[10px] text-[#777] ml-2">{memu.handle}</span>
                    </div>
                    <span className="text-[10px] text-[#777]">{memu.time}</span>
                  </div>
                  <div className="text-[12px] font-medium text-[#0f0f0f] mt-0.5 truncate">{memu.subject}</div>
                  <div className="text-[11px] text-[#777] mt-0.5 line-clamp-1">{memu.preview}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${natureStyles[memu.nature]}`}>
                      {natureLabels[memu.nature]}
                    </span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${status.bg}`}>
                      {status.icon}
                      <span className={`text-[9px] font-medium ${status.color}`}>{status.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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