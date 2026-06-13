'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Plus, MoreHorizontal, Trash2, Edit2, Check, X, 
  Loader2, Sparkles, GripVertical, CheckSquare
} from 'lucide-react';

interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string;
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
    if (boardId) {
      fetchKanbanData();
    }
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

      // Fetch all cards for all columns
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

  const addColumn = async () => {
    if (!newColumnTitle.trim()) return;
    const supabase = createClient();
    const position = columns.length;

    const { data, error } = await supabase
      .from('board_columns')
      .insert({
        board_id: boardId,
        title: newColumnTitle.trim(),
        position,
      })
      .select()
      .single();

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

    await supabase
      .from('board_columns')
      .update({ title: editColumnTitle.trim() })
      .eq('id', columnId);

    setColumns(columns.map(c => c.id === columnId ? { ...c, title: editColumnTitle.trim() } : c));
    setEditingColumnId(null);
    showToast('Column renamed', 'success');
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm('Delete this column and all its cards?')) return;
    const supabase = createClient();

    await supabase.from('board_columns').delete().eq('id', columnId);
    setColumns(columns.filter(c => c.id !== columnId));
    showToast('Column deleted', 'success');
  };

  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim() || !currentUserId) return;
    const supabase = createClient();
    const column = columns.find(c => c.id === columnId);
    const position = column?.cards.length || 0;

    const { data, error } = await supabase
      .from('board_cards')
      .insert({
        column_id: columnId,
        title: newCardTitle.trim(),
        position,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (!error && data) {
      setColumns(columns.map(c => 
        c.id === columnId ? { ...c, cards: [...c.cards, data] } : c
      ));
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
    setColumns(columns.map(c => 
      c.id === columnId ? { ...c, cards: c.cards.filter(card => card.id !== cardId) } : c
    ));
    showToast('Card deleted', 'success');
  };

  const moveCard = async (cardId: string, fromColumnId: string, toColumnId: string) => {
    const supabase = createClient();
    const toColumn = columns.find(c => c.id === toColumnId);
    const newPosition = toColumn?.cards.length || 0;

    await supabase
      .from('board_cards')
      .update({ column_id: toColumnId, position: newPosition })
      .eq('id', cardId);

    // Update local state
    const card = columns.find(c => c.id === fromColumnId)?.cards.find(c => c.id === cardId);
    if (card) {
      setColumns(columns.map(c => {
        if (c.id === fromColumnId) return { ...c, cards: c.cards.filter(cd => cd.id !== cardId) };
        if (c.id === toColumnId) return { ...c, cards: [...c.cards, card] };
        return c;
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500 blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {columns.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md animate-in zoom-in-95 duration-500">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl blur-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl w-24 h-24 flex items-center justify-center shadow-inner">
                <CheckSquare size={36} className="text-emerald-500" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Start your workflow</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Create your first column to organize tasks. Typical columns: "To Do", "In Progress", "Done".
            </p>
            <button
              onClick={() => setShowAddColumn(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Plus size={16} /> Create First Column
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 h-full min-w-max px-2">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="flex flex-col w-80 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    {editingColumnId === column.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editColumnTitle}
                          onChange={(e) => setEditColumnTitle(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:border-emerald-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateColumnTitle(column.id);
                            if (e.key === 'Escape') setEditingColumnId(null);
                          }}
                        />
                        <button onClick={() => updateColumnTitle(column.id)} className="p-1 rounded hover:bg-emerald-50 text-emerald-600">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingColumnId(null)} className="p-1 rounded hover:bg-red-50 text-red-600">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-gray-300" />
                          <h3 className="text-sm font-semibold text-gray-800">{column.title}</h3>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {column.cards.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingColumnId(column.id);
                              setEditColumnTitle(column.title);
                            }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => deleteColumn(column.id)}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[100px]">
                    {column.cards.map((card) => (
                      <div
                        key={card.id}
                        className="group bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-800 flex-1">{card.title}</p>
                          <button
                            onClick={() => deleteCard(card.id, column.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {card.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
                        )}
                        {columns.length > 1 && (
                          <div className="mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                            <select
                              onChange={(e) => {
                                if (e.target.value) moveCard(card.id, column.id, e.target.value);
                                e.target.value = '';
                              }}
                              className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-emerald-500"
                              defaultValue=""
                            >
                              <option value="" disabled>Move to...</option>
                              {columns.filter(c => c.id !== column.id).map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Card */}
                    {addingCardToColumn === column.id ? (
                      <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-sm">
                        <input
                          type="text"
                          value={newCardTitle}
                          onChange={(e) => setNewCardTitle(e.target.value)}
                          placeholder="Card title..."
                          className="w-full text-sm outline-none bg-transparent placeholder:text-gray-400 mb-2"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addCard(column.id);
                            if (e.key === 'Escape') {
                              setAddingCardToColumn(null);
                              setNewCardTitle('');
                            }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => addCard(column.id)}
                            className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-medium hover:shadow transition"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setAddingCardToColumn(null);
                              setNewCardTitle('');
                            }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingCardToColumn(column.id)}
                        className="w-full flex items-center gap-2 p-2 text-xs text-gray-500 hover:bg-gray-50 rounded-lg transition"
                      >
                        <Plus size={14} /> Add card
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Column Button */}
              {showAddColumn ? (
                <div className="w-80 bg-white/60 backdrop-blur-sm border border-emerald-200 rounded-2xl p-4 h-fit">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Column title..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500 mb-3"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addColumn();
                      if (e.key === 'Escape') {
                        setShowAddColumn(false);
                        setNewColumnTitle('');
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={addColumn}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-medium hover:shadow transition"
                    >
                      Add Column
                    </button>
                    <button
                      onClick={() => {
                        setShowAddColumn(false);
                        setNewColumnTitle('');
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddColumn(true)}
                  className="w-80 h-fit bg-white/40 backdrop-blur-sm border border-dashed border-gray-300 rounded-2xl p-4 flex items-center justify-center gap-2 text-sm text-gray-500 hover:bg-white/60 hover:border-emerald-300 hover:text-emerald-600 transition-all"
                >
                  <Plus size={16} /> Add Column
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}