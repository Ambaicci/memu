'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Edit2, Check, Users, Loader2, Sparkles, Search, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface SpaceSettingsModalProps {
  isOpen: boolean;
  space: any;
  onClose: () => void;
  onUpdate: (space: any) => void | Promise<void>;
  onDelete: (spaceId: string) => void | Promise<void>;
}

const PREMIUM_ICONS = [
  { emoji: '🚀', label: 'Rocket' }, { emoji: '💼', label: 'Briefcase' },
  { emoji: '📊', label: 'Chart' }, { emoji: '🎯', label: 'Target' },
  { emoji: '📈', label: 'Growth' }, { emoji: '💡', label: 'Idea' },
  { emoji: '🧠', label: 'Brain' }, { emoji: '⚡', label: 'Lightning' },
  { emoji: '🎨', label: 'Art' }, { emoji: '🖌️', label: 'Design' },
  { emoji: '🎵', label: 'Music' }, { emoji: '🎬', label: 'Film' },
  { emoji: '📸', label: 'Camera' }, { emoji: '✍️', label: 'Writing' },
  { emoji: '💻', label: 'Code' }, { emoji: '🤖', label: 'AI' },
  { emoji: '🌐', label: 'Web' }, { emoji: '📱', label: 'Mobile' },
  { emoji: '☁️', label: 'Cloud' }, { emoji: '🔒', label: 'Security' },
  { emoji: '👥', label: 'Team' }, { emoji: '🤝', label: 'Handshake' },
  { emoji: '❤️', label: 'Heart' }, { emoji: '⭐', label: 'Star' },
  { emoji: '🌟', label: 'Glow' }, { emoji: '🏆', label: 'Trophy' },
  { emoji: '☕', label: 'Coffee' }, { emoji: '🍕', label: 'Pizza' },
  { emoji: '🌍', label: 'World' }, { emoji: '🏠', label: 'Home' },
  { emoji: '🧭', label: 'Compass' }, { emoji: '🌈', label: 'Rainbow' },
];

const PREMIUM_COLORS = [
  { hex: '#2563EB', name: 'Blue' }, { hex: '#7C3AED', name: 'Purple' },
  { hex: '#EC4899', name: 'Pink' }, { hex: '#EF4444', name: 'Red' },
  { hex: '#F59E0B', name: 'Amber' }, { hex: '#10B981', name: 'Emerald' },
  { hex: '#06B6D4', name: 'Cyan' }, { hex: '#6366F1', name: 'Indigo' },
  { hex: '#8B5CF6', name: 'Violet' }, { hex: '#14B8A6', name: 'Teal' },
];

