'use client';

import { ChevronLeft, MessageSquare, Send, FileText, Phone, CheckSquare, Layout, Users, Sparkles, LayoutGrid } from 'lucide-react';

type ToolType = 'chat' | 'memus' | 'files' | 'calls' | 'tasks' | 'boards' | 'members';

interface SpaceHeaderProps {
  spaceName: string;
  spaceColor: string;
  memberCount: number;
  activeTool: ToolType;
  onBack: () => void;
  onToolChange: (tool: ToolType) => void;
}

const tools: { id: ToolType; label: string; icon: React.ReactNode; activeColor: string }[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={16} strokeWidth={2} />, activeColor: 'bg-blue-500' },
  { id: 'memus', label: 'Memus', icon: <Send size={16} strokeWidth={2} />, activeColor: 'bg-purple-500' },
  { id: 'files', label: 'Files', icon: <FileText size={16} strokeWidth={2} />, activeColor: 'bg-cyan-500' },
  { id: 'calls', label: 'Calls', icon: <Phone size={16} strokeWidth={2} />, activeColor: 'bg-emerald-500' },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} strokeWidth={2} />, activeColor: 'bg-amber-500' },
  { id: 'boards', label: 'Boards', icon: <Layout size={16} strokeWidth={2} />, activeColor: 'bg-violet-500' },
  { id: 'members', label: 'Members', icon: <Users size={16} strokeWidth={2} />, activeColor: 'bg-rose-500' },
];

// Helper: Get initials from space name
const getInitials = (name: string) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

export default function SpaceHeader({ 
  spaceName, 
  spaceColor, 
  memberCount, 
  activeTool, 
  onBack, 
  onToolChange 
}: SpaceHeaderProps) {
  const initials = getInitials(spaceName);

  return (
    <div className="bg-white border-b border-gray-200/60 shadow-sm">
      {/* Top Bar */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="group p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 btn-press"
            >
              <ChevronLeft size={18} strokeWidth={2} className="text-gray-500 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            
            {/* ✅ Rounded rectangle icon with space colour */}
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
              style={{ background: spaceColor }}
            >
              {initials}
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">{spaceName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Users size={12} strokeWidth={2} className="text-gray-400" />
                <span className="text-[11px] text-gray-500 font-medium">{memberCount} members</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <Sparkles size={12} strokeWidth={2} className="text-blue-500" />
                <span className="text-[11px] text-blue-600 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Tool Tabs - Premium Apple-style */}
      <div className="px-4 border-t border-gray-100/80">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1">
          {tools.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`
                  group relative px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap btn-press
                  ${isActive 
                    ? 'text-blue-700 bg-blue-50/80 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}>
                    {tool.icon}
                  </span>
                  <span>{tool.label}</span>
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}