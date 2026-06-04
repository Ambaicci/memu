'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, File, Download, Trash2, Share2, X, CheckCircle, AlertCircle } from 'lucide-react';
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

export default function AirSharePanel({ isGuest, requireAuth }: AirSharePanelProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Load user's files
  useEffect(() => {
    const loadFiles = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('airshare_files')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && data) setFiles(data);
        else console.error('Error loading files:', error);
      }
      setLoading(false);
    };
    loadFiles();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (isGuest && requireAuth) {
      requireAuth('upload files', () => performUpload(e.target.files!));
    } else {
      performUpload(e.target.files!);
    }
  };

  const performUpload = async (fileList: FileList) => {
    const supabase = createClient();
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('You must be logged in to upload files', 'error');
      setUploading(false);
      return;
    }

    for (const file of Array.from(fileList)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `airshare/${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('airshare')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        showToast(`Failed to upload ${file.name}`, 'error');
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('airshare')
        .getPublicUrl(filePath);

      // Insert metadata into database
      const { error: dbError } = await supabase
        .from('airshare_files')
        .insert({
          name: file.name,
          size: file.size,
          type: file.type,
          url: urlData.publicUrl,
          owner_id: user.id,
        });

      if (dbError) {
        console.error('DB insert error:', dbError);
        showToast(`Failed to save ${file.name} metadata`, 'error');
      } else {
        showToast(`${file.name} uploaded successfully!`, 'success');
        // Refresh file list
        const { data: newFiles } = await supabase
          .from('airshare_files')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        if (newFiles) setFiles(newFiles);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Delete "${file.name}"? This action cannot be undone.`)) return;
    
    const supabase = createClient();
    // Extract file path from URL
    const urlParts = file.url.split('/');
    const filePath = urlParts.slice(urlParts.indexOf('airshare')).join('/');
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('airshare')
      .remove([filePath]);
    
    if (storageError) {
      console.error('Storage delete error:', storageError);
      showToast('Failed to delete file from storage', 'error');
      return;
    }
    
    // Delete from database
    const { error: dbError } = await supabase
      .from('airshare_files')
      .delete()
      .eq('id', file.id);
    
    if (dbError) {
      console.error('DB delete error:', dbError);
      showToast('Failed to delete file record', 'error');
      return;
    }
    
    setFiles(files.filter(f => f.id !== file.id));
    showToast(`${file.name} deleted`, 'success');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5]" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-['Playfair_Display'] text-3xl font-normal text-[#0f0f0f]">AirShare</h1>
          <p className="text-[13px] text-[#777] mt-1">Securely share files with anyone</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-sm font-medium hover:shadow-lg transition disabled:opacity-50"
        >
          <Upload size={16} />
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
            <Upload size={36} className="text-[#aaa]" />
          </div>
          <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">No files yet</h3>
          <p className="text-[13px] text-[#777] max-w-sm mb-6">
            Upload your first file to share via AirShare.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition"
          >
            ✨ Upload File
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <div key={file.id} className="bg-white border border-[#e8e7e3] rounded-xl p-4 flex items-center justify-between hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#ede9fe] rounded-lg flex items-center justify-center text-[#4f46e5]">
                  <File size={20} />
                </div>
                <div>
                  <p className="font-medium text-[#0f0f0f]">{file.name}</p>
                  <p className="text-[11px] text-[#777]">{formatSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={file.url}
                  download
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] text-[#777] hover:text-[#4f46e5] transition"
                  title="Download"
                >
                  <Download size={18} />
                </a>
                <button
                  onClick={() => handleDelete(file)}
                  className="p-2 rounded-lg hover:bg-[#fee2e2] text-[#777] hover:text-[#dc2626] transition"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(file.url);
                    showToast('Link copied to clipboard', 'success');
                  }}
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] text-[#777] hover:text-[#0891b2] transition"
                  title="Copy shareable link"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}