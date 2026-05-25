'use client';

import { useState } from 'react';
import { Search, UserPlus, X, Crown, MoreVertical, UserMinus } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  textColor: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

interface SpaceMembersProps {
  spaceId: string;
  spaceName: string;
}

// Demo members data
const demoMembers: Member[] = [
  { id: '1', name: 'John Mark', handle: '@johnmark.memu', initials: 'JM', color: '#1a1a1a', textColor: 'white', role: 'owner', joinedAt: 'Jan 15, 2025' },
  { id: '2', name: 'Aisha Kimani', handle: '@aisha.memu', initials: 'AK', color: '#e1f5ee', textColor: '#0f6e56', role: 'admin', joinedAt: 'Jan 16, 2025' },
  { id: '3', name: 'David Osei', handle: '@david.memu', initials: 'DO', color: '#ede9fe', textColor: '#5b21b6', role: 'member', joinedAt: 'Jan 20, 2025' },
  { id: '4', name: 'Tobias Nguyen', handle: '@tobias.memu', initials: 'TN', color: '#f0f9ff', textColor: '#0369a1', role: 'member', joinedAt: 'Feb 1, 2025' },
  { id: '5', name: 'Amara Diallo', handle: '@amara.memu', initials: 'AD', color: '#fdf4ff', textColor: '#7e22ce', role: 'member', joinedAt: 'Feb 5, 2025' },
];

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

const roleColors = {
  owner: 'bg-[#fef3c7] text-[#d97706]',
  admin: 'bg-[#ede9fe] text-[#4f46e5]',
  member: 'bg-[#f2f1ee] text-[#777]',
};

export default function SpaceMembers({ spaceId, spaceName }: SpaceMembersProps) {
  const [members, setMembers] = useState<Member[]>(demoMembers);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveMember = (memberId: string) => {
    if (confirm('Remove this member from the space?')) {
      setMembers(members.filter(m => m.id !== memberId));
    }
  };

  const handleChangeRole = (memberId: string, newRole: 'admin' | 'member') => {
    setMembers(members.map(m =>
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    setSelectedMember(null);
  };

  const isOwner = members.find(m => m.role === 'owner')?.name === 'John Mark';

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-medium text-[#0f0f0f]">Members</h3>
          <span className="text-[11px] text-[#777]">{members.length} total</span>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-lg text-[11px] font-medium hover:shadow-md transition"
          >
            <UserPlus size={12} />
            Invite
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-[#f2f1ee] border border-[#e8e7e3] rounded-lg px-3 py-1.5">
        <Search size={14} className="text-[#777]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members..."
          className="flex-1 text-[12px] outline-none bg-transparent"
        />
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-white border border-[#e8e7e3] rounded-xl hover:border-[#d0cfc9] transition"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-medium shadow-sm"
                style={{ background: member.color, color: member.textColor }}
              >
                {member.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[#0f0f0f]">{member.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${roleColors[member.role]}`}>
                    {roleLabels[member.role]}
                  </span>
                </div>
                <div className="text-[10px] text-[#777]">{member.handle}</div>
                <div className="text-[9px] text-[#aaa] mt-0.5">Joined {member.joinedAt}</div>
              </div>
            </div>

            {isOwner && member.role !== 'owner' && (
              <div className="relative">
                <button
                  onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                  className="p-1.5 rounded-lg hover:bg-[#f2f1ee] transition"
                >
                  <MoreVertical size={14} className="text-[#777]" />
                </button>
                {selectedMember?.id === member.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-[#e8e7e3] rounded-lg shadow-lg z-10 min-w-[140px]">
                    {member.role !== 'admin' && (
                      <button
                        onClick={() => handleChangeRole(member.id, 'admin')}
                        className="w-full text-left px-3 py-2 text-[12px] text-[#777] hover:bg-[#f2f1ee] transition"
                      >
                        Make Admin
                      </button>
                    )}
                    {member.role !== 'member' && (
                      <button
                        onClick={() => handleChangeRole(member.id, 'member')}
                        className="w-full text-left px-3 py-2 text-[12px] text-[#777] hover:bg-[#f2f1ee] transition"
                      >
                        Remove Admin
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="w-full text-left px-3 py-2 text-[12px] text-[#dc2626] hover:bg-red-50 transition"
                    >
                      Remove from Space
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddMember(false)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-[#0f0f0f]">Invite to {spaceName}</h3>
              <button onClick={() => setShowAddMember(false)} className="p-1 rounded-lg hover:bg-[#f2f1ee]">
                <X size={16} />
              </button>
            </div>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
              <input
                type="text"
                placeholder="Search by name or @handle"
                className="w-full pl-9 pr-3 py-2 border border-[#e8e7e3] rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]"
              />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#f2f1ee]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ede9fe] flex items-center justify-center text-[11px] font-medium text-[#5b21b6]">JD</div>
                  <div>
                    <div className="text-[13px] font-medium text-[#0f0f0f]">Jane Doe</div>
                    <div className="text-[10px] text-[#777]">@jane.memu</div>
                  </div>
                </div>
                <button className="px-2 py-1 text-[10px] bg-[#0f0f0f] text-white rounded-md hover:bg-[#2a2a2a] transition">
                  Invite
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#e8e7e3]">
              <p className="text-[10px] text-[#777] text-center">
                Invite people by their memu handle. They'll receive a notification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}