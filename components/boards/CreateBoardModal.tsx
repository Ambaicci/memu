'use client';

import { useState } from 'react';
import { X, Lock, Users, Eye } from 'lucide-react';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (board: { name: string; description: string; isPrivate: boolean }) => void;
}

const colorOptions = [
  '#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];

export default function CreateBoardModal({ isOpen, onClose, onCreate }: CreateBoardModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [selectedColor, setSelectedColor] = useState('#4f46e5');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description, isPrivate });
    setName('');
    setDescription('');
    setIsPrivate(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[500px] max-w-[90%] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#e8e7e3] flex items-center justify-between">
          <h3 className="text-[18px] font-semibold text-[#0f0f0f]">Create a Board</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f2f1ee] transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Board Name */}
          <div>
            <label className="block text-[12px] font-medium text-[#777] mb-1.5">Board Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] text-[14px] transition"
              placeholder="e.g., iPod Design"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-medium text-[#777] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] text-[14px] transition resize-none"
              rows={3}
              placeholder="What's this board about? Who should be invited?"
            />
          </div>

          {/* Privacy Setting */}
          <div>
            <label className="block text-[12px] font-medium text-[#777] mb-1.5">Privacy</label>
            <div className="flex gap-3">
              <button
                onClick={() => setIsPrivate(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition ${
                  isPrivate
                    ? 'border-[#4f46e5] bg-[#ede9fe] text-[#4f46e5]'
                    : 'border-[#e8e7e3] text-[#777] hover:border-[#d0cfc9]'
                }`}
              >
                <Lock size={14} />
                <span className="text-[13px] font-medium">Private</span>
              </button>
              <button
                onClick={() => setIsPrivate(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition ${
                  !isPrivate
                    ? 'border-[#4f46e5] bg-[#ede9fe] text-[#4f46e5]'
                    : 'border-[#e8e7e3] text-[#777] hover:border-[#d0cfc9]'
                }`}
              >
                <Eye size={14} />
                <span className="text-[13px] font-medium">Public</span>
              </button>
            </div>
            <p className="text-[10px] text-[#aaa] mt-2">
              {isPrivate ? 'Only invited members can see and join this board' : 'Anyone in the space can see and join this board'}
            </p>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-[12px] font-medium text-[#777] mb-1.5">Board Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all duration-200 ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-[#0f0f0f] scale-110' : 'hover:scale-105'
                  }`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#e8e7e3] flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#777] hover:bg-[#f2f1ee] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-5 py-2 rounded-lg text-[13px] font-medium bg-[#0f0f0f] text-white hover:bg-[#2a2a2a] transition disabled:opacity-50"
          >
            Create Board
          </button>
        </div>
      </div>
    </div>
  );
}