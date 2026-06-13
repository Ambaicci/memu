'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  ArrowLeft, Users, MessageSquare, Settings, 
  Loader2, KanbanSquare, CheckSquare
} from 'lucide-react';
import BoardsPanel from '../boards/BoardsPanel';
import SpaceTasksPanel from './SpaceTasksPanel';
import SpaceChatsPanel from './SpaceChatsPanel';
import SpaceMembersPanel from './SpaceMembersPanel';

interface Member {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  textColor: string;
  role: 'owner' | 'admin' | 'member';
}

interface Space {
  id: string;
  name: string;
  color: string;
  members: Member[];
}

interface SpaceViewProps {
  spaceId?: string;
}

type TabType = 'chats' | 'boards' | 'tasks' | 'members';

export default function SpaceView({ spaceId }: SpaceViewProps) {
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
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

  useEffect(() => {
    if (spaceId && currentUserId) {
      fetchSpace(spaceId);
    } else {
      setLoading(false);
    }
  }, [spaceId, currentUserId]);

  const fetchSpace = async (id: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data: spaceData, error: spaceError } = await supabase.from('spaces').select('*').eq('id', id).single();
      if (spaceError) throw spaceError;

      const { data: membersData } = await supabase.from('space_members').select('user_id, role, profiles(full_name, username)').eq('space_id', id);

      const members: Member[] = (membersData || []).map((m: any, idx: number) => {
        let role: 'owner' | 'admin' | 'member' = 'member';
        if (m.role === 'owner') role = 'owner';
        else if (m.role === 'admin') role = 'admin';
        
        return {
          id: m.user_id,
          name: m.profiles?.full_name || m.profiles?.username || 'Unknown',
          handle: `@${m.profiles?.username || 'user'}`,
          initials: (m.profiles?.full_name || m.profiles?.username || 'U').substring(0, 2).toUpperCase(),
          color: ['#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6'][idx % 5],
          textColor: '#ffffff',
          role,
        };
      });

      setSpace({ id: spaceData.id, name: spaceData.name, color: spaceData.color || '#4f46e5', members });
    } catch (err) {
      console.error('Error fetching space:', err);
      showToast('Failed to load space', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'chats' as TabType, label: 'Chats', icon: <MessageSquare size={14} />, gradient: 'from-blue-500/20 to-indigo-500/20' },
    { id: 'boards' as TabType, label: 'Boards', icon: <KanbanSquare size={14} />, gradient: 'from-emerald-500/20 to-teal-500/20' },
    { id: 'tasks' as TabType, label: 'Tasks', icon: <CheckSquare size={14} />, gradient: 'from-purple-500/20 to-pink-500/20' },
    { id: 'members' as TabType, label: 'Members', icon: <Users size={14} />, gradient: 'from-orange-500/20 to-amber-500/20' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#fafaf8] to-white">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[#4f46e5] blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-10 h-10 animate-spin text-[#4f46e5] relative z-10" />
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#fafaf8] to-white">
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Users size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Space not found</h3>
          <p className="text-sm text-gray-500">This space may have been deleted or you don't have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#fafaf8] via-white to-[#fafaf8]">
      {/* Glassmorphic Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-white/20 shadow-sm">
        <div className="px-6 md:px-10 pt-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => window.history.back()} className="group p-2 rounded-xl hover:bg-white/60 transition-all duration-200 text-gray-500 hover:text-gray-900 backdrop-blur-sm">
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-md opacity-60" style={{ background: space.color }}></div>
                <div className="w-6 h-6 rounded-full shadow-md relative" style={{ background: space.color }} />
              </div>
              <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {space.name}
              </h1>
            </div>
            <button className="group p-2 rounded-xl hover:bg-white/60 transition-all duration-200 text-gray-500 hover:text-gray-900">
              <Settings size={18} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>

          {/* Animated Tabs */}
          <div className="relative flex items-center gap-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${activeTab === tab.id ? 'text-indigo-700 bg-gradient-to-r ' + tab.gradient : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'}`}>
                <div className="flex items-center gap-2">{tab.icon}{tab.label}</div>
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-in slide-in-from-left-2 duration-300" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {activeTab === 'chats' && <SpaceChatsPanel space={space} currentUserId={currentUserId} />}
          {activeTab === 'boards' && <BoardsPanel spaceId={space.id} />}
          {activeTab === 'tasks' && <SpaceTasksPanel spaceId={space.id} />}
          {activeTab === 'members' && <SpaceMembersPanel space={space} />}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}