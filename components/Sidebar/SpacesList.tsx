'use client';

import { useState } from 'react';
import { Edit2, Trash2, Check, X, Plus } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface Space {
  id: string;
  name: string;
  color: string;
  role?: 'admin' | 'member';
  created_at: string;
}

interface SpaceItemProps {
  space: Space;
  onOpenSpace: (spaceId: string) => void;
  onRenameSpace: (spaceId: string, newName: string) => void;
  onDeleteSpace: (space: Space) => void;
}

function SpaceItem({ space, onOpenSpace, onRenameSpace, onDeleteSpace }: SpaceItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(space.name);
  const { showToast } = useToast();

  const handleSave = () => {
    if (editName.trim()) {
      onRenameSpace(space.id, editName.trim());
      setIsEditing(false);
      showToast('Space renamed', 'success');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') {
      setEditName(space.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="group relative flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#686868] hover:text-[#1a1a1a] min-h-[44px]">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: space.color }} />
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-white border border-[#4f46e5] rounded px-2 py-1 text-[13px] outline-none"
            autoFocus
          />
          <button onClick={handleSave} className="p-1 rounded hover:bg-green-100 text-green-600 transition">
            <Check size={14} />
          </button>
          <button onClick={() => { setEditName(space.name); setIsEditing(false); }} className="p-1 rounded hover:bg-red-100 text-red-600 transition">
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <span onClick={() => onOpenSpace(space.id)} className="flex-1">
            {space.name}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-1 rounded hover:bg-white/60 transition"
              title="Rename"
            >
              <Edit2 size={12} className="text-[#777]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteSpace(space); }}
              className="p-1 rounded hover:bg-red-100 transition"
              title="Delete"
            >
              <Trash2 size={12} className="text-[#777] hover:text-[#dc2626]" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface SpacesListProps {
  spaces: Space[];
  loadingSpaces: boolean;
  onOpenSpace: (spaceId: string) => void;
  onRenameSpace: (spaceId: string, newName: string) => void;
  onDeleteSpace: (space: Space) => void;
  onCreateSpace: () => void;
  onNavigateSpaces: () => void;
}

export default function SpacesList({
  spaces,
  loadingSpaces,
  onOpenSpace,
  onRenameSpace,
  onDeleteSpace,
  onCreateSpace,
  onNavigateSpaces,
}: SpacesListProps) {
  if (loadingSpaces) {
    return (
      <div className="px-4 py-2 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-white/40 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        onClick={onNavigateSpaces}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#686868] hover:text-[#1a1a1a] min-h-[44px]"
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#4f46e5]" />
        <span>All Spaces</span>
      </div>
      
      <div className="my-2 border-t border-[#e8e7e3]/30 mx-4" />
      
      {spaces.map((space) => (
        <SpaceItem
          key={space.id}
          space={space}
          onOpenSpace={onOpenSpace}
          onRenameSpace={onRenameSpace}
          onDeleteSpace={onDeleteSpace}
        />
      ))}
      
      <div
        onClick={onCreateSpace}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all duration-200 cursor-pointer hover:bg-white/40 text-[#8a8a8a] hover:text-[#4f46e5] min-h-[44px]"
      >
        <Plus size={14} className="opacity-70 flex-shrink-0" />
        <span>New Space</span>
      </div>
    </>
  );
}