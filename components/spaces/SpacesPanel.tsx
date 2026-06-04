'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, MessageSquare, Calendar, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import CreateSpaceModal from './CreateSpaceModal';
import SpaceSettingsModal from './SpaceSettingsModal';

interface Space {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  color?: string;
  memberCount?: number;
  messageCount?: number;
  lastActive?: string;
  role?: 'admin' | 'member';
}

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 60%, 65%)`;
};

export default function SpacesPanel() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<Space | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch spaces where user is a member
  const fetchSpaces = async () => {
    if (!currentUserId) return;
    const supabase = createClient();
    setLoading(true);

    try {
      const { data: memberships, error: memError } = await supabase
        .from('space_members')
        .select('space_id, role')
        .eq('user_id', currentUserId);
      
      if (memError) {
        console.error('Membership fetch failed:', memError);
        showToast('Failed to load spaces', 'error');
        setLoading(false);
        return;
      }

      if (!memberships || memberships.length === 0) {
        setSpaces([]);
        setLoading(false);
        return;
      }

      const spaceIds = memberships.map(m => m.space_id);
      
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select('*')
        .in('id', spaceIds)
        .order('created_at', { ascending: false });

      if (spacesError) {
        console.error('Spaces fetch failed:', spacesError);
        showToast('Failed to load spaces', 'error');
        setLoading(false);
        return;
      }

      // Enrich with counts (graceful if tables don't exist yet)
      const enriched = await Promise.all(
        (spacesData || []).map(async (space) => {
          const role = memberships.find(m => m.space_id === space.id)?.role as 'admin' | 'member' | undefined;
          
          let memberCount = 0;
          try {
            const { count } = await supabase.from('space_members').select('*', { count: 'exact', head: true }).eq('space_id', space.id);
            memberCount = count || 0;
          } catch (e) { memberCount = 0; }

          let messageCount = 0;
          let lastActive = 'No messages yet';
          try {
            const { count } = await supabase.from('space_messages').select('*', { count: 'exact', head: true }).eq('space_id', space.id);
            messageCount = count || 0;
            
            const { data: lastMsg } = await supabase.from('space_messages').select('created_at').eq('space_id', space.id).order('created_at', { ascending: false }).limit(1);
            if (lastMsg?.[0]) {
              const diff = Date.now() - new Date(lastMsg[0].created_at).getTime();
              const mins = Math.floor(diff / 60000);
              lastActive = mins < 1 ? 'Just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins/60)}h ago` : `${Math.floor(mins/1440)}d ago`;
            }
          } catch (e) { /* space_messages may not exist yet */ }

          return { ...space, role, memberCount, messageCount, lastActive, color: stringToColor(space.id) };
        })
      );

      setSpaces(enriched);
    } catch (err) {
      console.error('Unexpected fetch error:', err);
      showToast('Failed to load spaces', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) fetchSpaces();
  }, [currentUserId]);

  // Realtime subscription
  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('spaces-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'space_members', filter: `user_id=eq.${currentUserId}` }, fetchSpaces)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spaces' }, fetchSpaces)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  // CREATE SPACE (Bulletproof)
  const handleCreateSpace = async (newSpace: Omit<Space, 'id' | 'memberCount' | 'messageCount' | 'lastActive' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!currentUserId) {
      showToast('You must be logged in', 'error');
      return;
    }
    
    const supabase = createClient();
    
    try {
      // 1. Insert space
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .insert({
          name: newSpace.name.trim(),
          description: newSpace.description?.trim() || null,
          color: newSpace.color || '#4f46e5',
          created_by: currentUserId,
        })
        .select()
        .single();

      if (spaceError) {
        console.error('Space insert failed:', JSON.stringify(spaceError, null, 2));
        showToast(`Failed to create space: ${spaceError.message}`, 'error');
        return;
      }

      // 2. Add creator as admin
      const { error: memberError } = await supabase
        .from('space_members')
        .insert({
          space_id: space.id,
          user_id: currentUserId,
          role: 'admin',
        });

      if (memberError) {
        console.error('Member insert failed:', JSON.stringify(memberError, null, 2));
        // Clean up orphaned space
        await supabase.from('spaces').delete().eq('id', space.id);
        showToast('Space created but failed to add you as admin.', 'error');
        return;
      }

      showToast('Space created successfully!', 'success');
      setShowCreateModal(false);
      fetchSpaces();
    } catch (err) {
      console.error('Unexpected creation error:', err);
      showToast('An unexpected error occurred.', 'error');
    }
  };

  const handleUpdateSpace = async (updatedSpace: Space) => {
    const supabase = createClient();
    const { error } = await supabase.from('spaces').update({
      name: updatedSpace.name,
      description: updatedSpace.description,
      color: updatedSpace.color,
    }).eq('id', updatedSpace.id);
    
    if (error) { showToast('Failed to update space', 'error'); return; }
    showToast('Space updated', 'success');
    fetchSpaces();
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm('Delete this space? This cannot be undone.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('spaces').delete().eq('id', spaceId);
    if (error) { showToast('Failed to delete space', 'error'); return; }
    showToast('Space deleted', 'success');
    fetchSpaces();
  };

  const handleOpenSpace = (space: Space) => {
    window.location.href = `/?panel=space-dashboard&space=${space.id}`;
  };

  const handleOpenSettings = (space: Space) => {
    setSpaceToEdit(space);
    setShowSettingsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Spaces</h1>
        <p className="text-[13px] text-[#777] mt-1">{spaces.length} spaces</p>
      </div>

      <div className="px-4 md:px-8 py-4">
        <button onClick={() => setShowCreateModal(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[14px] font-medium hover:shadow-lg transition">
          <Plus size={16} /> Create New Space
        </button>
      </div>

      <div className="flex-1 px-4 md:px-8 pb-32">
        {spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
              <Users size={36} className="text-[#aaa]" />
            </div>
            <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">No spaces yet</h3>
            <p className="text-[13px] text-[#777] max-w-sm mb-6">Create a space to collaborate with your team, friends, or family.</p>
            <button onClick={() => setShowCreateModal(true)} className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition">
              Create your first space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <div key={space.id} onClick={() => handleOpenSpace(space)} className="group bg-white border border-[#e8e7e3] rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: (space.color || '#4f46e5') + '15' }}>
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: space.color || '#4f46e5' }} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-[#0f0f0f]">{space.name}</h3>
                      <p className="text-[11px] text-[#777]">{space.memberCount || 0} members</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleOpenSettings(space); }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#f2f1ee] transition">
                    <Settings size={14} className="text-[#777]" />
                  </button>
                </div>
                <p className="text-[12px] text-[#777] mb-3 line-clamp-2">{space.description || 'No description'}</p>
                <div className="flex items-center justify-between pt-3 border-t border-[#f2f1ee]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><MessageSquare size={12} className="text-[#aaa]" /><span className="text-[11px] text-[#777]">{space.messageCount || 0}</span></div>
                    <div className="flex items-center gap-1"><Calendar size={12} className="text-[#aaa]" /><span className="text-[11px] text-[#777]">Active {space.lastActive}</span></div>
                  </div>
                  <div className="flex -space-x-1">
                    {[...Array(Math.min(space.memberCount || 0, 3))].map((_, i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-[#f2f1ee] border-2 border-white flex items-center justify-center text-[8px] font-medium text-[#777]">
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateSpaceModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateSpace} />
      <SpaceSettingsModal isOpen={showSettingsModal} space={spaceToEdit} onClose={() => setShowSettingsModal(false)} onUpdate={handleUpdateSpace} onDelete={handleDeleteSpace} />
      <style>{`.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`}</style>
    </div>
  );
}