'use client';

import { useState, useEffect } from 'react';
import { 
  Layout, Plus, Lock, Users, MessageSquare, Calendar, 
  ChevronRight, Sparkles, Star, Clock, Eye, 
  UserPlus, X, Search, Check, MoreVertical, UserMinus,
  Shield, Zap, ChevronLeft
} from 'lucide-react';
import BoardView from './BoardView';
import CreateBoardModal from './CreateBoardModal';
import Skeleton from '@/components/ui/Skeleton';

interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  accentColor: string;
  memberCount: number;
  messageCount: number;
  lastActive: string;
  isPrivate: boolean;
  isStarred?: boolean;
  members: Array<{
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

// Demo boards with distinct colors
const demoBoards: Board[] = [
  {
    id: '1',
    name: 'iPod Design',
    description: 'Industrial design, UI/UX, and engineering for the next generation iPod',
    color: '#4f46e5',
    accentColor: '#818cf8',
    memberCount: 5,
    messageCount: 47,
    lastActive: '2 hours ago',
    isPrivate: true,
    isStarred: true,
    members: [
      { name: 'Jony Ive', initials: 'JI', color: '#ede9fe', role: 'owner' },
      { name: 'John Ternus', initials: 'JT', color: '#d1fae5', role: 'member' },
      { name: 'Steve Wozniak', initials: 'SW', color: '#fef3c7', role: 'member' },
    ],
  },
  {
    id: '2',
    name: 'Logistics & Procurement',
    description: 'Supply chain, manufacturing, and vendor coordination',
    color: '#059669',
    accentColor: '#34d399',
    memberCount: 3,
    messageCount: 23,
    lastActive: 'Yesterday',
    isPrivate: true,
    isStarred: false,
    members: [
      { name: 'Tim Cook', initials: 'TC', color: '#d1fae5', role: 'owner' },
    ],
  },
  {
    id: '3',
    name: 'Software Architecture',
    description: 'Core OS and firmware development',
    color: '#d97706',
    accentColor: '#fbbf24',
    memberCount: 4,
    messageCount: 89,
    lastActive: '1 hour ago',
    isPrivate: true,
    isStarred: false,
    members: [
      { name: 'Software Team', initials: 'ST', color: '#fef3c7', role: 'owner' },
    ],
  },
  {
    id: '4',
    name: 'Marketing Launch',
    description: 'Go-to-market strategy and campaign planning',
    color: '#dc2626',
    accentColor: '#f87171',
    memberCount: 6,
    messageCount: 34,
    lastActive: '3 hours ago',
    isPrivate: false,
    isStarred: false,
    members: [
      { name: 'Amara Diallo', initials: 'AD', color: '#fee2e2', role: 'owner' },
    ],
  },
];

export default function BoardsPanel({ spaceId, spaceName, onBack }: BoardsPanelProps) {
  const [boards, setBoards] = useState(demoBoards);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const toggleStar = (id: string) => {
    setBoards(boards.map(b => b.id === id ? { ...b, isStarred: !b.isStarred } : b));
  };

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading skeleton
  if (isLoading) {
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
            {[1, 2, 3, 4, 5, 6].map((i) => (
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

  // Use the full BoardView component when a board is selected
  if (selectedBoard) {
    const boardViewData = {
      id: selectedBoard.id,
      name: selectedBoard.name,
      color: selectedBoard.color,
      members: selectedBoard.members.map(m => ({
        id: m.initials,
        name: m.name,
        handle: `@${m.name.toLowerCase().replace(/\s/g, '')}.memu`,
        initials: m.initials,
        color: m.color,
        textColor: '#1a1a1a',
        role: m.role === 'owner' ? 'owner' : 'member',
      })),
      messages: [],
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
      {/* Header */}
      <div className="border-b border-[#e8e7e3] bg-white/80 backdrop-blur-sm px-6 py-5">
        <div className="flex items-center gap-2 mb-1">
          <Layout size={20} className="text-[#4f46e5]" />
          <h2 className="text-[18px] font-medium text-[#0f0f0f]">Boards</h2>
        </div>
        <p className="body-small">Private project rooms for focused collaboration</p>
      </div>

      {/* Search and Create */}
      <div className="p-4 border-b border-[#e8e7e3] bg-white">
        <div className="flex gap-3">
          <div className="flex-1 relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa] transition-all group-focus-within:text-[#4f46e5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search boards..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#e8e7e3] rounded-xl text-[13px] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-all"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-xl text-[13px] font-medium hover:from-[#5b21b6] hover:to-[#6d28d9] transition shadow-sm"
          >
            <Plus size={14} />
            New Board
          </button>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Layout size={32} className="text-[#aaa]" />
            </div>
            <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-1">No boards found</h3>
            <p className="body-small">Create a board to start private collaboration</p>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(board.id);
                      }}
                      className="p-1 rounded-lg hover:bg-[#f2f1ee] transition-all hover:scale-105"
                    >
                      <Star size={14} className={board.isStarred ? 'fill-[#d97706] text-[#d97706]' : 'text-[#aaa]'} />
                    </button>
                  </div>
                  
                  <h3 className="text-[16px] font-semibold text-[#0f0f0f] mb-1">{board.name}</h3>
                  <p className="text-[12px] text-[#777] line-clamp-2 mb-3">{board.description}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-[#f2f1ee]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Users size={12} className="text-[#aaa]" />
                        <span className="text-[11px] text-[#777]">{board.memberCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare size={12} className="text-[#aaa]" />
                        <span className="text-[11px] text-[#777]">{board.messageCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-[#aaa]" />
                        <span className="text-[10px] text-[#777]">{board.lastActive}</span>
                      </div>
                    </div>
                    <div className="flex -space-x-1">
                      {board.members.slice(0, 3).map((member, idx) => (
                        <div
                          key={idx}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border border-white shadow-sm"
                          style={{ background: member.color, color: '#1a1a1a' }}
                        >
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

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(boardData) => {
          const newBoard: Board = {
            id: Date.now().toString(),
            name: boardData.name,
            description: boardData.description,
            color: '#4f46e5',
            accentColor: '#818cf8',
            memberCount: 1,
            messageCount: 0,
            lastActive: 'Just now',
            isPrivate: boardData.isPrivate,
            members: [{ name: 'You', initials: 'JM', color: '#1a1a1a', role: 'owner' }],
          };
          setBoards([newBoard, ...boards]);
          setShowCreateModal(false);
        }}
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