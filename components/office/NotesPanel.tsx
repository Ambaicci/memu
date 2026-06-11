'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Plus, Search, Pin, Trash2, Loader2, StickyNote, 
  CheckSquare, Type, X, MoreVertical
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
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchNotes(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch notes
  const fetchNotes = async (userId: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
  };

  // Delete note
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

  // Toggle pin
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

  const filteredNotes = notes.filter(n => {
    const query = searchQuery.toLowerCase();
    return (
      (n.title || '').toLowerCase().includes(query) ||
      (n.content || '').toLowerCase().includes(query) ||
      (n.tags || []).some(tag => tag.toLowerCase().includes(query))
    );
  });

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const otherNotes = filteredNotes.filter(n => !n.is_pinned);

  const getContrastColor = (hex: string) => {
    // Simple check to decide text color based on background
    const lightColors = ['#ffffff', '#fef3c7', '#d1fae5', '#dbeafe', '#ede9fe', '#fce7f3', '#fee2e2', '#f3f4f6'];
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
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-8 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Notes</h1>
              <p className="text-[13px] text-[#777] mt-1">{notes.length} notes · {pinnedNotes.length} pinned</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a2a2a] transition shadow-sm"
            >
              <Plus size={16} />
              New Note
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2.5 bg-[#f2f1ee] border border-[#e8e7e3] rounded-lg px-3.5 py-2.5">
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
        </div>

        {/* Notes Grid (Masonry Layout) */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 custom-scroll">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
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
                    {pinnedNotes.map(note => (
                      <NoteCard 
                        key={note.id} 
                        note={note} 
                        onClick={() => setEditingNote(note)}
                        onDelete={(e) => handleDelete(note.id, e)}
                        onPin={(e) => handlePin(note, e)}
                        textColor={getContrastColor(note.color)}
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
                    {otherNotes.map(note => (
                      <NoteCard 
                        key={note.id} 
                        note={note} 
                        onClick={() => setEditingNote(note)}
                        onDelete={(e) => handleDelete(note.id, e)}
                        onPin={(e) => handlePin(note, e)}
                        textColor={getContrastColor(note.color)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
  textColor: string;
}

function NoteCard({ note, onClick, onDelete, onPin, textColor }: NoteCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative break-inside-avoid rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border border-black/5"
      style={{ backgroundColor: note.color, color: textColor }}
    >
      {/* Actions (Hover) */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onPin}
          className="p-1.5 rounded-md hover:bg-black/10 transition"
          title={note.is_pinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={12} className={note.is_pinned ? 'fill-current' : ''} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-600 transition"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>

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