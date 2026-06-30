'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Plus, Loader2, CheckCircle2, Circle, Trash2, 
  Flag, List, LayoutGrid, GripVertical, Sparkles,
  Clock, Calendar, User, ChevronDown, MoreVertical
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  created_by?: string;
}

interface SpaceTasksPanelProps {
  spaceId: string;
  spaceColor?: string;
}

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'urgent': return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)', label: 'Urgent', dot: 'bg-rose-500' };
    case 'high': return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', label: 'High', dot: 'bg-amber-500' };
    case 'medium': return { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)', label: 'Medium', dot: 'bg-blue-500' };
    default: return { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.06)', label: 'Low', dot: 'bg-gray-400' };
  }
};

const statusConfig = {
  todo: { label: 'To Do', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  done: { label: 'Done', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const columns = [
  { id: 'todo', label: 'To Do', icon: '○' },
  { id: 'in_progress', label: 'In Progress', icon: '◉' },
  { id: 'done', label: 'Done', icon: '✓' },
];

export default function SpaceTasksPanel({ spaceId, spaceColor = '#3B82F6' }: SpaceTasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [mobileMenuTaskId, setMobileMenuTaskId] = useState<string | null>(null);
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
    if (!spaceId) return;
    fetchTasks();

    const supabase = createClient();
    const channel = supabase
      .channel(`space-tasks-${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'space_tasks', filter: `space_id=eq.${spaceId}` }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [spaceId]);

  const fetchTasks = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('space_tasks')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });
      
    if (!error && data) setTasks(data);
    setLoading(false);
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || !currentUserId) {
      showToast('Please enter a task title', 'error');
      return;
    }
    
    const supabase = createClient();
    
    try {
      const { error } = await supabase.from('space_tasks').insert({ 
        space_id: spaceId, 
        created_by: currentUserId, 
        title: newTaskTitle.trim(),
        status: 'todo',
        priority: 'medium'
      });
        
      if (error) {
        console.error('TASK CREATION ERROR:', error);
        showToast(`Failed: ${error.message}`, 'error');
      } else {
        setNewTaskTitle('');
        showToast('Task created!', 'success');
        fetchTasks();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      showToast('Failed to create task', 'error');
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    const supabase = createClient();
    const { error } = await supabase.from('space_tasks').update({ status: newStatus }).eq('id', taskId);
    
    if (error) {
      showToast('Failed to update status', 'error');
    } else {
      fetchTasks();
      setMobileMenuTaskId(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    const supabase = createClient();
    await supabase.from('space_tasks').delete().eq('id', taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
    showToast('Task deleted', 'success');
    setMobileMenuTaskId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask();
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    if (draggedTaskId) {
      updateTaskStatus(draggedTaskId, newStatus);
      setDraggedTaskId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 relative z-10" />
        </div>
      </div>
    );
  }

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="flex flex-col gap-3 md:gap-4 w-full h-full">
      
      {/* ================= PREMIUM HEADER ================= */}
      <div className="flex items-center justify-between flex-nowrap shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <div 
            className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ 
              background: `linear-gradient(135deg, ${spaceColor}22, ${spaceColor}11)`,
              color: spaceColor,
            }}
          >
            <CheckCircle2 size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm md:text-base font-bold text-gray-900 tracking-tight">Tasks</h2>
            <p className="text-[10px] md:text-xs text-gray-500 font-medium truncate">
              {tasks.length} total • {todoCount} to do • {inProgressCount} in progress
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-0.5 md:gap-1 p-0.5 md:p-1 bg-gray-100/80 rounded-xl shrink-0 ml-2">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2.5 md:p-2 rounded-lg transition-all ${
              viewMode === 'list' 
                ? 'bg-white shadow-sm text-blue-600' 
                : 'text-gray-500 active:text-gray-700 active:bg-gray-200/60'
            }`}
            aria-label="List view"
          >
            <List size={16} strokeWidth={2} />
          </button>
          <button 
            onClick={() => setViewMode('board')}
            className={`p-2.5 md:p-2 rounded-lg transition-all ${
              viewMode === 'board' 
                ? 'bg-white shadow-sm text-blue-600' 
                : 'text-gray-500 active:text-gray-700 active:bg-gray-200/60'
            }`}
            aria-label="Board view"
          >
            <LayoutGrid size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ================= QUICK ADD INPUT ================= */}
      <div className="flex items-center gap-2 flex-nowrap shrink-0">
        <div className="flex-1 relative">
          <div 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ background: spaceColor || '#3B82F6' }}
          />
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new task..."
            className="w-full pl-8 pr-4 py-3 md:py-2.5 text-sm bg-white border border-gray-200/60 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition shadow-sm"
          />
        </div>
        <button 
          onClick={addTask}
          disabled={!newTaskTitle.trim()}
          className="p-3 md:p-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center"
          style={{
            background: newTaskTitle.trim() 
              ? `linear-gradient(135deg, ${spaceColor || '#3B82F6'}, ${(spaceColor || '#3B82F6')}DD)` 
              : '#f3f4f6',
            color: newTaskTitle.trim() ? 'white' : '#9ca3af',
            cursor: newTaskTitle.trim() ? 'pointer' : 'not-allowed',
            boxShadow: newTaskTitle.trim() 
              ? `0 4px 12px ${spaceColor || '#3B82F6'}44` 
              : 'none',
            minWidth: '44px',
            minHeight: '44px',
          }}
          aria-label="Add task"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* ================= LIST VIEW – MOBILE OPTIMIZED ================= */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto custom-scroll -mx-2 px-2">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fadeIn">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ 
                  background: `linear-gradient(135deg, ${spaceColor}22, ${spaceColor}11)`,
                  border: `1px solid ${spaceColor}22`,
                }}
              >
                <Sparkles size={24} style={{ color: spaceColor }} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No tasks yet</p>
              <p className="text-xs text-gray-500 max-w-[200px]">Add a task above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const priorityConf = getPriorityConfig(task.priority);
                const isDone = task.status === 'done';
                const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;

                return (
                  <div 
                    key={task.id} 
                    className="group relative flex items-center gap-2 md:gap-3 p-3 bg-white border border-gray-200/50 rounded-xl active:border-blue-200/60 active:shadow-md transition-all duration-200"
                    style={{
                      borderLeft: `3px solid ${isDone ? '#10B981' : priorityConf.color}`,
                    }}
                  >
                    {/* Status Toggle - Larger on mobile */}
                    <button 
                      onClick={() => {
                        const next: Task['status'] = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
                        updateTaskStatus(task.id, next);
                      }}
                      className={`flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded-lg transition-all active:scale-95 shrink-0 ${
                        task.status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                        task.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-50 text-gray-400 active:text-gray-600'
                      }`}
                      aria-label="Toggle status"
                    >
                      {task.status === 'done' ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <Circle size={16} strokeWidth={2} />}
                    </button>
                    
                    {/* Task Title */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-[10px] text-gray-400">•</span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock size={10} strokeWidth={2} />
                          {formatDate(task.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Priority Badge - Tappable on mobile */}
                    <div 
                      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0"
                      style={{ 
                        background: priorityConf.bg,
                        color: priorityConf.color,
                      }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
                      {priorityConf.label}
                    </div>

                    {/* Mobile: Always show menu button */}
                    <button 
                      onClick={() => setMobileMenuTaskId(mobileMenuTaskId === task.id ? null : task.id)}
                      className="md:hidden p-2 rounded-lg active:bg-gray-100 text-gray-400 active:text-gray-600 transition-all shrink-0"
                      aria-label="Task options"
                    >
                      <MoreVertical size={16} strokeWidth={2} />
                    </button>

                    {/* Desktop: Delete button on hover */}
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="hidden md:block opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
                      aria-label="Delete task"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>

                    {/* Mobile Menu Dropdown */}
                    {mobileMenuTaskId === task.id && (
                      <div className="absolute right-3 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden animate-fadeIn">
                        <div className="p-1">
                          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Change Status</div>
                          {columns.map((col) => (
                            <button
                              key={col.id}
                              onClick={() => updateTaskStatus(task.id, col.id as Task['status'])}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg transition-all ${
                                task.status === col.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 active:bg-gray-50'
                              }`}
                            >
                              <span>{col.icon}</span>
                              {col.label}
                            </button>
                          ))}
                          <div className="h-px bg-gray-100 my-1" />
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 text-left rounded-lg active:bg-red-50 transition-all"
                          >
                            <Trash2 size={14} strokeWidth={2} />
                            Delete Task
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= BOARD VIEW (KANBAN) – MOBILE OPTIMIZED ================= */}
      {viewMode === 'board' && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scroll">
          <div className="flex gap-3 md:gap-4 h-full min-w-[800px] pb-2">
            {columns.map((col) => {
              const colTasks = tasks.filter(t => t.status === col.id);
              const status = statusConfig[col.id as keyof typeof statusConfig] || statusConfig.todo;
              
              return (
                <div 
                  key={col.id} 
                  className="flex-1 flex flex-col bg-gray-50/50 rounded-2xl border border-gray-200/40 p-2 md:p-3"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id as Task['status'])}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 md:px-3 py-2 rounded-xl mb-2 md:mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm font-semibold text-gray-700">{col.label}</span>
                      <span 
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                        style={{ background: spaceColor }}
                      >
                        {colTasks.length}
                      </span>
                    </div>
                    {col.id === 'done' && colTasks.length > 0 && (
                      <Sparkles size={12} className="text-emerald-500" />
                    )}
                  </div>

                  {/* Task Cards */}
                  <div className="flex-1 overflow-y-auto custom-scroll space-y-2 pr-1">
                    {colTasks.map((task) => {
                      const priorityConf = getPriorityConfig(task.priority);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="group bg-white p-3 rounded-xl border border-gray-200/60 shadow-sm active:shadow-md active:border-blue-200/60 transition-all cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical size={14} className="text-gray-300 mt-0.5 opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            <p className="text-sm font-medium text-gray-900 flex-1 leading-snug">{task.title}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100/60">
                            <div 
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-medium"
                              style={{ 
                                background: priorityConf.bg,
                                color: priorityConf.color,
                              }}
                            >
                              <span className={`w-1 h-1 rounded-full ${priorityConf.dot}`} />
                              {priorityConf.label}
                            </div>
                            
                            {/* Mobile: Always show menu */}
                            <button 
                              onClick={() => setMobileMenuTaskId(mobileMenuTaskId === task.id ? null : task.id)}
                              className="md:hidden p-1.5 rounded-lg active:bg-gray-100 text-gray-400 active:text-gray-600 transition-all"
                              aria-label="Task options"
                            >
                              <MoreVertical size={14} strokeWidth={2} />
                            </button>
                            
                            {/* Desktop: Delete on hover */}
                            <button 
                              onClick={() => deleteTask(task.id)}
                              className="hidden md:block opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                              aria-label="Delete task"
                            >
                              <Trash2 size={12} strokeWidth={2} />
                            </button>
                          </div>

                          {/* Mobile Menu Dropdown */}
                          {mobileMenuTaskId === task.id && (
                            <div className="absolute right-3 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden animate-fadeIn">
                              <div className="p-1">
                                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Move to</div>
                                {columns.map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => updateTaskStatus(task.id, c.id as Task['status'])}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg transition-all ${
                                      task.status === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 active:bg-gray-50'
                                    }`}
                                  >
                                    <span>{c.icon}</span>
                                    {c.label}
                                  </button>
                                ))}
                                <div className="h-px bg-gray-100 my-1" />
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 text-left rounded-lg active:bg-red-50 transition-all"
                                >
                                  <Trash2 size={14} strokeWidth={2} />
                                  Delete Task
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .btn-press:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}