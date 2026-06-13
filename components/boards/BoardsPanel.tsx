'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Layout, Plus, Search, Loader2, 
  Edit2, Trash2, Check, X
} from 'lucide-react';
import BoardView from './BoardView';

interface Member {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  textColor: string;
  role: 'member' | 'owner';
}

interface Board {
  id: string;
  name: string;
  color: string;
  members: Member[];
  created_at: string;
  updated_at: string;
}

interface BoardsPanelProps {
  spaceId?: string;
}

export default function BoardsPanel({ spaceId }: BoardsPanelProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [editingBoard, setEditingBoard] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
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
    if (currentUserId) {
      fetchBoards();
    }
  }, [currentUserId, spaceId]);

  const fetchBoards = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Build query based on whether we are inside a Space or not
      let query = supabase.from('boards').select('*').order('updated_at', { ascending: false });
      
      if (spaceId) {
        query = query.eq('space_id', spaceId);
      } else {
        query = query.eq('created_by', currentUserId);
      }
      
      const { data: boardsData, error } = await query;

      if (error) throw error;

      const boardsWithMembers = await Promise.all(
        (boardsData || []).map(async (board) => {
          const { data: membersData } = await supabase
            .from('board_members')
            .select('user_id, role, profiles(full_name, username)')
            .eq('board_id', board.id);

          const members: Member[] = (membersData || []).map((m: any, idx: number) => ({
            id: m.user_id,
            name: m.profiles?.full_name || m.profiles?.username || 'Unknown',
            handle: `@${m.profiles?.username || 'user'}`,
            initials: (m.profiles?.full_name || m.profiles?.username || 'U').substring(0, 2).toUpperCase(),
            color: ['#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6'][idx % 5],
            textColor: '#ffffff',
            role: (m.role === 'admin' ? 'owner' : 'member') as 'member' | 'owner',
          }));

          return {
            ...board,
            members,
          };
        })
      );

      setBoards(boardsWithMembers);
    } catch (err) {
      console.error('Error fetching boards:', err.message, err.details, err.hint);
      showToast('Failed to load boards', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !currentUserId) return;

    const supabase = createClient();
    const colors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#0891b2'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    try {
      const insertPayload: any = {
        name: newBoardName.trim(),
        color: randomColor,
        created_by: currentUserId,
      };
      
      // Link to space if we are inside one
      if (spaceId) insertPayload.space_id = spaceId;

      const { data, error } = await supabase
        .from('boards')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('board_members').insert({
        board_id: data.id,
        user_id: currentUserId,
        role: 'admin',
      });

      fetchBoards();
      setShowNewBoardModal(false);
      setNewBoardName('');
      showToast('Board created', 'success');
    } catch (err) {
      console.error('Error creating board:', err.message, err.details, err.hint);
      showToast('Failed to create board', 'error');
    }
  };

  const handleRenameBoard = async (boardId: string) => {
    if (!editName.trim()) return;

    const supabase = createClient();

    try {
      await supabase
        .from('boards')
        .update({ name: editName.trim() })
        .eq('id', boardId);

      setBoards(boards.map(b => b.id === boardId ? { ...b, name: editName.trim() } : b));
      setEditingBoard(null);
      showToast('Board renamed', 'success');
    } catch (err) {
      console.error('Error renaming board:', err);
      showToast('Failed to rename board', 'error');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board?')) return;

    const supabase = createClient();

    try {
      await supabase.from('boards').delete().eq('id', boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      showToast('Board deleted', 'success');
    } catch (err) {
      console.error('Error deleting board:', err);
      showToast('Failed to delete board', 'error');
    }
  };

  const filteredBoards = boards.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // BoardView Render
  if (selectedBoard) {
    return (
      <BoardView
        board={selectedBoard as any}
        onBack={() => setSelectedBoard(null)}
        currentUser="You"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {spaceId ? 'Space Boards' : 'All Boards'}
          </h2>
          <p className="text-[13px] text-gray-500 mt-1">
            {boards.length} {boards.length === 1 ? 'board' : 'boards'}
          </p>
        </div>
        <button
          onClick={() => setShowNewBoardModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[13px] font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          <Plus size={16} />
          New Board
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl px-3.5 py-2.5 mb-6">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search boards..."
          className="flex-1 text-[13.5px] outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>

      {/* Boards Grid */}
      <div className="flex-1 overflow-y-auto pb-8">
        {filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative w-20 h-20 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl blur-xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl w-20 h-20 flex items-center justify-center shadow-inner">
                <Layout size={28} className="text-emerald-500" />
              </div>
            </div>
            <h3 className="text-[16px] font-semibold text-gray-800 mb-1">
              {searchQuery ? 'No matching boards' : 'No boards yet'}
            </h3>
            <p className="text-[13px] text-gray-500 max-w-sm mb-4">
              {searchQuery ? 'Try a different search term.' : 'Create your first board to organize your work'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowNewBoardModal(true)}
                className="text-[13px] text-emerald-600 hover:underline font-medium"
              >
                Create a board →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                onClick={() => setSelectedBoard(board)}
                className="group bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: board.color }}
                  >
                    <Layout size={18} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBoard(board.id);
                        setEditName(board.name);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                    >
                      <Edit2 size={14} className="text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBoard(board.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 size={14} className="text-gray-500 hover:text-red-600" />
                    </button>
                  </div>
                </div>

                {editingBoard === board.id ? (
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-[14px] outline-none focus:border-emerald-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameBoard(board.id);
                        if (e.key === 'Escape') setEditingBoard(null);
                      }}
                    />
                    <button
                      onClick={() => handleRenameBoard(board.id)}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingBoard(null)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <h3 className="text-[15px] font-semibold text-gray-800 mb-2 truncate group-hover:text-emerald-600 transition-colors">
                    {board.name}
                  </h3>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {board.members.slice(0, 3).map((member) => (
                      <div
                        key={member.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold border-2 border-white"
                        style={{ backgroundColor: member.color, color: member.textColor }}
                        title={member.name}
                      >
                        {member.initials}
                      </div>
                    ))}
                    {board.members.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-medium text-gray-500 border-2 border-white">
                        +{board.members.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {new Date(board.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Board Modal */}
      {showNewBoardModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowNewBoardModal(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-md rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-gray-800 mb-4">New Board</h3>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name"
              className="w-full px-4 py-2.5 bg-white/60 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 mb-4 transition-all"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewBoardModal(false)}
                className="px-4 py-2 rounded-xl text-[13px] text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardName.trim()}
                className="px-4 py-2 rounded-xl text-[13px] font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}