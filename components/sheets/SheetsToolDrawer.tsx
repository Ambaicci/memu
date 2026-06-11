'use client';

import { useState } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Palette, Paintbrush, ChevronDown, Wrench, FunctionSquare, Sigma, Hash,
  Plus, Minus, Type, Grid, Merge, Split, ArrowUp, ArrowDown,
  Filter, SortAsc, DollarSign, Percent, Calendar, FlaskConical,
  Table, Rows, Columns, Trash2, Copy, Scissors
} from 'lucide-react';

interface SheetsToolDrawerProps {
  onFormat: (command: string, value?: string) => void;
  onInsertFormula: (formula: string) => void;
  onNumberFormat: (format: 'number' | 'currency' | 'percent' | 'date' | 'scientific' | 'decimal') => void;
}

const colorOptions = [
  '#0f0f0f', '#dc2626', '#059669', '#d97706', '#4f46e5', '#8b5cf6', '#ec4899', '#0891b2'
];

const fillColorOptions = [
  '#ffffff', '#fef3c7', '#d1fae5', '#dbeafe', '#ede9fe', '#fce7f3', '#fee2e2', '#f3f4f6'
];

const fontSizeOptions = ['10', '11', '12', '13', '14', '16', '18', '20', '24', '28', '32'];

const formulaCategories = [
  {
    label: 'Math',
    color: '#d97706',
    formulas: [
      { label: 'SUM', icon: <Sigma size={14} />, formula: '=SUM()', description: 'Adds a range of cells' },
      { label: 'AVERAGE', icon: <FunctionSquare size={14} />, formula: '=AVERAGE()', description: 'Average of a range' },
      { label: 'COUNT', icon: <Hash size={14} />, formula: '=COUNT()', description: 'Counts numeric values' },
      { label: 'MAX', icon: <ArrowUp size={14} />, formula: '=MAX()', description: 'Maximum value' },
      { label: 'MIN', icon: <ArrowDown size={14} />, formula: '=MIN()', description: 'Minimum value' },
    ]
  },
  {
    label: 'Logic',
    color: '#8b5cf6',
    formulas: [
      { label: 'IF', icon: <FunctionSquare size={14} />, formula: '=IF()', description: 'Conditional logic' },
      { label: 'AND', icon: <FunctionSquare size={14} />, formula: '=AND()', description: 'Logical AND' },
      { label: 'OR', icon: <FunctionSquare size={14} />, formula: '=OR()', description: 'Logical OR' },
    ]
  },
  {
    label: 'Text',
    color: '#059669',
    formulas: [
      { label: 'CONCAT', icon: <Type size={14} />, formula: '=CONCAT()', description: 'Join text strings' },
      { label: 'LEFT', icon: <Type size={14} />, formula: '=LEFT()', description: 'Extract from left' },
      { label: 'RIGHT', icon: <Type size={14} />, formula: '=RIGHT()', description: 'Extract from right' },
    ]
  },
  {
    label: 'Lookup',
    color: '#4f46e5',
    formulas: [
      { label: 'VLOOKUP', icon: <FlaskConical size={14} />, formula: '=VLOOKUP()', description: 'Vertical lookup' },
      { label: 'HLOOKUP', icon: <FlaskConical size={14} />, formula: '=HLOOKUP()', description: 'Horizontal lookup' },
    ]
  },
];

