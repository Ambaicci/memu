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
      
      // Delete members first
      await supabase.from('space_members').delete().eq('space_id', space.id);
      
      // Delete space
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

  // RESTORED: handleAddMember function
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

  // RESTORED: handleRemoveMember function
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
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh', zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
      }}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        style={{
          position: 'relative', width: '90%', maxWidth: '560px', maxHeight: '90vh',
          backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)',
          borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(229, 231, 235, 0.6)', overflow: 'hidden',
          animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hide-scrollbar" style={{ padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #2563EB, #4F46E5, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)', flexShrink: 0,
              }}>
                <Sparkles size={22} style={{ color: 'white', strokeWidth: 2 }} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>Space Settings</h3>
                <p style={{ fontSize: '14px', color: '#6B7280', fontWeight: 300, margin: 0 }}>
                  {isEditing ? 'Edit your workspace details' : `Manage ${space.name}`}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{ padding: '10px', borderRadius: '12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', transition: 'all 0.2s', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(243, 244, 246, 0.8)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Space Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.8), rgba(243, 244, 246, 0.4))', borderRadius: '16px', border: '1px solid rgba(229, 231, 235, 0.4)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', flexShrink: 0, background: `linear-gradient(135deg, ${displayColor}CC, ${displayColor}55)`, color: '#fff', transition: 'all 0.3s ease' }}>
                {displayIcon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName || 'Space Name'}
                </p>
                <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, margin: 0 }}>
                  {spaceMembers.length} members • {space.role || 'member'}
                </p>
              </div>
              {!isEditing && (
                <button onClick={handleStartEdit} style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(243, 244, 246, 0.8)', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '12px', fontWeight: 500, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229, 231, 235, 0.8)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(243, 244, 246, 0.8)' }}>
                  <Edit2 size={14} /> Edit
                </button>
              )}
            </div>

            {!isEditing ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Name</label>
                  <p style={{ fontSize: '14px', color: '#111827', fontWeight: 500, margin: 0 }}>{space.name}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Description</label>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>{space.description || 'No description provided'}</p>
                </div>

                {/* Members Section */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Members ({spaceMembers.length})</label>

                  {isOwner && (
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      <Search size={16} strokeWidth={2} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                      <input type="text" value={memberSearchQuery} onChange={(e) => setMemberSearchQuery(e.target.value)} placeholder="Add member by handle or name..." style={{ width: '100%', padding: '10px 12px 10px 40px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '13px', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }} onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)' }} onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none' }} />
                      {memberSearching && (
                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(249, 250, 251, 0.8)', borderRadius: '8px', fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>
                          <Loader2 size={12} style={{ display: 'inline', marginRight: '6px', animation: 'spin 1s linear infinite' }} /> Searching...
                        </div>
                      )}
                      {!memberSearching && memberSearchResults.length > 0 && (
                        <div style={{ marginTop: '8px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                          {memberSearchResults.map((user) => (
                            <button key={user.id} onClick={() => handleAddMember(user)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 246, 255, 0.8)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '9999px', background: 'linear-gradient(135deg, #3B82F6, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 700, flexShrink: 0 }}>
                                {getInitials(user.full_name || user.username)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || user.username}</p>
                                <p style={{ fontSize: '11px', color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{user.username}</p>
                              </div>
                              <Plus size={14} style={{ color: '#3B82F6', flexShrink: 0 }} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {spaceMembers.map((member) => (
                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(249, 250, 251, 0.6)', borderRadius: '10px', border: '1px solid rgba(229, 231, 235, 0.3)' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '9999px', background: `linear-gradient(135deg, ${displayColor}CC, ${displayColor}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(member.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.name} {member.id === currentUserId && '(You)'}
                          </p>
                          <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>@{member.username} • {member.role}</p>
                        </div>
                        {isOwner && member.id !== currentUserId && (
                          <button onClick={() => handleRemoveMember(member.id)} style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', transition: 'all 0.2s', display: 'flex' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }} onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.background = 'transparent' }}>
                            <X size={14} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delete Section */}
                <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(229, 231, 235, 0.6)' }}>
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '13px', fontWeight: 500, borderRadius: '10px', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                      <Trash2 size={14} /> Delete Space
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                        Are you sure? This action cannot be undone. All messages and files will be permanently lost.
                      </p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(243, 244, 246, 0.8)', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229, 231, 235, 0.8)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(243, 244, 246, 0.8)' }}>
                          Cancel
                        </button>
                        <button onClick={handleDelete} style={{ padding: '8px 16px', borderRadius: '10px', background: '#EF4444', border: 'none', cursor: 'pointer', color: 'white', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#DC2626' }} onMouseLeave={(e) => { e.currentTarget.style.background = '#EF4444' }}>
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Space Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Space name..." style={{ width: '100%', padding: '12px 16px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', fontSize: '14px', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }} onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)' }} onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Description</label>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="What is this space for?" rows={2} style={{ width: '100%', padding: '12px 16px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', fontSize: '14px', outline: 'none', transition: 'all 0.2s', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)' }} onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Icon</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                    {PREMIUM_ICONS.map((item, index) => (
                      <button key={index} onClick={() => setEditIcon(item.emoji)} style={{ position: 'relative', padding: '8px', borderRadius: '12px', fontSize: '20px', border: editIcon === item.emoji ? '2px solid #3B82F6' : '2px solid transparent', background: editIcon === item.emoji ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 250, 251, 0.8)', cursor: 'pointer', transition: 'all 0.2s', transform: editIcon === item.emoji ? 'scale(1.1)' : 'scale(1)', boxShadow: editIcon === item.emoji ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none' }} title={item.label} onMouseEnter={(e) => { if (editIcon !== item.emoji) { e.currentTarget.style.background = 'rgba(243, 244, 246, 0.8)'; e.currentTarget.style.transform = 'scale(1.05)' } }} onMouseLeave={(e) => { if (editIcon !== item.emoji) { e.currentTarget.style.background = 'rgba(249, 250, 251, 0.8)'; e.currentTarget.style.transform = 'scale(1)' } }}>
                        <span style={{ position: 'relative', zIndex: 1 }}>{item.emoji}</span>
                        {editIcon === item.emoji && (
                          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '9999px', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}>
                            <Check size={8} strokeWidth={3} style={{ color: 'white' }} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Color</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {PREMIUM_COLORS.map((c) => (
                      <button key={c.hex} onClick={() => setEditColor(c.hex)} style={{ width: '36px', height: '36px', borderRadius: '9999px', border: editColor === c.hex ? '4px solid rgba(59, 130, 246, 0.2)' : 'none', background: c.hex, cursor: 'pointer', transition: 'all 0.2s', transform: editColor === c.hex ? 'scale(1.1)' : 'scale(1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={c.name} onMouseEnter={(e) => { if (editColor !== c.hex) { e.currentTarget.style.transform = 'scale(1.05)' } }} onMouseLeave={(e) => { if (editColor !== c.hex) { e.currentTarget.style.transform = 'scale(1)' } }}>
                        {editColor === c.hex && <Check size={12} strokeWidth={3} style={{ color: 'white' }} />}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                  <button onClick={handleSaveEdit} disabled={isUpdating || !editName.trim()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', background: isUpdating || !editName.trim() ? 'rgba(156, 163, 175, 0.5)' : 'linear-gradient(135deg, #2563EB, #4F46E5, #7C3AED)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '14px', fontWeight: 600, cursor: isUpdating || !editName.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: isUpdating || !editName.trim() ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.25)' }} onMouseEnter={(e) => { if (!isUpdating && editName.trim()) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px -5px rgba(37, 99, 235, 0.35)'; } }} onMouseLeave={(e) => { if (!isUpdating && editName.trim()) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.25)'; } }}>
                    {isUpdating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} strokeWidth={2.5} />}
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={handleCancelEdit} style={{ padding: '12px 16px', background: 'rgba(243, 244, 246, 0.8)', color: '#374151', border: 'none', borderRadius: '16px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229, 231, 235, 0.8)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(243, 244, 246, 0.8)' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>,
    document.body
  );
}