'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import SpaceItem from './SpaceItem';

interface SpacesListProps {
  onOpenSpace: (spaceId: string) => void;
  activePanel: string;
  onDeleteRequest: (item: any) => void;
}

export default function SpacesList({ onOpenSpace, activePanel, onDeleteRequest }: SpacesListProps) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpaces = async () => {
      const supabase = createClient();
      
      // Check if user is logged in first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSpaces([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSpaces(data);
      } else {
        setSpaces([]);
      }
      setLoading(false);
    };

    fetchSpaces();
  }, []);

  // Function to handle renaming a space directly from the sidebar
  const handleRenameSpace = async (spaceId: string, newName: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('spaces').update({ name: newName }).eq('id', spaceId);
    if (!error) {
      // Update local state so the UI updates instantly without a full refresh
      setSpaces(prev => prev.map(s => s.id === spaceId ? { ...s, name: newName } : s));
    }
  };

  if (loading) {
    return (
      <div className="px-3 py-2 space-y-2">
        <div className="h-8 bg-white/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  // SAFETY CHECK: If no spaces, return null to keep the UI clean
  if (!spaces || spaces.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {spaces.map((space) => (
        <SpaceItem
          key={space.id}
          space={space}
          isActive={activePanel === 'space-dashboard'} 
          onOpenSpace={onOpenSpace}
          onRenameSpace={handleRenameSpace}
          onDeleteSpace={() => onDeleteRequest(space)}
        />
      ))}
    </div>
  );
}