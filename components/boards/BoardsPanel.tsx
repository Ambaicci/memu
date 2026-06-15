'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Layout, Plus, Search, Loader2, 
  Edit2, Trash2, Check, X, Calendar, Sparkles
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

// BoardCard component with floating effect
function BoardCard({ 
  board, 
  onClick, 
  onRename, 
  onDelete,
  isEditing,
  editName,
  setEditName,
  onSaveRename,
  onCancelEdit,
  idx
}: { 
  board: Board; 
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  isEditing: boolean;
  editName: string;
  setEditName: (name: string) => void;
  onSaveRename: () => void;
  onCancelEdit: () => void;
  idx: number;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => setMousePos({ x: 50, y: 50 });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setTimeout(() => setIsPressed(false), 200)}
      className="group relative cursor-pointer animate-in fade-in slide-in-from-bottom-3 duration-500"
      style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'backwards' }}
    >
      {/* Floating background glow (ambient light behind the card) */}
      <div className="absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 blur-3xl" />
      </div>

      {/* Dynamic lighting gradient that follows mouse */}
      <div
        className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(16,185,129,0.5), rgba(6,95,70,0.15))`,
        }}
      />

      {/* Card body with floating shadow and lift */}
      <div
        className={`relative bg-white/80 backdrop-blur-md rounded-2xl border border-white/40 shadow-float transition-all duration-300 ease-out ${
          isPressed ? 'translate-y-0 scale-[0.99] shadow-md' : 'group-hover:-translate-y-2 group-hover:shadow-float-hover group-hover:border-white/60'
        } overflow-hidden`}
        style={{
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 15px -6px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)'
        }}
      >
        {/* Glass highlight texture */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,_rgba(255,255,255,0.9),_transparent_70%)]" />
        
        {/* Wall reflection at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/30 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="p-5 relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-xl blur-md transition-opacity duration-700 group-hover:opacity-100"
                style={{ backgroundColor: board.color, opacity: 0.4 }}
              />
              <div
                className="relative w-10 h-10 rounded-xl shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-110 overflow-hidden"
                style={{ backgroundColor: board.color }}
              >
                <Layout size={18} className="text-white relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/20 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="flex items-center gap-1 translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
              <button
                onClick={(e) => { e.stopPropagation(); onRename(); }}
                className="p-1.5 rounded-lg hover:bg-white/60 transition"
                title="Rename"
              >
                <Edit2 size={14} className="text-gray-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg hover:bg-red-100/60 transition"
                title="Delete"
              >
                <Trash2 size={14} className="text-gray-600 hover:text-red-600" />
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1.5 bg-white/80 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveRename();
                  if (e.key === 'Escape') onCancelEdit();
                }}
              />
              <button onClick={onSaveRename} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"><Check size={14} /></button>
              <button onClick={onCancelEdit} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition"><X size={14} /></button>
            </div>
          ) : (
            <h3 className="text-base font-semibold text-gray-800 mb-2 truncate group-hover:text-emerald-700 transition-colors duration-200">
              {board.name}
            </h3>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/40">
            <div className="flex -space-x-2">
              {board.members.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 border-white shadow-sm transition-all duration-200 hover:scale-110 hover:ring-2"
                  style={{ backgroundColor: member.color, color: member.textColor }}
                  title={member.name}
                >
                  {member.initials}
                </div>
              ))}
              {board.members.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-500 border-2 border-white shadow-sm">
                  +{board.members.length - 3}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-white/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-gray-600 shadow-inner">
              <Calendar size={12} />
              {formatDate(board.updated_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main BoardsPanel component (unchanged logic)
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
    if (currentUserId) fetchBoards();
  }, [currentUserId, spaceId]);

  const fetchBoards = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      let query = supabase.from('boards').select('*').order('updated_at', { ascending: false });
      if (spaceId) query = query.eq('space_id', spaceId);
      else query = query.eq('created_by', currentUserId);
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
          return { ...board, members };
        })
      );
      setBoards(boardsWithMembers);
    } catch (err: any) {
      console.error(err);
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
      const insertPayload: any = { name: newBoardName.trim(), color: randomColor, created_by: currentUserId };
      if (spaceId) insertPayload.space_id = spaceId;
      const { data, error } = await supabase.from('boards').insert(insertPayload).select().single();
      if (error) throw error;
      await supabase.from('board_members').insert({ board_id: data.id, user_id: currentUserId, role: 'admin' });
      fetchBoards();
      setShowNewBoardModal(false);
      setNewBoardName('');
      showToast('Board created', 'success');
    } catch (err: any) {
      showToast('Failed to create board', 'error');
    }
  };

  const handleRenameBoard = async (boardId: string) => {
    if (!editName.trim()) return;
    const supabase = createClient();
    try {
      await supabase.from('boards').update({ name: editName.trim() }).eq('id', boardId);
      setBoards(boards.map(b => b.id === boardId ? { ...b, name: editName.trim() } : b));
      setEditingBoard(null);
      showToast('Board renamed', 'success');
    } catch (err: any) {
      showToast('Failed to rename board', 'error');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Delete this board? All tasks will be lost.')) return;
    const supabase = createClient();
    try {
      await supabase.from('boards').delete().eq('id', boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      showToast('Board deleted', 'success');
    } catch (err: any) {
      showToast('Failed to delete board', 'error');
    }
  };

  const filteredBoards = boards.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (selectedBoard) {
    return <BoardView board={selectedBoard as any} onBack={() => setSelectedBoard(null)} currentUser="You" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500 blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 relative" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {spaceId ? 'Space Boards' : 'All Boards'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{boards.length} {boards.length === 1 ? 'board' : 'boards'}</p>
        </div>
        <button
          onClick={() => setShowNewBoardModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          <Plus size={16} /> New Board
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search boards..."
          className="w-full pl-9 pr-4 py-2.5 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
        />
      </div>

      {/* Boards Grid */}
      <div className="flex-1">
        {filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in zoom-in-95 duration-500">
            <div className="relative w-24 h-24 mb-5">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl blur-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl w-24 h-24 flex items-center justify-center shadow-inner">
                {searchQuery ? <Search size={36} className="text-emerald-400" /> : <Sparkles size={36} className="text-emerald-400" />}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{searchQuery ? 'No matching boards' : 'No boards yet'}</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-5">{searchQuery ? 'Try a different search term.' : 'Create your first board to organize your work.'}</p>
            {!searchQuery && (
              <button onClick={() => setShowNewBoardModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all">
                <Plus size={14} /> Create a board
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoards.map((board, idx) => (
              <BoardCard
                key={board.id}
                board={board}
                idx={idx}
                onClick={() => setSelectedBoard(board)}
                onRename={() => { setEditingBoard(board.id); setEditName(board.name); }}
                onDelete={() => handleDeleteBoard(board.id)}
                isEditing={editingBoard === board.id}
                editName={editName}
                setEditName={setEditName}
                onSaveRename={() => handleRenameBoard(board.id)}
                onCancelEdit={() => setEditingBoard(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Board Modal */}
      {showNewBoardModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setShowNewBoardModal(false)}>
          <div className="bg-white/95 backdrop-blur-md rounded-2xl w-[420px] max-w-[90%] p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">New Board</h3>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name"
              className="w-full px-4 py-2.5 bg-white/60 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 mb-5 transition-all"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowNewBoardModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition">Cancel</button>
              <button onClick={handleCreateBoard} disabled={!newBoardName.trim()} className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}