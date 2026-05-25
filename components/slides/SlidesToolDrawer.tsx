'use client';

import { useState } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link, Image, Code, Quote, Paintbrush,
  Type, Minus, Plus, Heading1, Heading2, Heading3, Palette,
  ChevronDown, X, Wrench, Layout, Grid, Layers, Move,
  Sparkles, Image as ImageIcon, Wand2, Monitor, FileText
} from 'lucide-react';

interface SlidesToolDrawerProps {
  onFormat: (command: string, value?: string) => void;
  onInsert: (type: string) => void;
  onChangeLayout: (layout: 'title' | 'content' | 'two-column' | 'image') => void;
  currentLayout?: string;
  onAddImage?: () => void;
  onAddTransition?: (transition: string) => void;
}

const colorOptions = [
  '#4f46e5', '#0891b2', '#059669', '#dc2626', '#d97706', '#8b5cf6', '#ec4899', '#0f0f0f'
];

const layoutOptions = [
  { id: 'title', label: 'Title Slide', icon: <Type size={14} />, description: 'Large title and subtitle' },
  { id: 'content', label: 'Content', icon: <FileText size={14} />, description: 'Bullet points and text' },
  { id: 'two-column', label: 'Two Column', icon: <Grid size={14} />, description: 'Split layout' },
  { id: 'image', label: 'Image Focus', icon: <ImageIcon size={14} />, description: 'Full-width image' },
];

const transitionOptions = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'flip', label: 'Flip' },
];

export default function SlidesToolDrawer({ 
  onFormat, 
  onInsert, 
  onChangeLayout, 
  currentLayout,
  onAddImage,
  onAddTransition 
}: SlidesToolDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);
  const [showTransitions, setShowTransitions] = useState(false);

  return (
    <div className="relative">
      {/* Slides Toolbox Button - Purple themed */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
          isOpen 
            ? 'bg-[#7c3aed] text-white' 
            : 'bg-[#ede9fe] text-[#7c3aed] hover:bg-[#c4b5fd]'
        }`}
      >
        <Wand2 size={14} />
        <span>Slide Tools</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Slide Tools Drawer Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#e8e7e3] p-3 w-[600px] max-w-[95vw]">
            
            {/* Layout Section */}
            <div className="mb-3 pb-3 border-b border-[#e8e7e3]">
              <div className="flex items-center gap-2 mb-2">
                <Layout size={12} className="text-[#7c3aed]" />
                <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Slide Layout</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {layoutOptions.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => {
                      onChangeLayout(layout.id as any);
                      setShowLayouts(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition ${
                      currentLayout === layout.id
                        ? 'bg-[#7c3aed] text-white'
                        : 'bg-[#f2f1ee] text-[#777] hover:bg-[#e8e7e3]'
                    }`}
                  >
                    {layout.icon}
                    {layout.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Formatting */}
            <div className="mb-3 pb-3 border-b border-[#e8e7e3]">
              <div className="flex items-center gap-2 mb-2">
                <Type size={12} className="text-[#4f46e5]" />
                <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Text Formatting</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => onFormat('bold')}
                  className="p-1.5 rounded-md hover:bg-[#ede9fe] transition text-[#4f46e5]"
                  title="Bold"
                >
                  <Bold size={14} />
                </button>
                <button
                  onClick={() => onFormat('italic')}
                  className="p-1.5 rounded-md hover:bg-[#ede9fe] transition text-[#4f46e5]"
                  title="Italic"
                >
                  <Italic size={14} />
                </button>
                <button
                  onClick={() => onFormat('underline')}
                  className="p-1.5 rounded-md hover:bg-[#ede9fe] transition text-[#4f46e5]"
                  title="Underline"
                >
                  <Underline size={14} />
                </button>
                <div className="w-px h-4 bg-[#e8e7e3] mx-1" />
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
                <div className="w-px h-4 bg-[#e8e7e3] mx-1" />
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
            </div>

            {/* Insert Elements */}
            <div className="mb-3 pb-3 border-b border-[#e8e7e3]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-[#059669]" />
                <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Insert</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onInsert('image')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] bg-[#f2f1ee] text-[#777] hover:bg-[#e8e7e3] transition"
                >
                  <ImageIcon size={14} />
                  Image
                </button>
                <button
                  onClick={() => onInsert('link')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] bg-[#f2f1ee] text-[#777] hover:bg-[#e8e7e3] transition"
                >
                  <Link size={14} />
                  Link
                </button>
                <button
                  onClick={() => onInsert('code')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] bg-[#f2f1ee] text-[#777] hover:bg-[#e8e7e3] transition"
                >
                  <Code size={14} />
                  Code Block
                </button>
              </div>
            </div>

            {/* Slide Transitions */}
            <div className="mb-3 pb-3 border-b border-[#e8e7e3]">
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={12} className="text-[#0891b2]" />
                <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Transition</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {transitionOptions.map((transition) => (
                  <button
                    key={transition.id}
                    onClick={() => onAddTransition?.(transition.id)}
                    className="px-3 py-1.5 rounded-lg text-[12px] bg-[#f2f1ee] text-[#777] hover:bg-[#e8e7e3] transition"
                  >
                    {transition.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font & Color */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Font Family */}
              <select
                onChange={(e) => onFormat('fontName', e.target.value)}
                className="p-1.5 rounded-md border border-[#e8e7e3] text-[11px] bg-white focus:outline-none focus:border-[#4f46e5]"
                defaultValue="DM Sans"
              >
                <option value="DM Sans">DM Sans</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
                <option value="Arial">Arial</option>
              </select>

              {/* Font Size */}
              <div className="flex items-center gap-0.5">
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