'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  FileText, Trash2, Plus, Eye, EyeOff, Download, Copy, Check, 
  Maximize2, Minimize2, ChevronLeft, ChevronRight, Play,
  Grid, List, Image as ImageIcon, Type, Palette, Layout
} from 'lucide-react';
import SlidesToolDrawer from './SlidesToolDrawer';

interface Slide {
  id: number;
  title: string;
  content: string;
  notes: string;
  layout: 'title' | 'content' | 'two-column' | 'image';
  imageUrl?: string;
  transition?: string;
}

interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  lastEdited: string;
  createdAt: string;
}

// Simple markdown renderer for slides
function renderSlideContent(text: string): string {
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2">$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code class="bg-[#f2f1ee] px-1.5 py-0.5 rounded text-[#dc2626] text-sm">$1</code>')
    .replace(/\n\-\s(.*)/gim, '<li class="ml-4 mb-1">• $1</li>')
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
  const [editingSlideContent, setEditingSlideContent] = useState('');
  const [editingSlideNotes, setEditingSlideNotes] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Load presentations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('memu_slides');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPresentations(parsed);
      if (parsed.length > 0 && !activePresId) {
        setActivePresId(parsed[0].id);
        setPresTitle(parsed[0].title);
        setSlides(parsed[0].slides);
        setCurrentSlideIndex(0);
        setEditingSlideContent(parsed[0].slides[0]?.content || '');
        setEditingSlideNotes(parsed[0].slides[0]?.notes || '');
      }
    }
  }, []);

  // Auto-save
  const handleAutoSave = () => {
    if (!activePresId) return;
    
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      const updated = presentations.map(p => 
        p.id === activePresId 
          ? { 
              ...p, 
              title: presTitle, 
              slides: slides,
              lastEdited: new Date().toLocaleDateString() 
            }
          : p
      );
      setPresentations(updated);
      localStorage.setItem('memu_slides', JSON.stringify(updated));
      setIsSaving(false);
      setTimeout(() => setIsSaving(false), 1000);
    }, 1000);
  };

  useEffect(() => {
    if (activePresId) {
      handleAutoSave();
    }
  }, [slides, presTitle, activePresId]);

  // Update current slide content
  useEffect(() => {
    if (slides[currentSlideIndex]) {
      setEditingSlideContent(slides[currentSlideIndex].content);
      setEditingSlideNotes(slides[currentSlideIndex].notes);
    }
  }, [currentSlideIndex, slides]);

  const handleNewPresentation = () => {
    if (!newPresTitle.trim()) return;
    
    const newPres: Presentation = {
      id: Date.now().toString(),
      title: newPresTitle,
      slides: [
        {
          id: 1,
          title: 'Title Slide',
          content: '# ' + newPresTitle + '\n\n## Your subtitle here',
          notes: 'Start your presentation with a strong title',
          layout: 'title',
        },
        {
          id: 2,
          title: 'Content Slide',
          content: '## Key Points\n\n- First point\n- Second point\n- Third point',
          notes: 'List your main points',
          layout: 'content',
        },
      ],
      lastEdited: 'Just now',
      createdAt: new Date().toLocaleDateString(),
    };
    
    setPresentations([...presentations, newPres]);
    setActivePresId(newPres.id);
    setPresTitle(newPres.title);
    setSlides(newPres.slides);
    setCurrentSlideIndex(0);
    setShowNewPresModal(false);
    setNewPresTitle('');
  };

  const handleDeletePresentation = (id: string) => {
    const updated = presentations.filter(p => p.id !== id);
    setPresentations(updated);
    localStorage.setItem('memu_slides', JSON.stringify(updated));
    if (activePresId === id && updated.length > 0) {
      setActivePresId(updated[0].id);
      setPresTitle(updated[0].title);
      setSlides(updated[0].slides);
      setCurrentSlideIndex(0);
    } else if (updated.length === 0) {
      setActivePresId(null);
      setPresTitle('Untitled Presentation');
      setSlides([]);
    }
  };

  const handleSelectPresentation = (pres: Presentation) => {
    setActivePresId(pres.id);
    setPresTitle(pres.title);
    setSlides(pres.slides);
    setCurrentSlideIndex(0);
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: slides.length + 1,
      title: `Slide ${slides.length + 1}`,
      content: '## New Slide\n\nAdd your content here',
      notes: 'Add speaker notes here',
      layout: 'content',
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length === 1) {
      alert('You must have at least one slide');
      return;
    }
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  const handleSlideContentChange = (content: string) => {
    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      content: content,
    };
    setSlides(updatedSlides);
    setEditingSlideContent(content);
  };

  const handleSlideNotesChange = (notes: string) => {
    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      notes: notes,
    };
    setSlides(updatedSlides);
    setEditingSlideNotes(notes);
  };

  const handleFormat = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value || '');
      const content = editorRef.current.innerHTML;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      handleSlideContentChange(tempDiv.innerText);
    }
  };

  const handleInsert = (type: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      switch (type) {
        case 'link':
          const url = prompt('Enter URL:');
          if (url) document.execCommand('createLink', false, url);
          break;
        case 'image':
          const imgUrl = prompt('Enter image URL:');
          if (imgUrl) document.execCommand('insertImage', false, imgUrl);
          break;
      }
      const content = editorRef.current.innerHTML;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      handleSlideContentChange(tempDiv.innerText);
    }
  };

  const currentSlide = slides[currentSlideIndex];

  // Present Mode Component
  if (isPresentMode) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={() => setIsPresentMode(false)}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
          >
            Exit
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-4xl w-full">
            <div 
              className="prose prose-invert prose-lg max-w-none bg-white/5 rounded-2xl p-12"
              dangerouslySetInnerHTML={{ __html: renderSlideContent(currentSlide?.content || '') }}
            />
            {currentSlide?.notes && (
              <div className="mt-8 p-4 bg-white/5 rounded-lg">
                <p className="text-white/60 text-sm italic">Notes: {currentSlide.notes}</p>
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
          <button
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-30"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-white/60 text-sm flex items-center">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <button
            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-30"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  }

  const activePres = presentations.find(p => p.id === activePresId);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#fafaf8]' : 'flex h-full'} bg-[#fafaf8] transition-all duration-300`}>
      {/* Sidebar */}
      <div className="w-64 border-r border-[#e8e7e3] bg-white flex flex-col">
        <div className="px-4 pt-6 pb-2">
          <h1 className="h2">memu Slides</h1>
          <p className="body-small mt-1">Create beautiful presentations</p>
        </div>
        <div className="p-4 border-t border-[#e8e7e3]">
          <button
            onClick={() => setShowNewPresModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-[#059669] to-[#10b981] text-white rounded-lg text-[13px] font-medium hover:from-[#047857] hover:to-[#059669] transition"
          >
            <Plus size={14} />
            New Presentation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {presentations.length === 0 ? (
            <div className="p-6 text-center">
              <Layout size={32} className="text-[#aaa] mx-auto mb-3" />
              <p className="body-small">No presentations yet</p>
              <button
                onClick={() => setShowNewPresModal(true)}
                className="mt-2 text-[11px] text-[#059669] hover:underline"
              >
                Create one →
              </button>
            </div>
          ) : (
            presentations.map((pres) => (
              <div
                key={pres.id}
                onClick={() => handleSelectPresentation(pres)}
                className={`group p-3 border-b border-[#f2f1ee] cursor-pointer transition ${
                  activePresId === pres.id ? 'bg-[#d1fae5]' : 'hover:bg-[#f2f1ee]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Layout size={14} className="text-[#059669] flex-shrink-0" />
                    <span className="text-[13px] font-medium text-[#0f0f0f] truncate">
                      {pres.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePresentation(pres.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition flex-shrink-0"
                  >
                    <Trash2 size={12} className="text-[#777] hover:text-[#dc2626]" />
                  </button>
                </div>
                <div className="text-[10px] text-[#777] mt-1">
                  {pres.slides.length} slides • {pres.lastEdited}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {activePres ? (
          <>
            {/* Toolbar */}
            <div className="border-b border-[#e8e7e3] bg-white/80 backdrop-blur-sm p-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                    isPreviewMode ? 'bg-[#059669] text-white' : 'text-[#777] hover:bg-[#f2f1ee]'
                  }`}
                >
                  {isPreviewMode ? 'Edit' : 'Preview'}
                </button>
                
                <button
                  onClick={() => setIsPresentMode(true)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#059669] text-white hover:bg-[#047857] transition flex items-center gap-1"
                >
                  <Play size={12} />
                  Present
                </button>
                
                {!isPreviewMode && (
                  <SlidesToolDrawer 
                    onFormat={handleFormat}
                    onInsert={handleInsert}
                    onChangeLayout={(layout) => {
                      const updatedSlides = [...slides];
                      updatedSlides[currentSlideIndex] = {
                        ...updatedSlides[currentSlideIndex],
                        layout: layout,
                      };
                      setSlides(updatedSlides);
                    }}
                    currentLayout={currentSlide?.layout}
                  />
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {isSaving && (
                  <div className="text-[10px] text-[#059669] animate-pulse">Saving...</div>
                )}
                
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#059669]"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="px-6 pt-4">
              <input
                type="text"
                value={presTitle}
                onChange={(e) => setPresTitle(e.target.value)}
                className="text-xl md:text-2xl font-medium text-[#0f0f0f] bg-transparent border-b-2 border-transparent hover:border-[#e8e7e3] focus:border-[#059669] outline-none px-2 py-1 w-full max-w-md transition"
                placeholder="Untitled Presentation"
              />
            </div>

            {/* Slide Thumbnails */}
            <div className="px-6 pt-4 pb-2 border-b border-[#e8e7e3]">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {slides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`flex-shrink-0 w-32 p-2 rounded-lg text-left transition ${
                      currentSlideIndex === idx
                        ? 'bg-[#d1fae5] border border-[#059669]'
                        : 'bg-white border border-[#e8e7e3] hover:border-[#d0cfc9]'
                    }`}
                  >
                    <div className="text-[11px] font-medium text-[#777] mb-1">
                      Slide {idx + 1}
                    </div>
                    <div className="text-[10px] text-[#0f0f0f] truncate">
                      {slide.title}
                    </div>
                  </button>
                ))}
                <button
                  onClick={handleAddSlide}
                  className="flex-shrink-0 w-32 p-2 rounded-lg border border-dashed border-[#e8e7e3] text-[#777] hover:border-[#059669] hover:text-[#059669] transition flex flex-col items-center justify-center"
                >
                  <Plus size={16} />
                  <span className="text-[10px] mt-1">Add Slide</span>
                </button>
              </div>
            </div>

            {/* Current Slide Editor */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                {/* Slide Preview/Editor */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8e7e3] overflow-hidden">
                  <div className="border-b border-[#e8e7e3] p-3 bg-[#fafaf8] flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#777]">
                      Slide {currentSlideIndex + 1}
                    </span>
                    <button
                      onClick={() => handleDeleteSlide(currentSlideIndex)}
                      className="text-[11px] text-[#dc2626] hover:underline"
                    >
                      Delete Slide
                    </button>
                  </div>
                  
                  <div className="p-6 min-h-[300px]">
                    {isPreviewMode ? (
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderSlideContent(currentSlide?.content || '') }}
                      />
                    ) : (
                      <div
                        ref={editorRef}
                        contentEditable
                        onInput={(e) => handleSlideContentChange(e.currentTarget.innerText)}
                        className="w-full outline-none min-h-[250px] prose prose-sm focus:ring-1 focus:ring-[#059669] p-4 rounded-lg"
                        dangerouslySetInnerHTML={{ __html: currentSlide?.content.replace(/\n/g, '<br/>') || '' }}
                      />
                    )}
                  </div>
                </div>

                {/* Speaker Notes */}
                <div className="mt-4 bg-white rounded-xl shadow-sm border border-[#e8e7e3] overflow-hidden">
                  <div className="border-b border-[#e8e7e3] p-3 bg-[#fafaf8]">
                    <span className="text-[12px] font-medium text-[#777]">Speaker Notes</span>
                  </div>
                  <textarea
                    value={editingSlideNotes}
                    onChange={(e) => handleSlideNotesChange(e.target.value)}
                    placeholder="Add your speaker notes here..."
                    className="w-full p-4 outline-none resize-none text-[13px] leading-relaxed min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Layout size={48} className="text-[#aaa] mx-auto mb-4" />
              <h3 className="h3 mb-2">No presentation selected</h3>
              <p className="body mb-4">Create a new presentation to get started</p>
              <button
                onClick={() => setShowNewPresModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10b981] text-white rounded-lg text-[13px] font-medium hover:from-[#047857] hover:to-[#059669] transition"
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
              className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#059669] mb-4"
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
        .prose {
          font-family: 'DM Sans', sans-serif;
        }
        .prose h1 {
          font-size: 2em;
          font-weight: 700;
          margin-bottom: 0.5em;
        }
        .prose h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin-bottom: 0.4em;
        }
        .prose h3 {
          font-size: 1.25em;
          font-weight: 500;
          margin-bottom: 0.3em;
        }
        .prose p {
          margin-bottom: 0.75em;
          line-height: 1.6;
        }
        .prose ul, .prose ol {
          margin-left: 1.5em;
          margin-bottom: 0.75em;
        }
        .prose li {
          margin-bottom: 0.25em;
        }
      `}</style>
    </div>
  );
}