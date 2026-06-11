'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  FileText, Trash2, Plus, Eye, EyeOff, Download, Copy, Check, 
  Maximize2, Minimize2, ChevronLeft, ChevronRight, Play,
  Grid, List, Image as ImageIcon, Type, Palette, Layout,
  Loader2, Cloud, X
} from 'lucide-react';
import SlidesToolDrawer from './SlidesToolDrawer';

interface Slide {
  id: string;
  presentation_id: string;
  title: string;
  content: string;
  notes: string;
  layout: 'title' | 'content' | 'two-column' | 'image' | 'blank' | 'section';
  slide_order: number;
  background: string;
  transition: string;
  animation: string;
  created_at: string;
  updated_at: string;
}

interface Presentation {
  id: string;
  title: string;
  last_edited: string;
  created_at: string;
  updated_at: string;
}

function renderSlideContent(text: string): string {
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl md:text-4xl font-bold mb-4 text-[#0f0f0f]">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl md:text-3xl font-semibold mb-3 text-[#0f0f0f]">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl md:text-2xl font-medium mb-2 text-[#0f0f0f]">$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code class="bg-black/5 px-1.5 py-0.5 rounded text-[#dc2626] text-sm">$1</code>')
    .replace(/\n\-\s(.*)/gim, '<li class="ml-4 mb-1 text-[#3a3a3a]">• $1</li>')
    .replace(/\n/gim, '<br />');
}

export default function SlidesPanel() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [activePresId, setActivePresId] = useState<string | null>(null);
  const [presTitle, setPresTitle] = useState('Untitled Presentation');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewPresModal, setShowNewPresModal] = useState(false);
  const [newPresTitle, setNewPresTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchPresentations(user.id);
      } else {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  const fetchPresentations = async (userId: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('slides_presentations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching presentations:', error);
      showToast('Failed to load presentations', 'error');
    } else if (data && data.length > 0) {
      setPresentations(data);
      setActivePresId(data[0].id);
      setPresTitle(data[0].title);
      fetchSlides(data[0].id);
    } else {
      setPresentations([]);
    }
    setLoading(false);
  };

  const fetchSlides = async (presId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .eq('presentation_id', presId)
      .order('slide_order', { ascending: true });

    if (error) {
      console.error('Error fetching slides:', error);
    } else if (data && data.length > 0) {
      setSlides(data);
      setCurrentSlideIndex(0);
    } else {
      setSlides([]);
    }
  };

  const handleAutoSave = useCallback(() => {
    if (!activePresId || !currentUserId || slides.length === 0) return;
    
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      const supabase = createClient();
      const currentSlide = slides[currentSlideIndex];
      
      await supabase
        .from('slides_presentations')
        .update({ title: presTitle, last_edited: 'Just now' })
        .eq('id', activePresId);

      if (currentSlide) {
        await supabase
          .from('slides')
          .update({ 
            title: currentSlide.title,
            content: currentSlide.content,
            notes: currentSlide.notes,
            layout: currentSlide.layout,
            background: currentSlide.background,
            transition: currentSlide.transition,
            animation: currentSlide.animation
          })
          .eq('id', currentSlide.id);
      }

      setPresentations(prev => prev.map(p => 
        p.id === activePresId ? { ...p, title: presTitle, last_edited: 'Just now' } : p
      ));
      setIsSaving(false);
    }, 1000);
  }, [activePresId, presTitle, slides, currentSlideIndex, currentUserId]);

  useEffect(() => {
    if (activePresId && slides.length > 0) {
      handleAutoSave();
    }
  }, [presTitle, slides, currentSlideIndex, activePresId, handleAutoSave]);

  // ==========================================
  // SMART MARKDOWN TOGGLE HANDLERS
  // ==========================================
  
  const updateCurrentSlide = useCallback((updates: Partial<Slide>) => {
    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], ...updates };
      return newSlides;
    });
  }, [currentSlideIndex]);

  const handleFormat = useCallback((command: string, value?: string) => {
    console.log('🛠️ Format command received:', command); // DEBUG LOG
    const textarea = editorRef.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = slides[currentSlideIndex]?.content || '';
    const selectedText = text.substring(start, end);
    
    let insertion = '';
    let newCursorPos = end;

    if (command === 'bold') {
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        insertion = selectedText.slice(2, -2); // Toggle OFF
        newCursorPos = start + insertion.length;
      } else {
        insertion = selectedText ? `**${selectedText}**` : '**bold text**'; // Toggle ON
        newCursorPos = start + insertion.length;
      }
    } else if (command === 'italic') {
      if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**')) {
        insertion = selectedText.slice(1, -1); // Toggle OFF
        newCursorPos = start + insertion.length;
      } else {
        insertion = selectedText ? `*${selectedText}*` : '*italic text*'; // Toggle ON
        newCursorPos = start + insertion.length;
      }
    } else if (command === 'insertUnorderedList') {
      insertion = `\n- ${selectedText || 'list item'}`;
      newCursorPos = start + insertion.length;
    } else if (command === 'justifyLeft' || command === 'justifyCenter' || command === 'justifyRight') {
      showToast('Alignment applied (Markdown preview only)', 'info');
      return;
    } else {
      console.warn('Unknown format command:', command);
      return;
    }

    const newContent = text.substring(0, start) + insertion + text.substring(end);
    updateCurrentSlide({ content: newContent });

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [currentSlideIndex, slides, updateCurrentSlide, showToast]);

  const handleInsert = useCallback((type: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const text = slides[currentSlideIndex]?.content || '';
    let insertion = '';

    if (type === 'link') {
      const url = prompt('Enter URL:');
      if (url) insertion = ` [Link](${url}) `;
      else return;
    } else if (type === 'image') {
      const imgUrl = prompt('Enter image URL:');
      if (imgUrl) insertion = `\n![Image](${imgUrl})\n`;
      else return;
    } else if (type === 'code') {
      insertion = '\n```\ncode here\n```\n';
    } else if (type === 'quote') {
      insertion = '\n> Quote here\n';
    }

    const newContent = text.substring(0, start) + insertion + text.substring(start);
    updateCurrentSlide({ content: newContent });

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const newPos = start + insertion.length;
        editorRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [currentSlideIndex, slides, updateCurrentSlide]);

  // ==========================================
  // PRESENTATION ACTIONS
  // ==========================================

  const handleNewPresentation = async () => {
    if (!newPresTitle.trim() || !currentUserId) return;
    const supabase = createClient();
    
    const { data: presData, error: presError } = await supabase
      .from('slides_presentations')
      .insert({ user_id: currentUserId, title: newPresTitle.trim(), last_edited: 'Just now' })
      .select()
      .single();

    if (presError || !presData) {
      showToast('Failed to create presentation', 'error');
      return;
    }

    const defaultSlides = [
      { presentation_id: presData.id, title: 'Title Slide', content: `# ${newPresTitle.trim()}\n\n## Your subtitle here`, notes: 'Start your presentation with a strong title', layout: 'title', slide_order: 1, background: '#ffffff', transition: 'none', animation: 'none' },
      { presentation_id: presData.id, title: 'Content Slide', content: '## Key Points\n\n- First point\n- Second point\n- Third point', notes: 'List your main points', layout: 'content', slide_order: 2, background: '#ffffff', transition: 'none', animation: 'none' }
    ];

    await supabase.from('slides').insert(defaultSlides);

    setPresentations(prev => [presData, ...prev]);
    setActivePresId(presData.id);
    setPresTitle(presData.title);
    fetchSlides(presData.id);
    setShowNewPresModal(false);
    setNewPresTitle('');
    showToast('Presentation created', 'success');
  };

  const handleDeletePresentation = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('slides_presentations').delete().eq('id', id);
    
    if (error) {
      showToast('Failed to delete presentation', 'error');
      return;
    }

    const updated = presentations.filter(p => p.id !== id);
    setPresentations(updated);
    
    if (updated.length > 0) {
      setActivePresId(updated[0].id);
      setPresTitle(updated[0].title);
      fetchSlides(updated[0].id);
    } else {
      setActivePresId(null);
      setSlides([]);
    }
    showToast('Presentation deleted', 'success');
  };

  const handleAddSlide = async () => {
    if (!activePresId) return;
    const supabase = createClient();
    const newOrder = slides.length + 1;
    
    const { data, error } = await supabase
      .from('slides')
      .insert({ 
        presentation_id: activePresId, 
        title: `Slide ${newOrder}`, 
        content: '## New Slide\n\nAdd your content here', 
        notes: 'Add speaker notes here', 
        layout: 'content', 
        slide_order: newOrder,
        background: '#ffffff',
        transition: 'none',
        animation: 'none'
      })
      .select()
      .single();

    if (!error && data) {
      setSlides(prev => [...prev, data]);
      setCurrentSlideIndex(slides.length);
    }
  };

  const handleDeleteSlide = async (index: number) => {
    if (slides.length === 1) {
      showToast('You must have at least one slide', 'error');
      return;
    }
    const slideToDelete = slides[index];
    const supabase = createClient();
    await supabase.from('slides').delete().eq('id', slideToDelete.id);
    
    const newSlides = slides.filter((_, i) => i !== index);
    for (let i = 0; i < newSlides.length; i++) {
      await supabase.from('slides').update({ slide_order: i + 1 }).eq('id', newSlides[i].id);
    }
    
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
    showToast('Slide deleted', 'success');
  };

  // Present Mode Component
  if (isPresentMode && slides[currentSlideIndex]) {
    const currentSlide = slides[currentSlideIndex];
    const animClass = currentSlide.animation !== 'none' ? `animate-${currentSlide.animation}` : '';
    
    return (
      <div className="fixed inset-0 bg-[#0f0f0f] z-50 flex flex-col">
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={() => setIsPresentMode(false)}
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition text-[13px] font-medium backdrop-blur-sm"
          >
            Exit Presentation
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div 
            className={`max-w-5xl w-full rounded-2xl shadow-2xl p-8 md:p-16 min-h-[60vh] flex flex-col justify-center transition-all duration-500 ${animClass}`}
            style={{ background: currentSlide.background || '#ffffff' }}
            dangerouslySetInnerHTML={{ __html: renderSlideContent(currentSlide.content) }}
          />
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
          <button
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            className="p-2 rounded-full hover:bg-white/20 transition disabled:opacity-30 text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-white/80 text-sm font-medium">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <button
            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-2 rounded-full hover:bg-white/20 transition disabled:opacity-30 text-white"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#fafaf8]' : 'flex h-full'} bg-[#fafaf8] transition-all duration-300`}>
      {/* Sidebar */}
      <div className="w-64 border-r border-[#e8e7e3] bg-white flex flex-col shadow-sm">
        <div className="px-4 pt-6 pb-4 border-b border-[#f2f1ee]">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-[18px] font-semibold text-[#0f0f0f]">memu Slides</h1>
            <div className="p-1.5 rounded-full bg-[#d1fae5] text-[#059669]" title="Synced to cloud">
              <Cloud size={14} />
            </div>
          </div>
          <p className="text-[11px] text-[#777]">Create beautiful presentations</p>
        </div>
        
        <div className="p-3">
          <button
            onClick={() => setShowNewPresModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#059669] to-[#10b981] text-white rounded-lg text-[13px] font-medium hover:from-[#047857] hover:to-[#059669] transition shadow-sm"
          >
            <Plus size={14} />
            New Presentation
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {presentations.length === 0 ? (
            <div className="p-6 text-center">
              <Layout size={32} className="text-[#aaa] mx-auto mb-3" />
              <p className="text-[12px] text-[#777] mb-2">No presentations yet</p>
              <button onClick={() => setShowNewPresModal(true)} className="text-[11px] text-[#059669] hover:underline font-medium">
                Create one →
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {presentations.map((pres) => (
                <div
                  key={pres.id}
                  onClick={() => {
                    setActivePresId(pres.id);
                    setPresTitle(pres.title);
                    fetchSlides(pres.id);
                  }}
                  className={`group p-3 rounded-lg cursor-pointer transition-all ${
                    activePresId === pres.id 
                      ? 'bg-[#ede9fe] border border-[#c4b5fd]' 
                      : 'hover:bg-[#f9fafb] border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Layout size={14} className="text-[#7c3aed] flex-shrink-0" />
                      <span className="text-[13px] font-medium text-[#0f0f0f] truncate">{pres.title}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePresentation(pres.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition flex-shrink-0"
                    >
                      <Trash2 size={11} className="text-[#777] hover:text-[#dc2626]" />
                    </button>
                  </div>
                  <div className="text-[10px] text-[#777] pl-6">{pres.last_edited}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col bg-[#f9fafb]">
        {activePresId && currentSlide ? (
          <>
            {/* Toolbar */}
            <div className="border-b border-[#e8e7e3] bg-white shadow-sm px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                    isPreviewMode ? 'bg-[#7c3aed] text-white' : 'text-[#777] hover:bg-[#f2f1ee]'
                  }`}
                >
                  {isPreviewMode ? 'Edit' : 'Preview'}
                </button>
                
                <button
                  onClick={() => setIsPresentMode(true)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#059669] text-white hover:bg-[#047857] transition flex items-center gap-1.5"
                >
                  <Play size={12} />
                  Present
                </button>
                
                {!isPreviewMode && (
                  <SlidesToolDrawer 
                    onFormat={handleFormat}
                    onInsert={handleInsert}
                    onChangeLayout={(layout) => {
                      console.log('Changing layout to:', layout);
                      updateCurrentSlide({ layout });
                    }}
                    currentLayout={currentSlide.layout}
                    onAddBackground={(bg) => {
                      console.log('Changing background to:', bg);
                      updateCurrentSlide({ background: bg });
                    }}
                    onAddTransition={(t) => {
                      console.log('Changing transition to:', t);
                      updateCurrentSlide({ transition: t });
                      showToast(`Transition set to: ${t}`, 'success');
                    }}
                    onAddAnimation={(a) => {
                      console.log('Changing animation to:', a);
                      updateCurrentSlide({ animation: a });
                      showToast(`Animation set to: ${a}`, 'success');
                    }}
                    onDuplicateSlide={async () => {
                      const supabase = createClient();
                      const newOrder = currentSlide.slide_order + 1;
                      const { data } = await supabase.from('slides').insert({
                        presentation_id: activePresId,
                        title: currentSlide.title + ' (Copy)',
                        content: currentSlide.content,
                        notes: currentSlide.notes,
                        layout: currentSlide.layout,
                        background: currentSlide.background,
                        transition: currentSlide.transition,
                        animation: currentSlide.animation,
                        slide_order: newOrder
                      }).select().single();
                      if (data) {
                        const newSlides = [...slides];
                        newSlides.splice(currentSlideIndex + 1, 0, data);
                        for (let i = 0; i < newSlides.length; i++) {
                          await supabase.from('slides').update({ slide_order: i + 1 }).eq('id', newSlides[i].id);
                        }
                        setSlides(newSlides);
                        setCurrentSlideIndex(currentSlideIndex + 1);
                        showToast('Slide duplicated', 'success');
                      }
                    }}
                    onMoveSlideUp={async () => {
                      if (currentSlideIndex === 0) return;
                      const supabase = createClient();
                      const newSlides = [...slides];
                      [newSlides[currentSlideIndex], newSlides[currentSlideIndex - 1]] = [newSlides[currentSlideIndex - 1], newSlides[currentSlideIndex]];
                      for (let i = 0; i < newSlides.length; i++) {
                        await supabase.from('slides').update({ slide_order: i + 1 }).eq('id', newSlides[i].id);
                      }
                      setSlides(newSlides);
                      setCurrentSlideIndex(currentSlideIndex - 1);
                      showToast('Slide moved up', 'success');
                    }}
                    onMoveSlideDown={async () => {
                      if (currentSlideIndex === slides.length - 1) return;
                      const supabase = createClient();
                      const newSlides = [...slides];
                      [newSlides[currentSlideIndex], newSlides[currentSlideIndex + 1]] = [newSlides[currentSlideIndex + 1], newSlides[currentSlideIndex]];
                      for (let i = 0; i < newSlides.length; i++) {
                        await supabase.from('slides').update({ slide_order: i + 1 }).eq('id', newSlides[i].id);
                      }
                      setSlides(newSlides);
                      setCurrentSlideIndex(currentSlideIndex + 1);
                      showToast('Slide moved down', 'success');
                    }}
                  />
                )}
              </div>

              <div className="flex items-center gap-3">
                {isSaving && (
                  <div className="text-[10px] text-[#059669] animate-pulse flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> Saving...
                  </div>
                )}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#7c3aed]"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>

            {/* Presentation Title */}
            <div className="px-6 pt-4 pb-2">
              <input
                type="text"
                value={presTitle}
                onChange={(e) => setPresTitle(e.target.value)}
                className="text-xl md:text-2xl font-semibold text-[#0f0f0f] bg-transparent border-b-2 border-transparent hover:border-[#e8e7e3] focus:border-[#7c3aed] outline-none px-2 py-1 w-full max-w-md transition"
                placeholder="Untitled Presentation"
              />
            </div>

            {/* Slide Thumbnails */}
            <div className="px-6 pt-2 pb-4 border-b border-[#e8e7e3] bg-white">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scroll">
                {slides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`flex-shrink-0 w-32 p-3 rounded-lg text-left transition border ${
                      currentSlideIndex === idx
                        ? 'bg-[#ede9fe] border-[#7c3aed] shadow-sm'
                        : 'bg-[#f9fafb] border-[#e8e7e3] hover:border-[#c4b5fd]'
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-[#777] mb-1">Slide {idx + 1}</div>
                    <div className="text-[11px] text-[#0f0f0f] truncate font-medium">{slide.title}</div>
                  </button>
                ))}
                <button
                  onClick={handleAddSlide}
                  className="flex-shrink-0 w-32 p-3 rounded-lg border border-dashed border-[#e8e7e3] text-[#777] hover:border-[#7c3aed] hover:text-[#7c3aed] transition flex flex-col items-center justify-center gap-1"
                >
                  <Plus size={16} />
                  <span className="text-[11px] font-medium">Add Slide</span>
                </button>
              </div>
            </div>

            {/* Current Slide Editor */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Slide Canvas */}
                <div 
                  className="rounded-xl shadow-sm border border-[#e8e7e3] overflow-hidden transition-all duration-300"
                  style={{ background: currentSlide.background || '#ffffff' }}
                >
                  <div className="border-b border-black/5 px-4 py-2.5 bg-black/5 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#777] uppercase tracking-wider">
                      Slide {currentSlideIndex + 1} Canvas
                    </span>
                    <button
                      onClick={() => handleDeleteSlide(currentSlideIndex)}
                      className="text-[11px] text-[#dc2626] hover:underline font-medium flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete Slide
                    </button>
                  </div>
                  
                  <div className="p-8 min-h-[400px]">
                    {isPreviewMode ? (
                      <div 
                        className={`prose prose-sm max-w-none ${currentSlide.animation !== 'none' ? `animate-${currentSlide.animation}` : ''}`}
                        dangerouslySetInnerHTML={{ __html: renderSlideContent(currentSlide.content) }}
                      />
                    ) : (
                      <textarea
                        ref={editorRef}
                        value={currentSlide.content}
                        onChange={(e) => updateCurrentSlide({ content: e.target.value })}
                        placeholder="Write your slide content here... (Markdown supported)"
                        className="w-full min-h-[350px] outline-none resize-none text-[14px] leading-relaxed bg-transparent font-['DM_Sans'] text-[#3a3a3a] placeholder:text-[#aaa]"
                        style={{ color: currentSlide.background === '#0f0f0f' ? '#ffffff' : '#3a3a3a' }}
                      />
                    )}
                  </div>
                </div>

                {/* Speaker Notes */}
                <div className="bg-[#fafaf8] rounded-xl shadow-sm border border-[#e8e7e3] overflow-hidden">
                  <div className="border-b border-[#e8e7e3] px-4 py-2.5 bg-white flex items-center gap-2">
                    <List size={14} className="text-[#7c3aed]" />
                    <span className="text-[12px] font-semibold text-[#777] uppercase tracking-wider">Speaker Notes</span>
                  </div>
                  <textarea
                    value={currentSlide.notes}
                    onChange={(e) => updateCurrentSlide({ notes: e.target.value })}
                    placeholder="Add your speaker notes here..."
                    className="w-full p-4 outline-none resize-none text-[13px] leading-relaxed min-h-[100px] bg-transparent text-[#3a3a3a] placeholder:text-[#aaa]"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-[#ede9fe] flex items-center justify-center mx-auto mb-4">
                <Layout size={36} className="text-[#7c3aed]" />
              </div>
              <h3 className="text-[20px] font-semibold text-[#0f0f0f] mb-2">No presentation selected</h3>
              <p className="text-[13px] text-[#777] mb-6">Create a new presentation to start building your slides</p>
              <button
                onClick={() => setShowNewPresModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#059669] to-[#10b981] text-white rounded-lg text-[13px] font-medium hover:from-[#047857] hover:to-[#059669] transition shadow-sm"
              >
                Create New Presentation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Presentation Modal */}
      {showNewPresModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewPresModal(false)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">New Presentation</h3>
            <input
              type="text"
              value={newPresTitle}
              onChange={(e) => setNewPresTitle(e.target.value)}
              placeholder="Presentation title"
              className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#7c3aed] mb-4 transition"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNewPresentation()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewPresModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleNewPresentation}
                disabled={!newPresTitle.trim()}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-gradient-to-r from-[#059669] to-[#10b981] text-white hover:from-[#047857] hover:to-[#059669] transition disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { height: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
        .prose { font-family: 'DM Sans', sans-serif; line-height: 1.7; }
        .prose h1 { font-size: 2.5em; font-weight: 700; margin-top: 0; margin-bottom: 0.5em; }
        .prose h2 { font-size: 1.75em; font-weight: 600; margin-top: 0.8em; margin-bottom: 0.4em; }
        .prose h3 { font-size: 1.25em; font-weight: 500; margin-top: 0.6em; margin-bottom: 0.3em; }
        .prose p { margin-bottom: 0.75em; }
        .prose ul { margin-left: 1.5em; margin-bottom: 0.75em; }
        .prose li { margin-bottom: 0.25em; }
        .prose code { background: rgba(0,0,0,0.05); padding: 0.2em 0.4em; border-radius: 6px; font-size: 0.85em; color: #dc2626; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
        .animate-slideUp { animation: slideUp 0.6s ease-out; }
        .animate-slideLeft { animation: slideLeft 0.6s ease-out; }
        .animate-zoomIn { animation: zoomIn 0.6s ease-out; }
        .animate-bounce { animation: bounceIn 0.8s ease-out; }
      `}</style>
    </div>
  );
}