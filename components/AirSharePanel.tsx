'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, Upload, FileText, Presentation, Image, Video, 
  Link, Copy, Eye, Clock, Share2, Download, Trash2,
  Settings, Users, Globe, Lock, CheckCircle, AlertCircle,
  TrendingUp, Activity, Send, Mail, QrCode, X, File,
  FolderOpen, RefreshCw, BarChart3, Sparkles, Music,
  Archive, Code, Palette, Box, Hash, Inbox, Search
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  type: 'document' | 'presentation' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'font' | '3d';
  category: string;
  size: string;
  sizeBytes: number;
  sharedOn: string;
  views: number;
  downloads: number;
  access: 'public' | 'private' | 'team';
  lastViewed?: string;
  fileData?: string;
  shareLink: string;
  tags?: string[];
  folder?: string;
  fileDataStored: boolean;
}

const fileCategories = {
  document: { icon: <FileText size={18} />, color: '#4f46e5', bg: '#ede9fe', label: 'Document' },
  presentation: { icon: <Presentation size={18} />, color: '#059669', bg: '#d1fae5', label: 'Presentation' },
  image: { icon: <Image size={18} />, color: '#d97706', bg: '#fef3c7', label: 'Image' },
  video: { icon: <Video size={18} />, color: '#dc2626', bg: '#fee2e2', label: 'Video' },
  audio: { icon: <Music size={18} />, color: '#8b5cf6', bg: '#ede9fe', label: 'Audio' },
  archive: { icon: <Archive size={18} />, color: '#6b7280', bg: '#f3f4f6', label: 'Archive' },
  code: { icon: <Code size={18} />, color: '#3b82f6', bg: '#dbeafe', label: 'Code' },
  font: { icon: <Palette size={18} />, color: '#ec4899', bg: '#fce7f3', label: 'Font' },
  '3d': { icon: <Box size={18} />, color: '#14b8a6', bg: '#ccfbf1', label: '3D Model' },
};

// Demo data
const demoFiles: UploadedFile[] = [
  {
    id: '1',
    name: 'Q4 Strategy Document.pdf',
    type: 'document',
    category: 'Document',
    size: '2.4 MB',
    sizeBytes: 2400000,
    sharedOn: 'May 15, 2025',
    views: 24,
    downloads: 8,
    access: 'team',
    shareLink: 'https://memu.air/share/abc123',
    tags: ['quarterly', 'strategy'],
    fileDataStored: false,
  },
  {
    id: '2',
    name: 'Product Roadmap 2025.pptx',
    type: 'presentation',
    category: 'Presentation',
    size: '5.1 MB',
    sizeBytes: 5100000,
    sharedOn: 'May 12, 2025',
    views: 47,
    downloads: 15,
    access: 'public',
    shareLink: 'https://memu.air/share/def456',
    tags: ['roadmap', 'product'],
    fileDataStored: false,
  },
  {
    id: '3',
    name: 'Investor Deck - Final.pptx',
    type: 'presentation',
    category: 'Presentation',
    size: '8.3 MB',
    sizeBytes: 8300000,
    sharedOn: 'May 10, 2025',
    views: 89,
    downloads: 23,
    access: 'team',
    shareLink: 'https://memu.air/share/ghi789',
    tags: ['investor', 'funding'],
    fileDataStored: false,
  },
  {
    id: '4',
    name: 'Team Photo - Retreat.jpg',
    type: 'image',
    category: 'Image',
    size: '3.2 MB',
    sizeBytes: 3200000,
    sharedOn: 'May 8, 2025',
    views: 56,
    downloads: 12,
    access: 'private',
    shareLink: 'https://memu.air/share/jkl012',
    tags: ['team', 'retreat'],
    fileDataStored: false,
  },
];

// IndexedDB setup
const DB_NAME = 'airshare_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveFileData = async (id: string, fileData: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id, fileData });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
  });
};

const getFileData = async (id: string): Promise<string | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.fileData : null);
    };
    transaction.oncomplete = () => db.close();
  });
};

const deleteFileData = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
  });
};

interface AirSharePanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

