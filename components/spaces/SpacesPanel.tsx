'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, MessageSquare, Calendar, Settings, ChevronRight, Layers } from 'lucide-react';
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
  return `hsl(${hue}, 65%, 65%)`;
};

const getSpaceBorderClass = (color: string) => {
  const hex = color.replace('#', '').toLowerCase();
  const colorMap: Record<string, string> = {
    '4f46e5': 'border-indigo-200/60',
    '0891b2': 'border-cyan-200/60',
    '059669': 'border-emerald-200/60',
    'd97706': 'border-amber-200/60',
    'dc2626': 'border-rose-200/60',
    '8b5cf6': 'border-purple-200/60',
    'ec4899': 'border-pink-200/60',
    '06b6d4': 'border-cyan-200/60',
    '10b981': 'border-emerald-200/60',
    'f59e0b': 'border-amber-200/60',
  };
  return colorMap[hex] || 'border-gray-200/60';
};

export default function SpacesPanel() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<Space | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ['spaces', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const supabase = createClient();

      const { data: memberships, error: memError } = await supabase
        .from('space_members')
        .select('space_id, role')
        .eq('user_id', currentUserId);
      
      if (memError) throw memError;
      if (!memberships || memberships.length === 0) return [];

      const spaceIds = memberships.map(m => m.space_id);
      
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select('*')
        .in('id', spaceIds)
        .order('created_at', { ascending: false });

      if (spacesError) throw spacesError;

      const enriched = await Promise.all(
        (spacesData || []).map(async (space) => {
          const role = memberships.find(m => m.space_id === space.id)?.role as 'admin' | 'member' | undefined;
          
          let memberCount = 0;
          try {
            const { count } = await supabase.from('space_members').select('*', { count: 'exact', head: true }).eq('space_id', space.id);
            memberCount = count || 0;
          } catch (e) { memberCount = 0; }

          let messageCount = 0;
          let lastActive = 'No activity';
          try {
            const { count } = await supabase.from('space_messages').select('*', { count: 'exact', head: true }).eq('space_id', space.id);
            messageCount = count || 0;
            
            const { data: lastMsg } = await supabase.from('space_messages').select('created_at').eq('space_id', space.id).order('created_at', { ascending: false }).limit(1);
            if (lastMsg?.[0]) {
              const diff = Date.now() - new Date(lastMsg[0].created_at).getTime();
              const mins = Math.floor(diff / 60000);
              lastActive = mins < 1 ? 'Just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins/60)}h ago` : `${Math.floor(mins/1440)}d ago`;
            }
          } catch (e) { /* table may not exist */ }

          return { ...space, role, memberCount, messageCount, lastActive, color: space.color || stringToColor(space.id) };
        })
      );

      return enriched;
    },
    enabled: !!currentUserId,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('spaces-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'space_members', filter: `user_id=eq.${currentUserId}` }, () => queryClient.invalidateQueries({ queryKey: ['spaces', currentUserId] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spaces' }, () => queryClient.invalidateQueries({ queryKey: ['spaces', currentUserId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, queryClient]);

  const handleCreateSpace = async (newSpace: Omit<Space, 'id' | 'memberCount' | 'messageCount' | 'lastActive' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!currentUserId) {
      showToast('You must be logged in', 'error');
      return;
    }
    
    const supabase = createClient();
    
    try {
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

      if (spaceError) throw spaceError;

      const { error: memberError } = await supabase
        .from('space_members')
        .insert({
          space_id: space.id,
          user_id: currentUserId,
          role: 'admin',
        });

      if (memberError) {
        await supabase.from('spaces').delete().eq('id', space.id);
        throw memberError;
      }

      showToast('Space created successfully!', 'success');
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['spaces', currentUserId] });
    } catch (err) {
      console.error('Creation error:', err);
      showToast('Failed to create space', 'error');
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
    queryClient.invalidateQueries({ queryKey: ['spaces', currentUserId] });
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm('Delete this space? This cannot be undone.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('spaces').delete().eq('id', spaceId);
    if (error) { showToast('Failed to delete space', 'error'); return; }
    showToast('Space deleted', 'success');
    queryClient.invalidateQueries({ queryKey: ['spaces', currentUserId] });
  };

  const handleOpenSpace = (space: Space) => {
    window.location.href = `/?panel=space-dashboard&space=${space.id}`;
  };

  const handleOpenSettings = (space: Space, e: React.MouseEvent) => {
    e.stopPropagation();
    setSpaceToEdit(space);
    setShowSettingsModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-memu-canvas overflow-y-auto animate-page-enter">
      {/* Header Section */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Layers size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Workspaces</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">Spaces</h1>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-sm text-gray-500 font-medium">{spaces.length} spaces</span>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-sm font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg btn-press"
          >
            <Plus size={16} strokeWidth={2.5} /> New Space
          </button>
        </div>
      </div>

      {/* Spaces Grid */}
      <div className="flex-1 px-6 md:px-10 pb-10">
        {spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-scale">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl blur-2xl animate-pulse"></div>
              <div className="relative bg-white rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-gray-200">
                <Users size={48} className="text-indigo-500" strokeWidth={2} />
              </div>
            </div>
            <h3 className="font-serif text-xl font-semibold text-gray-900 mb-3">No spaces yet</h3>
            <p className="text-gray-500 text-sm max-w-md mb-6">
              Create a space to collaborate with your team, friends, or family.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-sm font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg btn-press"
            >
              <Plus size={16} strokeWidth={2.5} /> Create your first space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space, idx) => {
              const borderClass = getSpaceBorderClass(space.color || '#4f46e5');
              
              return (
                <div
                  key={space.id}
                  onClick={() => handleOpenSpace(space)}
                  className={`group relative bg-white rounded-2xl border-[1px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${borderClass} p-4 cursor-pointer animate-slide-up btn-press`}
                  style={{ animationDelay: `${idx * 80}ms`, opacity: 0 }}
                >
                  {/* 1. Header: Space Avatar & Name */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: (space.color || '#4f46e5') + '15' }}
                      >
                        <div 
                          className="w-5 h-5 rounded-full shadow-inner" 
                          style={{ backgroundColor: space.color || '#4f46e5' }} 
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {space.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">{space.memberCount || 0} members</span>
                          {space.role === 'admin' && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-indigo-100">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleOpenSettings(space, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all btn-press"
                    >
                      <Settings size={14} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* 2. Description */}
                  <p className="text-[13px] text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                    {space.description || 'No description'}
                  </p>

                  {/* 3. Footer: Stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <MessageSquare size={11} strokeWidth={2.5} className="text-gray-400" />
                        <span className="text-[11px] text-gray-400 font-medium">{space.messageCount || 0} msgs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={11} strokeWidth={2.5} className="text-gray-400" />
                        <span className="text-[11px] text-gray-400 font-medium">{space.lastActive || 'New'}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} strokeWidth={2.5} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateSpaceModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateSpace} />
      <SpaceSettingsModal isOpen={showSettingsModal} space={spaceToEdit} onClose={() => setShowSettingsModal(false)} onUpdate={handleUpdateSpace} onDelete={handleDeleteSpace} />
      
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}