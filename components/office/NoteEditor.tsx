'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { X, Save, Type, CheckSquare, Palette, Loader2 } from 'lucide-react';

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

interface NoteEditorProps {
  note?: Note | null;
  onClose: () => void;
  onSave: (note: Note) => void;
}

const colorOptions = [
  '#ffffff', '#fef3c7', '#d1fae5', '#dbeafe', 
  '#ede9fe', '#fce7f3', '#fee2e2', '#f3f4f6'
];

export default function NoteEditor({ note, onClose, onSave }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor] = useState(note?.color || '#ffffff');
  const [isChecklist, setIsChecklist] = useState(note?.is_checklist || false);
  const [saving, setSaving] = useState(false);
  
  const titleRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Auto-focus title on open
  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 100);
  }, []);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, content, color, isChecklist]);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      showToast('Note cannot be empty', 'error');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      showToast('You must be signed in', 'error');
      setSaving(false);
      return;
    }

    const noteData = {
      user_id: user.id,
      title: title.trim() || null,
      content: content.trim() || null,
      is_checklist: isChecklist,
      color: color,
    };

    try {
      let savedNote: Note;

      if (note) {
        // Update existing
        const { data, error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', note.id)
          .select()
          .single();
        
        if (error) throw error;
        savedNote = data;
        showToast('Note updated', 'success');
      } else {
        // Create new
        const { data, error } = await supabase
          .from('notes')
          .insert(noteData)
          .select()
          .single();
        
        if (error) throw error;
        savedNote = data;
        showToast('Note saved', 'success');
      }

      onSave(savedNote);
    } catch (err: any) {
      console.error('Error saving note:', err);
      showToast('Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getContrastColor = (hex: string) => {
    const lightColors = ['#ffffff', '#fef3c7', '#d1fae5', '#dbeafe', '#ede9fe', '#fce7f3', '#fee2e2', '#f3f4f6'];
    return lightColors.includes(hex.toLowerCase()) ? '#0f0f0f' : '#ffffff';
  };

  const textColor = getContrastColor(color);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-[#e8e7e3] animate-slideIn">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e7e3] bg-[#fafaf8]">
        <h3 className="text-[14px] font-semibold text-[#0f0f0f]">
          {note ? 'Edit Note' : 'New Note'}
        </h3>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#e8e7e3] transition text-[#777]"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content Area */}
      <div 
        className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto transition-colors duration-200"
        style={{ backgroundColor: color, color: textColor }}
      >
        {/* Title */}
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full bg-transparent text-[20px] font-semibold outline-none placeholder:opacity-40"
          style={{ color: textColor }}
        />

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-black/10">
          {/* Type Toggle */}
          <button
            onClick={() => setIsChecklist(!isChecklist)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
              isChecklist 
                ? 'bg-black/10 text-current' 
                : 'bg-black/5 text-current opacity-70 hover:opacity-100'
            }`}
          >
            {isChecklist ? <CheckSquare size={12} /> : <Type size={12} />}
            {isChecklist ? 'Checklist' : 'Note'}
          </button>

          {/* Color Picker */}
          <div className="flex items-center gap-1.5">
            <Palette size={12} className="opacity-60" />
            {colorOptions.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full border transition-transform hover:scale-110 ${
                  color === c ? 'border-[#0f0f0f] scale-110' : 'border-black/10'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isChecklist ? "Add items..." : "Start typing..."}
          className="flex-1 w-full resize-none bg-transparent outline-none text-[14px] leading-relaxed placeholder:opacity-40"
          style={{ color: textColor }}
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#e8e7e3] bg-white flex items-center justify-between">
        <span className="text-[11px] text-[#aaa]">
          {content.length} chars
        </span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#777] hover:bg-[#f2f1ee] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!title.trim() && !content.trim())}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              saving || (!title.trim() && !content.trim())
                ? 'bg-[#f2f1ee] text-[#aaa] cursor-not-allowed'
                : 'bg-[#0f0f0f] text-white hover:bg-[#2a2a2a] shadow-sm'
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn { animation: slideIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}