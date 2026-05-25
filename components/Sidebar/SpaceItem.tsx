'use client';

import { useState } from 'react';
import { Edit2, Trash2, Check, X } from 'lucide-react';

interface Space {
  id: string;
  name: string;
  color: string;
  unread?: number;
}

interface SpaceItemProps {
  space: Space;
  onOpenSpace: (spaceId: string) => void;
  onRenameSpace: (spaceId: string, newName: string) => void;
  onDeleteSpace: (space: Space) => void;
  isActive?: boolean;
}

export default function SpaceItem({ space, onOpenSpace, onRenameSpace, onDeleteSpace }: SpaceItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(space.name);

  const handleRename = () => {
    if (editName.trim() && editName !== space.name) {
      onRenameSpace(space.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(space.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg">
        <div className="w-2 h-2 rounded-full" style={{ background: space.color }}></div>
        <div className="flex-1 flex items-center gap-1">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-white border border-[#4f46e5] rounded px-2 py-1 text-[13px] outline-none"
            autoFocus
          />
          <button
            onClick={handleRename}
            className="p-1 rounded hover:bg-green-100 text-green-600"
          >
            <Check size={14} />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 rounded hover:bg-red-100 text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium text-[#686868] hover:bg-white/30 hover:text-[#1a1a1a] transition-all duration-200 cursor-pointer">
      <div className="w-2 h-2 rounded-full" style={{ background: space.color }}></div>
      
      <span 
        onClick={() => onOpenSpace(space.id)}
        className="flex-1"
      >
        {space.name}
      </span>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="p-1 rounded hover:bg-white/50 transition"
          title="Rename space"
        >
          <Edit2 size={12} className="text-[#777]" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSpace(space);
          }}
          className="p-1 rounded hover:bg-red-100 transition"
          title="Delete space"
        >
          <Trash2 size={12} className="text-[#777] hover:text-[#dc2626]" />
        </button>
      </div>
      
      {space.unread && space.unread > 0 && (
        <span className="text-[10px] font-medium bg-[#4f46e5]/20 text-[#4f46e5] px-2 py-0.5 rounded-full ml-auto">
          {space.unread}
        </span>
      )}
    </div>
  );
}