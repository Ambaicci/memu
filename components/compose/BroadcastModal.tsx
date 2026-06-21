'use client';

import { useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { useToast } from '@/contexts/ToastContext';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (recipients: string[]) => void;
}

export default function BroadcastModal({ isOpen, onClose, onApply }: BroadcastModalProps) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const { showToast } = useToast();

  const handleAddRecipient = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    let handle = trimmed;
    if (!handle.includes('@')) {
      if (!handle.startsWith('@')) handle = '@' + handle;
      if (!handle.endsWith('.memu')) handle += '.memu';
    }
    
    if (!recipients.includes(handle)) {
      setRecipients([...recipients, handle]);
      setInput('');
    }
  };

  const handleRemoveRecipient = (handle: string) => {
    triggerHaptic('light');
    setRecipients(recipients.filter(h => h !== handle));
  };

  const handleApply = () => {
    if (recipients.length === 0) {
      showToast('Add at least one recipient', 'error');
      return;
    }
    triggerHaptic('success');
    onApply(recipients);
    setRecipients([]);
    setInput('');
  };

  const handleClose = () => {
    setRecipients([]);
    setInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center shadow-lg">
              <Megaphone size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-serif text-lg font-semibold text-gray-900">Broadcast</h3>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-500 btn-press"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Add recipients
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddRecipient();
                }
              }}
              placeholder="@handle or email"
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              autoFocus
            />
            <button
              onClick={handleAddRecipient}
              className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all btn-press"
            >
              Add
            </button>
          </div>

          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {recipients.map((handle) => (
                <div
                  key={handle}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-2"
                >
                  <span>{handle}</span>
                  <button
                    onClick={() => handleRemoveRecipient(handle)}
                    className="opacity-60 hover:opacity-100 btn-press"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Send the same memu to multiple individuals at once.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all btn-press"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl hover:shadow-lg transition-all btn-press"
          >
            Apply ({recipients.length})
          </button>
        </div>
      </div>
    </div>
  );
}