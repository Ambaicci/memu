'use client';

import { useState } from 'react';
import { CheckSquare, Plus, X, Calendar, User, Flag, Trash2, Edit2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

interface SpaceTasksProps {
  spaceId: string;
  initialTasks: Task[];
}

const priorityConfig = {
  high: { label: 'High', color: 'bg-[#fee2e2] text-[#dc2626]', icon: '🔴' },
  medium: { label: 'Medium', color: 'bg-[#fef3c7] text-[#d97706]', icon: '🟡' },
  low: { label: 'Low', color: 'bg-[#d1fae5] text-[#059669]', icon: '🟢' },
};

export default function SpaceTasks({ spaceId, initialTasks }: SpaceTasksProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assignedTo: '', dueDate: '', priority: 'medium' as Task['priority'] });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleCreateTask = () => {
    if (!newTask.title.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      assignedTo: newTask.assignedTo || 'Unassigned',
      dueDate: newTask.dueDate || 'No date',
      completed: false,
      priority: newTask.priority,
      createdAt: new Date().toLocaleDateString(),
    };
    setTasks([task, ...tasks]);
    setNewTask({ title: '', assignedTo: '', dueDate: '', priority: 'medium' });
    setShowCreateModal(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({ title: task.title, assignedTo: task.assignedTo, dueDate: task.dueDate, priority: task.priority });
    setShowCreateModal(true);
  };

  const handleUpdateTask = () => {
    if (editingTask && newTask.title.trim()) {
      setTasks(tasks.map(t => 
        t.id === editingTask.id 
          ? { ...t, title: newTask.title, assignedTo: newTask.assignedTo, dueDate: newTask.dueDate, priority: newTask.priority }
          : t
      ));
      setEditingTask(null);
      setNewTask({ title: '', assignedTo: '', dueDate: '', priority: 'medium' });
      setShowCreateModal(false);
    }
  };

  const activeCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#4f46e5]" />
            <span className="text-[12px] font-medium text-[#777]">{activeCount} active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#10b981]" />
            <span className="text-[12px] font-medium text-[#777]">{completedCount} completed</span>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-[#e8e7e3] rounded-lg text-[12px] bg-white focus:outline-none focus:border-[#4f46e5]"
          >
            <option value="all">All Tasks</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-lg text-[12px] font-medium hover:shadow-md transition"
          >
            <Plus size={14} />
            New Task
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare size={48} className="text-[#aaa] mx-auto mb-4" />
          <p className="text-[14px] text-[#777]">No tasks yet</p>
          <p className="text-[12px] text-[#aaa] mt-1">Create a task to get organized</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-3 p-3 bg-white border border-[#e8e7e3] rounded-xl hover:shadow-md transition-all duration-200"
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task.id)}
                className="w-4 h-4 rounded border-[#e8e7e3] accent-[#4f46e5] cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[13px] ${task.completed ? 'line-through text-[#aaa]' : 'text-[#0f0f0f]'}`}>
                    {task.title}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${priorityConfig[task.priority].color}`}>
                    {priorityConfig[task.priority].icon} {priorityConfig[task.priority].label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] text-[#777] flex items-center gap-1">
                    <User size={10} />
                    {task.assignedTo}
                  </span>
                  <span className="text-[10px] text-[#777] flex items-center gap-1">
                    <Calendar size={10} />
                    Due {task.dueDate}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button
                  onClick={() => handleEditTask(task)}
                  className="p-1.5 rounded-lg hover:bg-[#f2f1ee] transition"
                  title="Edit"
                >
                  <Edit2 size={12} className="text-[#777]" />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition"
                  title="Delete"
                >
                  <Trash2 size={12} className="text-[#777] hover:text-[#dc2626]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setShowCreateModal(false);
          setEditingTask(null);
          setNewTask({ title: '', assignedTo: '', dueDate: '', priority: 'medium' });
        }}>
          <div className="bg-white rounded-2xl w-[450px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5]"
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Assigned To</label>
                <input
                  type="text"
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5]"
                  placeholder="Person's name"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e8e7e3] rounded-lg text-[14px] focus:outline-none focus:border-[#4f46e5]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#777] mb-1">Priority</label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setNewTask({ ...newTask, priority })}
                      className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-medium transition ${
                        newTask.priority === priority
                          ? priorityConfig[priority].color
                          : 'bg-[#f2f1ee] text-[#777] hover:bg-[#e8e7e3]'
                      }`}
                    >
                      {priorityConfig[priority].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTask(null);
                }}
                className="px-4 py-2 rounded-lg text-[13px] text-[#777] hover:bg-[#f2f1ee] transition"
              >
                Cancel
              </button>
              <button
                onClick={editingTask ? handleUpdateTask : handleCreateTask}
                disabled={!newTask.title.trim()}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white hover:shadow-lg transition disabled:opacity-50"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}