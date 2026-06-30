'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  LayoutGrid, Plus, Search, Loader2, 
  Edit2, Trash2, Check, X, Calendar, Sparkles, Folder,
  Users, ArrowRight, Palette
} from 'lucide-react';
import BoardView from './BoardView';

interface Member {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
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
  spaceColor?: string;
  spaceName?: string;
}

// Premium emoji options for boards
const BOARD_EMOJIS = ['📋', '🎯', '🚀', '💡', '🎨', '📊', '🏗️', '🌟', '⚡', '🔥', '💎', '🌈'];

// Premium gradient backgrounds for cards
const cardGradients = [
  'from-blue-50/60 via-indigo-50/30 to-white',
  'from-purple-50/60 via-pink-50/30 to-white',
  'from-emerald-50/60 via-teal-50/30 to-white',
  'from-amber-50/60 via-orange-50/30 to-white',
  'from-rose-50/60 via-pink-50/30 to-white',
  'from-cyan-50/60 via-blue-50/30 to-white',
];

const getCardGradient = (id: string) => {
  const index = id ? id.charCodeAt(0) % cardGradients.length : 0;
  return cardGradients[index];
};

export default function BoardsPanel({ spaceId, spaceColor = '#3B82F6', spaceName }: BoardsPanelProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📋');
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
            color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5],
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
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    try {
      const insertPayload: any = { 
        name: newBoardName.trim(), 
        color: randomColor, 
        created_by: currentUserId 
      };
      if (spaceId) insertPayload.space_id = spaceId;
      
      const { data, error } = await supabase.from('boards').insert(insertPayload).select().single();
      if (error) throw error;
      
      await supabase.from('board_members').insert({ 
        board_id: data.id, 
        user_id: currentUserId, 
        role: 'admin' 
      });
      
      fetchBoards();
      setShowNewBoardModal(false);
      setNewBoardName('');
      setSelectedEmoji('📋');
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

  const filteredBoards = boards.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // --- VIEW: BOARD DETAILS ---
  if (selectedBoard) {
    return <BoardView board={selectedBoard as any} onBack={() => setSelectedBoard(null)} currentUser="You" />;
  }

  // --- VIEW: LOADING ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full animate-fadeIn">
      
      {/* ================= SIMPLIFIED HEADER – NO REDUNDANT TITLE ================= */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ 
              background: `linear-gradient(135deg, ${spaceColor}22, ${spaceColor}11)`,
              color: spaceColor,
            }}
          >
            <LayoutGrid size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">
              {boards.length} {boards.length === 1 ? 'board' : 'boards'} {spaceName ? `in ${spaceName}` : ''}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowNewBoardModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          style={{
            background: `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)`,
            boxShadow: `0 4px 14px ${spaceColor}44`,
          }}
        >
          <Plus size={16} strokeWidth={2.5} /> New Board
        </button>
      </div>

      {/* ================= SEARCH ================= */}
      <div className="relative mb-6 shrink-0">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search boards..."
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200/60 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition shadow-sm"
        />
      </div>

      {/* ================= CONTENT – PREMIUM CARDS WITH COLOR ================= */}
      <div className="flex-1 overflow-y-auto custom-scroll pb-10">
        {filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
              style={{ 
                background: `linear-gradient(135deg, ${spaceColor}22, ${spaceColor}11)`,
                border: `1px solid ${spaceColor}22`,
              }}
            >
              {searchQuery ? <Search size={24} style={{ color: spaceColor }} /> : <Folder size={24} style={{ color: spaceColor }} />}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {searchQuery ? 'No matching boards' : 'No boards yet'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mb-5 leading-relaxed">
              {searchQuery ? 'Try a different search term.' : 'Create your first board to organize your projects.'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setShowNewBoardModal(true)} 
                className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                style={{
                  background: `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)`,
                  boxShadow: `0 4px 14px ${spaceColor}44`,
                }}
              >
                <Plus size={16} strokeWidth={2.5} /> Create a board
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBoards.map((board, idx) => {
              const boardEmoji = BOARD_EMOJIS[idx % BOARD_EMOJIS.length];
              const memberCount = board.members.length;
              const cardGradient = getCardGradient(board.id);
              
              return (
                <div 
                  key={board.id} 
                  className="group relative rounded-2xl p-5 cursor-pointer animate-slide-up transition-all duration-300 hover:-translate-y-1.5"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => setSelectedBoard(board)}
                >
                  {/* Glass card with gradient background */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cardGradient} border border-gray-200/40 shadow-sm group-hover:shadow-xl group-hover:border-blue-200/60 transition-all duration-300`} />
                  
                  {/* Subtle glow on hover */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-2xl" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Top Row: Emoji & Actions */}
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-300"
                        style={{ 
                          background: `linear-gradient(135deg, ${board.color}22, ${board.color}11)`,
                          border: `1px solid ${board.color}22`,
                        }}
                      >
                        {boardEmoji}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingBoard(board.id); 
                            setEditName(board.name); 
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-blue-600 transition"
                        >
                          <Edit2 size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }}
                          className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    {editingBoard === board.id ? (
                      <div className="flex items-center gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-white/80 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameBoard(board.id);
                            if (e.key === 'Escape') setEditingBoard(null);
                          }}
                        />
                        <button onClick={() => handleRenameBoard(board.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Check size={14} /></button>
                        <button onClick={() => setEditingBoard(null)} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <h3 className="text-base font-bold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                        {board.name}
                      </h3>
                    )}

                    {/* Footer: Members & Date */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200/30">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {board.members.slice(0, 3).map((member) => (
                            <div
                              key={member.id}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white shadow-sm"
                              style={{ backgroundColor: member.color }}
                              title={member.name}
                            >
                              {member.initials}
                            </div>
                          ))}
                          {board.members.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-200/80 flex items-center justify-center text-[9px] font-bold text-gray-500 border-2 border-white">
                              +{board.members.length - 3}
                            </div>
                          )}
                        </div>
                        {memberCount > 0 && (
                          <span className="text-[10px] text-gray-500 font-medium">
                            {memberCount} member{memberCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                        <Calendar size={10} strokeWidth={2} />
                        {formatDate(board.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= NEW BOARD MODAL – PREMIUM ================= */}
      {showNewBoardModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setShowNewBoardModal(false)}
        >
          <div 
            className="bg-white/95 backdrop-blur-xl rounded-2xl w-[420px] max-w-[90%] p-6 shadow-2xl border border-gray-200/60 animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Create New Board</h3>
                <p className="text-xs text-gray-500 font-light mt-0.5">Organize your projects visually</p>
              </div>
              <button onClick={() => setShowNewBoardModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Board Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Board Name</label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g., Product Roadmap, Q4 Goals"
                  className="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                />
              </div>

              {/* Emoji Picker */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Icon</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {BOARD_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`p-2 rounded-xl text-lg transition-all ${
                        selectedEmoji === emoji 
                          ? 'bg-blue-50 border-2 border-blue-500 shadow-md scale-110' 
                          : 'bg-gray-50/80 border-2 border-transparent hover:bg-gray-100 hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100/60">
              <button 
                onClick={() => setShowNewBoardModal(false)} 
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateBoard} 
                disabled={!newBoardName.trim()} 
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition disabled:opacity-50"
                style={{
                  background: !newBoardName.trim() 
                    ? '#e5e7eb' 
                    : `linear-gradient(135deg, ${spaceColor}, ${spaceColor}DD)`,
                  boxShadow: newBoardName.trim() 
                    ? `0 4px 14px ${spaceColor}44` 
                    : 'none',
                }}
              >
                Create Board
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; opacity: 0; }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .btn-press:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}