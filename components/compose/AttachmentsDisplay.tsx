'use client';

import { Paperclip, Loader2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { Attachment } from './types';

interface AttachmentsDisplayProps {
  attachments: Attachment[];
  isUploading: boolean;
  onRemove: (index: number) => void;
}

export default function AttachmentsDisplay({ attachments, isUploading, onRemove }: AttachmentsDisplayProps) {
  if (attachments.length === 0 && !isUploading) return null;

  return (
    <div className="px-4 md:px-6 py-3 border-t border-gray-100 flex flex-wrap gap-2 items-center">
      {attachments.map((att, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2 text-xs animate-fade-in-scale"
        >
          <Paperclip size={12} strokeWidth={2.5} className="text-indigo-600" />
          <span className="text-gray-700 max-w-[140px] md:max-w-[160px] truncate font-medium">
            {att.name}
          </span>
          <button
            onClick={() => {
              triggerHaptic('light');
              onRemove(idx);
            }}
            className="text-gray-500 hover:text-rose-600 transition-all btn-press"
          >
            ✕
          </button>
        </div>
      ))}
      {isUploading && (
        <div className="flex items-center gap-2 bg-indigo-50 rounded-full px-3 py-2 text-xs">
          <Loader2 size={12} className="animate-spin text-indigo-600" />
          <span className="text-indigo-700 font-medium">Uploading...</span>
        </div>
      )}
    </div>
  );
}