export default function AirSharePanel({ isGuest, requireAuth }: AirSharePanelProps = {}) {
  const [activeTab, setActiveTab] = useState<'shared' | 'analytics' | 'settings'>('shared');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(demoFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState<UploadedFile | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);

  // Load files metadata from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('airshare_files_metadata');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setUploadedFiles(parsed);
        }
      } catch (e) {
        console.error('Failed to load saved files');
      }
    }
  }, []);

  // Save files metadata to localStorage
  const saveMetadata = useCallback((files: UploadedFile[]) => {
    localStorage.setItem('airshare_files_metadata', JSON.stringify(files));
    setUploadedFiles(files);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const detectFileType = (filename: string): UploadedFile['type'] => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt'].includes(ext || '')) return 'document';
    if (['ppt', 'pptx', 'key', 'odp'].includes(ext || '')) return 'presentation';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(ext || '')) return 'video';
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext || '')) return 'audio';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext || '')) return 'archive';
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'php'].includes(ext || '')) return 'code';
    if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext || '')) return 'font';
    if (['obj', 'fbx', 'gltf', 'glb', 'stl', '3ds'].includes(ext || '')) return '3d';
    
    return 'document';
  };

  const handleFileUpload = async (files: FileList) => {
    if (isGuest && requireAuth) {
      requireAuth('upload files', () => {});
      return;
    }
    
    setIsUploading(true);
    const newFiles: UploadedFile[] = [];
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 10 * 1024 * 1024) {
        setToastMessage({ type: 'error', message: `${file.name} exceeds 10MB limit` });
        setTimeout(() => setToastMessage(null), 3000);
        hasError = true;
        continue;
      }

      const reader = new FileReader();
      
      await new Promise((resolve) => {
        reader.onload = async (e) => {
          const shareId = Math.random().toString(36).substring(7);
          const shareLink = `https://memu.air/share/${shareId}`;
          const fileType = detectFileType(file.name);
          
          await saveFileData(shareId, e.target?.result as string);
          
          newFiles.push({
            id: shareId,
            name: file.name,
            type: fileType,
            category: fileCategories[fileType]?.label || 'Document',
            size: formatFileSize(file.size),
            sizeBytes: file.size,
            sharedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            views: 0,
            downloads: 0,
            access: 'team',
            shareLink: shareLink,
            tags: [fileType, file.name.split('.').pop() || 'file'],
            fileDataStored: true,
          });
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    }

    if (!hasError && newFiles.length > 0) {
      const updatedFiles = [...uploadedFiles, ...newFiles];
      saveMetadata(updatedFiles);
      setToastMessage({ type: 'success', message: `${newFiles.length} file(s) uploaded` });
      setTimeout(() => setToastMessage(null), 3000);
    }
    setIsUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };

  const handleShare = (file: UploadedFile) => {
    setSelectedFile(file);
    setShareLink(file.shareLink);
    setShowShareModal(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setToastMessage({ type: 'success', message: 'Link copied!' });
    setTimeout(() => setToastMessage(null), 2000);
    setShowShareModal(false);
  };

  const handleDownload = async (file: UploadedFile) => {
    const fileData = await getFileData(file.id);
    if (fileData) {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = file.name;
      link.click();
      
      const updated = uploadedFiles.map(f => 
        f.id === file.id ? { ...f, downloads: f.downloads + 1 } : f
      );
      saveMetadata(updated);
      setToastMessage({ type: 'success', message: `Downloaded ${file.name}` });
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  const handleDelete = async (fileId: string) => {
    await deleteFileData(fileId);
    const updated = uploadedFiles.filter(f => f.id !== fileId);
    saveMetadata(updated);
    setToastMessage({ type: 'success', message: 'File deleted' });
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handlePreview = async (file: UploadedFile) => {
    setShowPreview(file);
    if (file.type === 'image') {
      const fileData = await getFileData(file.id);
      setPreviewData(fileData || null);
    } else {
      setPreviewData(null);
    }
  };

  const filteredFiles = uploadedFiles.filter(file => {
    const matchesType = filterType === 'all' || file.type === filterType;
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesType && matchesSearch;
  });

  const typeStats = Object.keys(fileCategories).reduce((acc, type) => {
    acc[type] = uploadedFiles.filter(f => f.type === type).length;
    return acc;
  }, {} as Record<string, number>);

  const totalViews = uploadedFiles.reduce((sum, f) => sum + f.views, 0);
  const totalDownloads = uploadedFiles.reduce((sum, f) => sum + f.downloads, 0);
  const totalSize = uploadedFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

  const handleOpenCompose = () => {
    window.dispatchEvent(new CustomEvent('openCompose'));
  };

  // Empty State - No files at all
  if (uploadedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Cloud size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">No files shared yet</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          Upload your first file to start sharing with others. memu AirShare supports documents, presentations, images, videos, and more.
        </p>
        <label className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition cursor-pointer inline-flex items-center gap-2">
          <Upload size={16} />
          Upload your first file
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#fafaf8] to-[#f2f1ee]">
      {/* Header - Keeping AirShare's unique character */}
      <div className="px-4 md:px-8 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#0891b2] flex items-center justify-center shadow-sm">
            <Cloud size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-['Playfair_Display'] text-3xl font-normal text-[#0f0f0f]">AirShare</h1>
            <p className="text-[13px] text-[#777] mt-0.5">Share files, track engagement, control access</p>
          </div>
        </div>
      </div>

      {/* Tabs - Keeping AirShare's unique pill design */}
      <div className="px-4 md:px-8 pt-2 pb-6">
        <div className="flex gap-3 max-w-2xl">
          <button
            onClick={() => setActiveTab('shared')}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${
              activeTab === 'shared'
                ? 'bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white shadow-md'
                : 'bg-white text-[#777] border border-[#e8e7e3] hover:border-[#d0cfc9]'
            }`}
          >
            <Share2 size={16} />
            Shared Files
            {uploadedFiles.length > 0 && activeTab !== 'shared' && (
              <span className="text-[11px] bg-[#f2f1ee] px-2 py-0.5 rounded-full text-[#777] ml-1">
                {uploadedFiles.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-[#0891b2] to-[#06b6d4] text-white shadow-md'
                : 'bg-white text-[#777] border border-[#e8e7e3] hover:border-[#d0cfc9]'
            }`}
          >
            <BarChart3 size={16} />
            Analytics
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-[#059669] to-[#10b981] text-white shadow-md'
                : 'bg-white text-[#777] border border-[#e8e7e3] hover:border-[#d0cfc9]'
            }`}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
        {activeTab === 'shared' && (
          <div className="max-w-6xl mx-auto">
            {/* Upload Area - Keeping AirShare's unique style */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mb-8 border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-[#4f46e5] bg-[#ede9fe]'
                  : 'border-[#e8e7e3] bg-white hover:border-[#d0cfc9]'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mx-auto mb-4">
                <Upload size={24} className={isDragging ? 'text-[#4f46e5]' : 'text-[#aaa]'} />
              </div>
              <p className="text-[15px] text-[#0f0f0f] font-medium mb-1">
                {isDragging ? 'Drop files here' : 'Drag & drop any file'}
              </p>
              <p className="text-[12px] text-[#aaa] mb-4">Documents, presentations, images, videos, audio, archives, code, fonts, 3D models (max 10MB per file)</p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f0f0f] text-white rounded-xl text-[13px] font-medium cursor-pointer hover:bg-[#2a2a2a] transition-all duration-200">
                <Upload size={14} />
                Browse Files
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              {isUploading && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-[#4f46e5]" />
                  <span className="text-[12px] text-[#777]">Uploading...</span>
                </div>
              )}
            </div>

            {/* Filter Bar - Matching the communications panel style */}
            {uploadedFiles.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                      filterType === 'all'
                        ? 'bg-[#0f0f0f] text-white'
                        : 'bg-white text-[#777] border border-[#e8e7e3] hover:border-[#d0cfc9]'
                    }`}
                  >
                    All ({uploadedFiles.length})
                  </button>
                  {Object.entries(fileCategories).map(([key, cat]) => (
                    typeStats[key] > 0 && (
                      <button
                        key={key}
                        onClick={() => setFilterType(key)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition flex items-center gap-1 ${
                          filterType === key
                            ? `text-white shadow-sm`
                            : 'bg-white text-[#777] border border-[#e8e7e3] hover:border-[#d0cfc9]'
                        }`}
                        style={filterType === key ? { backgroundColor: cat.color } : {}}
                      >
                        {cat.icon}
                        {cat.label} ({typeStats[key]})
                      </button>
                    )
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-[13px] border border-[#e8e7e3] rounded-lg bg-white focus:outline-none focus:border-[#4f46e5]"
                  />
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#aaa]" />
                </div>
              </div>
            )}

            {/* Stats Cards - Keeping AirShare's unique stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 border border-[#e8e7e3] hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[#ede9fe] flex items-center justify-center">
                    <Cloud size={12} className="text-[#4f46e5]" />
                  </div>
                  <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Files</span>
                </div>
                <div className="text-2xl font-semibold text-[#0f0f0f]">{uploadedFiles.length}</div>
                <div className="text-[10px] text-[#777] mt-1">{Object.keys(typeStats).filter(t => typeStats[t] > 0).length} file types</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-[#e8e7e3] hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[#d1fae5] flex items-center justify-center">
                    <Eye size={12} className="text-[#059669]" />
                  </div>
                  <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Views</span>
                </div>
                <div className="text-2xl font-semibold text-[#0f0f0f]">{totalViews}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-[#e8e7e3] hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[#fef3c7] flex items-center justify-center">
                    <Download size={12} className="text-[#d97706]" />
                  </div>
                  <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Downloads</span>
                </div>
                <div className="text-2xl font-semibold text-[#0f0f0f]">{totalDownloads}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-[#e8e7e3] hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[#fee2e2] flex items-center justify-center">
                    <Activity size={12} className="text-[#dc2626]" />
                  </div>
                  <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Storage</span>
                </div>
                <div className="text-2xl font-semibold text-[#0f0f0f]">{formatFileSize(totalSize)}</div>
              </div>
            </div>

            {/* Files List - Consistent card styling */}
            {filteredFiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#e8e7e3] p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-[#f2f1ee] flex items-center justify-center mx-auto mb-4">
                  <Search size={32} className="text-[#aaa]" />
                </div>
                <h3 className="text-[16px] font-medium text-[#777] mb-1">No matching files</h3>
                <p className="text-[13px] text-[#aaa]">Try a different search or filter</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#e8e7e3] overflow-hidden">
                <div className="px-6 py-4 bg-[#fafaf8] border-b border-[#e8e7e3]">
                  <span className="text-[12px] font-medium text-[#777] uppercase tracking-wide">All Files</span>
                </div>
                <div className="divide-y divide-[#f2f1ee]">
                  {filteredFiles.map((item) => {
                    const category = fileCategories[item.type];
                    return (
                      <div key={item.id} className="px-4 md:px-6 py-4 hover:bg-[#fafaf8] transition group">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition flex-shrink-0"
                              style={{ backgroundColor: category.bg, color: category.color }}
                              onClick={() => handlePreview(item)}
                            >
                              {category.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-[14px] font-medium text-[#0f0f0f] truncate">{item.name}</h4>
                                {item.tags && item.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f2f1ee] text-[#777]">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-[11px] text-[#777]">{item.size}</span>
                                <span className="w-1 h-1 rounded-full bg-[#ddd]" />
                                <span className="text-[11px] text-[#777]">{item.sharedOn}</span>
                                <span className="w-1 h-1 rounded-full bg-[#ddd]" />
                                <span className="text-[11px] text-[#777]">{item.views} views</span>
                                <span className="text-[11px] text-[#777]">{item.downloads} downloads</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button
                              onClick={() => handlePreview(item)}
                              className="p-2 rounded-lg hover:bg-[#ede9fe] transition text-[#4f46e5]"
                              title="Preview"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleShare(item)}
                              className="p-2 rounded-lg hover:bg-[#ede9fe] transition text-[#4f46e5]"
                              title="Share"
                            >
                              <Share2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDownload(item)}
                              className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#777]"
                              title="Download"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 rounded-lg hover:bg-[#fee2e2] transition text-[#dc2626]"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-[#e8e7e3] p-6">
              <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-6">File Type Distribution</h3>
              <div className="space-y-4 mb-8">
                {Object.entries(fileCategories).map(([key, cat]) => {
                  const count = typeStats[key];
                  if (count === 0) return null;
                  const percentage = (count / uploadedFiles.length) * 100;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-[13px] mb-1">
                        <div className="flex items-center gap-2">
                          <span style={{ color: cat.color }}>{cat.icon}</span>
                          <span className="text-[#0f0f0f]">{cat.label}</span>
                        </div>
                        <span className="text-[#777]">{count} files</span>
                      </div>
                      <div className="w-full bg-[#f2f1ee] rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-4">Engagement Overview</h3>
              {uploadedFiles.length === 0 ? (
                <p className="text-[13px] text-[#777] text-center py-8">Upload files to see analytics</p>
              ) : (
                <div className="space-y-5">
                  {uploadedFiles.slice(0, 5).map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between text-[13px] mb-2">
                        <span className="text-[#0f0f0f] truncate max-w-[300px]">{item.name}</span>
                        <span className="text-[#777]">{item.views} views • {item.downloads} downloads</span>
                      </div>
                      <div className="w-full bg-[#f2f1ee] rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-[#4f46e5] to-[#0891b2] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((item.views / 20) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-[#e8e7e3] p-6">
              <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-6">Storage & Settings</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[13px] mb-2">
                    <span className="text-[#777]">Used Space</span>
                    <span className="text-[#0f0f0f] font-medium">{formatFileSize(totalSize)} / 100 MB</span>
                  </div>
                  <div className="w-full bg-[#f2f1ee] rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-[#4f46e5] to-[#0891b2] h-2 rounded-full"
                      style={{ width: `${Math.min((totalSize / (100 * 1024 * 1024)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <h4 className="text-[13px] font-medium text-[#0f0f0f] mb-3">Supported File Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(fileCategories).map(([key, cat]) => (
                      <div key={key} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: cat.bg }}>
                        <span style={{ color: cat.color }}>{cat.icon}</span>
                        <span className="text-[11px] text-[#777]">{cat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Delete all files? This cannot be undone.')) {
                      for (const file of uploadedFiles) {
                        await deleteFileData(file.id);
                      }
                      localStorage.removeItem('airshare_files_metadata');
                      setUploadedFiles([]);
                      setToastMessage({ type: 'success', message: 'All files cleared' });
                      setTimeout(() => setToastMessage(null), 2000);
                    }
                  }}
                  className="text-[13px] text-[#dc2626] hover:underline mt-4"
                >
                  Clear all files
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal - Keeping existing */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => { setShowPreview(null); setPreviewData(null); }}>
          <div className="bg-white rounded-2xl max-w-2xl max-h-[80vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[#e8e7e3] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f2f1ee] flex items-center justify-center">
                  {showPreview.type && fileCategories[showPreview.type]?.icon}
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-[#0f0f0f]">{showPreview.name}</h3>
                  <p className="text-[11px] text-[#777]">{showPreview.size} • Shared {showPreview.sharedOn}</p>
                </div>
              </div>
              <button onClick={() => { setShowPreview(null); setPreviewData(null); }} className="p-1 rounded-lg hover:bg-[#f2f1ee]">
                <X size={18} />
              </button>
            </div>
            <div className="p-8 text-center">
              {showPreview.type === 'image' && previewData && (
                <img src={previewData} alt={showPreview.name} className="max-w-full max-h-[50vh] object-contain rounded-lg" />
              )}
              {(showPreview.type === 'document' || showPreview.type === 'presentation') && (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-[#4f46e5] mb-4" />
                  <p className="text-[13px] text-[#777]">Preview available after download</p>
                  <button
                    onClick={() => handleDownload(showPreview)}
                    className="mt-4 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-[13px]"
                  >
                    Download to view
                  </button>
                </div>
              )}
              {showPreview.type === 'video' && previewData && (
                <video src={previewData} controls className="max-w-full max-h-[50vh] rounded-lg" />
              )}
              {showPreview.type === 'audio' && previewData && (
                <audio src={previewData} controls className="w-full" />
              )}
              {!['image', 'video', 'audio'].includes(showPreview.type || '') && !previewData && (
                <div className="text-center py-12">
                  {showPreview.type && fileCategories[showPreview.type]?.icon}
                  <p className="text-[13px] text-[#777] mt-4">Preview not available for this file type</p>
                  <button
                    onClick={() => handleDownload(showPreview)}
                    className="mt-4 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-[13px]"
                  >
                    Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal - Keeping existing */}
      {showShareModal && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[90%] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[#e8e7e3]">
              <h3 className="text-[16px] font-medium text-[#0f0f0f]">Share: {selectedFile.name}</h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-[#f2f1ee] rounded-lg px-3 py-2 text-[12px] text-[#777] truncate">
                  {shareLink}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg bg-[#0f0f0f] text-white hover:bg-[#2a2a2a] transition"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[11px] text-[#777] text-center">Anyone with this link can view and download</p>
            </div>
            <div className="p-4 border-t border-[#e8e7e3] flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-[13px] text-[#777] hover:text-[#0f0f0f] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast - Keeping existing */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white rounded-full px-4 py-2 shadow-lg animate-slideUp z-50">
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle size={12} className="text-[#10b981]" />
            ) : (
              <AlertCircle size={12} className="text-[#dc2626]" />
            )}
            <span className="text-[12px]">{toastMessage.message}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px) translateX(-50%);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(-50%);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}