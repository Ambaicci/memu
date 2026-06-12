'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, File, Download, Trash2, Share2, Search, Filter, ChevronDown, Image, FileText, HelpCircle, Cloud, X, Check, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface AirSharePanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  owner_id: string;
}

const filterOptions = [
  { id: 'all', label: 'All', icon: <Cloud size={12} /> },
  { id: 'image', label: 'Images', icon: <Image size={12} /> },
  { id: 'document', label: 'Docs', icon: <FileText size={12} /> },
  { id: 'other', label: 'Other', icon: <HelpCircle size={12} /> },
];

export default function AirSharePanel({ isGuest, requireAuth }: AirSharePanelProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const loadFiles = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('airshare_files')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const uploadFiles = async (fileList: FileList) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Please sign in', 'error');
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(fileList)) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `airshare/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('airshare')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('airshare').getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('airshare_files')
          .insert({
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl,
            owner_id: user.id,
          });
        if (dbError) throw dbError;
        successCount++;
      } catch (err) {
        console.error('Upload failed:', file.name);
      }
    }

    if (successCount > 0) {
      showToast(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`, 'success');
      await loadFiles();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    if (isGuest && requireAuth) {
      requireAuth('upload', () => uploadFiles(e.target.files!));
    } else {
      uploadFiles(e.target.files!);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length) {
      if (isGuest && requireAuth) {
        requireAuth('upload', () => uploadFiles(files));
      } else {
        uploadFiles(files);
      }
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    const supabase = createClient();
    const urlParts = file.url.split('/');
    const filePath = urlParts.slice(urlParts.indexOf('airshare')).join('/');
    await supabase.storage.from('airshare').remove([filePath]);
    await supabase.from('airshare_files').delete().eq('id', file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
    showToast(`${file.name} deleted`, 'success');
  };

  const copyLink = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Link copied', 'success');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={20} className="text-[#4f46e5]" />;
    if (type.includes('pdf')) return <FileText size={20} className="text-[#dc2626]" />;
    return <File size={20} className="text-[#777]" />;
  };

  const filteredFiles = files.filter(file => {
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'image' && !file.type.startsWith('image/')) return false;
    if (filter === 'document' && !(file.type.includes('pdf') || file.type.includes('word') || file.type.includes('text'))) return false;
    if (filter === 'other' && (file.type.startsWith('image/') || file.type.includes('pdf') || file.type.includes('word'))) return false;
    return true;
  });

  const stats = {
    total: files.length,
    images: files.filter(f => f.type.startsWith('image/')).length,
    docs: files.filter(f => f.type.includes('pdf') || f.type.includes('word') || f.type.includes('text')).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fafaf8]">
      {/* Header with elegant stats */}
      <div className="px-6 md:px-10 pt-8 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="heading-gradient font-['Playfair_Display'] text-3xl md:text-4xl font-medium tracking-tight">AirShare</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-[#777]">
              <span>{stats.total} items</span>
              {stats.images > 0 && <span>· {stats.images} images</span>}
              {stats.docs > 0 && <span>· {stats.docs} documents</span>}
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-full text-sm font-medium hover:from-[#5b21b6] hover:to-[#06b6d4] transition shadow-sm disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="px-6 md:px-10 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#e8e7e3] rounded-full text-sm outline-none focus:border-[#4f46e5] transition"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e8e7e3] rounded-full text-sm text-[#777] hover:border-[#4f46e5] transition"
          >
            <Filter size={12} />
            {filterOptions.find(f => f.id === filter)?.label || 'All'}
            <ChevronDown size={10} />
          </button>
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-[#e8e7e3] overflow-hidden z-20">
              {filterOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setFilter(opt.id); setIsFilterOpen(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition ${
                    filter === opt.id ? 'bg-[#ede9fe] text-[#4f46e5]' : 'text-[#777] hover:bg-[#fafaf8]'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drop zone + file grid */}
      <div
        className="flex-1 overflow-y-auto px-6 md:px-10 pb-10"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {files.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 text-center rounded-2xl transition-all ${isDragging ? 'bg-[#ede9fe]/30 border-2 border-dashed border-[#4f46e5]' : ''}`}>
            <div className="w-20 h-20 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Cloud size={32} className="text-[#aaa]" />
            </div>
            <h3 className="text-[17px] font-medium text-[#1a1a1a] mb-1">Drop files here</h3>
            <p className="text-[13px] text-[#777] max-w-sm mb-6">
              or click the Upload button above.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-full text-sm font-medium hover:from-[#5b21b6] hover:to-[#06b6d4] transition"
            >
              <Upload size={14} />
              Choose files
            </button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={28} className="text-[#aaa] mb-3" />
            <h3 className="text-[15px] font-medium text-[#1a1a1a]">No matching files</h3>
            <p className="text-[13px] text-[#777]">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="group bg-white rounded-xl border border-[#e8e7e3] p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f2f1ee] flex items-center justify-center">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => copyLink(file.url, file.id)}
                      className="p-1.5 rounded-lg hover:bg-[#f2f1ee] text-[#777] hover:text-[#4f46e5] transition"
                      title="Copy link"
                    >
                      {copiedId === file.id ? <Check size={14} className="text-[#059669]" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1.5 rounded-lg hover:bg-[#fee2e2] text-[#777] hover:text-[#dc2626] transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                    <a
                      href={file.url}
                      download
                      className="p-1.5 rounded-lg hover:bg-[#f2f1ee] text-[#777] hover:text-[#4f46e5] transition"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>
                <div className="mb-2">
                  <p className="font-medium text-[#1a1a1a] text-sm truncate">{file.name}</p>
                  <p className="text-[10px] text-[#777] mt-0.5">{formatSize(file.size)} · {formatDate(file.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating action button for quick upload (mobile only) */}
      {files.length > 0 && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white shadow-lg flex items-center justify-center hover:scale-105 transition active:scale-95 md:hidden"
        >
          <Upload size={20} />
        </button>
      )}
    </div>
  );
}