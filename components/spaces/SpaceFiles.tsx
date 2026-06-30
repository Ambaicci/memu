'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  FileText, Image, Video, File, Music, Archive, AlertCircle, Loader2, 
  Upload, Trash2, Eye, Search, Link2, Download, X, Check, Folder,
  Sparkles, Clock, User, Grid3X3, List
} from 'lucide-react';

interface SpaceFile {
  id: string;
  name: string;
  type: string;
  size_bytes: number;
  url: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploader_name: string;
  source: 'direct' | 'chat' | 'airshare';
}

interface SpaceFilesProps {
  spaceId: string;
  spaceColor?: string;
}

const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  pdf: { icon: <FileText size={18} />, color: '#EF4444' },
  image: { icon: <Image size={18} />, color: '#3B82F6' },
  video: { icon: <Video size={18} />, color: '#8B5CF6' },
  audio: { icon: <Music size={18} />, color: '#EC4899' },
  archive: { icon: <Archive size={18} />, color: '#F59E0B' },
  default: { icon: <File size={18} />, color: '#6B7280' },
};

export default function SpaceFiles({ spaceId, spaceColor = '#3B82F6' }: SpaceFilesProps) {
  const [files, setFiles] = useState<SpaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showAirSharePicker, setShowAirSharePicker] = useState(false);
  const [airShareFiles, setAirShareFiles] = useState<any[]>([]);
  const [previewFile, setPreviewFile] = useState<SpaceFile | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Fetch files
  const fetchFiles = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    try {
      const { data: directFiles, error: directError } = await supabase
        .from('space_files')
        .select('id, name, type, size_bytes, url, uploaded_by, uploaded_at')
        .eq('space_id', spaceId)
        .order('uploaded_at', { ascending: false });

      if (directError && directError.code !== '42P01') throw directError;

      const { data: messages } = await supabase
        .from('space_messages')
        .select('id, user_id, attachments, created_at, user:profiles(full_name, username)')
        .eq('space_id', spaceId)
        .not('attachments', 'is', null)
        .order('created_at', { ascending: false });

      const allFiles: SpaceFile[] = [];

      (directFiles || []).forEach(f => {
        allFiles.push({
          ...f,
          uploader_name: f.uploaded_by === currentUserId ? 'You' : 'Member',
          source: 'direct',
        });
      });

      (messages || []).forEach((msg: any) => {
        const attachments = msg.attachments || [];
        attachments.forEach((att: any) => {
          allFiles.push({
            id: `chat-${msg.id}-${att.name}`,
            name: att.name,
            type: att.type || 'file',
            size_bytes: att.size || 0,
            url: att.url,
            uploaded_by: msg.user_id,
            uploaded_at: msg.created_at,
            uploader_name: (msg.user as any)?.full_name || (msg.user as any)?.username || 'Member',
            source: 'chat',
          });
        });
      });

      allFiles.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

      setFiles(allFiles);
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

  const fetchAirShareFiles = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('airshare_files')
      .select('*')
      .eq('user_id', currentUserId)
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setAirShareFiles(data);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const supabase = createClient();
    
    try {
      for (const file of Array.from(e.target.files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${fileExt}`;
        const filePath = `spaces/${spaceId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('space_files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('space_files').getPublicUrl(filePath);

        const { error: dbError } = await supabase.from('space_files').insert({
          space_id: spaceId,
          name: file.name,
          type: file.type.split('/')[0] || 'file',
          size_bytes: file.size,
          url: urlData.publicUrl,
          uploaded_by: currentUserId,
        });

        if (dbError) throw dbError;
      }

      showToast('Files uploaded successfully!', 'success');
      fetchFiles();
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast('Failed to upload files', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLinkFromAirShare = async (airShareFile: any) => {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('space_files').insert({
        space_id: spaceId,
        name: airShareFile.name,
        type: airShareFile.type,
        size_bytes: airShareFile.size_bytes,
        url: airShareFile.url,
        uploaded_by: currentUserId,
      });

      if (error) throw error;

      showToast('File linked from AirShare!', 'success');
      setShowAirSharePicker(false);
      fetchFiles();
    } catch (err) {
      showToast('Failed to link file', 'error');
    }
  };

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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

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

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ================= PREMIUM HEADER ================= */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ 
              background: `linear-gradient(135deg, ${spaceColor}22, ${spaceColor}11)`,
              color: spaceColor,
            }}
          >
            <Folder size={20} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Files</h2>
            <p className="text-sm text-gray-500 font-medium">
              {files.length} files in this space
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-gray-100/80 rounded-xl shrink-0 mr-2">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={14} strokeWidth={2} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid3X3 size={14} strokeWidth={2} />
            </button>
          </div>

          <button
            onClick={() => {
              fetchAirShareFiles();
              setShowAirSharePicker(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200/60 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
          >
            <Link2 size={14} strokeWidth={2} /> Link from AirShare
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)`,
              boxShadow: `0 4px 14px ${spaceColor}44`,
            }}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} strokeWidth={2} />}
            Upload
          </button>
        </div>
      </div>

      {/* ================= SEARCH ================= */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200/60 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition shadow-sm"
        />
      </div>

      {/* ================= EMPTY STATE ================= */}
      {filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
            style={{ 
              background: `linear-gradient(135deg, ${spaceColor}22, ${spaceColor}11)`,
              border: `1px solid ${spaceColor}22`,
            }}
          >
            <Folder size={24} style={{ color: spaceColor }} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {searchQuery ? 'No files found' : 'No files yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md leading-relaxed">
            {searchQuery 
              ? 'Try a different search term.' 
              : 'Upload files directly or link them from AirShare to get started.'}
          </p>
          {!searchQuery && (
            <div className="flex gap-3 flex-wrap justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                style={{
                  background: `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)`,
                  boxShadow: `0 4px 14px ${spaceColor}44`,
                }}
              >
                <Upload size={14} strokeWidth={2} /> Upload File
              </button>
              <button
                onClick={() => {
                  fetchAirShareFiles();
                  setShowAirSharePicker(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200/60 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
              >
                <Link2 size={14} strokeWidth={2} /> Link from AirShare
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* ================= LIST VIEW ================= */
        <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50/80 border-b border-gray-200/60 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Uploaded</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {filteredFiles.map((file) => {
            const typeInfo = typeIcons[file.type?.toLowerCase()] || typeIcons.default;
            return (
              <div
                key={file.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-gray-100 items-center hover:bg-gray-50/50 transition group"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}
                  >
                    {typeInfo.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <User size={10} strokeWidth={2} /> by {file.uploader_name}
                    </p>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
                    file.source === 'chat' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    file.source === 'airshare' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {file.source === 'chat' ? '💬 Chat' :
                     file.source === 'airshare' ? '🔗 AirShare' :
                     '📁 Direct'}
                  </span>
                </div>

                <div className="col-span-2 text-xs text-gray-600 font-medium">
                  {formatSize(file.size_bytes || 0)}
                </div>

                <div className="col-span-2 text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={10} strokeWidth={2} />
                  {formatDate(file.uploaded_at)}
                </div>

                <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-blue-600 transition"
                    title="Preview"
                  >
                    <Eye size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => {
                      if (file.url) window.open(file.url, '_blank');
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-blue-600 transition"
                    title="Download"
                  >
                    <Download size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
                    title="Delete"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const typeInfo = typeIcons[file.type?.toLowerCase()] || typeIcons.default;
            return (
              <div
                key={file.id}
                className="group bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-blue-200/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                onClick={() => setPreviewFile(file)}
              >
                <div 
                  className="w-full aspect-square rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${typeInfo.color}10` }}
                >
                  <div style={{ color: typeInfo.color }}>
                    {file.type?.startsWith('image') && file.url ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <File size={32} strokeWidth={1.5} />
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.size_bytes || 0)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= AIRSHARE PICKER MODAL ================= */}
      {showAirSharePicker && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAirSharePicker(false)}
        >
          <div 
            className="bg-white/95 backdrop-blur-xl rounded-2xl w-[600px] max-w-[90%] max-h-[80vh] flex flex-col shadow-2xl border border-gray-200/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100/60">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Link from AirShare</h3>
                <p className="text-sm text-gray-500 font-light mt-0.5">Select files to link to this space</p>
              </div>
              <button 
                onClick={() => setShowAirSharePicker(false)}
                className="p-2 rounded-xl hover:bg-gray-100/80 text-gray-500 transition"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scroll">
              {airShareFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ 
                      background: `linear-gradient(135deg, ${spaceColor}22, ${spaceColor}11)`,
                      border: `1px solid ${spaceColor}22`,
                    }}
                  >
                    <Sparkles size={24} style={{ color: spaceColor }} />
                  </div>
                  <p className="text-sm text-gray-500">No files in your AirShare</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {airShareFiles.map((file) => {
                    const typeInfo = typeIcons[file.type?.toLowerCase()] || typeIcons.default;
                    return (
                      <div 
                        key={file.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200/60 rounded-xl hover:border-blue-300/60 hover:shadow-md transition cursor-pointer group"
                        onClick={() => handleLinkFromAirShare(file)}
                      >
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}
                        >
                          {typeInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatSize(file.size_bytes || 0)}</p>
                        </div>
                        <Link2 size={16} style={{ color: spaceColor }} className="opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= PREVIEW MODAL ================= */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{previewFile.name}</h3>
                <p className="text-xs text-gray-500">{formatSize(previewFile.size_bytes || 0)}</p>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {previewFile.url && (
                <>
                  {previewFile.type?.startsWith('image') && (
                    <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[70vh] object-contain mx-auto" />
                  )}
                  {previewFile.type === 'pdf' && (
                    <iframe src={previewFile.url} className="w-full h-[70vh]" />
                  )}
                  {!previewFile.type?.startsWith('image') && previewFile.type !== 'pdf' && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <File size={32} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-4">Preview not available for this file type</p>
                      <a 
                        href={previewFile.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition"
                        style={{
                          background: `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)`,
                          boxShadow: `0 4px 14px ${spaceColor}44`,
                        }}
                      >
                        <Download size={14} strokeWidth={2} /> Download
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}