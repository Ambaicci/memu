'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Layout, Plus, Search, Loader2, MoreVertical, 
  Edit2, Trash2, Check, X
} from 'lucide-react';

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

export default function BoardsPanel() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [editingBoard, setEditingBoard] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
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
  }, [currentUserId]);

  const fetchBoards = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data: boardsData, error } = await supabase
        .from('boards')
        .select('*')
        .eq('created_by', currentUserId)
        .order('updated_at', { ascending: false });

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
      console.error('Error fetching boards:', err);
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
      const { data, error } = await supabase
        .from('boards')
        .insert({
          name: newBoardName.trim(),
          color: randomColor,
          created_by: currentUserId,
        })
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
      console.error('Error creating board:', err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fafaf8]">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">
              Boards
            </h1>
            <p className="text-[13px] text-[#777] mt-1">
              {boards.length} {boards.length === 1 ? 'board' : 'boards'}
            </p>
          </div>
          <button
            onClick={() => setShowNewBoardModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a2a2a] transition shadow-sm"
          >
            <Plus size={16} />
            New Board
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 bg-[#f2f1ee] border border-[#e8e7e3] rounded-lg px-3.5 py-2.5">
          <Search size={16} className="text-[#777]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search boards..."
            className="flex-1 text-[13.5px] outline-none bg-transparent placeholder:text-[#aaa]"
          />
        </div>
      </div>

      {/* Boards Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
        {filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Layout size={32} className="text-[#aaa]" />
            </div>
            <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-1">
              {searchQuery ? 'No matching boards' : 'No boards yet'}
            </h3>
            <p className="text-[13px] text-[#777] max-w-sm mb-4">
              {searchQuery ? 'Try a different search term.' : 'Create your first board to organize your work'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowNewBoardModal(true)}
                className="text-[13px] text-[#4f46e5] hover:underline font-medium"
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
                className="group bg-white border border-[#e8e7e3] rounded-xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
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
                      className="p-1.5 rounded-lg hover:bg-[#f2f1ee] transition"
                    >
                      <Edit2 size={14} className="text-[#777]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBoard(board.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 size={14} className="text-[#777] hover:text-[#dc2626]" />
                    </button>
                  </div>
                </div>

                {editingBoard === board.id ? (
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-[#e8e7e3] rounded text-[14px] outline-none focus:border-[#4f46e5]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameBoard(board.id);
                        if (e.key === 'Escape') setEditingBoard(null);
                      }}
                    />
                    <button
                      onClick={() => handleRenameBoard(board.id)}
                      className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingBoard(null)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <h3 className="text-[15px] font-semibold text-[#0f0f0f] mb-2 truncate">
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
                      <div className="w-6 h-6 rounded-full bg-[#f2f1ee] flex items-center justify-center text-[9px] font-medium text-[#777] border-2 border-white">
                        +{board.members.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-[#777]">
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowNewBoardModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">New Board</h3>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name"
              className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5] mb-4 transition"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewBoardModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardName.trim()}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#0f0f0f] text-white hover:bg-[#2a2a2a] transition disabled:opacity-50"
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