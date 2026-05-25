'use client';

import { useState } from 'react';
import { Search, Star, MessageCircle, Clock, ArrowRight, Users, Sparkles, Inbox } from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  textColor: string;
  memuCount: number;
  lastMemuDate: string;
  lastMemuPreview: string;
  status: 'active' | 'quiet' | 'new';
  isStarred?: boolean;
}

// Demo data
const connectionsData: Connection[] = [
  {
    id: '1',
    name: 'Aisha Kimani',
    handle: '@aisha.memu',
    initials: 'AK',
    color: '#e1f5ee',
    textColor: '#0f6e56',
    memuCount: 24,
    lastMemuDate: 'Today, 9:41 AM',
    lastMemuPreview: 'The board deck is ready for review. Let me know when you can look at it...',
    status: 'active',
    isStarred: true,
  },
  {
    id: '2',
    name: 'David Osei',
    handle: '@david.memu',
    initials: 'DO',
    color: '#ede9fe',
    textColor: '#5b21b6',
    memuCount: 18,
    lastMemuDate: 'Yesterday',
    lastMemuPreview: 'The prototype is looking great. One small suggestion about the compose panel...',
    status: 'active',
    isStarred: true,
  },
  {
    id: '3',
    name: 'Tobias Nguyen',
    handle: '@tobias.memu',
    initials: 'TN',
    color: '#f0f9ff',
    textColor: '#0369a1',
    memuCount: 12,
    lastMemuDate: 'Monday',
    lastMemuPreview: 'Server is stable now. The patch worked perfectly...',
    status: 'active',
  },
  {
    id: '4',
    name: 'Amara Diallo',
    handle: '@amara.memu',
    initials: 'AD',
    color: '#fdf4ff',
    textColor: '#7e22ce',
    memuCount: 9,
    lastMemuDate: 'Sunday',
    lastMemuPreview: 'The press release went out and the response has been incredible...',
    status: 'active',
  },
  {
    id: '5',
    name: 'Zara Ahmed',
    handle: '@zara.memu',
    initials: 'ZA',
    color: '#fef3c7',
    textColor: '#92400e',
    memuCount: 7,
    lastMemuDate: 'Saturday',
    lastMemuPreview: 'The community is growing faster than we projected...',
    status: 'quiet',
    isStarred: true,
  },
  {
    id: '6',
    name: 'Mum',
    handle: '@mum.memu',
    initials: 'MM',
    color: '#fce7f3',
    textColor: '#9d174d',
    memuCount: 14,
    lastMemuDate: 'Monday',
    lastMemuPreview: 'So glad you\'re coming for Christmas! Send me your flight details...',
    status: 'active',
    isStarred: true,
  },
  {
    id: '7',
    name: 'Nairobi Design Co.',
    handle: '@nairobi-design.memu',
    initials: 'ND',
    color: '#ecfdf5',
    textColor: '#065f46',
    memuCount: 6,
    lastMemuDate: 'Friday',
    lastMemuPreview: 'Invoice #2847 has been paid. Thank you for your business...',
    status: 'quiet',
  },
  {
    id: '8',
    name: 'Maria Santos',
    handle: '@maria.memu',
    initials: 'MS',
    color: '#fff7ed',
    textColor: '#9a3412',
    memuCount: 5,
    lastMemuDate: 'Wednesday',
    lastMemuPreview: 'Let\'s schedule a call to discuss the proposal...',
    status: 'new',
  },
];

const statusConfig = {
  active: { label: 'Active', color: 'text-[#059669]', bg: 'bg-[#d1fae5]', dot: 'bg-[#059669]' },
  quiet: { label: 'Quiet', color: 'text-[#d97706]', bg: 'bg-[#fef3c7]', dot: 'bg-[#d97706]' },
  new: { label: 'New', color: 'text-[#4f46e5]', bg: 'bg-[#ede9fe]', dot: 'bg-[#4f46e5]' },
};

interface ConnectionsPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

