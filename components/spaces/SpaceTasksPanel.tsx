'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Plus, Loader2, CheckSquare, CheckCircle2, Circle, Trash2, Sparkles
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  created_at: string;
}

interface SpaceTasksPanelProps {
  spaceId: string;
}

export default function SpaceTasksPanel({ spaceId }: SpaceTasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
    if (spaceId) {
      fetchTasks();
    }
  }, [spaceId]);

  const fetchTasks = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('space_tasks')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || !currentUserId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('space_tasks')
      .insert({ 
        space_id: spaceId, 
        created_by: currentUserId, 
        title: newTaskTitle.trim() 
      })
      .select()
      .single();
      
    if (!error && data) {
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      showToast('Task added!', 'success');
    } else {
      showToast('Failed to add task', 'error');
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const supabase = createClient();
    await supabase.from('space_tasks').update({ status: newStatus }).eq('id', task.id);
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const deleteTask = async (taskId: string) => {
    const supabase = createClient();
    await supabase.from('space_tasks').delete().eq('id', taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
    showToast('Task deleted', 'success');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-purple-500 blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Add Task Input - Premium Glassmorphic Style */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-300 transition-all">
        <div className="pl-3">
          <Plus size={20} className="text-purple-500" />
        </div>
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done? Press Enter to add..."
          className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400 py-2.5"
        />
        <button 
          onClick={addTask}
          disabled={!newTaskTitle.trim()}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
            newTaskTitle.trim() 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-md hover:-translate-y-0.5' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Add Task
        </button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-sm animate-in zoom-in-95 duration-500">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-full w-24 h-24 flex items-center justify-center shadow-inner">
                <CheckSquare size={36} className="text-purple-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">All clear!</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              You have no tasks yet. Type in the box above to create your first task.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full text-xs text-purple-600 border border-purple-100">
              <Sparkles size={12} /> Stay organized, stay ahead!
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-100">
          {tasks.map((task, idx) => (
            <div 
              key={task.id} 
              className="group flex items-center gap-4 p-4 hover:bg-white/60 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <button 
                onClick={() => toggleTaskStatus(task)}
                className="flex-shrink-0 transition-transform hover:scale-110"
              >
                {task.status === 'done' ? (
                  <CheckCircle2 size={22} className="text-purple-500 fill-purple-100" />
                ) : (
                  <Circle size={22} className="text-gray-300 hover:text-purple-400 transition-colors" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate transition-all ${
                  task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'
                }`}>
                  {task.title}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Created {new Date(task.created_at).toLocaleDateString()}
                </p>
              </div>

              <button 
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}