'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  FileText, Trash2, Plus, Eye, EyeOff, Download, Copy, 
  Maximize2, Minimize2, Loader2, Cloud, Search, Filter, ChevronDown
} from 'lucide-react';
import DocsToolbox from './DocsToolbox';

interface Document {
  id: string;
  title: string;
  content: string;
  word_count: number;
  char_count: number;
  last_edited: string;
  created_at: string;
  updated_at: string;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code class="bg-[#f2f1ee] px-1.5 py-0.5 rounded text-[#dc2626] text-sm">$1</code>')
    .replace(/\n\-\s(.*)/gim, '<li class="ml-4 mb-1">• $1</li>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-[#4f46e5] pl-4 my-3 text-[#777] italic">$1</blockquote>')
    .replace(/\n/gim, '<br />');
}

const filterOptions = [
  { id: 'all', label: 'All documents', icon: <FileText size={12} /> },
  { id: 'recent', label: 'Recently edited', icon: <Cloud size={12} /> },
];

export default function DocsPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('Untitled');
  const [docContent, setDocContent] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchDocuments(user.id);
      } else {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  const fetchDocuments = async (userId: string) => {
    setLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('docs')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching docs:', error);
      showToast('Failed to load documents', 'error');
    } else if (data) {
      setDocuments(data);
      if (data.length > 0 && !activeDocId) {
        setActiveDocId(data[0].id);
        setDocTitle(data[0].title);
        setDocContent(data[0].content);
        setWordCount(data[0].word_count);
        setCharCount(data[0].char_count);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (editorRef.current && !isPreviewMode && activeDocId) {
      editorRef.current.innerHTML = docContent.replace(/\n/g, '<br/>');
    }
  }, [activeDocId, isPreviewMode]);

  useEffect(() => {
    const words = docContent.trim() ? docContent.trim().split(/\s+/).length : 0;
    const chars = docContent.length;
    setWordCount(words);
    setCharCount(chars);
  }, [docContent]);

  const handleAutoSave = useCallback(async () => {
    if (!activeDocId || !currentUserId) return;
    
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('docs')
        .update({
          title: docTitle,
          content: docContent,
          word_count: wordCount,
          char_count: charCount,
          last_edited: 'Just now',
        })
        .eq('id', activeDocId)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Save error:', error);
        showToast('Failed to save document', 'error');
      } else {
        setDocuments(docs => docs.map(d => 
          d.id === activeDocId 
            ? { ...d, title: docTitle, content: docContent, word_count: wordCount, char_count: charCount, last_edited: 'Just now' }
            : d
        ));
      }
      setIsSaving(false);
    }, 1000);
  }, [activeDocId, docContent, docTitle, wordCount, charCount, currentUserId, showToast]);

  useEffect(() => {
    if (activeDocId && docContent !== undefined) {
      handleAutoSave();
    }
  }, [docContent, docTitle, activeDocId, handleAutoSave]);

  const handleNewDoc = async () => {
    if (!newDocTitle.trim() || !currentUserId) return;
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('docs')
      .insert({
        user_id: currentUserId,
        title: newDocTitle.trim(),
        content: '',
        word_count: 0,
        char_count: 0,
        last_edited: 'Just now',
      })
      .select()
      .single();
    
    if (error) {
      console.error('Create error:', error);
      showToast('Failed to create document', 'error');
      return;
    }

    if (data) {
      setDocuments(prev => [data, ...prev]);
      setActiveDocId(data.id);
      setDocTitle(data.title);
      setDocContent(data.content);
      setWordCount(0);
      setCharCount(0);
    }
    
    setShowNewDocModal(false);
    setNewDocTitle('');
    showToast('Document created', 'success');
  };

  const handleDeleteDoc = async (id: string) => {
    if (!currentUserId) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from('docs')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUserId);
    
    if (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete document', 'error');
      return;
    }

    const updated = documents.filter(doc => doc.id !== id);
    setDocuments(updated);
    
    if (activeDocId === id && updated.length > 0) {
      setActiveDocId(updated[0].id);
      setDocTitle(updated[0].title);
      setDocContent(updated[0].content);
      setWordCount(updated[0].word_count);
      setCharCount(updated[0].char_count);
    } else if (updated.length === 0) {
      setActiveDocId(null);
      setDocTitle('Untitled');
      setDocContent('');
    }
    
    showToast('Document deleted', 'success');
  };

  const handleSelectDoc = (doc: Document) => {
    setActiveDocId(doc.id);
    setDocTitle(doc.title);
    setDocContent(doc.content);
    setWordCount(doc.word_count);
    setCharCount(doc.char_count);
  };

  const handleExport = (format: 'md' | 'html') => {
    const blob = format === 'md' 
      ? new Blob([docContent], { type: 'text/markdown' })
      : new Blob([renderMarkdown(docContent)], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle}.${format === 'md' ? 'md' : 'html'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(docContent);
    showToast('Copied to clipboard', 'success');
  };

  const handleFormat = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value || '');
      if (editorRef.current) {
        setDocContent(editorRef.current.innerText);
      }
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
        case 'code':
          document.execCommand('formatBlock', false, '<pre>');
          break;
        case 'quote':
          document.execCommand('formatBlock', false, '<blockquote>');
          break;
      }
      if (editorRef.current) {
        setDocContent(editorRef.current.innerText);
      }
    }
  };

  const filteredDocs = documents.filter(doc => {
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(doc.updated_at) > sevenDaysAgo;
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const currentFilterLabel = filter === 'all' ? 'All documents' : 'Recently edited';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'flex h-full'} bg-[#fafaf8] transition-all duration-300 ${isFocusMode ? 'focus-mode' : ''}`}>
      {/* Sidebar */}
      <div className="w-64 border-r border-[#e8e7e3] bg-white flex flex-col shadow-sm">
        <div className="px-4 pt-6 pb-4 border-b border-[#f2f1ee]">
          <h1 className="heading-gradient font-['Playfair_Display'] text-xl font-medium tracking-tight">memu Docs</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f2f1ee] text-[11px] text-[#777]">
              <FileText size={10} /> {documents.length} total
            </span>
          </div>
        </div>
        
        <div className="p-3">
          <button
            onClick={() => setShowNewDocModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 btn-primary text-white rounded-lg text-[13px] font-medium"
          >
            <Plus size={14} />
            New Document
          </button>
        </div>

        {/* Search & Filter inside sidebar */}
        <div className="px-3 pb-2 space-y-2">
          <div className="flex items-center gap-2 bg-[#f2f1ee] rounded-lg px-3 py-1.5">
            <Search size={12} className="text-[#777]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs..."
              className="flex-1 text-[12px] outline-none bg-transparent"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full flex items-center justify-between gap-2 bg-white border border-[#e8e7e3] rounded-lg px-3 py-1.5 text-[12px] text-[#777] hover:border-[#4f46e5] transition"
            >
              <span className="flex items-center gap-1"><Filter size={10} /> {currentFilterLabel}</span>
              <ChevronDown size={10} />
            </button>
            {isFilterOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-[#e8e7e3] z-20">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setFilter(opt.id as any); setIsFilterOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] transition ${filter === opt.id ? 'bg-[#ede9fe] text-[#4f46e5]' : 'text-[#777] hover:bg-[#fafaf8]'}`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filteredDocs.length === 0 ? (
            <div className="p-6 text-center">
              <FileText size={32} className="text-[#aaa] mx-auto mb-3" />
              <p className="text-[12px] text-[#777] mb-2">No documents found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc)}
                  className={`group p-3 rounded-lg cursor-pointer transition-all ${
                    activeDocId === doc.id 
                      ? 'bg-[#ede9fe] ring-1 ring-[#4f46e5]/40' 
                      : 'hover:bg-[#f9fafb]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={13} className="text-[#4f46e5] flex-shrink-0" />
                      <span className="text-[13px] font-medium text-[#0f0f0f] truncate">{doc.title}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition"
                    >
                      <Trash2 size={11} className="text-[#777] hover:text-[#dc2626]" />
                    </button>
                  </div>
                  <div className="text-[10px] text-[#777] pl-6">{doc.word_count} words • {formatDate(doc.updated_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col bg-[#f9fafb]">
        {activeDocId ? (
          <>
            <div className="border-b border-[#e8e7e3] bg-white shadow-sm px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {!isFocusMode && !isFullscreen && (
                  <button onClick={() => setIsFocusMode(true)} className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]" title="Focus Mode"><Eye size={16} /></button>
                )}
                {isFocusMode && (
                  <button onClick={() => setIsFocusMode(false)} className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#4f46e5]" title="Exit Focus Mode"><EyeOff size={16} /></button>
                )}
                <div className="w-px h-5 bg-[#e8e7e3]" />
                <button onClick={() => setIsPreviewMode(!isPreviewMode)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${isPreviewMode ? 'btn-primary' : 'text-[#777] hover:bg-[#f2f1ee]'}`}>
                  {isPreviewMode ? 'Write' : 'Preview'}
                </button>
                {!isPreviewMode && <DocsToolbox onFormat={handleFormat} onInsert={handleInsert} wordCount={wordCount} charCount={charCount} />}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-[11px] text-[#777] hidden sm:block bg-[#f2f1ee] px-2 py-1 rounded">{wordCount} words • {charCount} chars</div>
                {isSaving && <div className="text-[10px] text-[#059669] animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Saving...</div>}
                <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]" title="Copy"><Copy size={14} /></button>
                <button onClick={() => handleExport('md')} className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]" title="Export as Markdown"><Download size={14} /></button>
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#4f46e5]">{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto px-6 md:px-12 py-8">
                <div className="mb-6 pb-4 border-b border-[#e8e7e3]">
                  <input type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="text-3xl md:text-4xl font-semibold text-[#0f0f0f] bg-transparent outline-none w-full placeholder:text-[#aaa]" placeholder="Untitled" />
                </div>
                {isPreviewMode ? (
                  <div className="prose prose-sm max-w-none bg-white rounded-xl p-8 shadow-sm min-h-[600px] border border-[#e8e7e3]" dangerouslySetInnerHTML={{ __html: renderMarkdown(docContent) }} />
                ) : (
                  <div ref={editorRef} contentEditable onInput={(e) => setDocContent(e.currentTarget.innerText)} className="w-full bg-white rounded-xl p-8 shadow-sm outline-none min-h-[600px] prose prose-sm border border-[#e8e7e3] focus:border-[#4f46e5] transition-colors" dir="ltr" suppressContentEditableWarning />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-[#ede9fe] flex items-center justify-center mx-auto mb-4"><FileText size={36} className="text-[#4f46e5]" /></div>
              <h3 className="text-[20px] font-semibold text-[#0f0f0f] mb-2">No document selected</h3>
              <p className="text-[13px] text-[#777] mb-6">Create a new document to start writing</p>
              <button onClick={() => setShowNewDocModal(true)} className="btn-primary">Create New Document</button>
            </div>
          </div>
        )}
      </div>

      {showNewDocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewDocModal(false)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">New Document</h3>
            <input type="text" value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} placeholder="Document title" className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5] mb-4 transition" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleNewDoc()} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowNewDocModal(false)} className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition">Cancel</button>
              <button onClick={handleNewDoc} disabled={!newDocTitle.trim()} className="btn-primary disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .focus-mode .w-64 { display: none; }
        .prose { font-family: 'DM Sans', sans-serif; line-height: 1.7; }
        .prose h1 { font-size: 2em; font-weight: 700; margin-top: 1em; margin-bottom: 0.5em; }
        .prose h2 { font-size: 1.5em; font-weight: 600; margin-top: 0.8em; margin-bottom: 0.4em; }
        .prose h3 { font-size: 1.25em; font-weight: 500; margin-top: 0.6em; margin-bottom: 0.3em; }
        .prose p { margin-bottom: 0.75em; }
        .prose ul, .prose ol { margin-left: 1.5em; margin-bottom: 0.75em; }
        .prose li { margin-bottom: 0.25em; }
        .prose blockquote { border-left: 3px solid #4f46e5; padding-left: 1em; margin: 1em 0; color: #666; font-style: italic; }
        .prose code { background: #f2f1ee; padding: 0.2em 0.4em; border-radius: 6px; font-size: 0.85em; color: #dc2626; }
        [contenteditable]:empty:before { content: 'Start writing...'; color: #aaa; font-style: italic; }
      `}</style>
    </div>
  );
}