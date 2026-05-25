'use client';

import { useState } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link, Image, Code, Quote, Paintbrush,
  Type, Minus, Plus, Heading1, Heading2, Heading3, Palette,
  ChevronDown, X, Wrench
} from 'lucide-react';

interface ToolDrawerProps {
  onFormat: (command: string, value?: string) => void;
  onInsert: (type: string) => void;
}

const colorOptions = [
  '#4f46e5', '#0891b2', '#059669', '#dc2626', '#d97706', '#8b5cf6', '#ec4899', '#0f0f0f'
];

export default function ToolDrawer({ onFormat, onInsert }: ToolDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);

  return (
    <div className="relative">
      {/* Toolbox Button - Green themed, inside toolbar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
          isOpen 
            ? 'bg-[#059669] text-white' 
            : 'bg-[#d1fae5] text-[#059669] hover:bg-[#a7f3d0]'
        }`}
      >
        <Wrench size={14} />
        <span>Toolbox</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Tool Drawer Panel - Dropdown below button */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#e8e7e3] p-3 w-[500px] max-w-[90vw]">
            <div className="flex flex-wrap items-center gap-1">
              {/* Text Formatting */}
              <div className="flex items-center gap-0.5 px-1">
                <button
                  onClick={() => onFormat('bold')}
                  className="p-1.5 rounded-md hover:bg-[#ede9fe] transition text-[#4f46e5]"
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={14} />
                </button>
                <button
                  onClick={() => onFormat('italic')}
                  className="p-1.5 rounded-md hover:bg-[#ede9fe] transition text-[#4f46e5]"
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={14} />
                </button>
                <button
                  onClick={() => onFormat('underline')}
                  className="p-1.5 rounded-md hover:bg-[#ede9fe] transition text-[#4f46e5]"
                  title="Underline (Ctrl+U)"
                >
                  <Underline size={14} />
                </button>
              </div>

              <div className="w-px h-5 bg-[#e8e7e3]" />

              {/* Headings */}
              <div className="flex items-center gap-0.5 px-1">
                <button
                  onClick={() => onFormat('formatBlock', '<h1>')}
                  className="p-1.5 rounded-md hover:bg-[#d1fae5] transition text-[#059669]"
                  title="Heading 1"
                >
                  <Heading1 size={14} />
                </button>
                <button
                  onClick={() => onFormat('formatBlock', '<h2>')}
                  className="p-1.5 rounded-md hover:bg-[#d1fae5] transition text-[#059669]"
                  title="Heading 2"
                >
                  <Heading2 size={14} />
                </button>
                <button
                  onClick={() => onFormat('formatBlock', '<h3>')}
                  className="p-1.5 rounded-md hover:bg-[#d1fae5] transition text-[#059669]"
                  title="Heading 3"
                >
                  <Heading3 size={14} />
                </button>
              </div>

              <div className="w-px h-5 bg-[#e8e7e3]" />

              {/* Alignment */}
              <div className="flex items-center gap-0.5 px-1">
                <button
                  onClick={() => onFormat('justifyLeft')}
                  className="p-1.5 rounded-md hover:bg-[#fef3c7] transition text-[#d97706]"
                  title="Align Left"
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  onClick={() => onFormat('justifyCenter')}
                  className="p-1.5 rounded-md hover:bg-[#fef3c7] transition text-[#d97706]"
                  title="Align Center"
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  onClick={() => onFormat('justifyRight')}
                  className="p-1.5 rounded-md hover:bg-[#fef3c7] transition text-[#d97706]"
                  title="Align Right"
                >
                  <AlignRight size={14} />
                </button>
              </div>

              <div className="w-px h-5 bg-[#e8e7e3]" />

              {/* Lists */}
              <div className="flex items-center gap-0.5 px-1">
                <button
                  onClick={() => onFormat('insertUnorderedList')}
                  className="p-1.5 rounded-md hover:bg-[#fee2e2] transition text-[#dc2626]"
                  title="Bullet List"
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => onFormat('insertOrderedList')}
                  className="p-1.5 rounded-md hover:bg-[#fee2e2] transition text-[#dc2626]"
                  title="Numbered List"
                >
                  <ListOrdered size={14} />
                </button>
              </div>

              <div className="w-px h-5 bg-[#e8e7e3]" />

              {/* Insert */}
              <div className="flex items-center gap-0.5 px-1">
                <button
                  onClick={() => onInsert('link')}
                  className="p-1.5 rounded-md hover:bg-[#e0e7ff] transition text-[#4338ca]"
                  title="Insert Link"
                >
                  <Link size={14} />
                </button>
                <button
                  onClick={() => onInsert('image')}
                  className="p-1.5 rounded-md hover:bg-[#e0e7ff] transition text-[#4338ca]"
                  title="Insert Image"
                >
                  <Image size={14} />
                </button>
                <button
                  onClick={() => onInsert('code')}
                  className="p-1.5 rounded-md hover:bg-[#e0e7ff] transition text-[#4338ca]"
                  title="Code Block"
                >
                  <Code size={14} />
                </button>
                <button
                  onClick={() => onInsert('quote')}
                  className="p-1.5 rounded-md hover:bg-[#e0e7ff] transition text-[#4338ca]"
                  title="Quote"
                >
                  <Quote size={14} />
                </button>
              </div>

              <div className="w-px h-5 bg-[#e8e7e3]" />

              {/* Text Size */}
              <div className="flex items-center gap-0.5 px-1">
                <button
                  onClick={() => onFormat('fontSize', '4')}
                  className="p-1.5 rounded-md hover:bg-[#fce7f3] transition text-[#be185d]"
                  title="Increase Font Size"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => onFormat('fontSize', '2')}
                  className="p-1.5 rounded-md hover:bg-[#fce7f3] transition text-[#be185d]"
                  title="Decrease Font Size"
                >
                  <Minus size={14} />
                </button>
              </div>

              <div className="w-px h-5 bg-[#e8e7e3]" />

              {/* Font Family */}
              <div className="px-1">
                <select
                  onChange={(e) => onFormat('fontName', e.target.value)}
                  className="p-1 rounded-md border border-[#e8e7e3] text-[11px] bg-white focus:outline-none focus:border-[#4f46e5]"
                  defaultValue="DM Sans"
                >
                  <option value="DM Sans">DM Sans</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Arial">Arial</option>
                </select>
              </div>

              <div className="w-px h-5 bg-[#e8e7e3]" />

              {/* Text Color */}
              <div className="relative">
                <button
                  onClick={() => setShowColors(!showColors)}
                  className="p-1.5 rounded-md hover:bg-[#f2f1ee] transition text-[#777]"
                  title="Text Color"
                >
                  <Palette size={14} />
                </button>
                {showColors && (
                  <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-[#e8e7e3] flex gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          onFormat('foreColor', color);
                          setShowColors(false);
                        }}
                        className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}