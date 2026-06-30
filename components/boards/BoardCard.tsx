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
      className="group bg-white rounded-xl border border-gray-200/60 shadow-sm p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-200/60 btn-press"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: board.color + '15' }}
          >
            {board.isPrivate ? (
              <Lock size={18} strokeWidth={2} style={{ color: board.color }} />
            ) : (
              <Eye size={18} strokeWidth={2} style={{ color: board.color }} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {board.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-gray-500 font-medium">{board.memberCount} members</span>
              {board.isPrivate && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium tracking-wide">
                  Private
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight 
          size={16} 
          strokeWidth={2.5} 
          className="text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-300" 
        />
      </div>

      <p className="text-sm text-gray-500 font-light leading-relaxed mb-3 line-clamp-2">
        {board.description}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <MessageSquare size={12} strokeWidth={2} className="text-gray-400" />
            <span className="text-[11px] text-gray-500 font-medium">{board.messageCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={12} strokeWidth={2} className="text-gray-400" />
            <span className="text-[11px] text-gray-500 font-medium">{board.lastActive}</span>
          </div>
        </div>
        <div className="flex -space-x-1">
          {[...Array(Math.min(board.memberCount, 3))].map((_, i) => (
            <div 
              key={i} 
              className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-medium text-gray-500"
            >
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