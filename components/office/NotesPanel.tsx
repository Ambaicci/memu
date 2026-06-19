'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Plus, Search, Pin, Trash2, Loader2, StickyNote, 
  CheckSquare, Type, X, MoreVertical, Lock, Unlock,
  Key, Copy, Eye, EyeOff, Shield, Zap, LayoutTemplate,
  Palette, Tag, Calendar, Bell, Share2, Download,
  Image as ImageIcon, Mic, Link as LinkIcon, Star,
  Archive, Clock, TrendingUp, Users, Globe, Briefcase
} from 'lucide-react';
import NoteEditor from './NoteEditor';

interface Note {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  is_checklist: boolean;
  color: string;
  is_pinned: boolean;
  is_locked?: boolean;
  is_archived?: boolean;
  tags: string[] | null;
  reminder_at?: string | null;
  category?: string | null;
  template_type?: string | null;
  pin_hash?: string | null;
  created_at: string;
  updated_at: string;
}
interface PasswordEntry {
  id: string;
  user_id: string;
  service_name: string;
  username: string;
  password: string;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const noteTemplates = [
  { id: 'blank', name: 'Blank Note', icon: <Type size={14} />, content: '' },
  { id: 'meeting', name: 'Meeting Notes', icon: <Users size={14} />, content: '## Attendees\n\n## Agenda\n\n## Action Items\n\n## Next Steps' },
  { id: 'todo', name: 'To-Do List', icon: <CheckSquare size={14} />, content: '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3' },
  { id: 'shopping', name: 'Shopping List', icon: <Tag size={14} />, content: '- [ ] Item 1\n- [ ] Item 2\n- [ ] Item 3' },
  { id: 'password', name: 'Password', icon: <Key size={14} />, content: '', isPassword: true },
  { id: 'idea', name: 'Idea', icon: <Zap size={14} />, content: '## The Idea\n\n## Why It Matters\n\n## Next Steps' },
  { id: 'journal', name: 'Journal Entry', icon: <Calendar size={14} />, content: `## ${new Date().toLocaleDateString()}\n\n### What happened today?\n\n### What did I learn?\n\n### What am I grateful for?` },
];

const categories = [
  { id: 'personal', name: 'Personal', icon: <Users size={12} />, color: 'text-blue-600' },
  { id: 'work', name: 'Work', icon: <Briefcase size={12} />, color: 'text-purple-600' },
  { id: 'ideas', name: 'Ideas', icon: <Zap size={12} />, color: 'text-amber-600' },
  { id: 'tasks', name: 'Tasks', icon: <CheckSquare size={12} />, color: 'text-emerald-600' },
  { id: 'finance', name: 'Finance', icon: <TrendingUp size={12} />, color: 'text-green-600' },
  { id: 'other', name: 'Other', icon: <Tag size={12} />, color: 'text-gray-600' },
];

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPasswordManager, setShowPasswordManager] = useState(false);
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [unlockedNotes, setUnlockedNotes] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchNotes(user.id);
        fetchPasswords(user.id);
      }
    };
    getUser();
  }, []);

  const fetchNotes = async (userId: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
  };

  const fetchPasswords = async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('passwords')
      .select('*')
      .eq('user_id', userId)
      .order('service_name', { ascending: true });

    if (!error && data) {
      setPasswords(data);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    const supabase = createClient();
    const { error } = await supabase.from('notes').delete().eq('id', id);
    
    if (!error) {
      setNotes(prev => prev.filter(n => n.id !== id));
      showToast('Note deleted', 'success');
    }
  };

  const handlePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = createClient();
    const { error } = await supabase
      .from('notes')
      .update({ is_pinned: !note.is_pinned })
      .eq('id', note.id);

    if (!error) {
      setNotes(prev => prev.map(n => 
        n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n
      ));
      showToast(note.is_pinned ? 'Unpinned' : 'Pinned', 'success');
    }
  };

  const handleArchive = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = createClient();
    const { error } = await supabase
      .from('notes')
      .update({ is_archived: true })
      .eq('id', note.id);

    if (!error) {
      setNotes(prev => prev.filter(n => n.id !== note.id));
      showToast('Note archived', 'success');
    }
  };

  const handleLock = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const pin = prompt('Enter a 4-digit PIN to lock this note:');
    if (!pin || pin.length !== 4 || isNaN(Number(pin))) {
      showToast('Invalid PIN. Must be 4 digits.', 'error');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('notes')
      .update({ is_locked: true, pin_hash: pin })
      .eq('id', note.id);

    if (!error) {
      setNotes(prev => prev.map(n => 
        n.id === note.id ? { ...n, is_locked: true } : n
      ));
      showToast('Note locked with PIN', 'success');
    }
  };

  const handleUnlock = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const pin = prompt('Enter PIN to unlock:');
    if (!pin) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('notes')
      .select('pin_hash')
      .eq('id', note.id)
      .single();

    if (!error && data && data.pin_hash === pin) {
      setUnlockedNotes(prev => new Set(prev).add(note.id));
      showToast('Note unlocked', 'success');
    } else {
      showToast('Incorrect PIN', 'error');
    }
  };

  const createFromTemplate = async (template: typeof noteTemplates[0]) => {
    if (template.isPassword) {
      setShowPasswordManager(true);
      setShowTemplates(false);
      return;
    }

    const supabase = createClient();
    const newNote = {
      user_id: currentUserId,
      title: template.name,
      content: template.content,
      is_checklist: template.id === 'todo' || template.id === 'shopping',
      color: '#ffffff',
      is_pinned: false,
      is_locked: false,
      is_archived: false,
      tags: [],
      category: template.id === 'meeting' ? 'work' : template.id === 'todo' ? 'tasks' : null,
      template_type: template.id,
    };

    const { data, error } = await supabase.from('notes').insert(newNote).select().single();
    
    if (!error && data) {
      setNotes(prev => [data, ...prev]);
      setEditingNote(data);
      showToast(`${template.name} created`, 'success');
    }
    setShowTemplates(false);
  };

  const filteredNotes = notes.filter(n => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (n.title || '').toLowerCase().includes(query) ||
      (n.content || '').toLowerCase().includes(query) ||
      (n.tags || []).some(tag => tag.toLowerCase().includes(query));
    
    const matchesCategory = !selectedCategory || n.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const otherNotes = filteredNotes.filter(n => !n.is_pinned);

  const getContrastColor = (hex: string) => {
    const lightColors = ['#ffffff', '#fef3c7', '#d1fae5', '#dbeafe', '#ede9fe', '#fce7f3', '#fee2e2', '#f3f4f6', '#fed7aa'];
    return lightColors.includes(hex.toLowerCase()) ? '#0f0f0f' : '#ffffff';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden animate-page-enter">
        {/* Header */}
        <div className="px-4 md:px-8 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Notes</h1>
              <p className="text-[13px] text-[#777] mt-1">{notes.length} notes · {pinnedNotes.length} pinned · {passwords.length} passwords</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPasswordManager(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-[13px] font-medium hover:shadow-lg transition btn-press"
              >
                <Key size={14} />
                Passwords
              </button>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 px-3 py-2 bg-[#0f0f0f] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a2a2a] transition btn-press"
              >
                <LayoutTemplate size={14} />
                Templates
              </button>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-[13px] font-medium hover:shadow-lg transition btn-press"
              >
                <Plus size={16} />
                New Note
              </button>
            </div>
          </div>

          {/* Templates Dropdown */}
          {showTemplates && (
            <div className="mb-4 p-4 bg-white rounded-xl border border-[#e8e7e3] shadow-lg animate-fade-in-scale">
              <div className="flex items-center gap-2 mb-3">
                <LayoutTemplate size={14} className="text-[#4f46e5]" />
                <span className="text-[13px] font-semibold text-[#0f0f0f]">Quick Templates</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {noteTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => createFromTemplate(template)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-[#e8e7e3] hover:border-[#4f46e5] hover:bg-[#f9fafb] transition btn-press"
                  >
                    <div className="text-[#4f46e5]">{template.icon}</div>
                    <span className="text-[11px] font-medium text-[#0f0f0f]">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 flex items-center gap-2.5 bg-[#f2f1ee] border border-[#e8e7e3] rounded-lg px-3.5 py-2.5">
              <Search size={16} className="text-[#777]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, tags, or content..."
                className="flex-1 text-[13.5px] outline-none bg-transparent placeholder:text-[#aaa]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[#777] hover:text-[#0f0f0f]">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-[#f2f1ee] rounded-lg p-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition btn-press ${
                    selectedCategory === cat.id ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                  }`}
                >
                  <span className={cat.color}>{cat.icon}</span>
                  <span className="hidden md:inline">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 custom-scroll">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-scale">
              <div className="w-20 h-20 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
                <StickyNote size={32} className="text-[#aaa]" />
              </div>
              <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-1">
                {searchQuery ? 'No matching notes' : 'Your notebook is empty'}
              </h3>
              <p className="text-[13px] text-[#777] max-w-sm">
                {searchQuery ? 'Try a different search term.' : 'Capture your thoughts, ideas, and tasks.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pinned Section */}
              {pinnedNotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pin size={12} className="text-[#d97706]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wider">Pinned</span>
                  </div>
                  <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                    {pinnedNotes.map((note, idx) => (
                      <NoteCard 
                        key={note.id} 
                        note={note} 
                        onClick={() => {
                          if (note.is_locked && !unlockedNotes.has(note.id)) {
                            handleUnlock(note, {} as React.MouseEvent);
                          } else {
                            setEditingNote(note);
                          }
                        }}
                        onDelete={(e) => handleDelete(note.id, e)}
                        onPin={(e) => handlePin(note, e)}
                        onArchive={(e) => handleArchive(note, e)}
                        onLock={(e) => handleLock(note, e)}
                        textColor={getContrastColor(note.color)}
                        isUnlocked={!note.is_locked || unlockedNotes.has(note.id)}
                        animationDelay={idx * 40}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Others Section */}
              {otherNotes.length > 0 && (
                <div>
                  {pinnedNotes.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 pt-2">
                      <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wider">Others</span>
                    </div>
                  )}
                  <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                    {otherNotes.map((note, idx) => (
                      <NoteCard 
                        key={note.id} 
                        note={note} 
                        onClick={() => {
                          if (note.is_locked && !unlockedNotes.has(note.id)) {
                            handleUnlock(note, {} as React.MouseEvent);
                          } else {
                            setEditingNote(note);
                          }
                        }}
                        onDelete={(e) => handleDelete(note.id, e)}
                        onPin={(e) => handlePin(note, e)}
                        onArchive={(e) => handleArchive(note, e)}
                        onLock={(e) => handleLock(note, e)}
                        textColor={getContrastColor(note.color)}
                        isUnlocked={!note.is_locked || unlockedNotes.has(note.id)}
                        animationDelay={(pinnedNotes.length + idx) * 40}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password Manager Modal */}
      {showPasswordManager && (
        <PasswordManager
          passwords={passwords}
          onClose={() => setShowPasswordManager(false)}
          onRefresh={() => currentUserId && fetchPasswords(currentUserId)}
        />
      )}

      {/* Slide-Over Editor */}
      {(isCreating || editingNote) && (
        <NoteEditor
          note={editingNote}
          onClose={() => { setIsCreating(false); setEditingNote(null); }}
          onSave={(savedNote) => {
            if (editingNote) {
              setNotes(prev => prev.map(n => n.id === savedNote.id ? savedNote : n));
            } else {
              setNotes(prev => [savedNote, ...prev]);
            }
            setIsCreating(false);
            setEditingNote(null);
          }}
        />
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
      `}</style>
    </>
  );
}

// ==========================================
// NOTE CARD COMPONENT
// ==========================================
interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onPin: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
  onLock: (e: React.MouseEvent) => void;
  textColor: string;
  isUnlocked: boolean;
  animationDelay: number;
}

function NoteCard({ note, onClick, onDelete, onPin, onArchive, onLock, textColor, isUnlocked, animationDelay }: NoteCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative break-inside-avoid rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border border-black/5 animate-slide-up btn-press"
      style={{ 
        backgroundColor: note.color, 
        color: textColor,
        animationDelay: `${animationDelay}ms`,
        opacity: 0
      }}
    >
      {/* Lock Indicator */}
      {note.is_locked && !isUnlocked && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <Lock size={24} className={textColor} />
        </div>
      )}

      {/* Actions (Hover) */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onPin}
          className="p-1.5 rounded-md hover:bg-black/10 transition btn-press"
          title={note.is_pinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={12} className={note.is_pinned ? 'fill-current' : ''} />
        </button>
        <button
          onClick={onLock}
          className="p-1.5 rounded-md hover:bg-black/10 transition btn-press"
          title={note.is_locked ? 'Locked' : 'Lock'}
        >
          {note.is_locked ? <Unlock size={12} /> : <Lock size={12} />}
        </button>
        <button
          onClick={onArchive}
          className="p-1.5 rounded-md hover:bg-black/10 transition btn-press"
          title="Archive"
        >
          <Archive size={12} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-600 transition btn-press"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Category Badge */}
      {note.category && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/10 text-[9px] font-semibold uppercase tracking-wider">
            {categories.find(c => c.id === note.category)?.icon}
            {note.category}
          </span>
        </div>
      )}

      {/* Content */}
      {note.title && (
        <h3 className="font-semibold text-[14px] mb-2 pr-16 line-clamp-2">{note.title}</h3>
      )}
      
      {note.is_checklist ? (
        <div className="text-[12px] space-y-1 pr-16 whitespace-pre-wrap line-clamp-6 opacity-90">
          {note.content}
        </div>
      ) : (
        <p className="text-[12px] leading-relaxed pr-16 whitespace-pre-wrap line-clamp-8 opacity-90">
          {note.content}
        </p>
      )}

      {/* Footer: Tags & Date */}
      <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {note.is_checklist ? <CheckSquare size={10} /> : <Type size={10} />}
          <span className="text-[9px] font-medium uppercase tracking-wider opacity-70">
            {note.is_checklist ? 'Checklist' : 'Note'}
          </span>
        </div>
        <span className="text-[9px] opacity-60">
          {new Date(note.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// PASSWORD MANAGER COMPONENT
// ==========================================
interface PasswordManagerProps {
  passwords: PasswordEntry[];
  onClose: () => void;
  onRefresh: () => void;
}

function PasswordManager({ passwords, onClose, onRefresh }: PasswordManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  const handleAddPassword = async () => {
    if (!serviceName || !username || !password) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('passwords').insert({
      user_id: user?.id,
      service_name: serviceName,
      username,
      password,
      url: url || null,
      notes: notes || null,
    });

    if (!error) {
      showToast('Password saved securely', 'success');
      setShowAddForm(false);
      setServiceName('');
      setUsername('');
      setPassword('');
      setUrl('');
      setNotes('');
      onRefresh();
    }
  };

  const handleDeletePassword = async (id: string) => {
    if (!confirm('Delete this password entry?')) return;
    
    const supabase = createClient();
    const { error } = await supabase.from('passwords').delete().eq('id', id);
    
    if (!error) {
      showToast('Password deleted', 'success');
      onRefresh();
    }
  };

  const toggleShowPassword = (id: string) => {
    setShowPassword(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[600px] max-w-[90%] max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[#e8e7e3] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-[#0f0f0f]">Password Manager</h3>
              <p className="text-[12px] text-[#777]">{passwords.length} passwords stored securely</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f2f1ee] transition btn-press">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="space-y-4 animate-fade-in-scale">
              <input
                type="text"
                value={serviceName}
                onChange={e => setServiceName(e.target.value)}
                placeholder="Service name (e.g., Google, Facebook)"
                className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5] transition"
              />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username or email"
                className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5] transition"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5] transition"
              />
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Website URL (optional)"
                className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5] transition"
              />
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5] transition resize-none"
                rows={3}
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition btn-press">Cancel</button>
                <button onClick={handleAddPassword} className="px-4 py-2 rounded-lg text-[13px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg transition btn-press">Save Password</button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-[13px] font-medium hover:shadow-lg transition btn-press"
              >
                <Plus size={14} />
                Add New Password
              </button>

              {passwords.length === 0 ? (
                <div className="text-center py-12">
                  <Key size={32} className="text-[#aaa] mx-auto mb-3" />
                  <p className="text-[13px] text-[#777]">No passwords saved yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {passwords.map((pwd, idx) => (
                    <div key={pwd.id} className="p-4 border border-[#e8e7e3] rounded-xl hover:shadow-md transition animate-slide-up" style={{ animationDelay: `${idx * 40}ms`, opacity: 0 }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                            <Key size={14} className="text-purple-600" />
                          </div>
                          <div>
                            <div className="text-[14px] font-semibold text-[#0f0f0f]">{pwd.service_name}</div>
                            {pwd.url && <a href={pwd.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#4f46e5] hover:underline">{pwd.url}</a>}
                          </div>
                        </div>
                        <button onClick={() => handleDeletePassword(pwd.id)} className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-600 transition btn-press">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="space-y-2 ml-10">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#777] w-16">Username:</span>
                          <span className="text-[12px] text-[#0f0f0f] flex-1">{pwd.username}</span>
                          <button onClick={() => copyToClipboard(pwd.username, 'Username')} className="p-1 rounded hover:bg-[#f2f1ee] transition btn-press">
                            <Copy size={10} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#777] w-16">Password:</span>
                          <span className="text-[12px] text-[#0f0f0f] flex-1 font-mono">
                            {showPassword.has(pwd.id) ? pwd.password : '••••••••'}
                          </span>
                          <button onClick={() => toggleShowPassword(pwd.id)} className="p-1 rounded hover:bg-[#f2f1ee] transition btn-press">
                            {showPassword.has(pwd.id) ? <EyeOff size={10} /> : <Eye size={10} />}
                          </button>
                          <button onClick={() => copyToClipboard(pwd.password, 'Password')} className="p-1 rounded hover:bg-[#f2f1ee] transition btn-press">
                            <Copy size={10} />
                          </button>
                        </div>
                        {pwd.notes && (
                          <div className="text-[11px] text-[#777] italic">{pwd.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}