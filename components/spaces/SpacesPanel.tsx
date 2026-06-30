'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Users, MessageSquare, Settings, Layers, 
  Search, Filter, X, Sparkles, ArrowRight, 
  Calendar, Clock, Folder, Globe, Zap,
  Palette, Edit3
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import CreateSpaceModal from './CreateSpaceModal';
import SpaceSettingsModal from './SpaceSettingsModal';
import { EmptyState } from '@/components/ui';

interface Space {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_by: string;
  created_at: string;
  memberCount?: number;
  messageCount?: number;
  lastActive?: string;
  role?: 'owner' | 'admin' | 'member';
}

interface SpacesPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const filterLabels: Record<string, string> = {
  all: 'All',
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  active: 'Active',
  inactive: 'Inactive',
};

const cardGradients = [
  'from-blue-50/80 via-indigo-50/40 to-white',
  'from-purple-50/80 via-pink-50/30 to-white',
  'from-emerald-50/80 via-teal-50/30 to-white',
  'from-amber-50/80 via-orange-50/30 to-white',
  'from-rose-50/80 via-pink-50/30 to-white',
  'from-cyan-50/80 via-blue-50/30 to-white',
];

const iconGradients = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-pink-500 to-rose-600',
];

const getCardGradient = (id: string) => {
  const index = id ? id.charCodeAt(0) % cardGradients.length : 0;
  return cardGradients[index];
};

const getIconGradient = (id: string) => {
  const index = id ? id.charCodeAt(0) % iconGradients.length : 0;
  return iconGradients[index];
};

