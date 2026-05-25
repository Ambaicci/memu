'use client';

import { useState } from 'react';
import { X, Trash2, Edit2, Palette, Lock, Eye } from 'lucide-react';

interface Space {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  messageCount: number;
  lastActive: string;
}

interface SpaceSettingsModalProps {
  isOpen: boolean;
  space: Space | null;
  onClose: () => void;
  onUpdate: (space: Space) => void;
  onDelete: (spaceId: string) => void;
}

const colorOptions = [
  '#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];

export default function SpaceSettingsModal({ isOpen, space, onClose, onUpdate, onDelete }: SpaceSettingsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !space) return null;

  const handleStartEdit = () => {
    setEditName(space.name);
    setEditDescription(space.description);
    setEditColor(space.color);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    onUpdate({
      ...space,
      name: editName.trim(),
      description: editDescription,
      color: editColor,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(space.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[500px] max-w-[90%] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#e8e7e3] flex items-center justify-between">
          <h3 className="text-[18px] font-semibold text-[#0f0f0f]">Space Settings</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f2f1ee] transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Space Preview */}
          <div className="flex items-center gap-3 p-4 bg-[#fafaf8] rounded-xl">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: space.color + '15' }}
            >
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: space.color }} />
            </div>
            <div>
              <div className="text-[15px] font-medium text-[#0f0f0f]">{space.name}</div>
              <div className="text-[11px] text-[#777]">{space.memberCount} members</div>
            </div>
          </div>

          {!isEditing ? (
            // View Mode
            <>
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Space Name</label>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#0f0f0f]">{space.name}</span>
                  <button
                    onClick={handleStartEdit}
                    className="p-1.5 rounded-lg hover:bg-[#f2f1ee] transition"
                  >
                    <Edit2 size={14} className="text-[#777]" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Description</label>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#777]">
                    {space.description || 'No description provided'}
                  </span>
                  <button
                    onClick={handleStartEdit}
                    className="p-1.5 rounded-lg hover:bg-[#f2f1ee] transition"
                  >
                    <Edit2 size={14} className="text-[#777]" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: space.color }} />
                  <span className="text-[13px] text-[#777]">Customizable</span>
                  <button
                    onClick={handleStartEdit}
                    className="ml-auto p-1.5 rounded-lg hover:bg-[#f2f1ee] transition"
                  >
                    <Edit2 size={14} className="text-[#777]" />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e8e7e3]">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 text-[#dc2626] hover:bg-red-50 px-3 py-2 rounded-lg transition"
                  >
                    <Trash2 size={14} />
                    <span className="text-[13px]">Delete Space</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[13px] text-[#777]">
                      Are you sure? This action cannot be undone. All messages and files will be permanently lost.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#dc2626] text-white hover:bg-[#b91c1c] transition"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Edit Mode
            <>
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1.5">Space Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] text-[14px] transition"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1.5">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-xl focus:outline-none focus:border-[#4f46e5] text-[14px] transition resize-none"
                  rows={3}
                  placeholder="Add a description"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1.5">Space Color</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={`w-8 h-8 rounded-full transition-all duration-200 ${
                        editColor === color ? 'ring-2 ring-offset-2 ring-[#0f0f0f] scale-110' : 'hover:scale-105'
                      }`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editName.trim()}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#0f0f0f] text-white hover:bg-[#2a2a2a] transition disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}