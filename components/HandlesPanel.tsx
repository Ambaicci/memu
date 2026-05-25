'use client';

import { useState } from 'react';
import { Search, Star, Mail, Users, UserPlus, Inbox } from 'lucide-react';

interface Handle {
  id: string;
  name: string;
  handle: string;
  role: string;
  initials: string;
  color: string;
  textColor: string;
  isFavorite?: boolean;
}

// Demo data
const handlesData: Handle[] = [
  { id: '1', name: 'Aisha Kimani', handle: '@aisha.memu', role: 'CFO · Horizon Group', initials: 'AK', color: '#e1f5ee', textColor: '#0f6e56', isFavorite: true },
  { id: '2', name: 'David Osei', handle: '@david.memu', role: 'Product Lead', initials: 'DO', color: '#ede9fe', textColor: '#5b21b6', isFavorite: true },
  { id: '3', name: 'Zara Ahmed', handle: '@zara.memu', role: 'NGO Director', initials: 'ZA', color: '#fef3c7', textColor: '#92400e' },
  { id: '4', name: 'Tobias Nguyen', handle: '@tobias.memu', role: 'Lead Engineer', initials: 'TN', color: '#f0f9ff', textColor: '#0369a1' },
  { id: '5', name: 'Amara Diallo', handle: '@amara.memu', role: 'Head of Comms', initials: 'AD', color: '#fdf4ff', textColor: '#7e22ce', isFavorite: true },
  { id: '6', name: 'Nairobi Design Co.', handle: '@nairobi-design.memu', role: 'Design Studio', initials: 'ND', color: '#ecfdf5', textColor: '#065f46' },
  { id: '7', name: 'Mum', handle: '@mum.memu', role: 'Most Important Handle', initials: 'MM', color: '#fce7f3', textColor: '#9d174d', isFavorite: true },
  { id: '8', name: 'Maria Santos', handle: '@maria.memu', role: 'Strategy Consultant', initials: 'MS', color: '#fff7ed', textColor: '#9a3412' },
  { id: '9', name: 'Kofi Mensah', handle: '@kofi.memu', role: 'Creative Director', initials: 'KM', color: '#e0e7ff', textColor: '#4338ca' },
  { id: '10', name: 'Esther Wanjiku', handle: '@esther.memu', role: 'Community Manager', initials: 'EW', color: '#fce7f3', textColor: '#be185d' },
];

interface HandlesPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
  onComposeToHandle?: (handle: string) => void;
}

export default function HandlesPanel({ isGuest, requireAuth, onComposeToHandle }: HandlesPanelProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [handles, setHandles] = useState(handlesData);
  const [filterFavorites, setFilterFavorites] = useState(false);

  const filteredHandles = handles.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = filterFavorites ? h.isFavorite : true;
    return matchesSearch && matchesFavorite;
  });

  const toggleFavorite = (id: string) => {
    setHandles(prev => prev.map(h => 
      h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
    ));
  };

  const handleCompose = (handle: string) => {
    if (isGuest && requireAuth) {
      requireAuth('compose memu', () => onComposeToHandle?.(handle));
    } else {
      onComposeToHandle?.(handle);
    }
  };

  const handleAddHandle = () => {
    alert('Add new handle feature coming soon! ✨');
  };

  const handleOpenCompose = () => {
    window.dispatchEvent(new CustomEvent('openCompose'));
  };

  // Empty State
  if (handles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Users size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">Your directory is empty</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          Add handles to build your network. Start by connecting with people you communicate with.
        </p>
        <button
          onClick={handleAddHandle}
          className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition flex items-center gap-2 mx-auto"
        >
          <UserPlus size={16} />
          Add your first handle
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Consistent with In/Out Memus */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Handles</h1>
        <p className="text-[13px] text-[#777] mt-1">
          {handles.length} contacts · {handles.filter(h => h.isFavorite).length} favorites
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
              placeholder="Search handles or names…"
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
          <button
            onClick={handleAddHandle}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-medium bg-[#0f0f0f] text-white hover:bg-[#2a2a2a] transition"
          >
            <UserPlus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Handles Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredHandles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Search size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">No matching handles</h3>
            <p className="text-[13px] text-[#777]">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHandles.map((handle) => (
              <div
                key={handle.id}
                className="bg-white border border-[#e8e7e3] rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#d0cfc9]"
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-base font-medium mb-3 shadow-sm"
                  style={{ background: handle.color, color: handle.textColor }}
                >
                  {handle.initials}
                </div>

                {/* Info */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-[14px] font-medium text-[#0f0f0f] mb-0.5">{handle.name}</div>
                    <div className="text-[12px] text-[#4f46e5] font-medium mb-2">{handle.handle}</div>
                    <div className="text-[12px] text-[#777] mb-3">{handle.role}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(handle.id);
                    }}
                    className="p-1.5 rounded-md hover:bg-[#f2f1ee] transition flex-shrink-0"
                  >
                    <Star size={14} className={handle.isFavorite ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleCompose(handle.handle)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#0f0f0f] text-white rounded-md py-2 text-[11.5px] font-medium hover:bg-[#2a2a2a] transition"
                  >
                    <Mail size={12} />
                    Write
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}