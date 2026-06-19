'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Users, Plus, AtSign, Crown, Shield, X, 
  UserPlus, Loader2, Check, Square
} from 'lucide-react';

interface SpaceMembersPanelProps {
  space: any;
}

interface HandleProfile {
  id: string;
  user_id: string;
  contact_id: string; // The actual user ID of the contact
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export default function SpaceMembersPanel({ space }: SpaceMembersPanelProps) {
  const [members, setMembers] = useState<any[]>(space.members || []);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [availableHandles, setAvailableHandles] = useState<HandleProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingHandles, setLoadingHandles] = useState(false);
  const [adding, setAdding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    setMembers(space.members || []);
  }, [space]);

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

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Fetch user's saved handles when modal opens
  const fetchHandles = async () => {
    if (!currentUserId) return;
    setLoadingHandles(true);
    const supabase = createClient();

    try {
      const { data: handlesData, error } = await supabase
        .from('handles')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out handles that are already members of this space
      const memberIds = members.map((m: any) => m.id);
      const filteredHandles = (handlesData || []).filter((h: HandleProfile) => {
        return !memberIds.includes(h.contact_id);
      });
        
      setAvailableHandles(filteredHandles);
    } catch (err: any) {
      console.error('Fetch handles error:', err.message);
      showToast('Failed to load handles', 'error');
    } finally {
      setLoadingHandles(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === availableHandles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableHandles.map(h => h.id));
    }
  };

  const addSelectedMembers = async () => {
    if (selectedIds.length === 0) return;
    setAdding(true);
    const supabase = createClient();

    try {
      const inserts = selectedIds.map(id => {
        const handle = availableHandles.find(h => h.id === id);
        return {
          space_id: space.id,
          user_id: handle?.contact_id, // Use contact_id (the actual user ID)
          role: 'member',
        };
      });

      const { error } = await supabase.from('space_members').insert(inserts);
      if (error) throw error;

      // Update local state with new members
      const newMembers = availableHandles
        .filter(h => selectedIds.includes(h.id))
        .map((profile, idx) => ({
          id: profile.contact_id,
          name: profile.full_name || profile.username || 'Unknown',
          handle: profile.username ? `@${profile.username}` : '',
          avatar_url: profile.avatar_url,
          initials: getInitials(profile.full_name || profile.username),
          color: ['#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6'][(members.length + idx) % 5],
          textColor: '#ffffff',
          role: 'member',
        }));

      setMembers([...members, ...newMembers]);
      showToast(`${selectedIds.length} member(s) added to space!`, 'success');
      setShowInviteModal(false);
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Add members error:', err.message);
      showToast('Failed to add members', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl p-6 animate-in slide-in-from-bottom-4 duration-400">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <Users size={18} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">Members</h3>
              <p className="text-xs text-gray-500">{members.length} {members.length === 1 ? 'person' : 'people'} in this space</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setShowInviteModal(true);
              fetchHandles();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus size={12} /> Invite
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((member: any, idx: number) => (
            <div key={member.id} className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white/50 hover:bg-white hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name} className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm" />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: member.color, color: member.textColor }}>
                  {member.initials}
                </div>
              )}
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowInviteModal(false)}
        >
          <div 
            className="bg-white/95 backdrop-blur-md rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <UserPlus size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Invite from Handles</h3>
                  <p className="text-xs text-gray-500">Select contacts to add to {space.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Select All / Count */}
            {availableHandles.length > 0 && (
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <button 
                  onClick={selectAll}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                >
                  {selectedIds.length === availableHandles.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs text-gray-500">
                  {selectedIds.length} selected
                </span>
              </div>
            )}

            {/* Handles List */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingHandles ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="text-indigo-500 animate-spin" />
                </div>
              ) : availableHandles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Users size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">No handles to invite</p>
                  <p className="text-xs text-gray-400 mt-1">Add contacts to your Handles list first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableHandles.map((profile) => {
                    const isSelected = selectedIds.includes(profile.id);
                    return (
                      <div 
                        key={profile.id}
                        onClick={() => toggleSelection(profile.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-indigo-300 bg-indigo-50/50 shadow-sm' 
                            : 'border-gray-100 bg-white/50 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.full_name} className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                            {getInitials(profile.full_name || profile.username)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">{profile.full_name || 'Unknown User'}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1"><AtSign size={10} />@{profile.username}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <Check size={20} className="text-indigo-600" />
                          ) : (
                            <Square size={20} className="text-gray-300" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Action */}
            {availableHandles.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button
                  onClick={addSelectedMembers}
                  disabled={selectedIds.length === 0 || adding}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <UserPlus size={16} /> Add {selectedIds.length} Member{selectedIds.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

