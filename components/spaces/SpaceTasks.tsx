'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Loader2,
  CalendarDays
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'completed';
  due_date: string | null;
  created_at: string;
  created_by: string;
}

interface SpaceTasksProps {
  spaceId: string;
}

export default function SpaceTasks({ spaceId }: SpaceTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('space_tasks')
        .select('id, title, description, status, due_date, created_at, created_by')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (error) {
        // Table doesn't exist yet (Phase 1 fallback)
        if (error.code === '42P01') {
          setError('TABLE_MISSING');
          setLoading(false);
          return;
        }
        throw error;
      }

      setTasks(data || []);
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [spaceId, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchTasks();
  }, [fetchTasks, currentUserId]);

  // Add task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !currentUserId) return;
    
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('space_tasks')
        .insert({
          space_id: spaceId,
          title: newTaskTitle.trim(),
          description: null,
          status: 'pending',
          due_date: newTaskDue || null,
          created_by: currentUserId,
        });
      
      if (error) throw error;
      
      setNewTaskTitle('');
      setNewTaskDue('');
      setShowAddForm(false);
      fetchTasks();
      showToast('Task added', 'success');
    } catch (err: any) {
      console.error('Failed to add task:', err);
      showToast(err.message || 'Failed to add task', 'error');
    }
  };

  // Toggle task status
  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const supabase = createClient();
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    
    try {
      const { error } = await supabase
        .from('space_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      
      if (error) throw error;
      fetchTasks();
    } catch (err) {
      showToast('Failed to update task', 'error');
    }
  };

  // Delete task
  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    const supabase = createClient();
    try {
      const { error } = await supabase.from('space_tasks').delete().eq('id', taskId);
      if (error) throw error;
      fetchTasks();
      showToast('Task deleted', 'success');
    } catch (err) {
      showToast('Failed to delete task', 'error');
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  // Table not ready yet
  if (error === 'TABLE_MISSING') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#aaa]" />
        </div>
        <h3 className="text-lg font-medium text-[#0f0f0f] mb-2">Tasks is coming soon</h3>
        <p className="text-sm text-[#777] max-w-md">
          The task management backend is being set up. You'll be able to create and track tasks here shortly.
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={fetchTasks} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition">
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0 && !showAddForm) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <CheckCircle2 className="w-8 h-8 text-[#aaa] mb-3" />
        <p className="text-sm text-[#777] mb-4">No tasks yet. Keep your space organized by adding one.</p>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition"
        >
          <Plus size={14} /> Add Task
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#0f0f0f]">Tasks</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-sm hover:bg-[#2a2a2a] transition"
        >
          <Plus size={14} /> {showAddForm ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white border border-[#e8e7e3] rounded-xl p-4 mb-6">
          <div className="space-y-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full border border-[#e8e7e3] rounded-lg px-4 py-2.5 text-[13.5px] outline-none focus:border-[#4f46e5] transition"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <div className="flex gap-3">
              <input
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="flex-1 border border-[#e8e7e3] rounded-lg px-4 py-2.5 text-[13.5px] outline-none focus:border-[#4f46e5] transition"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="px-5 py-2.5 bg-[#4f46e5] text-white rounded-lg text-sm font-medium hover:bg-[#4338ca] transition disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-white border border-[#e8e7e3] rounded-xl p-4 flex items-center gap-4 group hover:border-[#d0cfc9] transition"
          >
            <button
              onClick={() => toggleTaskStatus(task.id, task.status)}
              className="flex-shrink-0"
            >
              {task.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-[#059669]" />
              ) : (
                <Circle className="w-5 h-5 text-[#aaa] group-hover:text-[#4f46e5] transition" />
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <p className={`text-[14px] font-medium ${task.status === 'completed' ? 'line-through text-[#777]' : 'text-[#0f0f0f]'}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-[#777] flex items-center gap-1">
                  <CalendarDays size={11} />
                  {formatDate(task.due_date)}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  task.status === 'completed' ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#f2f1ee] text-[#777]'
                }`}>
                  {task.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => deleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-[#777] hover:text-red-600 transition"
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}