const getInitials = (name: string) => {
  if (!name) return '📁';
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

// Skeleton Card Component
const SkeletonCard = ({ index }: { index: number }) => (
  <div 
    className="group relative rounded-3xl p-6 animate-slide-up"
    style={{ animationDelay: `${index * 50}ms` }}
  >
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-gray-100/80 via-gray-50/40 to-white border border-gray-200/40 shadow-sm" />
    
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-200 animate-pulse" />
      </div>

      <div className="mb-3 space-y-2">
        <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="space-y-2 mb-5">
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200/30">
        <div className="flex items-center gap-4">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

export default function SpacesPanel({ isGuest, requireAuth }: SpacesPanelProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<Space | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    if (showFilterMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch Spaces - OPTIMIZED WITH RPC
  const { data: spaces = [], isLoading, error: queryError } = useQuery({
    queryKey: ['spaces', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const supabase = createClient();

      // Try RPC first (optimized single query)
      const { data, error } = await supabase.rpc('get_user_spaces_enriched', {
        user_uuid: currentUserId
      });

      if (error) {
        console.error('RPC Error:', error);
        // Fallback to regular queries if RPC fails
        return await fetchSpacesFallback(supabase, currentUserId);
      }

      return (data || []).map((space: any) => ({
        id: space.id,
        name: space.name,
        description: space.description,
        icon: space.icon,
        color: space.color,
        created_by: space.created_by,
        created_at: space.created_at,
        role: space.role as 'owner' | 'admin' | 'member',
        memberCount: Number(space.member_count),
        messageCount: Number(space.message_count),
        lastActive: space.last_active,
      }));
    },
    enabled: !!currentUserId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fallback function if RPC doesn't exist
  const fetchSpacesFallback = async (supabase: any, userId: string) => {
    const { data: memberships, error: memError } = await supabase
      .from('space_members')
      .select('space_id, role')
      .eq('user_id', userId);
    
    if (memError || !memberships || memberships.length === 0) return [];

    const spaceIds = memberships.map((m: any) => m.space_id);
    
    const { data: spacesData, error: spacesError } = await supabase
      .from('spaces')
      .select('*')
      .in('id', spaceIds)
      .order('created_at', { ascending: false });

    if (spacesError) return [];

    const enriched = await Promise.all(
      (spacesData || []).map(async (space: any) => {
        const role = memberships.find((m: any) => m.space_id === space.id)?.role as 'owner' | 'admin' | 'member' | undefined;
        
        let memberCount = 0;
        try {
          const { count } = await supabase.from('space_members').select('*', { count: 'exact', head: true }).eq('space_id', space.id);
          memberCount = count || 0;
        } catch (e) { memberCount = 0; }

        let messageCount = 0;
        let lastActive = 'New';
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

        return { ...space, role, memberCount, messageCount, lastActive };
      })
    );

    return enriched;
  };

  // Real-time updates
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

  const handleUpdateSpace = async (updatedSpace: Space) => {
    const supabase = createClient();
    const { error } = await supabase.from('spaces').update({
      name: updatedSpace.name,
      description: updatedSpace.description,
      color: updatedSpace.color,
      icon: updatedSpace.icon,
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
    router.push(`/?panel=space-dashboard&space=${space.id}`);
  };

  const handleOpenSettings = (space: Space, e: React.MouseEvent) => {
    e.stopPropagation();
    setSpaceToEdit(space);
    setShowSettingsModal(true);
  };

  const filteredSpaces = spaces.filter(space => {
    const matchesSearch = !searchQuery || 
      (space.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (space.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filter === 'owner' || filter === 'admin') {
      matchesFilter = space.role === filter;
    } else if (filter === 'member') {
      matchesFilter = space.role === 'member';
    } else if (filter === 'active') {
      matchesFilter = space.lastActive !== 'New';
    } else if (filter === 'inactive') {
      matchesFilter = space.lastActive === 'New';
    }
    
    return matchesSearch && matchesFilter;
  });

  const clearFilters = () => {
    setFilter('all');
    setSearchQuery('');
    setShowSearch(false);
  };

  const hasActiveFilters = filter !== 'all' || searchQuery;

  return (
    <div className="flex flex-col h-full w-full bg-memu-canvas overflow-y-auto pb-24 custom-scroll">
      
      {/* ================= PREMIUM HEADER ================= */}
      <div className="relative px-6 md:px-10 pt-8 pb-6 w-full overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Layers size={24} strokeWidth={2} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Spaces</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                {isLoading ? 'Loading...' : `${filteredSpaces.length} ${filteredSpaces.length === 1 ? 'workspace' : 'workspaces'}`}
                {!isLoading && filter !== 'all' && ` • ${filterLabels[filter]}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                showSearch ? 'bg-blue-600 border-blue-600 text-white shadow-blue-500/25' : 'bg-white/80 backdrop-blur-sm border-gray-200/60 text-gray-500 hover:text-blue-600 hover:border-blue-300'
              }`}
            >
              <Search size={18} strokeWidth={2} />
            </button>

            <div className="relative" ref={filterMenuRef}>
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                  hasActiveFilters ? 'bg-blue-600 border-blue-600 text-white shadow-blue-500/25' : 'bg-white/80 backdrop-blur-sm border-gray-200/60 text-gray-500 hover:text-blue-600 hover:border-blue-300'
                }`}
              >
                <Filter size={18} strokeWidth={2} />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/60 z-50 overflow-hidden animate-fade-in-scale">
                  <div className="p-2">
                    <div className="px-3 py-2 text-[10px] font-bold text-gray-400 tracking-widest uppercase">Filter by Role</div>
                    {['all', 'owner', 'admin', 'member', 'active', 'inactive'].map((f) => (
                      <button
                        key={f}
                        onClick={() => { setFilter(f); setShowFilterMenu(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all ${
                          filter === f ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50/80'
                        }`}
                      >
                        {filterLabels[f]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>New Space</span>
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-6 animate-fadeIn w-full relative z-10">
            <div className="relative">
              <Search size={18} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your workspaces..."
                className="w-full pl-12 pr-12 py-3.5 text-sm bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition shadow-sm"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={18} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-2 animate-fadeIn relative z-10">
            {filter !== 'all' && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100/60">
                {filterLabels[filter]}
                <button onClick={() => setFilter('all')} className="opacity-60 hover:opacity-100"><X size={12} /></button>
              </div>
            )}
            {searchQuery && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100/80 text-gray-700 border border-gray-200/60">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100"><X size={12} /></button>
              </div>
            )}
            <button onClick={clearFilters} className="text-xs font-semibold text-blue-600 hover:text-blue-700 ml-2">Clear all</button>
          </div>
        )}
      </div>

      {/* ================= SPACES GRID ================= */}
      <div className="flex-1 px-6 md:px-10 pb-10 w-full">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, idx) => (
              <SkeletonCard key={idx} index={idx} />
            ))}
          </div>
        ) : filteredSpaces.length === 0 ? (
          <EmptyState
            icon={<Layers size={40} strokeWidth={1.5} className="text-blue-500" />}
            title={spaces.length === 0 ? 'No workspaces yet' : 'No spaces found'}
            description={
              spaces.length === 0 
                ? 'Create a space to collaborate with your team, friends, or family.'
                : 'Try adjusting your filters or search query.'
            }
            action={
              spaces.length === 0
                ? { label: 'Create your first space', onClick: () => setShowCreateModal(true) }
                : hasActiveFilters
                ? { label: 'Clear Filters', onClick: clearFilters }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpaces.map((space, idx) => {
              const cardGradient = getCardGradient(space.id);
              const iconGradient = getIconGradient(space.id);
              const isOwnerOrAdmin = space.role === 'owner' || space.role === 'admin';
              const displayIcon = space.icon || getInitials(space.name);
              
              return (
                <div
                  key={space.id}
                  onClick={() => handleOpenSpace(space)}
                  className="group relative rounded-3xl p-6 cursor-pointer animate-slide-up transition-all duration-300 hover:-translate-y-2"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${cardGradient} border border-gray-200/40 shadow-sm group-hover:shadow-xl group-hover:border-blue-200/60 transition-all duration-300`} />
                  
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-2xl" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
                        style={{ 
                          background: space.color 
                            ? `linear-gradient(135deg, ${space.color}CC, ${space.color}55)` 
                            : `bg-gradient-to-br ${iconGradient}`,
                          color: space.color ? '#fff' : 'inherit'
                        }}
                      >
                        {displayIcon}
                      </div>
                      
                      {isOwnerOrAdmin && (
                        <div className="absolute top-0 left-0 -mt-1 -ml-1 w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                          <Sparkles size={10} className="text-white" strokeWidth={2.5} />
                        </div>
                      )}
                      
                      <button
                        onClick={(e) => handleOpenSettings(space, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-white/60 text-gray-400 hover:text-blue-600 transition-all"
                      >
                        <Settings size={16} strokeWidth={2} />
                      </button>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors mb-1 truncate">
                        {space.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isOwnerOrAdmin && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-blue-200/40">
                            {space.role}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                          <Users size={10} className="text-gray-400" /> {space.memberCount || 0} members
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 font-light leading-relaxed mb-5 line-clamp-2 h-10">
                      {space.description || 'No description provided for this workspace.'}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200/30">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MessageSquare size={12} strokeWidth={2} className="text-gray-400" />
                          <span className="font-medium">{space.messageCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock size={12} strokeWidth={2} className="text-gray-400" />
                          <span className="font-medium">{space.lastActive}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs group-hover:translate-x-1 transition-transform duration-300">
                        <span>Open</span>
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}
      <CreateSpaceModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onSpaceCreated={() => queryClient.invalidateQueries({ queryKey: ['spaces', currentUserId] })}
        currentUser={{ id: currentUserId }}
      />
      
      <SpaceSettingsModal 
        isOpen={showSettingsModal} 
        space={spaceToEdit} 
        onClose={() => setShowSettingsModal(false)} 
        onUpdate={handleUpdateSpace} 
        onDelete={handleDeleteSpace} 
      />
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}