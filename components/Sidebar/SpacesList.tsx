'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, MoreHorizontal } from 'lucide-react';

interface SpaceItem {
  id: string;
  name: string;
  color?: string;
}

interface SpacesListProps {
  onOpenSpace: (spaceId: string) => void;
  activePanel: string;
  onDeleteRequest: (item: any) => void;
  maxItems?: number;
}

export default function SpacesList({ onOpenSpace, activePanel, onDeleteRequest, maxItems }: SpacesListProps) {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpaces = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: memberships } = await supabase
          .from('space_members')
          .select('space_id')
          .eq('user_id', user.id);

        if (memberships && memberships.length > 0) {
          const spaceIds = memberships.map(m => m.space_id);
          
          const { data: spacesData } = await supabase
            .from('spaces')
            .select('id, name, color')
            .in('id', spaceIds)
            .order('updated_at', { ascending: false })
            .limit(maxItems || 2);

          if (spacesData) {
            setSpaces(spacesData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch spaces:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, [maxItems]);

  if (loading || spaces.length === 0) return null;

  //  THE MICROSCREEN CONTAINER
  return (
    <div className="bg-[#f8f9fa]/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-100 shadow-sm space-y-1">
      {spaces.map((space) => {
        const isActive = activePanel === 'space-dashboard' && window.location.search.includes(space.id);
        
        return (
          <div
            key={space.id}
            onClick={() => onOpenSpace(space.id)}
            className={`group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-300 ${
              isActive
                ? 'bg-white shadow-md ring-1 ring-indigo-100'
                : 'hover:bg-white hover:shadow-sm'
            }`}
          >
            {/* Elegant Color Indicator */}
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 transition-transform group-hover:scale-105"
              style={{ backgroundColor: space.color ? `${space.color}20` : '#e0e7ff' }}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-inner"
                style={{ backgroundColor: space.color || '#4f46e5' }}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate transition-colors ${
                isActive ? 'text-indigo-900' : 'text-gray-700 group-hover:text-gray-900'
              }`}>
                {space.name}
              </p>
            </div>

            {/* Hover Actions */}
            <div className="flex items-center gap-1">
              <ArrowRight size={12} className="text-gray-300 group-hover:text-indigo-500 transition-all opacity-0 group-hover:opacity-100 translate-x-[-5px] group-hover:translate-x-0 duration-300" />
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteRequest(space); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                title="Leave Space"
              >
                <MoreHorizontal size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}