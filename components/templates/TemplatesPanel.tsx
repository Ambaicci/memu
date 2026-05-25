'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Trash2, Plus, Maximize2, Minimize2, Bold, Italic, 
  AlignLeft, AlignCenter, AlignRight, Grid, X,
  Copy, Download, Save, FileSpreadsheet, Search, Wrench
} from 'lucide-react';
import SheetsToolDrawer from '../sheets/SheetsToolDrawer';
interface CellData {
  value: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  color: string;
}

interface Sheet {
  id: string;
  name: string;
  data: CellData[][];
}

interface Workbook {
  id: string;
  name: string;
  sheets: Sheet[];
  lastEdited: string;
}

const ROWS = 30;
const COLS = 10;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Create empty cell
const emptyCell = (): CellData => ({
  value: '',
  bold: false,
  italic: false,
  align: 'left',
  color: '#0f0f0f',
});

// Create empty sheet
const createEmptySheet = (name: string): Sheet => {
  const data: CellData[][] = [];
  for (let i = 0; i < ROWS; i++) {
    data[i] = [];
    for (let j = 0; j < COLS; j++) {
      data[i][j] = emptyCell();
    }
  }
  return { id: Date.now().toString() + Math.random(), name, data };
};

export default function SheetsPanel() {
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [activeWorkbookId, setActiveWorkbookId] = useState<string | null>(null);
  const [workbookName, setWorkbookName] = useState('Untitled');
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newWorkbookName, setNewWorkbookName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('memu_sheets_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      setWorkbooks(parsed);
      if (parsed.length > 0) {
        setActiveWorkbookId(parsed[0].id);
        setWorkbookName(parsed[0].name);
        setSheets(parsed[0].sheets);
        setActiveSheetId(parsed[0].sheets[0]?.id);
      }
    } else {
      const defaultSheet = createEmptySheet('Sheet1');
      const defaultWorkbook: Workbook = {
        id: Date.now().toString(),
        name: 'Untitled',
        sheets: [defaultSheet],
        lastEdited: 'Just now',
      };
      setWorkbooks([defaultWorkbook]);
      setActiveWorkbookId(defaultWorkbook.id);
      setWorkbookName(defaultWorkbook.name);
      setSheets([defaultSheet]);
      setActiveSheetId(defaultSheet.id);
      localStorage.setItem('memu_sheets_v2', JSON.stringify([defaultWorkbook]));
    }
  }, []);

  // Auto-save
  const autoSave = () => {
    if (!activeWorkbookId) return;
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const updated = workbooks.map(w =>
        w.id === activeWorkbookId
          ? { ...w, name: workbookName, sheets, lastEdited: new Date().toLocaleDateString() }
          : w
      );
      setWorkbooks(updated);
      localStorage.setItem('memu_sheets_v2', JSON.stringify(updated));
      setIsSaving(false);
      setTimeout(() => setIsSaving(false), 800);
    }, 800);
  };

  useEffect(() => {
    if (activeWorkbookId) autoSave();
  }, [sheets, workbookName]);

  // Focus edit input when cell selected
  useEffect(() => {
    if (selectedCell && activeSheet) {
      const cell = activeSheet.data[selectedCell.row][selectedCell.col];
      setEditValue(cell.value);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectedCell]);

  const getActiveSheet = () => sheets.find(s => s.id === activeSheetId);

  const updateCell = (row: number, col: number, value: string) => {
    const sheetIndex = sheets.findIndex(s => s.id === activeSheetId);
    if (sheetIndex === -1) return;
    const newSheets = [...sheets];
    const newData = [...newSheets[sheetIndex].data];
    newData[row][col] = { ...newData[row][col], value };
    newSheets[sheetIndex].data = newData;
    setSheets(newSheets);
  };

  const updateCellFormat = (format: string, value?: any) => {
    if (!selectedCell || !activeSheet) return;
    const sheetIndex = sheets.findIndex(s => s.id === activeSheetId);
    if (sheetIndex === -1) return;
    const newSheets = [...sheets];
    const newData = [...newSheets[sheetIndex].data];
    const cell = newData[selectedCell.row][selectedCell.col];
    
    switch (format) {
      case 'bold': cell.bold = !cell.bold; break;
      case 'italic': cell.italic = !cell.italic; break;
      case 'align': cell.align = value; break;
      case 'color': cell.color = value; break;
    }
    newSheets[sheetIndex].data = newData;
    setSheets(newSheets);
  };

  const handleEditSubmit = () => {
    if (selectedCell) {
      updateCell(selectedCell.row, selectedCell.col, editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
      if (selectedCell && selectedCell.row + 1 < ROWS) {
        setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
      }
    }
    if (e.key === 'Escape') {
      setSelectedCell(null);
    }
    if (selectedCell) {
      if (e.key === 'ArrowUp' && selectedCell.row > 0) {
        e.preventDefault();
        setSelectedCell({ row: selectedCell.row - 1, col: selectedCell.col });
      }
      if (e.key === 'ArrowDown' && selectedCell.row + 1 < ROWS) {
        e.preventDefault();
        setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
      }
      if (e.key === 'ArrowLeft' && selectedCell.col > 0) {
        e.preventDefault();
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col - 1 });
      }
      if (e.key === 'ArrowRight' && selectedCell.col + 1 < COLS) {
        e.preventDefault();
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 });
      }
    }
  };

  const handleFormat = (command: string, value?: string) => {
    updateCellFormat(command, value);
  };

  const handleInsertFormula = (formula: string) => {
    if (selectedCell) {
      updateCell(selectedCell.row, selectedCell.col, formula);
      setEditValue(formula);
    }
  };

  const handleNumberFormat = (format: string) => {
    if (!selectedCell) return;
    const cell = activeSheet?.data[selectedCell.row][selectedCell.col];
    if (cell && !isNaN(parseFloat(cell.value))) {
      const num = parseFloat(cell.value);
      let formatted = '';
      switch (format) {
        case 'number':
          formatted = num.toString();
          break;
        case 'currency':
          formatted = `$${num.toFixed(2)}`;
          break;
        case 'percent':
          formatted = `${(num * 100).toFixed(1)}%`;
          break;
        default:
          formatted = cell.value;
      }
      updateCell(selectedCell.row, selectedCell.col, formatted);
      setEditValue(formatted);
    }
  };

  const addNewSheet = () => {
    const newSheet = createEmptySheet(`Sheet${sheets.length + 1}`);
    setSheets([...sheets, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  const deleteSheet = (sheetId: string) => {
    if (sheets.length === 1) return;
    const newSheets = sheets.filter(s => s.id !== sheetId);
    setSheets(newSheets);
    if (activeSheetId === sheetId) setActiveSheetId(newSheets[0].id);
  };

  const createNewWorkbook = () => {
    if (!newWorkbookName.trim()) return;
    const newSheet = createEmptySheet('Sheet1');
    const newWorkbook: Workbook = {
      id: Date.now().toString(),
      name: newWorkbookName,
      sheets: [newSheet],
      lastEdited: 'Just now',
    };
    setWorkbooks([...workbooks, newWorkbook]);
    setActiveWorkbookId(newWorkbook.id);
    setWorkbookName(newWorkbook.name);
    setSheets([newSheet]);
    setActiveSheetId(newSheet.id);
    setShowNewModal(false);
    setNewWorkbookName('');
  };

  const deleteWorkbook = (id: string) => {
    const updated = workbooks.filter(w => w.id !== id);
    setWorkbooks(updated);
    if (updated.length > 0) {
      setActiveWorkbookId(updated[0].id);
      setWorkbookName(updated[0].name);
      setSheets(updated[0].sheets);
      setActiveSheetId(updated[0].sheets[0].id);
    } else {
      setActiveWorkbookId(null);
    }
  };

  const activeSheet = getActiveSheet();
  const activeWorkbook = workbooks.find(w => w.id === activeWorkbookId);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#fafaf8]' : 'flex h-full'} bg-[#fafaf8]`}>
      {/* Sidebar */}
      <div className="w-64 border-r border-[#e8e7e3] bg-white flex flex-col">
        <div className="px-4 pt-6 pb-2">
          <h1 className="font-['Playfair_Display'] text-xl font-normal text-[#0f0f0f]">Workbooks</h1>
          <p className="text-[11px] text-[#777] mt-1">Spreadsheets for data</p>
        </div>
        <div className="p-4 border-t border-[#e8e7e3]">
          <button
            onClick={() => setShowNewModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white rounded-lg text-[13px] font-medium hover:from-[#f59e0b] hover:to-[#fbbf24] transition"
          >
            <Plus size={14} />
            New Workbook
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {workbooks.length === 0 ? (
            <div className="p-6 text-center">
              <Grid size={32} className="text-[#aaa] mx-auto mb-3" />
              <p className="text-[12px] text-[#777]">No workbooks yet</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-2 text-[11px] text-[#d97706] hover:underline"
              >
                Create one →
              </button>
            </div>
          ) : (
            workbooks.map((wb) => (
              <div
                key={wb.id}
                onClick={() => {
                  setActiveWorkbookId(wb.id);
                  setWorkbookName(wb.name);
                  setSheets(wb.sheets);
                  setActiveSheetId(wb.sheets[0]?.id);
                }}
                className={`group p-3 border-b border-[#f2f1ee] cursor-pointer transition ${
                  activeWorkbookId === wb.id ? 'bg-[#fffbeb]' : 'hover:bg-[#fffbeb]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-[#d97706]" />
                    <span className="text-[13px] font-medium truncate">{wb.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteWorkbook(wb.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100"
                  >
                    <Trash2 size={12} className="text-[#777] hover:text-[#dc2626]" />
                  </button>
                </div>
                <div className="text-[10px] text-[#777] mt-1">{wb.sheets.length} sheets</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeWorkbook ? (
          <>
            {/* Toolbar */}
            <div className="border-b border-[#e8e7e3] bg-white p-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => updateCellFormat('bold')}
                  className={`p-1.5 rounded-md transition ${selectedCell && activeSheet?.data[selectedCell.row][selectedCell.col].bold ? 'bg-[#fffbeb] text-[#d97706]' : 'text-[#777] hover:bg-[#fffbeb]'}`}
                  title="Bold"
                >
                  <Bold size={14} />
                </button>
                <button
                  onClick={() => updateCellFormat('italic')}
                  className={`p-1.5 rounded-md transition ${selectedCell && activeSheet?.data[selectedCell.row][selectedCell.col].italic ? 'bg-[#fffbeb] text-[#d97706]' : 'text-[#777] hover:bg-[#fffbeb]'}`}
                  title="Italic"
                >
                  <Italic size={14} />
                </button>
                <div className="w-px h-5 bg-[#e8e7e3]" />
                <button
                  onClick={() => updateCellFormat('align', 'left')}
                  className="p-1.5 rounded-md text-[#777] hover:bg-[#fffbeb] transition"
                  title="Align Left"
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  onClick={() => updateCellFormat('align', 'center')}
                  className="p-1.5 rounded-md text-[#777] hover:bg-[#fffbeb] transition"
                  title="Align Center"
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  onClick={() => updateCellFormat('align', 'right')}
                  className="p-1.5 rounded-md text-[#777] hover:bg-[#fffbeb] transition"
                  title="Align Right"
                >
                  <AlignRight size={14} />
                </button>
                
                {/* Sheets Tools Button - Yellow themed */}
                <SheetsToolDrawer 
                  onFormat={handleFormat}
                  onInsertFormula={handleInsertFormula}
                  onNumberFormat={handleNumberFormat}
                />
              </div>

              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="text-[10px] text-[#059669] animate-pulse">Saving...</div>
                )}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg hover:bg-[#fffbeb] transition text-[#d97706]"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>

            {/* Workbook Name */}
            <div className="px-6 pt-4">
              <input
                type="text"
                value={workbookName}
                onChange={(e) => setWorkbookName(e.target.value)}
                className="text-xl font-medium bg-transparent border-b-2 border-transparent hover:border-[#e8e7e3] focus:border-[#d97706] outline-none px-2 py-1 w-64 transition"
                placeholder="Untitled Workbook"
              />
            </div>

            {/* Sheet Tabs */}
            <div className="px-6 pt-2 border-b border-[#e8e7e3] flex gap-1 overflow-x-auto">
              {sheets.map((sheet) => (
                <div key={sheet.id} className="flex items-center">
                  <button
                    onClick={() => setActiveSheetId(sheet.id)}
                    className={`px-4 py-2 text-[12px] rounded-t-lg transition ${
                      activeSheetId === sheet.id
                        ? 'bg-white text-[#d97706] border-l border-r border-t border-[#e8e7e3]'
                        : 'text-[#777] hover:text-[#0f0f0f]'
                    }`}
                  >
                    {sheet.name}
                  </button>
                  {sheets.length > 1 && (
                    <button
                      onClick={() => deleteSheet(sheet.id)}
                      className="ml-1 p-1 text-[#777] hover:text-[#dc2626] transition"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addNewSheet}
                className="px-3 py-2 text-[12px] text-[#777] hover:text-[#d97706] transition"
              >
                + New Sheet
              </button>
            </div>

            {/* Formula Bar */}
            <div className="px-6 py-2 border-b border-[#e8e7e3] bg-white">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-mono bg-[#fffbeb] px-2 py-1 rounded min-w-[50px] text-center text-[#d97706]">
                  {selectedCell ? `${COL_LABELS[selectedCell.col]}${selectedCell.row + 1}` : ''}
                </div>
                <div className="text-[#aaa] text-[11px]">fx</div>
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditSubmit}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter a value"
                  className="flex-1 px-3 py-1.5 text-[13px] border border-[#e8e7e3] rounded-lg focus:outline-none focus:border-[#d97706] transition"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto">
              <div className="inline-block min-w-full">
                {/* Column Headers */}
                <div className="sticky top-0 z-10 bg-white border-b border-[#e8e7e3] flex">
                  <div className="w-12 h-7 flex-shrink-0 bg-[#fffbeb] border-r border-[#e8e7e3]" />
                  {COL_LABELS.map((label, idx) => (
                    <div key={idx} className="w-24 h-7 flex-shrink-0 flex items-center justify-center text-[11px] font-medium text-[#777] border-r border-[#e8e7e3] bg-[#fffbeb]">
                      {label}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {activeSheet && Array(ROWS).fill(0).map((_, row) => (
                  <div key={row} className="flex border-b border-[#e8e7e3]">
                    <div className="sticky left-0 z-10 w-12 h-7 flex-shrink-0 flex items-center justify-center text-[11px] font-medium text-[#777] bg-[#fffbeb] border-r border-[#e8e7e3]">
                      {row + 1}
                    </div>
                    {Array(COLS).fill(0).map((_, col) => {
                      const cell = activeSheet.data[row]?.[col];
                      const isSelected = selectedCell?.row === row && selectedCell?.col === col;
                      return (
                        <div
                          key={col}
                          onClick={() => setSelectedCell({ row, col })}
                          className={`w-24 h-7 flex-shrink-0 border-r border-[#e8e7e3] p-1 cursor-pointer transition ${
                            isSelected ? 'bg-[#fffbeb] ring-1 ring-inset ring-[#d97706]' : 'hover:bg-[#fffbeb]'
                          }`}
                          style={{
                            fontWeight: cell?.bold ? 'bold' : 'normal',
                            fontStyle: cell?.italic ? 'italic' : 'normal',
                            textAlign: cell?.align || 'left',
                            color: cell?.color || '#0f0f0f',
                          }}
                        >
                          <div className="text-[12px] truncate">{cell?.value || ''}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileSpreadsheet size={48} className="text-[#aaa] mx-auto mb-4" />
              <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-2">No workbook open</h3>
              <p className="text-[13px] text-[#777] mb-4">Create a new workbook to start</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white rounded-lg text-[13px] font-medium hover:from-[#f59e0b] hover:to-[#fbbf24] transition"
              >
                Create New Workbook
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Workbook Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewModal(false)}>
          <div className="bg-white rounded-2xl w-[400px] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">New Workbook</h3>
            <input
              type="text"
              value={newWorkbookName}
              onChange={(e) => setNewWorkbookName(e.target.value)}
              placeholder="Workbook name"
              className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#d97706] mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && createNewWorkbook()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition"
              >
                Cancel
              </button>
              <button
                onClick={createNewWorkbook}
                disabled={!newWorkbookName.trim()}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white hover:from-[#f59e0b] hover:to-[#fbbf24] transition disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}