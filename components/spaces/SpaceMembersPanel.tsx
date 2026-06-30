'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Users, Shield, Crown, UserPlus, Search, X, 
  MoreVertical, Trash2, Loader2, User, Check, 
  ArrowUp, ArrowDown, CornerDownLeft, Sparkles,
  Mail, Clock
} from 'lucide-react';

interface MemberProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface SpaceMember {
  id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profiles: MemberProfile | MemberProfile[];
}

interface SpaceMembersPanelProps {
  space: {
    id: string;
    name: string;
    color?: string | null;
  };
}
export default function SpaceMembersPanel({ space }: SpaceMembersPanelProps) {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCollaborators, setRecentCollaborators] = useState<MemberProfile[]>([]);
  const [searchResults, setSearchResults] = useState<MemberProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const spaceColor = space.color || '#3B82F6';

  // Helper to extract profile from member
  const getProfile = (member: SpaceMember): MemberProfile | null => {
    if (Array.isArray(member.profiles)) {
      return member.profiles[0] || null;
    }
    return member.profiles;
  };

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (space?.id) fetchMembers();
  }, [space?.id]);

  useEffect(() => {
    if (showInvite && currentUserId) {
      fetchRecentCollaborators();
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  }, [showInvite, currentUserId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowInvite(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('space_members')
      .select('id, role, joined_at, profiles(id, username, full_name, avatar_url)')
      .eq('space_id', space.id)
      .order('role', { ascending: true });

    if (!error && data) setMembers(data);
    setLoading(false);
  };

  const fetchRecentCollaborators = async () => {
    const supabase = createClient();
    const { data: mySpaces } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', currentUserId);
    
    if (!mySpaces || mySpaces.length === 0) return;
    
    const spaceIds = mySpaces.map(s => s.space_id);
    const { data: allMembers } = await supabase
      .from('space_members')
      .select('user_id, profiles(id, username, full_name, avatar_url)')
      .in('space_id', spaceIds)
      .neq('space_id', space.id)
      .neq('user_id', currentUserId);
    
    if (allMembers) {
      const uniqueUsers = Array.from(
        new Map(allMembers.map(m => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return [m.user_id, profile];
        })).values()
      ).filter(Boolean) as MemberProfile[];
      
      uniqueUsers.sort((a, b) => 
        (a.full_name || a.username).localeCompare(b.full_name || b.username)
      );
      setRecentCollaborators(uniqueUsers);
    }
  };

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSelectedIndex(-1);
      return;
    }

    const fetchUsers = async () => {
      setSearching(true);
      setSelectedIndex(-1);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(5);

      if (!error && data) {
        const memberIds = members.map(m => {
          const profile = getProfile(m);
          return profile?.id;
        }).filter(Boolean);
        
        const filtered = data.filter(u => 
          u.id !== currentUserId && 
          !memberIds.includes(u.id) && 
          !recentCollaborators.some(h => h.id === u.id)
        );
        setSearchResults(filtered);
      }
      setSearching(false);
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId, members, recentCollaborators]);

  const handleAddMember = async (user: MemberProfile) => {
    setAddingId(user.id);
    const supabase = createClient();
    const { error } = await supabase.from('space_members').insert({
      space_id: space.id,
      user_id: user.id,
      role: 'member'
    });

    if (!error) {
      showToast(`Added ${user.full_name || user.username}!`, 'success');
      setShowInvite(false);
      fetchMembers();
    } else {
      showToast('Failed to add member', 'error');
    }
    setAddingId(null);
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    const supabase = createClient();
    const { error } = await supabase.from('space_members').update({ role: newRole }).eq('id', memberId);
    if (!error) {
      showToast(`Role updated`, 'success');
      fetchMembers();
      setOpenMenuId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('space_members').delete().eq('id', memberId);
    if (!error) {
      showToast('Member removed', 'success');
      fetchMembers();
      setOpenMenuId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return { 
        icon: <Crown size={12} strokeWidth={2.5} />, 
        label: 'Owner', 
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        glow: 'amber-400'
      };
      case 'admin': return { 
        icon: <Shield size={12} strokeWidth={2.5} />, 
        label: 'Admin', 
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        glow: 'blue-400'
      };
      default: return { 
        icon: <User size={12} strokeWidth={2.5} />, 
        label: 'Member', 
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        glow: 'gray-400'
      };
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        handleAddMember(searchResults[selectedIndex]);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 relative z-10" />
        </div>
      </div>
    );
  }

  const ownerCount = members.filter(m => m.role === 'owner').length;
  const adminCount = members.filter(m => m.role === 'admin').length;
  const memberCount = members.filter(m => m.role === 'member').length;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      
      {/* ================= PREMIUM HEADER ================= */}
      <div className="flex items-center justify-between flex-nowrap shrink-0">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${spaceColor}22, ${spaceColor}11)`,
              color: spaceColor,
            }}
          >
            <Users size={16} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Members</h2>
            <p className="text-xs text-gray-500 font-medium">
              {members.length} people • {ownerCount} owner{ownerCount !== 1 ? 's' : ''} • {adminCount} admin{adminCount !== 1 ? 's' : ''} • {memberCount} member{memberCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            style={{
              background: `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)`,
              color: 'white',
              boxShadow: `0 4px 14px ${spaceColor}44`,
            }}
          >
            <UserPlus size={16} strokeWidth={2} />
            Invite
          </button>

          {showInvite && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/60 z-50 overflow-hidden animate-fade-in-scale">
              
              {/* Search Input */}
              <div className="p-3 border-b border-gray-100/60 bg-gray-50/50">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search by handle or name..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200/60 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition"
                    autoFocus
                  />
                  {searchQuery.length >= 2 && !searching && searchResults.length > 0 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <ArrowUp size={10} className="text-gray-300" />
                      <ArrowDown size={10} className="text-gray-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="max-h-80 overflow-y-auto custom-scroll p-2">
                
                {/* Global Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="mb-3">
                    <p className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Global Search</p>
                    
                    {searching ? (
                      <div className="space-y-2 p-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-gray-200" />
                            <div className="flex-1 space-y-1">
                              <div className="h-3 w-24 bg-gray-200 rounded" />
                              <div className="h-2 w-16 bg-gray-100 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((user, index) => {
                        const isSelected = index === selectedIndex;
                        return (
                          <button
                            key={user.id}
                            onClick={() => handleAddMember(user)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            disabled={addingId === user.id}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition text-left group ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-100 shrink-0" />
                            ) : (
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ background: `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)` }}
                              >
                                {getInitials(user.full_name || user.username)}
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name || user.username}</p>
                              <p className="text-[11px] text-gray-500 truncate">@{user.username}</p>
                            </div>
                            
                            {addingId === user.id ? (
                              <Loader2 size={14} className="animate-spin text-blue-600" />
                            ) : isSelected ? (
                              <CornerDownLeft size={14} style={{ color: spaceColor }} />
                            ) : (
                              <UserPlus size={14} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <p className="p-3 text-xs text-gray-500 text-center">No users found.</p>
                    )}
                  </div>
                )}

                {/* Recent Collaborators */}
                {searchQuery.length < 2 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent Collaborators</p>
                    {recentCollaborators.length > 0 ? (
                      recentCollaborators.map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleAddMember(user)}
                          disabled={addingId === user.id}
                          className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-xl transition text-left group"
                        >
                          {user.avatar_url ? (
                            <img src={user.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100" />
                          ) : (
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)` }}
                            >
                              {getInitials(user.full_name || user.username)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name || user.username}</p>
                            <p className="text-[11px] text-gray-500 truncate">@{user.username}</p>
                          </div>
                          {addingId === user.id ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <UserPlus size={14} className="text-gray-400 opacity-0 group-hover:opacity-100" />}
                        </button>
                      ))
                    ) : (
                      <p className="p-3 text-xs text-gray-500 text-center">No recent collaborators. Search above.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MEMBERS LIST – PREMIUM CARDS ================= */}
      <div className="flex-1 overflow-y-auto custom-scroll -mx-2 px-2">
        <div className="space-y-2">
          {members.map((member) => {
            const profile = getProfile(member);
            if (!profile) return null;
            
            const roleBadge = getRoleBadge(member.role);
            const isMe = profile.id === currentUserId;
            const currentUserRole = members.find(m => getProfile(m)?.id === currentUserId)?.role;
            const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

            return (
              <div 
                key={member.id} 
                className="group flex items-center gap-3 p-3 bg-white border border-gray-200/50 rounded-xl hover:border-blue-200/60 hover:shadow-md transition-all duration-200"
                style={{
                  borderLeft: `3px solid ${member.role === 'owner' ? '#F59E0B' : member.role === 'admin' ? spaceColor : 'transparent'}`,
                }}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm" />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)` }}
                    >
                      {getInitials(profile.full_name || profile.username)}
                    </div>
                  )}
                  {isMe && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {profile.full_name || profile.username}
                    </p>
                    {isMe && (
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
                </div>

                {/* Joined Date (hidden on small screens) */}
                <div className="hidden md:flex items-center gap-1 text-[10px] text-gray-400 font-medium shrink-0">
                  <Clock size={10} strokeWidth={2} />
                  {formatDate(member.joined_at)}
                </div>

                {/* Role Badge */}
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${roleBadge.color} shrink-0`}>
                  {roleBadge.icon}
                  {roleBadge.label}
                </div>

                {/* Actions */}
                {canManage && !isMe && member.role !== 'owner' && (
                  <div className="relative shrink-0" ref={menuRef}>
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical size={14} strokeWidth={2} />
                    </button>

                    {openMenuId === member.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden animate-fade-in-scale">
                        <button 
                          onClick={() => handleRoleChange(member.id, member.role === 'admin' ? 'member' : 'admin')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
                        >
                          <Shield size={12} strokeWidth={2} />
                          {member.role === 'admin' ? 'Make Member' : 'Make Admin'}
                        </button>
                        <div className="h-px bg-gray-100" />
                        <button 
                          onClick={() => handleRemove(member.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out; }
        .btn-press:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}