export default function ConnectionsPanel({ isGuest, requireAuth }: ConnectionsPanelProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [connections, setConnections] = useState(connectionsData);

  const filteredConnections = connections.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.handle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = filterFavorites ? c.isStarred : true;
    return matchesSearch && matchesFavorite;
  });

  const toggleFavorite = (id: string) => {
    setConnections(prev => prev.map(c => 
      c.id === id ? { ...c, isStarred: !c.isStarred } : c
    ));
  };

  const openConnection = (connection: Connection) => {
    if (isGuest && requireAuth) {
      requireAuth('view conversation', () => {
        alert(`Opening conversation with ${connection.name}\n\nThis will show all memus exchanged (${connection.memuCount} total memus). Coming soon! ✨`);
      });
    } else {
      alert(`Opening conversation with ${connection.name}\n\nThis will show all memus exchanged (${connection.memuCount} total memus). Coming soon! ✨`);
    }
  };

  const handleOpenCompose = () => {
    window.dispatchEvent(new CustomEvent('openCompose'));
  };

  // Empty State
  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Users size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">No connections yet</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          Start a conversation and exchange 4+ memus with someone to build a connection.
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
      {/* Header - Consistent with In/Out Memus */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Connections</h1>
        <p className="text-[13px] text-[#777] mt-1">
          {connections.length} active correspondences · {connections.filter(c => c.memuCount >= 10).length} with 10+ memus
        </p>
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
              placeholder="Search connections..."
              className="flex-1 text-[13.5px] outline-none bg-transparent"
            />
          </div>
          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-medium transition ${
              filterFavorites 
                ? 'bg-[#fef3c7] text-[#d97706] border border-[#fde68a]' 
                : 'bg-white border border-[#e8e7e3] text-[#3a3a3a] hover:border-[#777]'
            }`}
          >
            <Star size={14} className={filterFavorites ? 'fill-[#d97706]' : ''} />
            Favorites
          </button>
        </div>
      </div>

      {/* Connections Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredConnections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Search size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">No matching connections</h3>
            <p className="text-[13px] text-[#777]">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredConnections.map((connection) => (
              <div
                key={connection.id}
                onClick={() => openConnection(connection)}
                className="bg-white border border-[#e8e7e3] rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#d0cfc9]"
              >
                {/* Header with Avatar and Name */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-medium shadow-sm flex-shrink-0"
                    style={{ background: connection.color, color: connection.textColor }}
                  >
                    {connection.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-semibold text-[#0f0f0f]">{connection.name}</h3>
                      {connection.isStarred && (
                        <Star size={12} className="fill-[#d97706] text-[#d97706]" />
                      )}
                    </div>
                    <p className="text-[12px] text-[#4f46e5] font-medium">{connection.handle}</p>
                  </div>
                </div>

                {/* Memu Stats */}
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#f2f1ee]">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle size={12} className="text-[#777]" />
                    <span className="text-[13px] font-medium text-[#0f0f0f]">{connection.memuCount}</span>
                    <span className="text-[11px] text-[#777]">memus</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-[#ddd]" />
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-[#777]" />
                    <span className="text-[11px] text-[#777]">{connection.lastMemuDate}</span>
                  </div>
                </div>

                {/* Last Memu Preview */}
                <div className="mb-3">
                  <p className="text-[12px] text-[#777] line-clamp-2 italic">
                    "{connection.lastMemuPreview}"
                  </p>
                </div>

                {/* Footer with Status and Action */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusConfig[connection.status].bg}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusConfig[connection.status].dot}`} />
                    <span className={`text-[10px] font-medium ${statusConfig[connection.status].color}`}>
                      {statusConfig[connection.status].label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(connection.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-[#f2f1ee] transition"
                    >
                      <Star size={14} className={connection.isStarred ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConnection(connection);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#4f46e5] hover:gap-2 transition-all"
                    >
                      View Conversation
                      <ArrowRight size={12} />
                    </button>
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
      `}</style>
    </div>
  );
}