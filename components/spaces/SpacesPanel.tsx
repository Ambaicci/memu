'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, MessageSquare, Calendar, Settings, Layers, Search, Filter, X, Sparkles } from 'lucide-react';
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

interface SpacesPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const filterLabels: Record<string, string> = {
  all: 'All',
  admin: 'Admin',
  member: 'Member',
  active: 'Active',
  inactive: 'Inactive',
};

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

const SpacesSkeleton = () => (
  <div className="flex flex-col h-full bg-memu-canvas p-6 md:p-10 animate-fadeIn">
    <div className="mb-8 space-y-3">
      <div className="w-48 h-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-xl animate-shimmer" />
      <div className="w-32 h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-md animate-shimmer" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
              <div className="space-y-2">
                <div className="w-24 h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
                <div className="w-16 h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
              </div>
            </div>
          </div>
          <div className="w-full h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer mb-3" />
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <div className="w-12 h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
            <div className="w-12 h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function SpacesPanel({ isGuest, requireAuth }: SpacesPanelProps = {}) {
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

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu]);

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

  const filteredSpaces = spaces.filter(space => {
    // Search filter
    const matchesSearch = !searchQuery || 
      (space.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (space.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter
    let matchesFilter = true;
    if (filter === 'admin') {
      matchesFilter = space.role === 'admin';
    } else if (filter === 'member') {
      matchesFilter = space.role === 'member';
    } else if (filter === 'active') {
      matchesFilter = space.lastActive !== 'No activity' && space.lastActive !== 'New';
    } else if (filter === 'inactive') {
      matchesFilter = space.lastActive === 'No activity' || space.lastActive === 'New';
    }
    
    return matchesSearch && matchesFilter;
  });

  const clearFilters = () => {
    setFilter('all');
    setSearchQuery('');
    setShowSearch(false);
  };

  const hasActiveFilters = filter !== 'all' || searchQuery;

  if (isLoading) {
    return <SpacesSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-memu-canvas animate-page-enter">
      
      {/* Header Section */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Layers size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">Spaces</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {filteredSpaces.length} {filteredSpaces.length === 1 ? 'space' : 'spaces'}
              {filter !== 'all' && ` • ${filterLabels[filter]}`}
              {searchQuery && ` • Search: "${searchQuery}"`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Button */}
            <button 
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm btn-press ${
                showSearch ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200'
              }`}
            >
              <Search size={18} strokeWidth={2.5} />
            </button>

            {/* Filter Button with Dropdown */}
            <div className="relative" ref={filterMenuRef}>
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm btn-press ${
                  hasActiveFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200'
                }`}
              >
                <Filter size={18} strokeWidth={2.5} />
              </button>

              {/* Filter Dropdown Menu */}
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale">
                  <div className="p-2">
                    <button
                      onClick={() => { setFilter('all'); setShowFilterMenu(false); }}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press ${
                        filter === 'all' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All Spaces
                    </button>
                    <button
                      onClick={() => { setFilter('admin'); setShowFilterMenu(false); }}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                        filter === 'admin' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Settings size={14} /> Admin
                    </button>
                    <button
                      onClick={() => { setFilter('member'); setShowFilterMenu(false); }}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                        filter === 'member' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Users size={14} /> Member
                    </button>
                    <button
                      onClick={() => { setFilter('active'); setShowFilterMenu(false); }}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                        filter === 'active' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <MessageSquare size={14} /> Active
                    </button>
                    <button
                      onClick={() => { setFilter('inactive'); setShowFilterMenu(false); }}
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                        filter === 'inactive' ? 'bg-gray-50 text-gray-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Calendar size={14} /> Inactive
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Create Space Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all btn-press"
            >
              <Plus size={18} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mb-4 animate-fadeIn">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by space name or description..."
                className="w-full pl-12 pr-12 py-3 text-sm bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 btn-press"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mb-4 animate-fadeIn">
            {filter !== 'all' && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {filterLabels[filter]}
                <button onClick={() => setFilter('all')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            {searchQuery && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
              </div>
            )}
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 btn-press"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Spaces Grid */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-24 custom-scroll">
        {filteredSpaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in-scale">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-4">
              {spaces.length === 0 ? <Sparkles size={32} className="text-indigo-400" /> : <Filter size={32} className="text-indigo-400" />}
            </div>
            <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
              {spaces.length === 0 ? 'No spaces yet' : 'No spaces found'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {spaces.length === 0 
                ? 'Create a space to collaborate with your team, friends, or family.'
                : 'Try adjusting your filters or search query.'
              }
            </p>
            {spaces.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all btn-press"
              >
                Create your first space
              </button>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all btn-press"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpaces.map((space, idx) => {
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
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}