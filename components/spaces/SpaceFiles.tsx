'use client';

import { useState } from 'react';
import { FileText, Download, Trash2, Upload, FolderOpen, Image, File, Film, Music, Archive, X } from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'doc' | 'sheet' | 'slide' | 'image' | 'pdf' | 'video' | 'audio' | 'archive';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
}

interface SpaceFilesProps {
  spaceId: string;
  initialFiles: FileItem[];
}

const fileTypeIcons = {
  doc: <FileText size={16} />,
  sheet: <FileText size={16} />,
  slide: <FileText size={16} />,
  image: <Image size={16} />,
  pdf: <FileText size={16} />,
  video: <Film size={16} />,
  audio: <Music size={16} />,
  archive: <Archive size={16} />,
};

const fileTypeColors = {
  doc: 'bg-[#ede9fe] text-[#4f46e5]',
  sheet: 'bg-[#d1fae5] text-[#059669]',
  slide: 'bg-[#fef3c7] text-[#d97706]',
  image: 'bg-[#e0e7ff] text-[#4338ca]',
  pdf: 'bg-[#fee2e2] text-[#dc2626]',
  video: 'bg-[#fce7f3] text-[#be185d]',
  audio: 'bg-[#cffafe] text-[#0891b2]',
  archive: 'bg-[#f3f4f6] text-[#6b7280]',
};

export default function SpaceFiles({ spaceId, initialFiles }: SpaceFilesProps) {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsUploading(true);
    
    // Simulate upload
    setTimeout(() => {
      const newFiles: FileItem[] = Array.from(e.target.files!).map((file, idx) => ({
        id: Date.now().toString() + idx,
        name: file.name,
        type: getFileType(file.name),
        size: formatFileSize(file.size),
        uploadedBy: 'You',
        uploadedAt: 'Just now',
      }));
      setFiles([...newFiles, ...files]);
      setIsUploading(false);
    }, 1000);
  };

  const getFileType = (filename: string): FileItem['type'] => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['pdf'].includes(ext || '')) return 'pdf';
    if (['mp4', 'mov', 'webm'].includes(ext || '')) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
    if (['zip', 'rar', '7z'].includes(ext || '')) return 'archive';
    if (['doc', 'docx', 'txt', 'md'].includes(ext || '')) return 'doc';
    if (['xls', 'xlsx'].includes(ext || '')) return 'sheet';
    if (['ppt', 'pptx'].includes(ext || '')) return 'slide';
    return 'doc';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = (file: FileItem) => {
    alert(`Downloading ${file.name}...`);
  };

  const handleDelete = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
  };

  const handlePreview = (file: FileItem) => {
    setSelectedFile(file);
  };

  return (
    <div className="space-y-4">
      {/* Header with Upload */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5] bg-white"
          />
        </div>
        <label className="cursor-pointer">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-lg text-[13px] font-medium hover:shadow-lg transition">
            <Upload size={14} />
            Upload File
          </div>
          <input type="file" multiple onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* Uploading Indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 p-3 bg-[#f2f1ee] rounded-lg animate-pulse">
          <div className="w-4 h-4 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] text-[#777]">Uploading files...</span>
        </div>
      )}

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen size={48} className="text-[#aaa] mx-auto mb-4" />
          <p className="text-[14px] text-[#777]">No files yet</p>
          <p className="text-[12px] text-[#aaa] mt-1">Upload your first file to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => handlePreview(file)}
              className="flex items-center justify-between p-3 bg-white border border-[#e8e7e3] rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${fileTypeColors[file.type]}`}>
                  {fileTypeIcons[file.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#0f0f0f] truncate">{file.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-[#777]">{file.size}</span>
                    <span className="w-1 h-1 rounded-full bg-[#ddd]" />
                    <span className="text-[10px] text-[#777]">Uploaded by {file.uploadedBy}</span>
                    <span className="w-1 h-1 rounded-full bg-[#ddd]" />
                    <span className="text-[10px] text-[#777]">{file.uploadedAt}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] transition"
                  title="Download"
                >
                  <Download size={14} className="text-[#777]" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                  className="p-2 rounded-lg hover:bg-red-50 transition"
                  title="Delete"
                >
                  <Trash2 size={14} className="text-[#777] hover:text-[#dc2626]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setSelectedFile(null)}>
          <div className="bg-white rounded-2xl w-[600px] max-w-[90%] max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-[#e8e7e3] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${fileTypeColors[selectedFile.type]}`}>
                  {fileTypeIcons[selectedFile.type]}
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-[#0f0f0f]">{selectedFile.name}</h3>
                  <p className="text-[11px] text-[#777]">{selectedFile.size} • Uploaded by {selectedFile.uploadedBy}</p>
                </div>
              </div>
              <button onClick={() => setSelectedFile(null)} className="p-1 rounded-lg hover:bg-[#f2f1ee] transition">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 text-center">
              {selectedFile.type === 'image' ? (
                <div className="bg-[#f2f1ee] rounded-lg p-8">
                  <Image size={48} className="text-[#aaa] mx-auto mb-4" />
                  <p className="text-[13px] text-[#777]">Image preview coming soon</p>
                </div>
              ) : selectedFile.type === 'pdf' ? (
                <div className="bg-[#f2f1ee] rounded-lg p-8">
                  <FileText size={48} className="text-[#aaa] mx-auto mb-4" />
                  <p className="text-[13px] text-[#777]">PDF preview coming soon</p>
                </div>
              ) : (
                <div className="bg-[#f2f1ee] rounded-lg p-8">
                  <File size={48} className="text-[#aaa] mx-auto mb-4" />
                  <p className="text-[13px] text-[#777]">Preview not available</p>
                  <button
                    onClick={() => handleDownload(selectedFile)}
                    className="mt-4 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-[13px] hover:bg-[#2a2a2a] transition"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}