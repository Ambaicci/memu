'use client';

import { Lock, Eye, MessageSquare, Calendar, Users, ChevronRight } from 'lucide-react';

interface BoardCardProps {
  board: {
    id: string;
    name: string;
    description: string;
    color: string;
    memberCount: number;
    messageCount: number;
    lastActive: string;
    isPrivate: boolean;
  };
  onClick: () => void;
}

export default function BoardCard({ board, onClick }: BoardCardProps) {
  return (
    <div
      onClick={onClick}
      className="group bg-white border border-[#e8e7e3] rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#d0cfc9]"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: board.color + '15' }}>
            {board.isPrivate ? (
              <Lock size={18} style={{ color: board.color }} />
            ) : (
              <Eye size={18} style={{ color: board.color }} />
            )}
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

      <p className="text-[12px] text-[#777] mb-4 line-clamp-2 leading-relaxed">{board.description}</p>

      <div className="flex items-center justify-between pt-3 border-t border-[#f2f1ee]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <MessageSquare size={12} className="text-[#aaa]" />
            <span className="text-[11px] text-[#777]">{board.messageCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={12} className="text-[#aaa]" />
            <span className="text-[11px] text-[#777]">{board.lastActive}</span>
          </div>
        </div>
        <div className="flex -space-x-1">
          {[...Array(Math.min(board.memberCount, 3))].map((_, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-[#f2f1ee] border-2 border-white flex items-center justify-center text-[9px] font-medium text-[#777]">
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
      </div>

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