'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, File, Download, Trash2, Search, Filter, ChevronDown, Image, FileText, HelpCircle, Cloud, Check, Copy } from 'lucide-react';
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
  { id: 'all', label: 'All', icon: <Cloud size={14} strokeWidth={2.5} /> },
  { id: 'image', label: 'Images', icon: <Image size={14} strokeWidth={2.5} /> },
  { id: 'document', label: 'Docs', icon: <FileText size={14} strokeWidth={2.5} /> },
  { id: 'other', label: 'Other', icon: <HelpCircle size={14} strokeWidth={2.5} /> },
];

const getFileBorderClass = (type: string) => {
  if (type.startsWith('image/')) return 'border-blue-200/60';
  if (type.includes('pdf')) return 'border-rose-200/60';
  if (type.includes('word') || type.includes('text')) return 'border-amber-200/60';
  return 'border-gray-200/60';
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image size={16} strokeWidth={2.5} className="text-blue-600" />;
  if (type.includes('pdf')) return <FileText size={16} strokeWidth={2.5} className="text-rose-600" />;
  if (type.includes('word') || type.includes('text')) return <FileText size={16} strokeWidth={2.5} className="text-amber-600" />;
  return <File size={16} strokeWidth={2.5} className="text-gray-400" />;
};

const getFileIconBg = (type: string) => {
  if (type.startsWith('image/')) return 'bg-blue-50 border-blue-100';
  if (type.includes('pdf')) return 'bg-rose-50 border-rose-100';
  if (type.includes('word') || type.includes('text')) return 'bg-amber-50 border-amber-100';
  return 'bg-gray-50 border-gray-100';
};

export default function AirSharePanel({ isGuest, requireAuth }: AirSharePanelProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const filterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['airshare-files', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('airshare_files')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const uploadFiles = async (fileList: FileList) => {
    if (!user) {
      showToast('Please sign in', 'error');
      return;
    }

    setUploading(true);
    let successCount = 0;
    const supabase = createClient();

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
      queryClient.invalidateQueries({ queryKey: ['airshare-files', user.id] });
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
    
    showToast(`${file.name} deleted`, 'success');
    queryClient.invalidateQueries({ queryKey: ['airshare-files', user?.id] });
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

  const filteredFiles = files.filter((file: FileItem) => {
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'image' && !file.type.startsWith('image/')) return false;
    if (filter === 'document' && !(file.type.includes('pdf') || file.type.includes('word') || file.type.includes('text'))) return false;
    if (filter === 'other' && (file.type.startsWith('image/') || file.type.includes('pdf') || file.type.includes('word'))) return false;
    return true;
  });

  const stats = {
    total: files.length,
    images: files.filter((f: FileItem) => f.type.startsWith('image/')).length,
    docs: files.filter((f: FileItem) => f.type.includes('pdf') || f.type.includes('word') || f.type.includes('text')).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-memu-canvas animate-page-enter">
      {/* Header Section */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Cloud size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Storage</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">AirShare</h1>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-sm text-gray-500 font-medium">{stats.total} items</span>
              {stats.images > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500 font-medium">{stats.images} images</span>
                </>
              )}
              {stats.docs > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500 font-medium">{stats.docs} documents</span>
                </>
              )}
            </div>
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-sm font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg disabled:opacity-50 btn-press"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={16} strokeWidth={2.5} />
            )}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-3 px-5 py-4 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 transition-all shadow-sm btn-press"
            >
              <Filter size={15} />
              <span>{filterOptions.find(f => f.id === filter)?.label || 'All'}</span>
              <ChevronDown size={13} />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-20 animate-fadeIn">
                <div className="py-2">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setFilter(opt.id); setIsFilterOpen(false); }}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition ${
                        filter === opt.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
          <div className={`flex flex-col items-center justify-center py-24 text-center transition-all animate-fade-in-scale ${isDragging ? 'bg-indigo-50/30 border-2 border-dashed border-indigo-300 rounded-3xl' : ''}`}>
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl blur-2xl animate-pulse"></div>
              <div className="relative bg-white rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-gray-200">
                <Cloud size={48} className="text-indigo-500" strokeWidth={2} />
              </div>
            </div>
            <h3 className="font-serif text-xl font-semibold text-gray-900 mb-3">Drop files here</h3>
            <p className="text-gray-500 text-sm max-w-md mb-6">
              or click the Upload button above.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-sm font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg btn-press"
            >
              <Upload size={16} strokeWidth={2.5} />
              Choose files
            </button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-scale">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl blur-2xl animate-pulse"></div>
              <div className="relative bg-white rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-gray-200">
                <Search size={48} className="text-gray-400" strokeWidth={2} />
              </div>
            </div>
            <h3 className="font-serif text-xl font-semibold text-gray-900 mb-3">No matching files</h3>
            <p className="text-gray-500 text-sm max-w-md">
              Try a different search or filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file: FileItem, idx) => (
              <div
                key={file.id}
                className={`group relative bg-white rounded-2xl border-[1px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${getFileBorderClass(file.type)} p-4 animate-slide-up btn-press`}
                style={{ animationDelay: `${idx * 60}ms`, opacity: 0 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getFileIconBg(file.type)}`}>
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => copyLink(file.url, file.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all btn-press"
                      title="Copy link"
                    >
                      {copiedId === file.id ? <Check size={12} strokeWidth={2.5} className="text-emerald-600" /> : <Copy size={12} strokeWidth={2.5} />}
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-600 transition-all btn-press"
                      title="Delete"
                    >
                      <Trash2 size={12} strokeWidth={2.5} />
                    </button>
                    <a
                      href={file.url}
                      download
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all btn-press"
                      title="Download"
                    >
                      <Download size={12} strokeWidth={2.5} />
                    </a>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{file.name}</p>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">{formatSize(file.size)} · {formatDate(file.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}