export default function SheetsToolDrawer({ onFormat, onInsertFormula, onNumberFormat }: SheetsToolDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showFillColor, setShowFillColor] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);

  return (
    <div className="relative">
      {/* Sheets Toolbox Button - Yellow themed */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
          isOpen 
            ? 'bg-[#d97706] text-white' 
            : 'bg-[#fffbeb] text-[#d97706] hover:bg-[#fef3c7]'
        }`}
      >
        <Wrench size={14} />
        <span>Tools</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Tools Drawer Panel - Landscape Layout */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-[#e8e7e3] p-4 w-[900px] max-w-[95vw]">
            
            {/* Row 1: Text & Font */}
            <div className="mb-4 pb-4 border-b border-[#e8e7e3]">
              <div className="flex items-center gap-2 mb-3">
                <Type size={12} className="text-[#d97706]" />
                <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Text & Font</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Font Style */}
                <div className="flex items-center gap-1 pr-2 border-r border-[#e8e7e3]">
                  <button
                    onClick={() => onFormat('bold')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Bold"
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    onClick={() => onFormat('italic')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Italic"
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    onClick={() => onFormat('underline')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Underline"
                  >
                    <Underline size={14} />
                  </button>
                </div>

                {/* Font Size */}
                <div className="relative pr-2 border-r border-[#e8e7e3]">
                  <button
                    onClick={() => setShowFontSize(!showFontSize)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706] text-[11px]"
                  >
                    Size
                    <ChevronDown size={10} />
                  </button>
                  {showFontSize && (
                    <div className="absolute top-full left-0 mt-1 p-1 bg-white rounded-lg shadow-lg border border-[#e8e7e3] flex flex-wrap gap-1 w-48 z-10">
                      {fontSizeOptions.map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            onFormat('fontSize', size);
                            setShowFontSize(false);
                          }}
                          className="px-2 py-1 rounded text-[11px] hover:bg-[#fffbeb] transition"
                        >
                          {size}px
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-1 pr-2 border-r border-[#e8e7e3]">
                  <button
                    onClick={() => onFormat('align', 'left')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Align Left"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    onClick={() => onFormat('align', 'center')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Align Center"
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button
                    onClick={() => onFormat('align', 'right')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Align Right"
                  >
                    <AlignRight size={14} />
                  </button>
                </div>

                {/* Borders */}
                <div className="flex items-center gap-1 pr-2 border-r border-[#e8e7e3]">
                  <button
                    onClick={() => onFormat('border', 'all')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="All Borders"
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    onClick={() => onFormat('border', 'top')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Top Border"
                  >
                    <Rows size={14} />
                  </button>
                  <button
                    onClick={() => onFormat('border', 'bottom')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Bottom Border"
                  >
                    <Columns size={14} />
                  </button>
                </div>

                {/* Merge */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onFormat('merge')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Merge Cells"
                  >
                    <Merge size={14} />
                  </button>
                  <button
                    onClick={() => onFormat('unmerge')}
                    className="p-1.5 rounded-md hover:bg-[#fffbeb] transition text-[#d97706]"
                    title="Unmerge Cells"
                  >
                    <Split size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Colors & Number Format */}
            <div className="mb-4 pb-4 border-b border-[#e8e7e3]">
              <div className="grid grid-cols-2 gap-4">
                {/* Colors */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Palette size={12} className="text-[#8b5cf6]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Colors</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Text Color */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowColors(!showColors); setShowFillColor(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition"
                      >
                        <Palette size={12} />
                        Text
                      </button>
                      {showColors && (
                        <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-[#e8e7e3] flex gap-1 z-10">
                          {colorOptions.map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                onFormat('color', color);
                                setShowColors(false);
                              }}
                              className="w-5 h-5 rounded-full transition-transform hover:scale-110 border border-[#e8e7e3]"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fill Color */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowFillColor(!showFillColor); setShowColors(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition"
                      >
                        <Paintbrush size={12} />
                        Fill
                      </button>
                      {showFillColor && (
                        <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-[#e8e7e3] flex gap-1 z-10">
                          {fillColorOptions.map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                onFormat('fillColor', color);
                                setShowFillColor(false);
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

                {/* Number Format */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Hash size={12} className="text-[#059669]" />
                    <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Number Format</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onNumberFormat('number')}
                      className="px-3 py-1.5 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition font-medium"
                    >
                      123
                    </button>
                    <button
                      onClick={() => onNumberFormat('currency')}
                      className="px-3 py-1.5 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition font-medium"
                    >
                      <DollarSign size={10} className="inline" />1.00
                    </button>
                    <button
                      onClick={() => onNumberFormat('percent')}
                      className="px-3 py-1.5 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition font-medium"
                    >
                      50<Percent size={10} className="inline" />
                    </button>
                    <button
                      onClick={() => onNumberFormat('date')}
                      className="px-3 py-1.5 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition font-medium"
                    >
                      <Calendar size={10} className="inline" /> Date
                    </button>
                    <button
                      onClick={() => onNumberFormat('scientific')}
                      className="px-3 py-1.5 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition font-medium"
                    >
                      1.2e+3
                    </button>
                    <button
                      onClick={() => onNumberFormat('decimal')}
                      className="px-3 py-1.5 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition font-medium"
                    >
                      .00
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Formulas */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FunctionSquare size={12} className="text-[#4f46e5]" />
                <span className="text-[11px] font-semibold text-[#777] uppercase tracking-wide">Formulas</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {formulaCategories.map((category) => (
                  <div key={category.label}>
                    <div className="text-[10px] font-semibold mb-2 uppercase tracking-wide" style={{ color: category.color }}>
                      {category.label}
                    </div>
                    <div className="flex flex-col gap-1">
                      {category.formulas.map((formula) => (
                        <button
                          key={formula.label}
                          onClick={() => onInsertFormula(formula.formula)}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition text-left"
                          title={formula.description}
                        >
                          {formula.icon}
                          <span className="font-medium">{formula.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}