const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export default function SpaceSettingsModal({ isOpen, space, onClose, onUpdate, onDelete }: SpaceSettingsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [spaceMembers, setSpaceMembers] = useState<any[]>([]);
  const [spaceMemberIds, setSpaceMemberIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (space?.id && isOpen) {
      fetchSpaceMembers(space.id);
    }
  }, [space?.id, isOpen]);

  const fetchSpaceMembers = async (spaceId: string) => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('space_members')
        .select('user_id, role, profiles(id, full_name, username, avatar_url)')
        .eq('space_id', spaceId);

      if (!error && data) {
        const members = data.map((m: any) => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return {
            id: m.user_id,
            role: m.role,
            name: profile?.full_name || profile?.username || 'Unknown',
            username: profile?.username || 'unknown',
            avatar_url: profile?.avatar_url,
          };
        });
        setSpaceMembers(members);
        setSpaceMemberIds(new Set(members.map(m => m.id)));
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  useEffect(() => {
    if (memberSearchQuery.length < 2 || !space?.id) {
      setMemberSearchResults([]);
      return;
    }

    const fetchUsers = async () => {
      setMemberSearching(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${memberSearchQuery}%,full_name.ilike.%${memberSearchQuery}%`)
        .neq('id', currentUserId || '')
        .limit(5);

      if (!error && data) {
        const filtered = data.filter(u => !spaceMemberIds.has(u.id));
        setMemberSearchResults(filtered);
      }
      setMemberSearching(false);
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [memberSearchQuery, space?.id, currentUserId, spaceMemberIds]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleStartEdit = () => {
    setEditName(space?.name || '');
    setEditDescription(space?.description || '');
    setEditIcon(space?.icon || '🚀');
    setEditColor(space?.color || '#2563EB');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !space) return;
    setIsUpdating(true);

    try {
      await onUpdate({
        ...space,
        name: editName.trim(),
        description: editDescription.trim() || null,
        icon: editIcon,
        color: editColor,
      });
      showToast('Space updated successfully!', 'success');
      setIsEditing(false);
    } catch (err) {
      showToast('Failed to update space', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!space) return;
    
    try {
      const supabase = createClient();
      
      await supabase.from('space_members').delete().eq('space_id', space.id);
      const { error } = await supabase.from('spaces').delete().eq('id', space.id);
      
      if (error) throw error;
      
      showToast('Space deleted successfully', 'success');
      
      if (onDelete) {
        await onDelete(space.id);
      }
      
      onClose();
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete space', 'error');
    }
  };

  const handleAddMember = async (user: any) => {
    if (!space) return;
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('space_members')
        .insert({ space_id: space.id, user_id: user.id, role: 'member' });

      if (error) throw error;

      showToast(`${user.full_name || user.username} added to space`, 'success');
      setMemberSearchQuery('');
      setMemberSearchResults([]);
      await fetchSpaceMembers(space.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to add member', 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!space || userId === currentUserId) {
      showToast('Cannot remove yourself', 'error');
      return;
    }

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('space_members')
        .delete()
        .eq('space_id', space.id)
        .eq('user_id', userId);

      if (error) throw error;

      showToast('Member removed', 'success');
      await fetchSpaceMembers(space.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member', 'error');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!mounted || !isOpen || !space) return null;

  const displayColor = isEditing ? editColor : (space.color || '#2563EB');
  const displayIcon = isEditing ? editIcon : (space.icon || '🚀');
  const displayName = isEditing ? editName : space.name;
  
  const isOwner = space.role === 'owner' || space.role === 'admin';

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[560px] max-h-[95vh] md:max-h-[90vh] bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-gray-200/60 overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hide-scrollbar p-5 md:p-8 max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Sparkles size={20} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Space Settings</h3>
                <p className="text-xs md:text-sm text-gray-500 font-light">
                  {isEditing ? 'Edit your workspace details' : `Manage ${space.name}`}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all flex-shrink-0 active:scale-95"
              aria-label="Close"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {/* Space Preview */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-gray-50/80 to-gray-100/40 rounded-2xl border border-gray-200/40">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0 transition-all duration-300 active:scale-95"
                style={{ 
                  background: `linear-gradient(135deg, ${displayColor}CC, ${displayColor}55)`,
                  color: '#fff',
                }}
              >
                {displayIcon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 truncate">
                  {displayName || 'Space Name'}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  {spaceMembers.length} members • {space.role || 'member'}
                </p>
              </div>
              {!isEditing && (
                <button 
                  onClick={handleStartEdit} 
                  className="px-4 py-2 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95"
                  style={{ minHeight: '44px' }}
                >
                  <Edit2 size={14} strokeWidth={2} /> Edit
                </button>
              )}
            </div>

            {!isEditing ? (
              // ===== VIEW MODE =====
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                  <p className="text-sm text-gray-900 font-medium">{space.name}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                  <p className="text-sm text-gray-600">{space.description || 'No description provided'}</p>
                </div>

                {/* Members Section */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Members ({spaceMembers.length})</label>

                  {isOwner && (
                    <div className="relative mb-3">
                      <Search size={16} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        value={memberSearchQuery} 
                        onChange={(e) => setMemberSearchQuery(e.target.value)} 
                        placeholder="Add member by handle or name..." 
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition"
                        style={{ minHeight: '44px' }}
                      />
                      {memberSearching && (
                        <div className="mt-2 p-2 bg-gray-50/80 rounded-lg text-xs text-gray-600 text-center">
                          <Loader2 size={12} className="inline mr-1.5 animate-spin" /> Searching...
                        </div>
                      )}
                      {!memberSearching && memberSearchResults.length > 0 && (
                        <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {memberSearchResults.map((user) => (
                            <button 
                              key={user.id} 
                              onClick={() => handleAddMember(user)} 
                              className="w-full flex items-center gap-2.5 p-3 hover:bg-blue-50/80 border-b border-gray-100 last:border-b-0 transition-all text-left active:scale-[0.98]"
                              style={{ minHeight: '44px' }}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                {getInitials(user.full_name || user.username)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || user.username}</p>
                                <p className="text-[11px] text-gray-500 truncate">@{user.username}</p>
                              </div>
                              <Plus size={14} className="text-blue-500 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    {spaceMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center gap-2.5 p-2.5 bg-gray-50/60 rounded-xl border border-gray-200/30"
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${displayColor}CC, ${displayColor}55)` }}
                        >
                          {getInitials(member.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.name} {member.id === currentUserId && <span className="text-xs text-gray-400">(You)</span>}
                          </p>
                          <p className="text-[11px] text-gray-500">@{member.username} • {member.role}</p>
                        </div>
                        {isOwner && member.id !== currentUserId && (
                          <button 
                            onClick={() => handleRemoveMember(member.id)} 
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex-shrink-0 active:scale-95"
                            aria-label="Remove member"
                            style={{ minHeight: '44px', minWidth: '44px' }}
                          >
                            <X size={16} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delete Section */}
                <div className="pt-4 border-t border-gray-200/60">
                  {!showDeleteConfirm ? (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)} 
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-red-50/80 text-red-500 text-sm font-medium rounded-xl transition-all active:scale-95"
                      style={{ minHeight: '44px' }}
                    >
                      <Trash2 size={16} strokeWidth={2} /> Delete Space
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-gray-600">
                        Are you sure? This action cannot be undone. All messages and files will be permanently lost.
                      </p>
                      <div className="flex gap-2.5">
                        <button 
                          onClick={() => setShowDeleteConfirm(false)} 
                          className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 text-sm font-medium transition-all active:scale-95"
                          style={{ minHeight: '44px' }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleDelete} 
                          className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all active:scale-95"
                          style={{ minHeight: '44px' }}
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // ===== EDIT MODE =====
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Space Name</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    placeholder="Space name..." 
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition"
                    style={{ minHeight: '44px' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea 
                    value={editDescription} 
                    onChange={(e) => setEditDescription(e.target.value)} 
                    placeholder="What is this space for?" 
                    rows={2}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Icon</label>
                  <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                    {PREMIUM_ICONS.map((item, index) => (
                      <button 
                        key={index} 
                        onClick={() => setEditIcon(item.emoji)} 
                        className={`relative p-2 rounded-xl text-xl transition-all active:scale-95 ${
                          editIcon === item.emoji 
                            ? 'border-2 border-blue-500 bg-blue-50/80 scale-110 shadow-md' 
                            : 'border-2 border-transparent bg-gray-50/80 hover:bg-gray-100/80 hover:scale-105'
                        }`}
                        title={item.label}
                        style={{ minHeight: '44px' }}
                      >
                        <span className="relative z-10">{item.emoji}</span>
                        {editIcon === item.emoji && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                            <Check size={8} strokeWidth={3} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {PREMIUM_COLORS.map((c) => (
                      <button 
                        key={c.hex} 
                        onClick={() => setEditColor(c.hex)} 
                        className={`w-9 h-9 rounded-full transition-all flex items-center justify-center active:scale-95 ${
                          editColor === c.hex 
                            ? 'border-4 border-blue-200/60 scale-110' 
                            : 'hover:scale-105'
                        }`}
                        style={{ background: c.hex }}
                        title={c.name}
                      >
                        {editColor === c.hex && <Check size={12} strokeWidth={3} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleSaveEdit} 
                    disabled={isUpdating || !editName.trim()}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                      isUpdating || !editName.trim()
                        ? 'bg-gray-300/50 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={handleCancelEdit} 
                    className="px-4 py-3 rounded-2xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 text-sm font-medium transition-all active:scale-95"
                    style={{ minHeight: '44px' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @media (max-width: 768px) {
          .animate-slideUp {
            animation: slideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes slideUpMobile {
            from { opacity: 0; transform: translateY(100%); }
            to { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
    </div>,
    document.body
  );
}