'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  X, Check, Users, Sparkles, Loader2
} from 'lucide-react';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceCreated: () => void;
  currentUser: any;
}

// Premium icon library (Restored all emojis)
const PREMIUM_ICONS = [
  { emoji: '', label: 'Rocket' }, { emoji: '💼', label: 'Briefcase' },
  { emoji: '📊', label: 'Chart' }, { emoji: '🎯', label: 'Target' },
  { emoji: '', label: 'Growth' }, { emoji: '💡', label: 'Idea' },
  { emoji: '🧠', label: 'Brain' }, { emoji: '⚡', label: 'Lightning' },
  { emoji: '🎨', label: 'Art' }, { emoji: '🖌️', label: 'Design' },
  { emoji: '🎵', label: 'Music' }, { emoji: '', label: 'Film' },
  { emoji: '📸', label: 'Camera' }, { emoji: '✍️', label: 'Writing' },
  { emoji: '💻', label: 'Code' }, { emoji: '🤖', label: 'AI' },
  { emoji: '🌐', label: 'Web' }, { emoji: '📱', label: 'Mobile' },
  { emoji: '☁️', label: 'Cloud' }, { emoji: '🔒', label: 'Security' },
  { emoji: '👥', label: 'Team' }, { emoji: '🤝', label: 'Handshake' },
  { emoji: '❤️', label: 'Heart' }, { emoji: '⭐', label: 'Star' },
  { emoji: '', label: 'Glow' }, { emoji: '🏆', label: 'Trophy' },
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

interface ContactUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function CreateSpaceModal({ isOpen, onClose, onSpaceCreated, currentUser }: CreateSpaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🚀');
  const [color, setColor] = useState('#2563EB');
  const [selectedMembers, setSelectedMembers] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Contacts State
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle mount for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Fetch Contacts when modal opens
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      const fetchContacts = async () => {
        setLoadingContacts(true);
        const supabase = createClient();
        
        // Fetch contacts and join with profiles
        const { data, error } = await supabase
          .from('contacts')
          .select('contact_user_id, profiles(id, username, full_name, avatar_url)')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mappedContacts = data.map((item: any) => item.profiles).filter(Boolean);
          setContacts(mappedContacts);
        }
        setLoadingContacts(false);
      };
      fetchContacts();
    }
  }, [isOpen, currentUser?.id]);

  const toggleContact = (user: ContactUser) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === user.id);
      if (exists) {
        return prev.filter(m => m.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleCreateSpace = async () => {
    if (!name.trim()) {
      showToast('Please enter a space name', 'error');
      return;
    }
    if (!currentUser?.id) {
      showToast('User not authenticated', 'error');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Insert Space
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          color,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (spaceError) {
        console.error('Supabase Space Insert Error:', spaceError);
        throw new Error(spaceError.message || 'Failed to create space');
      }

      if (!spaceData) {
        throw new Error('Space created but no data returned. Check RLS policies.');
      }

      // 2. Insert Members
      const membersToInsert = [
        { space_id: spaceData.id, user_id: currentUser.id, role: 'owner' }
      ];

      selectedMembers.forEach(member => {
        membersToInsert.push({
          space_id: spaceData.id,
          user_id: member.id,
          role: 'member'
        });
      });

      const { error: membersError } = await supabase
        .from('space_members')
        .insert(membersToInsert);

      if (membersError) {
        console.error('Supabase Members Insert Error:', membersError);
        throw new Error(membersError.message || 'Failed to add members');
      }

      showToast('Space created successfully!', 'success');
      onSpaceCreated();
      onClose();
      
      // Reset form
      setName(''); setDescription(''); setIcon(''); setColor('#2563EB'); setSelectedMembers([]);
    } catch (err: any) {
      console.error('Create space error:', err);
      showToast(err.message || 'Failed to create space', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh', zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        style={{
          position: 'relative', width: '90%', maxWidth: '800px', maxHeight: '90vh',
          backgroundColor: 'rgba(255, 255, 255, 0.98)', borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(229, 231, 235, 0.6)',
          overflow: 'hidden', animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Inner Content with Hidden Scrollbar */}
        <div className="hide-scrollbar" style={{ padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
                <Sparkles size={22} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">New Space</h3>
                <p className="text-sm text-gray-500 font-light">Create a workspace for your team</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all flex-shrink-0">
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Space Preview */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, ${color}CC, ${color}55)` }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 truncate">{name.trim() || 'Space Name'}</p>
                <p className="text-xs text-gray-500 font-medium">{selectedMembers.length + 1} members • Created by you</p>
              </div>
              <div className="flex -space-x-2 flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-sm" style={{ background: color }}>
                  {currentUser?.full_name ? getInitials(currentUser.full_name) : 'U'}
                </div>
                {selectedMembers.slice(0, 2).map((m) => (
                  <div key={m.id} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 border-2 border-white shadow-sm">
                    {getInitials(m.full_name || m.username)}
                  </div>
                ))}
                {selectedMembers.length > 2 && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border-2 border-white shadow-sm">+{selectedMembers.length - 2}</div>
                )}
              </div>
            </div>

            {/* Space Name & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Space Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Marketing Team" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" autoFocus />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Description <span className="font-normal text-gray-400">(Optional)</span></label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this space for?" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" />
              </div>
            </div>

            {/* Icon & Color Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Icon</label>
                <div className="grid grid-cols-8 gap-1.5">
                  {PREMIUM_ICONS.map((item, index) => (
                    <button 
                      key={index} // FIXED: Use index as key to avoid duplicate emoji errors
                      onClick={() => setIcon(item.emoji)} 
                      className={`relative p-2 rounded-lg text-lg transition-all ${icon === item.emoji ? 'bg-blue-100 border-2 border-blue-500 scale-110' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PREMIUM_COLORS.map((c) => (
                    <button key={c.hex} onClick={() => setColor(c.hex)} className={`relative w-8 h-8 rounded-full transition-all ${color === c.hex ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c.hex }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Invite Members (Contacts List) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Invite Members</label>
                <span className="text-xs text-blue-600 font-semibold">{selectedMembers.length} selected</span>
              </div>
              
              <div className="bg-gray-50 rounded-xl border border-gray-100 max-h-[200px] overflow-y-auto hide-scrollbar">
                {loadingContacts ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    <Loader2 size={16} className="animate-spin inline mr-2" /> Loading contacts...
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No contacts saved yet. Add some in your Handles panel!</div>
                ) : (
                  <div className="p-2 space-y-1">
                    {contacts.map((contact) => {
                      const isSelected = selectedMembers.some(m => m.id === contact.id);
                      return (
                        <button
                          key={contact.id}
                          onClick={() => toggleContact(contact)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-white border border-transparent'}`}
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(contact.full_name || contact.username)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{contact.full_name || contact.username}</p>
                            <p className="text-xs text-gray-500 truncate">@{contact.username}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                            {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button onClick={handleCreateSpace} disabled={loading || !name.trim()} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
                {loading ? 'Creating...' : 'Create Space'}
              </button>
              <button onClick={onClose} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>,
    document.body
  );
}