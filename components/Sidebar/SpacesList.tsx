'use client';

import { Plus } from 'lucide-react';
import SpaceItem from './SpaceItem';

interface Space {
  id: string;
  name: string;
  color: string;
  unread?: number;
}

interface SpacesListProps {
  spaces: Space[];
  onOpenSpace: (spaceId: string) => void;
  onRenameSpace: (spaceId: string, newName: string) => void;
  onDeleteSpace: (space: Space) => void;
  onCreateSpace: () => void;
  isCollapsed?: boolean;
}

export default function SpacesList({ 
  spaces, 
  onOpenSpace, 
  onRenameSpace, 
  onDeleteSpace, 
  onCreateSpace,
  isCollapsed 
}: SpacesListProps) {
  return (
    <div>
      {!isCollapsed && (
        <div className="text-[11px] font-semibold tracking-wide text-[#8a8a8a] px-4 pb-2 uppercase flex items-center gap-2">
          <div className="w-1 h-4 bg-[#dc2626] rounded-full"></div>
          My Spaces
        </div>
      )}
      <div className="space-y-0.5">
        {spaces.map((space) => (
          <SpaceItem
            key={space.id}
            space={space}
            onOpenSpace={onOpenSpace}
            onRenameSpace={onRenameSpace}
            onDeleteSpace={onDeleteSpace}
            isCollapsed={isCollapsed}
          />
        ))}
        
        {/* Add New Space Button */}
        <div 
          onClick={onCreateSpace}
          className={`flex items-center gap-3 px-4 py-2 rounded-lg text-[13.5px] font-medium text-[#8a8a8a] hover:bg-white/30 hover:text-[#1a1a1a] transition-all duration-200 cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'New Space' : ''}
        >
          <div className="w-2 h-2 rounded-full border border-dashed border-[#aaa] bg-transparent"></div>
          {!isCollapsed && <span>+ New space</span>}
        </div>
      </div>
    </div>
  );
}