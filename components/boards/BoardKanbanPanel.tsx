'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Plus, Trash2, Edit2, Check, X, 
  Loader2, CheckSquare, GripVertical, Sparkles,
  Clock, User, MoreHorizontal, LayoutGrid
} from 'lucide-react';

interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  position: number;
  created_by: string;
  created_at: string;
}

interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  cards: Card[];
}

interface BoardKanbanPanelProps {
  boardId: string;
  boardColor: string;
}

// Column colors for premium headers
const columnColors = [
  { bg: 'bg-gray-50/80', border: 'border-gray-200/60', dot: '#9CA3AF', label: 'To Do' },
  { bg: 'bg-blue-50/80', border: 'border-blue-200/60', dot: '#3B82F6', label: 'In Progress' },
  { bg: 'bg-emerald-50/80', border: 'border-emerald-200/60', dot: '#10B981', label: 'Done' },
  { bg: 'bg-purple-50/80', border: 'border-purple-200/60', dot: '#8B5CF6', label: 'Review' },
];

const getColumnColor = (index: number) => {
  return columnColors[index % columnColors.length];
};

export default function BoardKanbanPanel({ boardId, boardColor }: BoardKanbanPanelProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [addingCardToColumn, setAddingCardToColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState('');
  
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedFromColumnId, setDraggedFromColumnId] = useState<string | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (boardId) fetchKanbanData();
  }, [boardId]);

  const fetchKanbanData = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: columnsData, error: colError } = await supabase
        .from('board_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (colError) throw colError;

      const columnsWithCards = await Promise.all(
        (columnsData || []).map(async (col) => {
          const { data: cardsData } = await supabase
            .from('board_cards')
            .select('*')
            .eq('column_id', col.id)
            .order('position', { ascending: true });
          return { ...col, cards: cardsData || [] };
        })
      );
      setColumns(columnsWithCards);
    } catch (err) {
      console.error('Error fetching kanban:', err);
      showToast('Failed to load board', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, cardId: string, columnId: string) => {
    setDraggedCardId(cardId);
    setDraggedFromColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedCardId || !draggedFromColumnId) return;
    if (draggedFromColumnId === targetColumnId) {
      setDraggedCardId(null);
      return;
    }

    const cardToMove = columns.find(c => c.id === draggedFromColumnId)?.cards.find(c => c.id === draggedCardId);
    if (!cardToMove) return;

    setColumns(prev => prev.map(col => {
      if (col.id === draggedFromColumnId) return { ...col, cards: col.cards.filter(c => c.id !== draggedCardId) };
      if (col.id === targetColumnId) return { ...col, cards: [...col.cards, cardToMove] };
      return col;
    }));

    const supabase = createClient();
    const toColumn = columns.find(c => c.id === targetColumnId);
    const newPosition = toColumn?.cards.length || 0;

    await supabase.from('board_cards').update({ 
      column_id: targetColumnId, 
      position: newPosition 
    }).eq('id', draggedCardId);

    setDraggedCardId(null);
    setDraggedFromColumnId(null);
  };

  const addColumn = async () => {
    if (!newColumnTitle.trim()) {
      showToast("Please enter a column title", "error");
      return;
    }
    const supabase = createClient();
    const position = columns.length;
    const { data, error } = await supabase.from('board_columns').insert({
      board_id: boardId, title: newColumnTitle.trim(), position,
    }).select().single();

    if (!error && data) {
      setColumns([...columns, { ...data, cards: [] }]);
      setNewColumnTitle('');
      setShowAddColumn(false);
      showToast('Column added!', 'success');
    } else {
      showToast('Failed to add column', 'error');
    }
  };

  const updateColumnTitle = async (columnId: string) => {
    if (!editColumnTitle.trim()) return;
    const supabase = createClient();
    await supabase.from('board_columns').update({ title: editColumnTitle.trim() }).eq('id', columnId);
    setColumns(columns.map(c => c.id === columnId ? { ...c, title: editColumnTitle.trim() } : c));
    setEditingColumnId(null);
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm('Delete this column and all its cards?')) return;
    const supabase = createClient();
    await supabase.from('board_columns').delete().eq('id', columnId);
    setColumns(columns.filter(c => c.id !== columnId));
    showToast('Column deleted', 'success');
  };

  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim()) {
      showToast("Please enter a card title", "error");
      return;
    }
    if (!currentUserId) {
      showToast("User not loaded yet", "error");
      return;
    }
    
    const supabase = createClient();
    const column = columns.find(c => c.id === columnId);
    const position = column?.cards.length || 0;

    const { data, error } = await supabase.from('board_cards').insert({
      column_id: columnId, title: newCardTitle.trim(), position, created_by: currentUserId,
    }).select().single();

    if (!error && data) {
      setColumns(columns.map(c => c.id === columnId ? { ...c, cards: [...c.cards, data] } : c));
      setNewCardTitle('');
      setAddingCardToColumn(null);
      showToast('Card added!', 'success');
    } else {
      showToast('Failed to add card', 'error');
    }
  };

  const deleteCard = async (cardId: string, columnId: string) => {
    const supabase = createClient();
    await supabase.from('board_cards').delete().eq('id', cardId);
    setColumns(columns.map(c => c.id === columnId ? { ...c, cards: c.cards.filter(card => card.id !== cardId) } : c));
    showToast('Card deleted', 'success');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-memu-canvas overflow-hidden relative">
      
      {columns.length === 0 ? (
        /* ================= PREMIUM EMPTY STATE ================= */
        <div className="flex-1 flex items-center justify-center p-6 animate-fadeIn">
          <div className="text-center bg-white/95 backdrop-blur-xl p-12 rounded-3xl shadow-xl border border-gray-200/60 max-w-lg">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm"
              style={{ 
                background: `linear-gradient(135deg, ${boardColor}22, ${boardColor}11)`,
                border: `1px solid ${boardColor}22`,
              }}
            >
              <LayoutGrid size={32} style={{ color: boardColor }} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Start your workflow</h3>
            <p className="text-gray-500 mb-8 leading-relaxed text-base">
              Create your first column to organize tasks. Typical columns: "To Do", "In Progress", "Done".
            </p>
            
            {!showAddColumn ? (
              <button
                onClick={() => setShowAddColumn(true)}
                className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${boardColor}, ${boardColor}DD)`,
                  boxShadow: `0 4px 14px ${boardColor}44`,
                }}
              >
                <Plus size={18} strokeWidth={2.5} /> Create First Column
              </button>
            ) : (
              <div className="max-w-sm mx-auto text-left animate-fadeIn">
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="e.g., To Do"
                  className="w-full px-4 py-3 border border-gray-200/60 rounded-xl text-sm font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addColumn();
                    if (e.key === 'Escape') { setShowAddColumn(false); setNewColumnTitle(''); }
                  }}
                />
                <div className="flex items-center gap-2 justify-end mt-3">
                  <button 
                    onClick={() => { setShowAddColumn(false); setNewColumnTitle(''); }} 
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addColumn} 
                    className="px-4 py-2 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition"
                    style={{
                      background: `linear-gradient(135deg, ${boardColor}, ${boardColor}DD)`,
                      boxShadow: `0 4px 14px ${boardColor}44`,
                    }}
                  >
                    Add Column
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= KANBAN BOARD – PREMIUM ================= */
        <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scroll p-6">
          <div className="flex gap-6 h-full min-w-max flex-nowrap">
            {columns.map((column, colIndex) => {
              const colColor = getColumnColor(colIndex);
              
              return (
                <div
                  key={column.id}
                  className="flex flex-col w-80 bg-white/80 backdrop-blur-sm border border-gray-200/40 rounded-2xl shadow-sm overflow-hidden shrink-0 min-h-0"
                >
                  {/* ================= COLUMN HEADER – PREMIUM ================= */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200/40 bg-white/50 shrink-0">
                    {editingColumnId === column.id ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="text"
                          value={editColumnTitle}
                          onChange={(e) => setEditColumnTitle(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 bg-white truncate"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateColumnTitle(column.id);
                            if (e.key === 'Escape') setEditingColumnId(null);
                          }}
                        />
                        <button onClick={() => updateColumnTitle(column.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 shrink-0"><Check size={14} /></button>
                        <button onClick={() => setEditingColumnId(null)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 shrink-0"><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colColor.dot }} />
                          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
                            {column.title}
                          </h3>
                          <span 
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                            style={{ background: boardColor }}
                          >
                            {column.cards.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => { setEditingColumnId(column.id); setEditColumnTitle(column.title); }} className="p-1.5 rounded-lg hover:bg-gray-200/50 text-gray-400 hover:text-blue-600 transition">
                            <Edit2 size={12} strokeWidth={2} />
                          </button>
                          <button onClick={() => deleteColumn(column.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition">
                            <Trash2 size={12} strokeWidth={2} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ================= CARDS AREA ================= */}
                  <div 
                    className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2.5 min-h-[100px]"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.id)}
                  >
                    {column.cards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                          <Plus size={14} className="text-gray-300" strokeWidth={2} />
                        </div>
                        <p className="text-xs text-gray-400 font-medium">No cards yet</p>
                        <p className="text-[10px] text-gray-300">Drag cards here or add one below</p>
                      </div>
                    ) : (
                      column.cards.map((card) => {
                        const isDragging = draggedCardId === card.id;
                        return (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card.id, column.id)}
                            className={`group bg-white border border-gray-200/60 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-blue-200/60 hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing ${
                              isDragging ? 'opacity-50 rotate-2 scale-105' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900 flex-1 leading-snug break-words">
                                {card.title}
                              </p>
                              <button
                                onClick={() => deleteCard(card.id, column.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all shrink-0"
                              >
                                <Trash2 size={12} strokeWidth={2} />
                              </button>
                            </div>
                            {card.description && (
                              <p className="text-xs text-gray-500 font-light mt-2 line-clamp-2 break-words">
                                {card.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-gray-100/60">
                              <span className="text-[9px] text-gray-400 flex items-center gap-1">
                                <Clock size={9} strokeWidth={2} />
                                {formatDate(card.created_at)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ================= ADD CARD ================= */}
                  <div className="p-3 border-t border-gray-200/40 bg-white/30 shrink-0" draggable={false} onDragOver={(e) => e.stopPropagation()}>
                    {addingCardToColumn === column.id ? (
                      <div className="bg-white border border-blue-200 rounded-xl p-3 shadow-sm animate-fadeIn">
                        <input
                          type="text"
                          value={newCardTitle}
                          onChange={(e) => setNewCardTitle(e.target.value)}
                          placeholder="Card title..."
                          className="w-full text-sm outline-none bg-transparent placeholder:text-gray-400 mb-2 font-medium"
                          autoFocus
                          draggable={false}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addCard(column.id);
                            if (e.key === 'Escape') { setAddingCardToColumn(null); setNewCardTitle(''); }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => addCard(column.id)} 
                            className="px-3 py-1.5 text-white rounded-lg text-xs font-semibold hover:shadow-md transition"
                            style={{
                              background: `linear-gradient(135deg, ${boardColor}, ${boardColor}DD)`,
                            }}
                          >
                            Add
                          </button>
                          <button 
                            onClick={() => { setAddingCardToColumn(null); setNewCardTitle(''); }} 
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                          >
                            <X size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingCardToColumn(column.id)}
                        className="w-full flex items-center justify-center gap-2 p-2.5 text-xs font-semibold text-gray-500 hover:bg-white hover:text-blue-600 rounded-xl transition border border-transparent hover:border-gray-200"
                        draggable={false}
                      >
                        <Plus size={14} strokeWidth={2} /> Add Card
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* ================= ADD COLUMN ================= */}
            {showAddColumn ? (
              <div className="w-80 bg-white/95 backdrop-blur-sm border border-blue-200 rounded-2xl p-4 h-fit shadow-md animate-fadeIn shrink-0">
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="Column title..."
                  className="w-full px-3 py-2 border border-gray-200/60 rounded-lg text-sm font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addColumn();
                    if (e.key === 'Escape') { setShowAddColumn(false); setNewColumnTitle(''); }
                  }}
                />
                <div className="flex items-center gap-2">
                  <button 
                    onClick={addColumn} 
                    className="px-3 py-1.5 text-white rounded-lg text-xs font-semibold hover:shadow-md transition"
                    style={{
                      background: `linear-gradient(135deg, ${boardColor}, ${boardColor}DD)`,
                    }}
                  >
                    Add Column
                  </button>
                  <button onClick={() => { setShowAddColumn(false); setNewColumnTitle(''); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddColumn(true)}
                className="w-80 h-fit bg-white/40 backdrop-blur-sm border border-dashed border-gray-300 rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all shrink-0"
              >
                <Plus size={16} strokeWidth={2} /> Add Column
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}