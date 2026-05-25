'use client';

import { useState } from 'react';
import { 
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Palette, ChevronDown, Wrench, FunctionSquare, Sigma, Hash,
  Plus, Minus, Type, Grid
} from 'lucide-react';

interface SheetsToolDrawerProps {
  onFormat: (command: string, value?: string) => void;
  onInsertFormula: (formula: string) => void;
  onNumberFormat: (format: 'number' | 'currency' | 'percent' | 'date') => void;
}

const colorOptions = [
  '#0f0f0f', '#dc2626', '#059669', '#d97706', '#4f46e5', '#8b5cf6', '#ec4899', '#0891b2'
];

const formulaOptions = [
  { label: 'SUM', icon: <Sigma size={14} />, formula: '=SUM()', description: 'Adds a range of cells' },
  { label: 'AVERAGE', icon: <FunctionSquare size={14} />, formula: '=AVERAGE()', description: 'Average of a range' },
  { label: 'COUNT', icon: <Hash size={14} />, formula: '=COUNT()', description: 'Counts numeric values' },
  { label: 'MAX', icon: <Plus size={14} />, formula: '=MAX()', description: 'Maximum value' },
  { label: 'MIN', icon: <Minus size={14} />, formula: '=MIN()', description: 'Minimum value' },
];

export default function SheetsToolDrawer({ onFormat, onInsertFormula, onNumberFormat }: SheetsToolDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

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

      {/* Tools Drawer Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#e8e7e3] p-3 w-[500px] max-w-[95vw]">
            
            {/* Text Formatting */}
            <div className="mb-3 pb-3 border-b border-[#e8e7e3]">
              <div className="flex items-center gap-2 mb-2">
                <Type size={12} className="text-[#d97706]" />
                <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Text Formatting</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
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
                <div className="w-px h-4 bg-[#e8e7e3] mx-1" />
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
            </div>

            {/* Number Formatting */}
            <div className="mb-3 pb-3 border-b border-[#e8e7e3]">
              <div className="flex items-center gap-2 mb-2">
                <Hash size={12} className="text-[#059669]" />
                <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Number Format</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onNumberFormat('number')}
                  className="px-3 py-1 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition"
                >
                  123
                </button>
                <button
                  onClick={() => onNumberFormat('currency')}
                  className="px-3 py-1 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition"
                >
                  $1.00
                </button>
                <button
                  onClick={() => onNumberFormat('percent')}
                  className="px-3 py-1 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition"
                >
                  50%
                </button>
              </div>
            </div>

            {/* Formulas */}
            <div className="mb-3 pb-3 border-b border-[#e8e7e3]">
              <div className="flex items-center gap-2 mb-2">
                <FunctionSquare size={12} className="text-[#8b5cf6]" />
                <span className="text-[11px] font-medium text-[#777] uppercase tracking-wide">Formulas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formulaOptions.map((formula) => (
                  <button
                    key={formula.label}
                    onClick={() => onInsertFormula(formula.formula)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition"
                    title={formula.description}
                  >
                    {formula.icon}
                    {formula.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowColors(!showColors)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] bg-[#fffbeb] text-[#777] hover:bg-[#fef3c7] transition"
                >
                  <Palette size={12} />
                  Text Color
                </button>
                {showColors && (
                  <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-[#e8e7e3] flex gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          onFormat('color', color);
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