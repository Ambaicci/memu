'use client';

import { useState } from 'react';
import { Plus, Users, MessageSquare, Calendar, Settings, Trash2, Edit2, MoreHorizontal, Layout } from 'lucide-react';
import CreateSpaceModal from './CreateSpaceModal';
import SpaceSettingsModal from './SpaceSettingsModal';

interface Space {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  messageCount: number;
  lastActive: string;
  icon?: string;
}

// Demo spaces data
const demoSpaces: Space[] = [
  {
    id: 'work',
    name: 'Work',
    description: 'Team collaboration and project management',
    color: '#4f46e5',
    memberCount: 14,
    messageCount: 234,
    lastActive: '2 minutes ago',
  },
  {
    id: 'friends',
    name: 'Friends',
    description: 'Weekend plans, memes, and good vibes',
    color: '#059669',
    memberCount: 6,
    messageCount: 89,
    lastActive: '1 hour ago',
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Family announcements and coordination',
    color: '#d97706',
    memberCount: 8,
    messageCount: 45,
    lastActive: 'Yesterday',
  },
  {
    id: 'design',
    name: 'Design Squad',
    description: 'UI/UX discussions and design reviews',
    color: '#dc2626',
    memberCount: 5,
    messageCount: 67,
    lastActive: '3 hours ago',
  },
];

export default function SpacesPanel() {
  const [spaces, setSpaces] = useState<Space[]>(demoSpaces);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<Space | null>(null);

  const handleCreateSpace = (newSpace: Omit<Space, 'id' | 'memberCount' | 'messageCount' | 'lastActive'>) => {
    const space: Space = {
      ...newSpace,
      id: Date.now().toString(),
      memberCount: 1,
      messageCount: 0,
      lastActive: 'Just now',
    };
    setSpaces([...spaces, space]);
  };

  const handleUpdateSpace = (updatedSpace: Space) => {
    setSpaces(spaces.map(s => s.id === updatedSpace.id ? updatedSpace : s));
  };

  const handleDeleteSpace = (spaceId: string) => {
    if (spaces.length === 1) {
      alert('You must have at least one space');
      return;
    }
    setSpaces(spaces.filter(s => s.id !== spaceId));
  };

  const handleOpenSpace = (space: Space) => {
    // Navigate to the beautiful existing Space UI
    window.location.href = `/?panel=space-dashboard&space=${space.id}`;
  };

  const handleOpenSettings = (space: Space) => {
    setSpaceToEdit(space);
    setShowSettingsModal(true);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Spaces</h1>
        <p className="text-[13px] text-[#777] mt-1">
          {spaces.length} spaces · {spaces.reduce((sum, s) => sum + s.memberCount, 0)} total members
        </p>
      </div>

      {/* Create Space Button */}
      <div className="px-4 md:px-8 py-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[14px] font-medium hover:shadow-lg transition-all duration-200"
        >
          <Plus size={16} />
          Create New Space
        </button>
      </div>

      {/* Spaces Grid */}
      <div className="flex-1 px-4 md:px-8 pb-32">
        {spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
              <Users size={36} className="text-[#aaa]" />
            </div>
            <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">No spaces yet</h3>
            <p className="text-[13px] text-[#777] max-w-sm mb-6">
              Create a space to collaborate with your team, friends, or family.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition"
            >
              Create your first space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <div
                key={space.id}
                onClick={() => handleOpenSpace(space)}
                className="group bg-white border border-[#e8e7e3] rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#d0cfc9]"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: space.color + '15' }}
                    >
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: space.color }} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-[#0f0f0f]">{space.name}</h3>
                      <p className="text-[11px] text-[#777]">{space.memberCount} members</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSettings(space);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#f2f1ee] transition"
                  >
                    <Settings size={14} className="text-[#777]" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-[12px] text-[#777] mb-3 line-clamp-2">
                  {space.description}
                </p>

                {/* Footer Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-[#f2f1ee]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <MessageSquare size={12} className="text-[#aaa]" />
                      <span className="text-[11px] text-[#777]">{space.messageCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-[#aaa]" />
                      <span className="text-[11px] text-[#777]">Active {space.lastActive}</span>
                    </div>
                  </div>
                  <div className="flex -space-x-1">
                    {[...Array(Math.min(space.memberCount, 3))].map((_, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full bg-[#f2f1ee] border-2 border-white flex items-center justify-center text-[8px] font-medium text-[#777]"
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateSpace}
      />

      {/* Space Settings Modal */}
      <SpaceSettingsModal
        isOpen={showSettingsModal}
        space={spaceToEdit}
        onClose={() => setShowSettingsModal(false)}
        onUpdate={handleUpdateSpace}
        onDelete={handleDeleteSpace}
      />

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