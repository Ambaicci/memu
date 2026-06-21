'use client';

import { useState, useEffect } from 'react';
import { X, Layers, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { triggerHaptic } from '@/lib/haptics';
import { useToast } from '@/contexts/ToastContext';
import { Space } from './types';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (space: Space) => void;
  currentUserId: string | null;
}

export default function GroupModal({ isOpen, onClose, onApply, currentUserId }: GroupModalProps) {
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [spacesList, setSpacesList] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Fetch spaces when modal opens
  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchSpaces();
    }
  }, [isOpen, currentUserId]);

  const fetchSpaces = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: memberships } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', currentUserId || '');

    if (memberships && memberships.length > 0) {
      const spaceIds = memberships.map(m => m.space_id);
      const { data: spaces } = await supabase
        .from('spaces')
        .select('*')
        .in('id', spaceIds);
      if (spaces) setSpacesList(spaces);
    }
    setLoading(false);
  };

  const handleApply = () => {
    if (!selectedSpace) {
      showToast('Select a space', 'error');
      return;
    }
    const space = spacesList.find(s => s.id === selectedSpace);
    if (space) {
      triggerHaptic('success');
      onApply(space);
      setSelectedSpace(null);
    }
  };

  const handleClose = () => {
    setSelectedSpace(null);
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Layers size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-serif text-lg font-semibold text-gray-900">Post to Space</h3>
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
            Select a space
          </label>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : spacesList.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              You're not a member of any spaces yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
              {spacesList.map((space) => (
                <button
                  key={space.id}
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedSpace(space.id);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all btn-press text-left ${
                    selectedSpace === space.id
                      ? 'bg-indigo-50 border-2 border-indigo-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (space.color || '#4f46e5') + '20' }}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: space.color || '#4f46e5' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{space.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {space.description || 'No description'}
                    </div>
                  </div>
                  {selectedSpace === space.id && (
                    <Check size={16} strokeWidth={2.5} className="text-indigo-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            Post this memu to a Space feed where all members can see it.
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
            disabled={!selectedSpace}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 btn-press"
          >
            Post to Space
          </button>
        </div>
      </div>
    </div>
  );
}