'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Trash2, Plus, Maximize2, Minimize2, Bold, Italic, 
  AlignLeft, AlignCenter, AlignRight, Grid, X,
  Copy, Download, Save, FileSpreadsheet, Search, Loader2, Cloud
} from 'lucide-react';
import SheetsToolDrawer from './SheetsToolDrawer';

interface CellData {
  value: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  color: string;
}

interface Sheet {
  id: string;
  workbook_id: string;
  name: string;
  data: CellData[][];
}

interface Workbook {
  id: string;
  name: string;
  last_edited: string;
}

const ROWS = 30;
const COLS = 10;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const emptyCell = (): CellData => ({
  value: '',
  bold: false,
  italic: false,
  align: 'left',
  color: '#0f0f0f',
});

const createEmptySheetData = (): CellData[][] => {
  const data: CellData[][] = [];
  for (let i = 0; i < ROWS; i++) {
    data[i] = [];
    for (let j = 0; j < COLS; j++) {
      data[i][j] = emptyCell();
    }
  }
  return data;
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
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchWorkbooks(user.id);
      } else {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  // Fetch workbooks and sheets
  const fetchWorkbooks = async (userId: string) => {
    setLoading(true);
    const supabase = createClient();
    
    const { data: wbData, error: wbError } = await supabase
      .from('sheets_workbooks')
      .select('id, name, last_edited')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (wbError) {
      console.error('Error fetching workbooks:', wbError);
      showToast('Failed to load workbooks', 'error');
    } else if (wbData && wbData.length > 0) {
      setWorkbooks(wbData);
      setActiveWorkbookId(wbData[0].id);
      setWorkbookName(wbData[0].name);
      fetchSheets(wbData[0].id);
    } else {
      setWorkbooks([]);
    }
    setLoading(false);
  };

  const fetchSheets = async (workbookId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sheets')
      .select('*')
      .eq('workbook_id', workbookId);

    if (error) {
      console.error('Error fetching sheets:', error);
    } else if (data && data.length > 0) {
      // Parse JSONB data back to CellData[][]
      const parsedSheets = data.map(s => ({
        ...s,
        data: s.data as CellData[][]
      }));
      setSheets(parsedSheets);
      setActiveSheetId(parsedSheets[0].id);
    }
  };

  // Auto-save debounce
  const handleAutoSave = useCallback(() => {
    if (!activeWorkbookId || !activeSheetId || !currentUserId) return;
    
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      const supabase = createClient();
      
      // Update workbook name
      await supabase
        .from('sheets_workbooks')
        .update({ name: workbookName, last_edited: 'Just now' })
        .eq('id', activeWorkbookId);

      // Update active sheet data
      const activeSheet = sheets.find(s => s.id === activeSheetId);
      if (activeSheet) {
        await supabase
          .from('sheets')
          .update({ data: activeSheet.data })
          .eq('id', activeSheetId);
      }
      
      setWorkbooks(prev => prev.map(w => 
        w.id === activeWorkbookId ? { ...w, name: workbookName, last_edited: 'Just now' } : w
      ));
      setIsSaving(false);
    }, 1000);
  }, [activeWorkbookId, activeSheetId, workbookName, sheets, currentUserId]);

  useEffect(() => {
    if (activeWorkbookId && activeSheetId) {
      handleAutoSave();
    }
  }, [sheets, workbookName, activeWorkbookId, activeSheetId, handleAutoSave]);

    const activeSheet = sheets.find(s => s.id === activeSheetId);

  // Focus edit input when cell selected
  useEffect(() => {
    if (selectedCell && activeSheet) {
      const cell = activeSheet.data[selectedCell.row][selectedCell.col];
      setEditValue(cell.value);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectedCell, activeSheet]);
  const updateCell = (row: number, col: number, value: string) => {
    if (!activeSheetId) return;
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      const newData = s.data.map(r => [...r]);
      newData[row][col] = { ...newData[row][col], value };
      return { ...s, data: newData };
    }));
  };

  const updateCellFormat = (format: string, value?: any) => {
    if (!selectedCell || !activeSheetId) return;
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      const newData = s.data.map(r => [...r]);
      const cell = { ...newData[selectedCell.row][selectedCell.col] };
      
      switch (format) {
        case 'bold': cell.bold = !cell.bold; break;
        case 'italic': cell.italic = !cell.italic; break;
        case 'align': cell.align = value; break;
        case 'color': cell.color = value; break;
        case 'fontSize': cell.value = `<span style="font-size:${value}px">${cell.value}</span>`; break;
        case 'fillColor': /* Handled via inline style in render */ break;
      }
      newData[selectedCell.row][selectedCell.col] = cell;
      return { ...s, data: newData };
    }));
  };

  const handleEditSubmit = () => {
    if (selectedCell) {
      updateCell(selectedCell.row, selectedCell.col, editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
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

  const handleInsertFormula = (formula: string) => {
    if (selectedCell) {
      updateCell(selectedCell.row, selectedCell.col, formula);
      setEditValue(formula);
    }
  };

  const handleNumberFormat = (format: string) => {
    if (!selectedCell || !activeSheet) return;
    const cell = activeSheet.data[selectedCell.row][selectedCell.col];
    if (cell && !isNaN(parseFloat(cell.value.replace(/[^0-9.-]+/g,"")))) {
      const num = parseFloat(cell.value.replace(/[^0-9.-]+/g,""));
      let formatted = '';
      switch (format) {
        case 'number': formatted = num.toString(); break;
        case 'currency': formatted = `$${num.toFixed(2)}`; break;
        case 'percent': formatted = `${(num * 100).toFixed(1)}%`; break;
        case 'date': formatted = new Date(num).toLocaleDateString(); break;
        case 'scientific': formatted = num.toExponential(2); break;
        case 'decimal': formatted = num.toFixed(2); break;
        default: formatted = cell.value;
      }
      updateCell(selectedCell.row, selectedCell.col, formatted);
      setEditValue(formatted);
    }
  };

  const handleNewWorkbook = async () => {
    if (!newWorkbookName.trim() || !currentUserId) return;
    const supabase = createClient();
    
    const { data: wbData, error: wbError } = await supabase
      .from('sheets_workbooks')
      .insert({ user_id: currentUserId, name: newWorkbookName.trim(), last_edited: 'Just now' })
      .select()
      .single();

    if (wbError || !wbData) {
      showToast('Failed to create workbook', 'error');
      return;
    }

    const emptyData = createEmptySheetData();
    await supabase.from('sheets').insert({
      workbook_id: wbData.id,
      name: 'Sheet1',
      data: emptyData
    });

    setWorkbooks(prev => [wbData, ...prev]);
    setActiveWorkbookId(wbData.id);
    setWorkbookName(wbData.name);
    fetchSheets(wbData.id);
    setShowNewModal(false);
    setNewWorkbookName('');
    showToast('Workbook created', 'success');
  };

  const handleDeleteWorkbook = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('sheets_workbooks').delete().eq('id', id);
    
    if (error) {
      showToast('Failed to delete workbook', 'error');
      return;
    }

    const updated = workbooks.filter(w => w.id !== id);
    setWorkbooks(updated);
    
    if (updated.length > 0) {
      setActiveWorkbookId(updated[0].id);
      setWorkbookName(updated[0].name);
      fetchSheets(updated[0].id);
    } else {
      setActiveWorkbookId(null);
      setSheets([]);
    }
    showToast('Workbook deleted', 'success');
  };

  const addNewSheet = async () => {
    if (!activeWorkbookId) return;
    const supabase = createClient();
    const emptyData = createEmptySheetData();
    const newName = `Sheet${sheets.length + 1}`;
    
    const { data, error } = await supabase
      .from('sheets')
      .insert({ workbook_id: activeWorkbookId, name: newName, data: emptyData })
      .select()
      .single();

    if (!error && data) {
      setSheets(prev => [...prev, { ...data, data: emptyData }]);
      setActiveSheetId(data.id);
    }
  };

  const deleteSheet = async (sheetId: string) => {
    if (sheets.length === 1) {
      showToast('You must have at least one sheet', 'error');
      return;
    }
    const supabase = createClient();
    await supabase.from('sheets').delete().eq('id', sheetId);
    
    const newSheets = sheets.filter(s => s.id !== sheetId);
    setSheets(newSheets);
    if (activeSheetId === sheetId) {
      setActiveSheetId(newSheets[0].id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#d97706]" />
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#fafaf8]' : 'flex h-full'} bg-[#fafaf8] transition-all duration-300`}>
      {/* Sidebar */}
      <div className="w-64 border-r border-[#e8e7e3] bg-white flex flex-col shadow-sm">
        <div className="px-4 pt-6 pb-4 border-b border-[#f2f1ee]">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-[18px] font-semibold text-[#0f0f0f]">memu Sheets</h1>
            <div className="p-1.5 rounded-full bg-[#d1fae5] text-[#059669]" title="Synced to cloud">
              <Cloud size={14} />
            </div>
          </div>
          <p className="text-[11px] text-[#777]">Spreadsheets for data</p>
        </div>
        
        <div className="p-3">
          <button
            onClick={() => setShowNewModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white rounded-lg text-[13px] font-medium hover:from-[#f59e0b] hover:to-[#fbbf24] transition shadow-sm"
          >
            <Plus size={14} />
            New Workbook
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {workbooks.length === 0 ? (
            <div className="p-6 text-center">
              <Grid size={32} className="text-[#aaa] mx-auto mb-3" />
              <p className="text-[12px] text-[#777] mb-2">No workbooks yet</p>
              <button onClick={() => setShowNewModal(true)} className="text-[11px] text-[#d97706] hover:underline font-medium">
                Create one →
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {workbooks.map((wb) => (
                <div
                  key={wb.id}
                  onClick={() => {
                    setActiveWorkbookId(wb.id);
                    setWorkbookName(wb.name);
                    fetchSheets(wb.id);
                  }}
                  className={`group p-3 rounded-lg cursor-pointer transition-all ${
                    activeWorkbookId === wb.id 
                      ? 'bg-[#fffbeb] border border-[#fde68a]' 
                      : 'hover:bg-[#f9fafb] border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileSpreadsheet size={14} className="text-[#d97706] flex-shrink-0" />
                      <span className="text-[13px] font-medium text-[#0f0f0f] truncate">{wb.name}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteWorkbook(wb.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition flex-shrink-0"
                    >
                      <Trash2 size={11} className="text-[#777] hover:text-[#dc2626]" />
                    </button>
                  </div>
                  <div className="text-[10px] text-[#777] pl-6">{wb.last_edited}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f9fafb]">
        {activeWorkbookId ? (
          <>
            {/* Toolbar */}
            <div className="border-b border-[#e8e7e3] bg-white shadow-sm px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => updateCellFormat('bold')} className={`p-1.5 rounded-md transition ${selectedCell && activeSheet?.data[selectedCell.row][selectedCell.col].bold ? 'bg-[#fffbeb] text-[#d97706]' : 'text-[#777] hover:bg-[#fffbeb]'}`} title="Bold"><Bold size={14} /></button>
                <button onClick={() => updateCellFormat('italic')} className={`p-1.5 rounded-md transition ${selectedCell && activeSheet?.data[selectedCell.row][selectedCell.col].italic ? 'bg-[#fffbeb] text-[#d97706]' : 'text-[#777] hover:bg-[#fffbeb]'}`} title="Italic"><Italic size={14} /></button>
                <div className="w-px h-5 bg-[#e8e7e3]" />
                <button onClick={() => updateCellFormat('align', 'left')} className="p-1.5 rounded-md text-[#777] hover:bg-[#fffbeb] transition" title="Align Left"><AlignLeft size={14} /></button>
                <button onClick={() => updateCellFormat('align', 'center')} className="p-1.5 rounded-md text-[#777] hover:bg-[#fffbeb] transition" title="Align Center"><AlignCenter size={14} /></button>
                <button onClick={() => updateCellFormat('align', 'right')} className="p-1.5 rounded-md text-[#777] hover:bg-[#fffbeb] transition" title="Align Right"><AlignRight size={14} /></button>
                
                <SheetsToolDrawer 
                  onFormat={updateCellFormat}
                  onInsertFormula={handleInsertFormula}
                  onNumberFormat={handleNumberFormat}
                />
              </div>

              <div className="flex items-center gap-3">
                {isSaving && (
                  <div className="text-[10px] text-[#059669] animate-pulse flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> Saving...
                  </div>
                )}
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg hover:bg-[#f2f1ee] transition text-[#d97706]" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>

            {/* Workbook Name */}
            <div className="px-6 pt-4 pb-2">
              <input
                type="text"
                value={workbookName}
                onChange={(e) => setWorkbookName(e.target.value)}
                className="text-xl font-semibold bg-transparent border-b-2 border-transparent hover:border-[#e8e7e3] focus:border-[#d97706] outline-none px-2 py-1 w-64 transition text-[#0f0f0f]"
                placeholder="Untitled Workbook"
              />
            </div>

            {/* Sheet Tabs */}
            <div className="px-6 pt-2 border-b border-[#e8e7e3] flex gap-1 overflow-x-auto bg-white">
              {sheets.map((sheet) => (
                <div key={sheet.id} className="flex items-center">
                  <button
                    onClick={() => setActiveSheetId(sheet.id)}
                    className={`px-4 py-2 text-[12px] rounded-t-lg transition ${
                      activeSheetId === sheet.id
                        ? 'bg-[#f9fafb] text-[#d97706] border-l border-r border-t border-[#e8e7e3] font-medium'
                        : 'text-[#777] hover:text-[#0f0f0f] hover:bg-[#f2f1ee]'
                    }`}
                  >
                    {sheet.name}
                  </button>
                  {sheets.length > 1 && (
                    <button onClick={() => deleteSheet(sheet.id)} className="ml-1 p-1 text-[#777] hover:text-[#dc2626] transition">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addNewSheet} className="px-3 py-2 text-[12px] text-[#777] hover:text-[#d97706] transition font-medium">+ New Sheet</button>
            </div>

            {/* Formula Bar */}
            <div className="px-6 py-2 border-b border-[#e8e7e3] bg-white flex items-center gap-2">
              <div className="text-[11px] font-mono bg-[#fffbeb] px-2 py-1 rounded min-w-[50px] text-center text-[#d97706] font-medium">
                {selectedCell ? `${COL_LABELS[selectedCell.col]}${selectedCell.row + 1}` : ''}
              </div>
              <div className="text-[#aaa] text-[11px] font-medium">fx</div>
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSubmit}
                onKeyDown={handleKeyDown}
                placeholder="Enter a value or formula"
                className="flex-1 px-3 py-1.5 text-[13px] border border-[#e8e7e3] rounded-lg focus:outline-none focus:border-[#d97706] transition bg-[#f9fafb]"
              />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto bg-white">
              <div className="inline-block min-w-full">
                {/* Column Headers */}
                <div className="sticky top-0 z-10 bg-[#f9fafb] border-b border-[#e8e7e3] flex">
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
                          <div className="text-[12px] truncate" dangerouslySetInnerHTML={{ __html: cell?.value || '' }} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-[#fffbeb] flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet size={36} className="text-[#d97706]" />
              </div>
              <h3 className="text-[20px] font-semibold text-[#0f0f0f] mb-2">No workbook selected</h3>
              <p className="text-[13px] text-[#777] mb-6">Create a new workbook to start building your spreadsheet</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white rounded-lg text-[13px] font-medium hover:from-[#f59e0b] hover:to-[#fbbf24] transition shadow-sm"
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
          <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">New Workbook</h3>
            <input
              type="text"
              value={newWorkbookName}
              onChange={(e) => setNewWorkbookName(e.target.value)}
              placeholder="Workbook name"
              className="w-full px-4 py-2.5 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#d97706] mb-4 transition"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNewWorkbook()}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition">Cancel</button>
              <button onClick={handleNewWorkbook} disabled={!newWorkbookName.trim()} className="px-4 py-2 rounded-lg text-[13px] font-medium bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white hover:from-[#f59e0b] hover:to-[#fbbf24] transition disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}