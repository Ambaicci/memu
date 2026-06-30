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
  
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      const fetchContacts = async () => {
        setLoadingContacts(true);
        const supabase = createClient();
        
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
      
      setName(''); setDescription(''); setIcon('🚀'); setColor('#2563EB'); setSelectedMembers([]);
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
      className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="relative w-[95%] md:w-[90%] max-w-[800px] max-h-[95vh] md:max-h-[90vh] bg-white/98 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-gray-200/60 overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hide-scrollbar p-5 md:p-8 max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
                <Sparkles size={22} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">New Space</h3>
                <p className="text-xs md:text-sm text-gray-500 font-light">Create a workspace for your team</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all flex-shrink-0"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="space-y-5 md:space-y-6">
            {/* Space Preview */}
            <div className="flex items-center gap-3 md:gap-4 p-4 bg-gradient-to-br from-gray-50/80 to-gray-100/40 rounded-2xl border border-gray-200/40">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0 transition-all duration-300"
                style={{ background: `linear-gradient(135deg, ${color}CC, ${color}55)` }}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 truncate">{name.trim() || 'Space Name'}</p>
                <p className="text-xs text-gray-500 font-medium">{selectedMembers.length + 1} members • Created by you</p>
              </div>
              <div className="flex -space-x-2 flex-shrink-0">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-sm"
                  style={{ background: color }}
                >
                  {currentUser?.full_name ? getInitials(currentUser.full_name) : 'U'}
                </div>
                {selectedMembers.slice(0, 2).map((m) => (
                  <div key={m.id} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-sm">
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
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Space Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., Marketing Team" 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition"
                  autoFocus 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Description <span className="font-normal text-gray-400">(Optional)</span></label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="What is this space for?" 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition" 
                />
              </div>
            </div>

            {/* Icon & Color Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Icon</label>
                <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                  {PREMIUM_ICONS.map((item, index) => (
                    <button 
                      key={index}
                      onClick={() => setIcon(item.emoji)} 
                      className={`relative p-2.5 md:p-2 rounded-xl text-xl md:text-lg transition-all ${
                        icon === item.emoji 
                          ? 'bg-blue-50/80 border-2 border-blue-500 scale-110 shadow-md' 
                          : 'bg-gray-50/80 border-2 border-transparent hover:bg-gray-100/80 hover:scale-105'
                      }`}
                      title={item.label}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Color</label>
                <div className="flex gap-2.5 md:gap-2 flex-wrap">
                  {PREMIUM_COLORS.map((c) => (
                    <button 
                      key={c.hex} 
                      onClick={() => setColor(c.hex)} 
                      className={`relative w-10 h-10 md:w-8 md:h-8 rounded-full transition-all flex items-center justify-center ${
                        color === c.hex 
                          ? 'ring-4 ring-blue-200/60 scale-110' 
                          : 'hover:scale-105'
                      }`}
                      style={{ background: c.hex }}
                      title={c.name}
                    >
                      {color === c.hex && <Check size={14} strokeWidth={3} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Invite Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Invite Members</label>
                <span className="text-xs text-blue-600 font-semibold">{selectedMembers.length} selected</span>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50/80 to-gray-100/40 rounded-2xl border border-gray-200/40 max-h-[240px] md:max-h-[200px] overflow-y-auto hide-scrollbar">
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
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                            isSelected 
                              ? 'bg-blue-50/80 border border-blue-200/60' 
                              : 'hover:bg-white/80 border border-transparent'
                          }`}
                        >
                          <div className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(contact.full_name || contact.username)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{contact.full_name || contact.username}</p>
                            <p className="text-xs text-gray-500 truncate">@{contact.username}</p>
                          </div>
                          <div className={`w-6 h-6 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200/60">
              <button 
                onClick={handleCreateSpace} 
                disabled={loading || !name.trim()} 
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                  loading || !name.trim()
                    ? 'bg-gray-300/50 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
                {loading ? 'Creating...' : 'Create Space'}
              </button>
              <button 
                onClick={onClose} 
                className="px-6 py-3.5 rounded-2xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 text-sm font-medium transition-all"
              >
                Cancel
              </button>
            </div>
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