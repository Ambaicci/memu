'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Users, MessageSquare, Settings, Loader2, 
  CheckSquare, Folder, Sparkles, LayoutGrid
} from 'lucide-react';

// Child Panels
import BoardsPanel from '../boards/BoardsPanel';
import SpaceTasksPanel from './SpaceTasksPanel';
import SpaceChatsPanel from './SpaceChatsPanel';
import SpaceMembersPanel from './SpaceMembersPanel';
import SpaceFiles from './SpaceFiles';
import SpaceSettingsModal from './SpaceSettingsModal';

// Types
interface SpaceMember {
  id: string;
  name: string;
  handle: string;
  role: 'owner' | 'admin' | 'member';
}

interface SpaceData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  members: SpaceMember[];
  created_by?: string;
  role?: string;
}

type TabType = 'chats' | 'tasks' | 'boards' | 'files' | 'members';

interface SpaceViewProps {
  spaceId?: string;
}

const getInitials = (name: string) => {
  if (!name) return '📁';
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

export default function SpaceView({ spaceId }: SpaceViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (spaceId && currentUserId) fetchSpace(spaceId);
    else if (!spaceId) setLoading(false);
  }, [spaceId, currentUserId]);

  const fetchSpace = async (id: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', id)
        .single();
      if (spaceError) throw spaceError;

      const { data: membersData, error: membersError } = await supabase
        .from('space_members')
        .select('user_id, role, profiles(full_name, username)')
        .eq('space_id', id);
      if (membersError) throw membersError;

      const currentUserMember = membersData?.find(m => m.user_id === currentUserId);

      const members: SpaceMember[] = (membersData || []).map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.full_name || m.profiles?.username || 'Unknown',
        handle: `@${m.profiles?.username || 'user'}`,
        role: (m.role === 'owner' ? 'owner' : m.role === 'admin' ? 'admin' : 'member') as SpaceMember['role'],
      }));

      setSpace({
        id: spaceData.id,
        name: spaceData.name,
        description: spaceData.description,
        icon: spaceData.icon,
        color: spaceData.color || '#3B82F6',
        members,
        created_by: spaceData.created_by,
        role: currentUserMember?.role || 'member',
      });
    } catch (err: any) {
      console.error('Fetch space error:', err);
      showToast(err.message || 'Failed to load space', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSpace = async (updatedData: any) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('spaces')
      .update({
        name: updatedData.name,
        description: updatedData.description,
        icon: updatedData.icon,
        color: updatedData.color,
      })
      .eq('id', space?.id);

    if (error) throw error;
    
    setSpace(prev => prev ? { ...prev, ...updatedData } : null);
  };

  const handleDeleteSpace = async (deletedSpaceId: string) => {
    router.push('/?panel=spaces');
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'chats', label: 'Chat', icon: <MessageSquare size={18} strokeWidth={2} /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={18} strokeWidth={2} /> },
    { id: 'boards', label: 'Boards', icon: <LayoutGrid size={18} strokeWidth={2} /> },
    { id: 'files', label: 'Files', icon: <Folder size={18} strokeWidth={2} /> },
    { id: 'members', label: 'Members', icon: <Users size={18} strokeWidth={2} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-memu-canvas">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 relative z-10" strokeWidth={2} />
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-memu-canvas p-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 border border-gray-200/60">
          <Folder size={32} strokeWidth={1.5} className="text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight">Space not found</h3>
        <p className="text-sm text-gray-500 font-light mb-6 max-w-xs">This space may have been deleted or you no longer have access.</p>
        <button 
          onClick={() => router.push('/?panel=spaces')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 hover:shadow-md transition-all btn-press active:scale-95"
          style={{ minHeight: '44px' }}
        >
          Back to Spaces
        </button>
      </div>
    );
  }

  const bgColor = space.color || '#3B82F6';
  const memberCount = space.members.length;
  const initials = getInitials(space.name);
  const displayIcon = space.icon || initials;
  const isCreator = space.created_by === currentUserId;

  return (
    <div className="flex flex-col h-full w-full bg-memu-canvas overflow-hidden">
      
      {/* ================= PREMIUM HEADER – MOBILE OPTIMIZED ================= */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-gray-200/40 shadow-sm">
        <div className="px-4 md:px-10 pt-4 md:pt-5 pb-2 md:pb-3">
          {/* Top Row: Space Identity */}
          <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              {/* Space Avatar – Touch-friendly */}
              <div 
                className="w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-lg flex-shrink-0 transition-all duration-300 active:scale-95"
                style={{ 
                  background: `linear-gradient(135deg, ${bgColor}CC, ${bgColor}55)`,
                  color: '#fff',
                  boxShadow: `0 8px 24px ${bgColor}33, inset 0 1px 0 ${bgColor}44`,
                  border: `1px solid ${bgColor}33`,
                }}
              >
                {displayIcon}
              </div>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight leading-tight truncate">
                  {space.name}
                </h1>
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-500 font-medium mt-0.5">
                  <Users size={12} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                  {isCreator && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                      <span className="flex items-center gap-1 truncate">
                        <Sparkles size={10} className="text-blue-500 flex-shrink-0" />
                        <span className="hidden sm:inline">Created by you</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons – Touch-friendly */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              {/* Files Button */}
              <button 
                onClick={() => setActiveTab('files')}
                className={`group p-2.5 md:p-3 rounded-xl transition-all duration-300 btn-press active:scale-95 ${
                  activeTab === 'files' 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'hover:bg-gray-100/80 text-gray-500 hover:text-gray-700'
                }`}
                title="Space Files"
                aria-label="Space Files"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Folder 
                  size={18} 
                  strokeWidth={2} 
                  className="transition-all duration-300" 
                />
              </button>

              {/* Settings Button */}
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="group p-2.5 md:p-3 rounded-xl transition-all duration-300 btn-press active:scale-95 hover:bg-gray-100/80"
                title="Space Settings"
                aria-label="Space Settings"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Settings 
                  size={18} 
                  strokeWidth={2} 
                  className="text-gray-500 transition-all duration-300 group-hover:rotate-45 group-hover:text-gray-700" 
                />
              </button>
            </div>
          </div>

          {/* ================= TABS – MOBILE OPTIMIZED ================= */}
          <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto custom-scroll-hide pb-1 -mx-4 md:-mx-0 px-4 md:px-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 md:gap-2.5 px-3.5 md:px-5 py-2.5 rounded-2xl
                    transition-all duration-300 whitespace-nowrap btn-press flex-shrink-0
                    ${isActive 
                      ? 'text-white shadow-lg' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/70'
                    }
                  `}
                  style={{
                    background: isActive 
                      ? `linear-gradient(135deg, ${bgColor}, ${bgColor}DD)` 
                      : 'transparent',
                    boxShadow: isActive 
                      ? `0 8px 24px ${bgColor}44, inset 0 1px 0 ${bgColor}44` 
                      : 'none',
                    minHeight: '44px',
                  }}
                >
                  <span className="transition-colors duration-300 flex-shrink-0">
                    {tab.icon}
                  </span>
                  <span 
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </span>
                  
                  {isActive && (
                    <span 
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/70"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= SCROLLABLE CONTENT ================= */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
          
          {activeTab === 'chats' && (
            <SpaceChatsPanel space={space} currentUserId={currentUserId} />
          )}

          {activeTab === 'tasks' && (
            <SpaceTasksPanel spaceId={space.id} />
          )}

          {activeTab === 'boards' && (
            <BoardsPanel spaceId={space.id} />
          )}

          {activeTab === 'files' && (
            <SpaceFiles spaceId={space.id} />
          )}

          {activeTab === 'members' && (
            <SpaceMembersPanel space={space} />
          )}
          
        </div>
      </div>

      {/* ================= SETTINGS MODAL ================= */}
      {isSettingsOpen && (
        <SpaceSettingsModal
          isOpen={isSettingsOpen}
          space={space}
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={handleUpdateSpace}
          onDelete={handleDeleteSpace}
        />
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll-hide::-webkit-scrollbar { display: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
        .btn-press:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}