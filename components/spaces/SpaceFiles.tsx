'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { FileText, Image, Video, File, Music, Archive, AlertCircle, Loader2, Upload, Trash2, Eye } from 'lucide-react';

interface SpaceFile {
  id: string;
  name: string;
  type: string;
  size_bytes: number;
  url: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploader_name: string;
}

interface SpaceFilesProps {
  spaceId: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <FileText size={18} className="text-red-500" />,
  image: <Image size={18} className="text-blue-500" />,
  video: <Video size={18} className="text-purple-500" />,
  audio: <Music size={18} className="text-pink-500" />,
  archive: <Archive size={18} className="text-yellow-600" />,
  default: <File size={18} className="text-gray-500" />,
};

export default function SpaceFiles({ spaceId }: SpaceFilesProps) {
  const [files, setFiles] = useState<SpaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch files for this space
  const fetchFiles = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('space_files')
        .select('id, name, type, size_bytes, url, uploaded_by, uploaded_at')
        .eq('space_id', spaceId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setError('TABLE_MISSING');
          setLoading(false);
          return;
        }
        throw error;
      }

      const enriched: SpaceFile[] = (data || []).map(f => ({
        ...f,
        uploader_name: f.uploaded_by === currentUserId ? 'You' : 'Member',
      }));

      setFiles(enriched);
    } catch (err: any) {
      console.error('Failed to fetch files:', err);
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [spaceId, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchFiles();
  }, [fetchFiles, currentUserId]);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Delete file
  const handleDelete = async (fileId: string) => {
    if (!confirm('Delete this file?')) return;
    const supabase = createClient();
    try {
      const { error } = await supabase.from('space_files').delete().eq('id', fileId);
      if (error) throw error;
      fetchFiles();
      showToast('File deleted', 'success');
    } catch (err) {
      showToast('Failed to delete file', 'error');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  // Table not ready yet
  if (error === 'TABLE_MISSING') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-[#aaa]" />
        </div>
        <h3 className="text-lg font-medium text-[#0f0f0f] mb-2">Files is coming soon</h3>
        <p className="text-sm text-[#777] max-w-md">
          The file storage backend is being set up. You'll be able to upload and share files here shortly.
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={fetchFiles} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition">
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <FileText className="w-8 h-8 text-[#aaa] mb-3" />
        <p className="text-sm text-[#777] mb-4">No files yet. Upload documents to share with your space.</p>
        <button
          onClick={() => showToast('File upload coming in Phase 2', 'success')}
          className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition"
        >
          <Upload size={14} /> Upload File
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#0f0f0f]">Files ({files.length})</h2>
        <button
          onClick={() => showToast('File upload coming in Phase 2', 'success')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-sm hover:bg-[#2a2a2a] transition"
        >
          <Upload size={14} /> Upload
        </button>
      </div>

      {/* File List */}
      <div className="bg-white border border-[#e8e7e3] rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[#f2f1ee] text-[11px] font-semibold text-[#777] uppercase tracking-wide">
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Uploaded</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {files.map((file) => (
          <div
            key={file.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-[#f2f1ee] items-center hover:bg-[#fafaf8] transition group"
          >
            <div className="col-span-5 flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#f2f1ee] flex items-center justify-center flex-shrink-0">
                {typeIcons[file.type?.toLowerCase()] || typeIcons.default}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#0f0f0f] truncate">{file.name}</p>
                <p className="text-[11px] text-[#777] truncate">by {file.uploader_name}</p>
              </div>
            </div>

            <div className="col-span-2">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f2f1ee] text-[#777]">
                {file.type?.toUpperCase() || 'FILE'}
              </span>
            </div>

            <div className="col-span-2 text-[12px] text-[#777]">
              {formatSize(file.size_bytes || 0)}
            </div>

            <div className="col-span-2 text-[12px] text-[#777]">
              {formatDate(file.uploaded_at)}
            </div>

            <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => showToast('Preview coming in Phase 2', 'success')}
                className="p-1.5 rounded-lg hover:bg-[#e8e7e3] text-[#777] transition"
                title="Preview"
              >
                <Eye size={14} />
              </button>
              <button
                onClick={() => handleDelete(file.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-[#777] hover:text-red-600 transition"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}