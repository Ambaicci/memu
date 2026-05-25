'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  FileText, Trash2, Plus, Eye, EyeOff, Download, Copy, Check, 
  Maximize2, Minimize2
} from 'lucide-react';
import ToolDrawer from './ToolDrawer';

interface Document {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  charCount: number;
  lastEdited: string;
  createdAt: string;
}

// Simple markdown renderer
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
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load documents from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('memu_docs_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      setDocuments(parsed);
      if (parsed.length > 0 && !activeDocId) {
        setActiveDocId(parsed[0].id);
        setDocTitle(parsed[0].title);
        setDocContent(parsed[0].content);
        setWordCount(parsed[0].wordCount);
        setCharCount(parsed[0].charCount);
      }
    }
  }, []);

  // Update word/char count
  useEffect(() => {
    const words = docContent.trim() ? docContent.trim().split(/\s+/).length : 0;
    const chars = docContent.length;
    setWordCount(words);
    setCharCount(chars);
  }, [docContent]);

  // Auto-save
  const handleAutoSave = () => {
    if (!activeDocId) return;
    
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      const updated = documents.map(doc => 
        doc.id === activeDocId 
          ? { 
              ...doc, 
              title: docTitle, 
              content: docContent, 
              wordCount: wordCount,
              charCount: charCount,
              lastEdited: new Date().toLocaleDateString() 
            }
          : doc
      );
      setDocuments(updated);
      localStorage.setItem('memu_docs_v2', JSON.stringify(updated));
      setIsSaving(false);
      setTimeout(() => setIsSaving(false), 1000);
    }, 1000);
  };

  useEffect(() => {
    if (activeDocId) {
      handleAutoSave();
    }
  }, [docContent, docTitle, activeDocId]);

  const handleNewDoc = () => {
    if (!newDocTitle.trim()) return;
    
    const newDoc: Document = {
      id: Date.now().toString(),
      title: newDocTitle,
      content: '# ' + newDocTitle + '\n\nStart writing here...',
      wordCount: 0,
      charCount: 0,
      lastEdited: 'Just now',
      createdAt: new Date().toLocaleDateString(),
    };
    
    setDocuments([...documents, newDoc]);
    setActiveDocId(newDoc.id);
    setDocTitle(newDoc.title);
    setDocContent(newDoc.content);
    setShowNewDocModal(false);
    setNewDocTitle('');
  };

  const handleDeleteDoc = (id: string) => {
    const updated = documents.filter(doc => doc.id !== id);
    setDocuments(updated);
    localStorage.setItem('memu_docs_v2', JSON.stringify(updated));
    if (activeDocId === id && updated.length > 0) {
      setActiveDocId(updated[0].id);
      setDocTitle(updated[0].title);
      setDocContent(updated[0].content);
    } else if (updated.length === 0) {
      setActiveDocId(null);
      setDocTitle('Untitled');
      setDocContent('');
    }
  };

  const handleSelectDoc = (doc: Document) => {
    setActiveDocId(doc.id);
    setDocTitle(doc.title);
    setDocContent(doc.content);
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
    const btn = document.getElementById('copy-btn');
    if (btn) {
      btn.innerHTML = '<span class="text-[#10b981]">✓</span>';
      setTimeout(() => {
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
      }, 1500);
    }
  };

  const handleFormat = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value || '');
      const content = editorRef.current.innerHTML;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      setDocContent(tempDiv.innerText);
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
      const content = editorRef.current.innerHTML;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      setDocContent(tempDiv.innerText);
    }
  };

  const activeDoc = documents.find(d => d.id === activeDocId);

  // Shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleAutoSave();
        }
        if (e.key === 'p') {
          e.preventDefault();
          window.print();
        }
        if (e.key === 'f') {
          e.preventDefault();
          setIsFocusMode(!isFocusMode);
        }
        if (e.key === 'b') {
          e.preventDefault();
          handleFormat('bold');
        }
        if (e.key === 'i') {
          e.preventDefault();
          handleFormat('italic');
        }
        if (e.key === 'u') {
          e.preventDefault();
          handleFormat('underline');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#fafaf8]' : 'flex h-full'} bg-[#fafaf8] transition-all duration-300 ${isFocusMode ? 'focus-mode' : ''}`}>
      {/* Sidebar */}
      <div className="w-64 border-r border-[#e8e7e3] bg-white flex flex-col">
        <div className="px-4 pt-6 pb-2">
          <h1 className="h2">memu Docs</h1>
          <p className="body-small mt-1">Write, edit, and format documents</p>
        </div>
        <div className="p-4 border-t border-[#e8e7e3]">
          <button
            onClick={() => setShowNewDocModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-lg text-[13px] font-medium hover:from-[#5b21b6] hover:to-[#6d28d9] transition"
          >
            <Plus size={14} />
            New Document
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {documents.length === 0 ? (
            <div className="p-6 text-center">
              <FileText size={32} className="text-[#aaa] mx-auto mb-3" />
              <p className="body-small">No documents yet</p>
              <button
                onClick={() => setShowNewDocModal(true)}
                className="mt-2 text-[11px] text-[#4f46e5] hover:underline"
              >
                Create one →
              </button>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className={`group p-3 border-b border-[#f2f1ee] cursor-pointer transition ${
                  activeDocId === doc.id ? 'bg-[#ede9fe]' : 'hover:bg-[#f2f1ee]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText size={14} className="text-[#4f46e5] flex-shrink-0" />
                    <span className="text-[13px] font-medium text-[#0f0f0f] truncate">
                      {doc.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDoc(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition flex-shrink-0"
                  >
                    <Trash2 size={12} className="text-[#777] hover:text-[#dc2626]" />
                  </button>
                </div>
                <div className="text-[10px] text-[#777] mt-1">
                  {doc.wordCount} words • {doc.lastEdited}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {activeDoc ? (
          <>
            {/* Toolbar */}
            <div className="border-b border-[#e8e7e3] bg-white/80 backdrop-blur-sm p-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {!isFocusMode && !isFullscreen && (
                  <button
                    onClick={() => setIsFocusMode(true)}
                    className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]"
                    title="Focus Mode (Ctrl+F)"
                  >
                    <Eye size={16} />
                  </button>
                )}
                {isFocusMode && (
                  <button
                    onClick={() => setIsFocusMode(false)}
                    className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#4f46e5]"
                    title="Exit Focus Mode"
                  >
                    <EyeOff size={16} />
                  </button>
                )}
                <div className="w-px h-5 bg-[#e8e7e3]" />
                
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                    isPreviewMode ? 'bg-[#4f46e5] text-white' : 'text-[#777] hover:bg-[#f2f1ee]'
                  }`}
                >
                  {isPreviewMode ? 'Write' : 'Preview'}
                </button>
                
                {!isPreviewMode && <ToolDrawer onFormat={handleFormat} onInsert={handleInsert} />}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-[11px] text-[#aaa] hidden sm:block">
                  {wordCount} words • {charCount} chars
                </div>
                {isSaving && (
                  <div className="text-[10px] text-[#059669] animate-pulse">Saving...</div>
                )}
                <div className="w-px h-5 bg-[#e8e7e3]" />
                <button
                  id="copy-btn"
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]"
                  title="Copy"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]"
                  title="Export as Markdown"
                >
                  <Download size={14} />
                </button>
                
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#4f46e5]"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="px-6 pt-6">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="text-2xl md:text-3xl font-medium text-[#0f0f0f] bg-transparent border-b-2 border-transparent hover:border-[#e8e7e3] focus:border-[#4f46e5] outline-none px-2 py-1 w-full transition"
                placeholder="Untitled"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {isPreviewMode ? (
                <div 
                  className="prose prose-sm max-w-3xl mx-auto bg-white rounded-xl p-8 shadow-sm min-h-[500px]"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(docContent) }}
                />
              ) : (
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={(e) => setDocContent(e.currentTarget.innerText)}
                  className="w-full max-w-3xl mx-auto bg-white rounded-xl p-8 shadow-sm outline-none min-h-[500px] prose prose-sm focus:ring-1 focus:ring-[#4f46e5]"
                  dangerouslySetInnerHTML={{ __html: docContent.replace(/\n/g, '<br/>') }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} className="text-[#aaa] mx-auto mb-4" />
              <h3 className="h3 mb-2">No document selected</h3>
              <p className="body mb-4">Create a new document to start writing</p>
              <button
                onClick={() => setShowNewDocModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-lg text-[13px] font-medium hover:from-[#5b21b6] hover:to-[#6d28d9] transition"
              >
                Create New Document
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Document Modal */}
      {showNewDocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewDocModal(false)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">New Document</h3>
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Document title"
              className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5] mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNewDoc()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewDocModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleNewDoc}
                disabled={!newDocTitle.trim()}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white hover:from-[#5b21b6] hover:to-[#6d28d9] transition disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .focus-mode .w-64 {
          display: none;
        }
        .prose {
          font-family: 'DM Sans', sans-serif;
        }
        .prose h1 {
          font-size: 2em;
          font-weight: 700;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .prose h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 0.8em;
          margin-bottom: 0.4em;
        }
        .prose h3 {
          font-size: 1.25em;
          font-weight: 500;
          margin-top: 0.6em;
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
        .prose blockquote {
          border-left: 3px solid #4f46e5;
          padding-left: 1em;
          margin: 1em 0;
          color: #666;
          font-style: italic;
        }
        .prose code {
          background: #f2f1ee;
          padding: 0.2em 0.4em;
          border-radius: 6px;
          font-size: 0.85em;
          color: #dc2626;
        }
      `}</style>
    </div>
  );
}