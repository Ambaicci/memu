'use client';

import { useState } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link, Image, Code, Quote, Paintbrush,
  Type, Minus, Plus, Heading1, Heading2, Heading3, Palette,
  ChevronDown, X, Wrench, Layout, Grid, Layers, Move,
  Sparkles, Image as ImageIcon, Wand2, Monitor, FileText,
  Square, Circle, ArrowRight, Minus as LineIcon, Triangle,
  Play, Pause, Timer, Zap, Eye, EyeOff, Copy, ArrowUp, ArrowDown,
  Trash2, Lock, Unlock, Maximize2
} from 'lucide-react';

interface SlidesToolDrawerProps {
  onFormat: (command: string, value?: string) => void;
  onInsert: (type: string) => void;
  onChangeLayout: (layout: 'title' | 'content' | 'two-column' | 'image' | 'blank' | 'section') => void;
  currentLayout?: string;
  onAddImage?: () => void;
  onAddTransition?: (transition: string) => void;
  onAddBackground?: (background: string) => void;
  onAddShape?: (shape: string) => void;
  onAddAnimation?: (animation: string) => void;
  onDuplicateSlide?: () => void;
  onMoveSlideUp?: () => void;
  onMoveSlideDown?: () => void;
  onTogglePresenterMode?: () => void;
}

const colorOptions = [
  '#4f46e5', '#0891b2', '#059669', '#dc2626', '#d97706', '#8b5cf6', '#ec4899', '#0f0f0f'
];

