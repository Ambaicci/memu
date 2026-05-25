'use client';

import { ChevronLeft, MessageSquare, Send, FileText, Phone, CheckSquare, Layout, Users, Sparkles } from 'lucide-react';

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
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={16} />, activeColor: 'bg-[#4f46e5]' },
  { id: 'memus', label: 'Memus', icon: <Send size={16} />, activeColor: 'bg-[#8b5cf6]' },
  { id: 'files', label: 'Files', icon: <FileText size={16} />, activeColor: 'bg-[#0891b2]' },
  { id: 'calls', label: 'Calls', icon: <Phone size={16} />, activeColor: 'bg-[#059669]' },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} />, activeColor: 'bg-[#d97706]' },
  { id: 'boards', label: 'Boards', icon: <Layout size={16} />, activeColor: 'bg-[#7c3aed]' },
  { id: 'members', label: 'Members', icon: <Users size={16} />, activeColor: 'bg-[#dc2626]' },
];

export default function SpaceHeader({ spaceName, spaceColor, memberCount, activeTool, onBack, onToolChange }: SpaceHeaderProps) {
  return (
    <div className="bg-white border-b border-[#e8e7e3]">
      {/* Top Bar */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="p-2 rounded-lg hover:bg-[#f2f1ee] transition-all duration-200 group"
            >
              <ChevronLeft size={18} className="text-[#777] group-hover:text-[#4f46e5] group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: spaceColor + '15' }}>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: spaceColor }} />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#0f0f0f]">{spaceName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Users size={12} className="text-[#777]" />
                <span className="text-[11px] text-[#777]">{memberCount} members</span>
                <span className="w-1 h-1 rounded-full bg-[#ddd]" />
                <Sparkles size={12} className="text-[#4f46e5]" />
                <span className="text-[11px] text-[#4f46e5]">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Tabs - Apple-style */}
      <div className="px-4 border-t border-[#f2f1ee]">
        <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`group relative px-5 py-3 text-[13px] font-medium transition-all duration-200 ${
                activeTool === tool.id
                  ? 'text-[#0f0f0f]'
                  : 'text-[#777] hover:text-[#0f0f0f]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`transition-colors duration-200 ${activeTool === tool.id ? 'text-[#4f46e5]' : 'text-[#777] group-hover:text-[#4f46e5]'}`}>
                  {tool.icon}
                </span>
                <span>{tool.label}</span>
              </div>
              {activeTool === tool.id && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full mx-5"
                  style={{ backgroundColor: spaceColor }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}