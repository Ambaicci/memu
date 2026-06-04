
'use client';

import { useState, useEffect } from 'react';
import { 
  Layout, Plus, Lock, Users, MessageSquare, Calendar, 
  ChevronRight, Sparkles, Star, Clock, Eye, 
  UserPlus, X, Search, Check, MoreVertical, UserMinus,
  Shield, Zap, ChevronLeft
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BoardView from './BoardView';
import CreateBoardModal from './CreateBoardModal';
import Skeleton from '@/components/ui/Skeleton';

interface Board {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  memberCount?: number;
  messageCount?: number;
  lastActive?: string;
  role?: 'admin' | 'member';
  members?: Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
    role?: 'owner' | 'member';
  }>;
}

interface BoardsPanelProps {
  spaceId?: string;
  spaceName?: string;
  onBack?: () => void;
}

export default function BoardsPanel({ spaceId, spaceName, onBack }: BoardsPanelProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch boards
  const fetchBoards = async () => {
    if (!currentUserId) return;
    const supabase = createClient();
    setLoading(true);
    
    // First get memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('board_members')
      .select('board_id, role')
      .eq('user_id', currentUserId);
    
    if (membershipError) {
      console.error('Error fetching memberships:', membershipError);
      setLoading(false);
      return;
    }
    
    let boardsQuery = supabase.from('boards').select('*');
    if (memberships && memberships.length > 0) {
      const boardIds = memberships.map(m => m.board_id);
      boardsQuery = boardsQuery.in('id', boardIds);
    } else {
      // Also show public boards if any
      boardsQuery = boardsQuery.eq('is_private', false);
    }
    
    const { data: boardsData, error: boardsError } = await boardsQuery.order('created_at', { ascending: false });
    if (boardsError) {
      console.error('Error fetching boards:', boardsError);
      setLoading(false);
      return;
    }
    
    // Enrich with member count and message count and role
    const enriched = await Promise.all(
      (boardsData || []).map(async (board) => {
        const role = memberships?.find(m => m.board_id === board.id)?.role as 'admin' | 'member' | undefined;
        const { count: memberCount } = await supabase
          .from('board_members')
          .select('*', { count: 'exact', head: true })
          .eq('board_id', board.id);
        const { count: messageCount } = await supabase
          .from('board_messages')
          .select('*', { count: 'exact', head: true })
          .eq('board_id', board.id);
        
        // Last active: get latest message created_at
        const { data: lastMsg } = await supabase
          .from('board_messages')
          .select('created_at')
          .eq('board_id', board.id)
          .order('created_at', { ascending: false })
          .limit(1);
        let lastActive = 'No messages';
        if (lastMsg && lastMsg[0]) {
          const diff = Date.now() - new Date(lastMsg[0].created_at).getTime();
          const minutes = Math.floor(diff / 60000);
          if (minutes < 1) lastActive = 'Just now';
          else if (minutes < 60) lastActive = `${minutes} min ago`;
          else if (minutes < 1440) lastActive = `${Math.floor(minutes / 60)} hours ago`;
          else lastActive = `${Math.floor(minutes / 1440)} days ago`;
        }
        
        // Get members for avatar preview
        const { data: memberProfiles } = await supabase
          .from('board_members')
          .select('user_id, profiles!inner(full_name)')
          .eq('board_id', board.id)
          .limit(3);
        const members = (memberProfiles || []).map(m => ({
          id: m.user_id,
          name: (m as any).profiles?.full_name || 'Unknown',
          initials: ((m as any).profiles?.full_name || 'U').charAt(0).toUpperCase(),
          color: '#f2f1ee',
        }));
        
        return {
          ...board,
          role,
          memberCount: memberCount || 0,
          messageCount: messageCount || 0,
          lastActive,
          members,
        };
      })
    );
    
    setBoards(enriched);
    setLoading(false);
  };
  
  useEffect(() => {
    if (currentUserId) fetchBoards();
  }, [currentUserId]);
  
  const toggleStar = async (boardId: string) => {
    // No stars table yet – just UI update for demo
    // We'll implement later using a user_board_stars table if needed
    alert('Star feature coming soon');
  };
  
  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (board.description && board.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#fafaf8] to-[#f2f1ee]">
        <div className="border-b border-[#e8e7e3] bg-white/80 px-6 py-5">
          <Skeleton className="w-24 h-6 mb-2" />
          <Skeleton className="w-48 h-4" />
        </div>
        <div className="p-4">
          <div className="flex gap-3 mb-4">
            <Skeleton className="flex-1 h-10 rounded-xl" />
            <Skeleton className="w-24 h-10 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-xl p-5 border border-[#e8e7e3]">
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <Skeleton className="w-5 h-5 rounded-lg" />
                </div>
                <Skeleton className="w-32 h-5 mb-2" />
                <Skeleton className="w-full h-3 mb-1" />
                <Skeleton className="w-3/4 h-3 mb-3" />
                <div className="flex items-center justify-between pt-3">
                  <div className="flex gap-3">
                    <Skeleton className="w-12 h-3" />
                    <Skeleton className="w-12 h-3" />
                    <Skeleton className="w-12 h-3" />
                  </div>
                  <Skeleton className="w-16 h-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (selectedBoard) {
    // Convert to the format expected by BoardView
    const boardViewData = {
      id: selectedBoard.id,
      name: selectedBoard.name,
      color: selectedBoard.color,
      members: (selectedBoard.members || []).map(m => ({
        id: m.id,
        name: m.name,
        handle: `@${m.name.toLowerCase().replace(/\s/g, '')}.memu`,
        initials: m.initials,
        color: m.color,
        textColor: '#1a1a1a',
        role: selectedBoard.role === 'admin' ? 'owner' : 'member',
      })),
      messages: [], // will be loaded in BoardView
    };
    return (
      <BoardView
        board={boardViewData}
        onBack={() => setSelectedBoard(null)}
        currentUser="You"
      />
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#fafaf8] to-[#f2f1ee]">
      <div className="border-b border-[#e8e7e3] bg-white/80 backdrop-blur-sm px-6 py-5">
        <div className="flex items-center gap-2 mb-1">
          <Layout size={20} className="text-[#4f46e5]" />
          <h2 className="text-[18px] font-medium text-[#0f0f0f]">Boards</h2>
        </div>
        <p className="text-[13px] text-[#777]">Private project rooms for focused collaboration</p>
      </div>
      
      <div className="p-4 border-b border-[#e8e7e3] bg-white">
        <div className="flex gap-3">
          <div className="flex-1 relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search boards..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#e8e7e3] rounded-xl text-[13px] focus:outline-none focus:border-[#4f46e5]"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-xl text-[13px] font-medium hover:shadow-md transition"
          >
            <Plus size={14} />
            New Board
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Layout size={32} className="text-[#aaa]" />
            </div>
            <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-1">No boards found</h3>
            <p className="text-[13px] text-[#777]">Create a board to start private collaboration</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                onClick={() => setSelectedBoard(board)}
                className="group bg-white rounded-xl border border-[#e8e7e3] overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ background: `${board.color}15` }}
                    >
                      <Layout size={18} style={{ color: board.color }} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStar(board.id); }}
                      className="p-1 rounded-lg hover:bg-[#f2f1ee] transition"
                    >
                      <Star size={14} className="text-[#aaa]" />
                    </button>
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#0f0f0f] mb-1">{board.name}</h3>
                  <p className="text-[12px] text-[#777] line-clamp-2 mb-3">{board.description || 'No description'}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-[#f2f1ee]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1"><Users size={12} className="text-[#aaa]" /><span className="text-[11px] text-[#777]">{board.memberCount}</span></div>
                      <div className="flex items-center gap-1"><MessageSquare size={12} className="text-[#aaa]" /><span className="text-[11px] text-[#777]">{board.messageCount}</span></div>
                      <div className="flex items-center gap-1"><Clock size={12} className="text-[#aaa]" /><span className="text-[10px] text-[#777]">{board.lastActive}</span></div>
                    </div>
                    <div className="flex -space-x-1">
                      {(board.members || []).slice(0,3).map((member, idx) => (
                        <div key={idx} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border border-white shadow-sm" style={{ background: member.color || '#e8e7e3', color: '#1a1a1a' }}>
                          {member.initials}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <CreateBoardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={async (boardData) => {
          if (!currentUserId) return;
          const supabase = createClient();
          // Insert board
          const { data: newBoard, error: boardError } = await supabase
            .from('boards')
            .insert({
              name: boardData.name,
              description: boardData.description,
              color: '#4f46e5',
              is_private: boardData.isPrivate,
              created_by: currentUserId,
            })
            .select()
            .single();
          if (boardError) {
            console.error('Error creating board:', boardError);
            alert('Failed to create board');
            return;
          }
          // Add creator as admin member
          const { error: memberError } = await supabase
            .from('board_members')
            .insert({
              board_id: newBoard.id,
              user_id: currentUserId,
              role: 'admin',
            });
          if (memberError) console.error('Error adding member:', memberError);
          fetchBoards();
        }}
      />
      
      <style>{`.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`}</style>
    </div>
  );
}