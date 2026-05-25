'use client';

import { useState } from 'react';
import { Layout, Plus, Lock, Eye, MessageSquare, Calendar, Users, ChevronRight } from 'lucide-react';
import CreateBoardModal from '../boards/CreateBoardModal';
import BoardCard from '../boards/BoardCard';

interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  messageCount: number;
  lastActive: string;
  isPrivate: boolean;
}

interface SpaceBoardsProps {
  spaceId: string;
  initialBoards: Board[];
  onOpenBoard: (board: Board) => void;
}

export default function SpaceBoards({ spaceId, initialBoards, onOpenBoard }: SpaceBoardsProps) {
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateBoard = (boardData: { name: string; description: string; isPrivate: boolean }) => {
    const newBoard: Board = {
      id: Date.now().toString(),
      name: boardData.name,
      description: boardData.description,
      color: '#8b5cf6',
      memberCount: 1,
      messageCount: 0,
      lastActive: 'Just now',
      isPrivate: boardData.isPrivate,
    };
    setBoards([...boards, newBoard]);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Search and Create */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search boards..."
            className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5] bg-white"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-lg text-[13px] font-medium hover:shadow-lg transition"
        >
          <Plus size={14} />
          New Board
        </button>
      </div>

      {/* Boards Grid */}
      {filteredBoards.length === 0 ? (
        <div className="text-center py-12">
          <Layout size={48} className="text-[#aaa] mx-auto mb-4" />
          <p className="text-[14px] text-[#777]">No boards yet</p>
          <p className="text-[12px] text-[#aaa] mt-1">Create a board for private team collaboration</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBoards.map((board) => (
            <div
              key={board.id}
              onClick={() => onOpenBoard(board)}
              className="group bg-white border border-[#e8e7e3] rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#d0cfc9]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: board.color + '15' }}>
                    {board.isPrivate ? <Lock size={16} style={{ color: board.color }} /> : <Eye size={16} style={{ color: board.color }} />}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#0f0f0f]">{board.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[#777]">{board.memberCount} members</span>
                      {board.isPrivate && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f2f1ee] text-[#777]">Private</span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#aaa] opacity-0 group-hover:opacity-100 transition" />
              </div>

              <p className="text-[12px] text-[#777] mb-3 line-clamp-2 leading-relaxed">
                {board.description}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-[#f2f1ee]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <MessageSquare size={12} className="text-[#aaa]" />
                    <span className="text-[11px] text-[#777]">{board.messageCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-[#aaa]" />
                    <span className="text-[11px] text-[#777]">Active {board.lastActive}</span>
                  </div>
                </div>
                <div className="flex -space-x-1">
                  {[...Array(Math.min(board.memberCount, 3))].map((_, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full bg-[#f2f1ee] border-2 border-white flex items-center justify-center text-[8px] font-medium text-[#777]"
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateBoard}
      />

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