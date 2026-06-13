'use client';

import { Users, Plus, AtSign, Crown, Shield } from 'lucide-react';

interface SpaceMembersPanelProps {
  space: any;
}

export default function SpaceMembersPanel({ space }: SpaceMembersPanelProps) {
  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown size={12} className="text-amber-500" />;
    if (role === 'admin') return <Shield size={12} className="text-blue-500" />;
    return null;
  };

  const getRoleLabel = (role: string) => {
    if (role === 'owner') return 'Owner';
    if (role === 'admin') return 'Admin';
    return 'Member';
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl p-6 animate-in slide-in-from-bottom-4 duration-400">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <Users size={18} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">Members</h3>
            <p className="text-xs text-gray-500">{space.members.length} {space.members.length === 1 ? 'person' : 'people'} in this space</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-800 hover:shadow-md transition-all duration-200">
          <Plus size={12} /> Invite
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {space.members.map((member: any, idx: number) => (
          <div key={member.id} className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white/50 hover:bg-white hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: member.color, color: member.textColor }}>
              {member.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-semibold text-gray-800 truncate">{member.name}</div>
                {getRoleIcon(member.role)}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <AtSign size={10} />{member.handle}
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-gray-600">
              {getRoleIcon(member.role)}
              <span>{getRoleLabel(member.role)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}