'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, Highlighter,
  Heading1, Heading2, Heading3, Type,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, IndentIncrease, IndentDecrease,
  Link as LinkIcon, Image, Table, Code, Quote, Minus,
  ChevronDown, Check, Sparkles
} from 'lucide-react';

interface DocsToolboxProps {
  onFormat: (command: string, value?: string) => void;
  onInsert: (type: string) => void;
  wordCount?: number;
  charCount?: number;
}

type ToolItem = {
  icon: React.ElementType;
  action: () => void;
  tooltip: string;
  shortcut?: string;
  color: string;
};

type ToolGroup = {
  label: string;
  color: string;
  tools: ToolItem[];
};

export default function DocsToolbox({ onFormat, onInsert, wordCount, charCount }: DocsToolboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveTooltip(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toolGroups: ToolGroup[] = [
    {
      label: 'Text',
      color: '#059669',
      tools: [
        { icon: Bold, action: () => onFormat('bold'), tooltip: 'Bold', shortcut: 'Ctrl+B', color: '#059669' },
        { icon: Italic, action: () => onFormat('italic'), tooltip: 'Italic', shortcut: 'Ctrl+I', color: '#059669' },
        { icon: Underline, action: () => onFormat('underline'), tooltip: 'Underline', shortcut: 'Ctrl+U', color: '#059669' },
        { icon: Strikethrough, action: () => onFormat('strikeThrough'), tooltip: 'Strikethrough', color: '#6b7280' },
        { icon: Highlighter, action: () => onFormat('hiliteColor', '#fef08a'), tooltip: 'Highlight', color: '#f59e0b' },
        { icon: Type, action: () => onFormat('removeFormat'), tooltip: 'Clear Formatting', color: '#6b7280' },
      ],
    },
    {
      label: 'Paragraph',
      color: '#4f46e5',
      tools: [
        { icon: Heading1, action: () => onFormat('formatBlock', '<h1>'), tooltip: 'Heading 1', color: '#4f46e5' },
        { icon: Heading2, action: () => onFormat('formatBlock', '<h2>'), tooltip: 'Heading 2', color: '#4f46e5' },
        { icon: Heading3, action: () => onFormat('formatBlock', '<h3>'), tooltip: 'Heading 3', color: '#4f46e5' },
        { icon: AlignLeft, action: () => onFormat('justifyLeft'), tooltip: 'Align Left', color: '#6b7280' },
        { icon: AlignCenter, action: () => onFormat('justifyCenter'), tooltip: 'Align Center', color: '#6b7280' },
        { icon: AlignRight, action: () => onFormat('justifyRight'), tooltip: 'Align Right', color: '#6b7280' },
        { icon: AlignJustify, action: () => onFormat('justifyFull'), tooltip: 'Justify', color: '#6b7280' },
      ],
    },
    {
      label: 'Structure',
      color: '#d97706',
      tools: [
        { icon: List, action: () => onFormat('insertUnorderedList'), tooltip: 'Bullet List', color: '#d97706' },
        { icon: ListOrdered, action: () => onFormat('insertOrderedList'), tooltip: 'Numbered List', color: '#d97706' },
        { icon: IndentIncrease, action: () => onFormat('indent'), tooltip: 'Increase Indent', color: '#6b7280' },
        { icon: IndentDecrease, action: () => onFormat('outdent'), tooltip: 'Decrease Indent', color: '#6b7280' },
      ],
    },
    {
      label: 'Insert',
      color: '#7c3aed',
      tools: [
        { icon: LinkIcon, action: () => onInsert('link'), tooltip: 'Insert Link', color: '#7c3aed' },
        { icon: Image, action: () => onInsert('image'), tooltip: 'Insert Image', color: '#7c3aed' },
        { icon: Table, action: () => onInsert('table'), tooltip: 'Insert Table', color: '#7c3aed' },
        { icon: Code, action: () => onInsert('code'), tooltip: 'Code Block', color: '#7c3aed' },
        { icon: Quote, action: () => onInsert('quote'), tooltip: 'Blockquote', color: '#7c3aed' },
        { icon: Minus, action: () => onInsert('hr'), tooltip: 'Horizontal Rule', color: '#6b7280' },
      ],
    },
  ];

  const ToolButton = ({ icon: Icon, action, tooltip, shortcut, color }: ToolItem) => (
    <button
      onClick={action}
      onMouseEnter={() => setActiveTooltip(tooltip)}
      onMouseLeave={() => setActiveTooltip(null)}
      className="group relative p-2 rounded-lg transition-all duration-150 hover:scale-105"
      title={tooltip}
    >
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-15 transition-opacity duration-150" style={{ backgroundColor: color }} />
      <Icon size={18} style={{ color }} className="transition-transform duration-150 group-hover:scale-110" />
      {shortcut && (
        <span className="absolute -bottom-1 -right-1 text-[8px] text-[#777] bg-white/90 px-1 rounded opacity-0 group-hover:opacity-100 transition shadow-sm">
          {shortcut.replace('Ctrl+', '⌘').replace('B', '').replace('I', '').replace('U', '') || shortcut}
        </span>
      )}
    </button>
  );

  return (
    <div className="relative" ref={containerRef}>
      {/* Green Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setActiveTooltip('Formatting Tools')}
        onMouseLeave={() => setActiveTooltip(null)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 shadow-sm ${
          isOpen ? 'bg-[#047857] text-white shadow-md' : 'bg-[#059669] text-white hover:bg-[#047857] hover:shadow-md'
        }`}
      >
        <Sparkles size={14} className="animate-pulse-slow" />
        Toolbox
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Tooltip */}
      {activeTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#1a1a1a] text-white text-[10px] rounded-lg whitespace-nowrap pointer-events-none z-50 shadow-lg">
          {activeTooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-[#1a1a1a] rotate-45" />
        </div>
      )}

      {/* LANDSCAPE DROPDOWN PANEL (Horizontal Ribbon) */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white/95 backdrop-blur-md border border-[#e8e7e3] rounded-xl shadow-xl p-3 z-50 animate-fadeIn min-w-[800px] max-w-[95vw]">
          <div className="flex items-center gap-5 overflow-x-auto pb-1 custom-scroll">
            {/* Tool Groups laid out horizontally */}
            {toolGroups.map((group, idx) => (
              <div key={group.label} className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1">
                  {group.tools.map((tool, i) => (
                    <ToolButton key={i} {...tool} />
                  ))}
                </div>
                {idx < toolGroups.length - 1 && (
                  <div className="w-px h-8 bg-[#e8e7e3] flex-shrink-0" />
                )}
              </div>
            ))}

            {/* Stats on the far right */}
            {(wordCount !== undefined || charCount !== undefined) && (
              <div className="ml-auto flex items-center gap-3 text-[10px] text-[#777] flex-shrink-0 pl-3 border-l border-[#e8e7e3]">
                <span className="flex items-center gap-1">
                  <Type size={10} /> {wordCount ?? 0} words
                </span>
                <span>{charCount ?? 0} chars</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
        .custom-scroll::-webkit-scrollbar { height: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
      `}</style>
    </div>
  );
}