const backgroundColors = [
  { id: 'white', label: 'White', color: '#ffffff' },
  { id: 'cream', label: 'Cream', color: '#fafaf8' },
  { id: 'light-gray', label: 'Light Gray', color: '#f3f4f6' },
  { id: 'light-blue', label: 'Light Blue', color: '#dbeafe' },
  { id: 'light-green', label: 'Light Green', color: '#d1fae5' },
  { id: 'light-purple', label: 'Light Purple', color: '#ede9fe' },
  { id: 'gradient-1', label: 'Purple Gradient', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'gradient-2', label: 'Blue Gradient', gradient: 'linear-gradient(135deg, #667eea 0%, #00d2ff 100%)' },
  { id: 'gradient-3', label: 'Sunset', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'gradient-4', label: 'Ocean', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
];

const layoutOptions = [
  { id: 'title', label: 'Title', icon: <Type size={14} />, description: 'Large title slide' },
  { id: 'content', label: 'Content', icon: <FileText size={14} />, description: 'Bullet points' },
  { id: 'two-column', label: 'Two Column', icon: <Grid size={14} />, description: 'Split layout' },
  { id: 'image', label: 'Image Focus', icon: <ImageIcon size={14} />, description: 'Full-width image' },
  { id: 'blank', label: 'Blank', icon: <Square size={14} />, description: 'Empty canvas' },
  { id: 'section', label: 'Section', icon: <Heading1 size={14} />, description: 'Section divider' },
];

const shapeOptions = [
  { id: 'rectangle', label: 'Rectangle', icon: <Square size={14} /> },
  { id: 'circle', label: 'Circle', icon: <Circle size={14} /> },
  { id: 'triangle', label: 'Triangle', icon: <Triangle size={14} /> },
  { id: 'arrow', label: 'Arrow', icon: <ArrowRight size={14} /> },
  { id: 'line', label: 'Line', icon: <LineIcon size={14} /> },
];

const transitionOptions = [
  { id: 'none', label: 'None', icon: <X size={12} /> },
  { id: 'fade', label: 'Fade', icon: <Eye size={12} /> },
  { id: 'slide', label: 'Slide', icon: <Move size={12} /> },
  { id: 'zoom', label: 'Zoom', icon: <Maximize2 size={12} /> },
  { id: 'flip', label: 'Flip', icon: <Layers size={12} /> },
  { id: 'dissolve', label: 'Dissolve', icon: <Sparkles size={12} /> },
  { id: 'push', label: 'Push', icon: <ArrowRight size={12} /> },
  { id: 'wipe', label: 'Wipe', icon: <Move size={12} /> },
];

const animationOptions = [
  { id: 'none', label: 'None' },
  { id: 'fadeIn', label: 'Fade In' },
  { id: 'slideUp', label: 'Slide Up' },
  { id: 'slideLeft', label: 'Slide Left' },
  { id: 'zoomIn', label: 'Zoom In' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'rotate', label: 'Rotate' },
];

export default function SlidesToolDrawer({ 
  onFormat, 
  onInsert, 
  onChangeLayout, 
  currentLayout,
  onAddImage,
  onAddTransition,
  onAddBackground,
  onAddShape,
  onAddAnimation,
  onDuplicateSlide,
  onMoveSlideUp,
  onMoveSlideDown,
  onTogglePresenterMode,
}: SlidesToolDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showBackgrounds, setShowBackgrounds] = useState(false);

  return (
    <div className="relative">
      {/* Slides Toolbox Button - Purple themed */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
          isOpen 
            ? 'bg-[#7c3aed] text-white' 
            : 'bg-[#ede9fe] text-[#7c3aed] hover:bg-[#ddd6fe]'
        }`}
      >
        <Wand2 size={14} />
        <span>Slide Tools</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Slide Tools Drawer Panel - Landscape Layout */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-[#e8e7e3] p-4 w-[950px] max-w-[95vw]">
            
            {/* Row 1: Layout & Background */}
            <div className="mb-4 pb-4 border-b border-[#e8e7e3]">
              <div className="grid grid-cols-2 gap-4">
                {/* Layout */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Layout size={12} className="text-[#7c3aed]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Layout</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {layoutOptions.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => onChangeLayout(layout.id as any)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition ${
                          currentLayout === layout.id
                            ? 'bg-[#7c3aed] text-white'
                            : 'bg-[#f9fafb] text-[#777] hover:bg-[#ede9fe]'
                        }`}
                      >
                        {layout.icon}
                        <span className="font-medium">{layout.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Paintbrush size={12} className="text-[#059669]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Background</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {backgroundColors.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => onAddBackground?.(bg.gradient || bg.color)}
                        className="w-full aspect-square rounded-lg border border-[#e8e7e3] hover:scale-105 transition-transform"
                        style={{ background: bg.gradient || bg.color }}
                        title={bg.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Text & Shapes */}
            <div className="mb-4 pb-4 border-b border-[#e8e7e3]">
              <div className="grid grid-cols-2 gap-4">
                {/* Text Formatting */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Type size={12} className="text-[#4f46e5]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Text</span>
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
                    <div className="w-px h-4 bg-[#e8e7e3] mx-1" />
                    <div className="relative">
                      <button
                        onClick={() => setShowColors(!showColors)}
                        className="p-1.5 rounded-md hover:bg-[#f2f1ee] transition text-[#777]"
                        title="Text Color"
                      >
                        <Palette size={14} />
                      </button>
                      {showColors && (
                        <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-[#e8e7e3] flex gap-1 z-10">
                          {colorOptions.map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                onFormat('foreColor', color);
                                setShowColors(false);
                              }}
                              className="w-5 h-5 rounded-full transition-transform hover:scale-110 border border-[#e8e7e3]"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shapes */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Square size={12} className="text-[#0891b2]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Shapes</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {shapeOptions.map((shape) => (
                      <button
                        key={shape.id}
                        onClick={() => onAddShape?.(shape.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#f0f9ff] text-[#0891b2] hover:bg-[#e0f2fe] transition"
                      >
                        {shape.icon}
                        {shape.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Transitions & Animations */}
            <div className="mb-4 pb-4 border-b border-[#e8e7e3]">
              <div className="grid grid-cols-2 gap-4">
                {/* Transitions */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor size={12} className="text-[#d97706]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Transitions</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {transitionOptions.map((transition) => (
                      <button
                        key={transition.id}
                        onClick={() => onAddTransition?.(transition.id)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] bg-[#fffbeb] text-[#d97706] hover:bg-[#fef3c7] transition"
                      >
                        {transition.icon}
                        {transition.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animations */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={12} className="text-[#ec4899]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Animations</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {animationOptions.map((animation) => (
                      <button
                        key={animation.id}
                        onClick={() => onAddAnimation?.(animation.id)}
                        className="px-2 py-1.5 rounded-lg text-[10px] bg-[#fce7f3] text-[#ec4899] hover:bg-[#fbcfe8] transition"
                      >
                        {animation.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Insert & Slide Management */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                {/* Insert Elements */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={12} className="text-[#059669]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Insert</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onInsert('image')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#f0fdf4] text-[#059669] hover:bg-[#dcfce7] transition"
                    >
                      <ImageIcon size={12} />
                      Image
                    </button>
                    <button
                      onClick={() => onInsert('link')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#f0fdf4] text-[#059669] hover:bg-[#dcfce7] transition"
                    >
                      <Link size={12} />
                      Link
                    </button>
                    <button
                      onClick={() => onInsert('code')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#f0fdf4] text-[#059669] hover:bg-[#dcfce7] transition"
                    >
                      <Code size={12} />
                      Code
                    </button>
                    <button
                      onClick={() => onInsert('quote')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#f0fdf4] text-[#059669] hover:bg-[#dcfce7] transition"
                    >
                      <Quote size={12} />
                      Quote
                    </button>
                  </div>
                </div>

                {/* Slide Management */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={12} className="text-[#8b5cf6]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Slide</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={onDuplicateSlide}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#f5f3ff] text-[#8b5cf6] hover:bg-[#ede9fe] transition"
                    >
                      <Copy size={12} />
                      Duplicate
                    </button>
                    <button
                      onClick={onMoveSlideUp}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#f5f3ff] text-[#8b5cf6] hover:bg-[#ede9fe] transition"
                    >
                      <ArrowUp size={12} />
                      Move Up
                    </button>
                    <button
                      onClick={onMoveSlideDown}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#f5f3ff] text-[#8b5cf6] hover:bg-[#ede9fe] transition"
                    >
                      <ArrowDown size={12} />
                      Move Down
                    </button>
                    <button
                      onClick={onTogglePresenterMode}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#f5f3ff] text-[#8b5cf6] hover:bg-[#ede9fe] transition"
                    >
                      <Play size={12} />
                      Present
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}