'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  LayoutGrid, CheckCircle2, Clock, Users, TrendingUp, 
  Plus, ArrowRight, Loader2, Calendar, MessageSquare, 
  Star, Zap, Target, Award
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Space {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  space_id: string;
  space_name?: string;
  created_at: string;
}

interface RecentActivity {
  id: string;
  type: 'space_joined' | 'task_created' | 'member_added' | 'message_sent';
  title: string;
  description: string;
  created_at: string;
  space_id?: string;
}

interface Stats {
  totalSpaces: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  totalMembers: number;
}

export default function HomePanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSpaces: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    totalMembers: 0,
  });

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchDashboardData(user.id);
      } else {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  const fetchDashboardData = async (userId: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Fetch user's spaces
      const { data: spacesData } = await supabase
        .from('space_members')
        .select('spaces(id, name, color, created_at)')
        .eq('user_id', userId);

      const userSpaces: Space[] = (spacesData || []).map((item: any) => item.spaces);
      setSpaces(userSpaces);

      // 2. Fetch tasks from all spaces
      const spaceIds = userSpaces.map(s => s.id);
      let tasksData: Task[] = [];
      
      if (spaceIds.length > 0) {
        const { data: tasks } = await supabase
          .from('space_tasks')
          .select('id, title, status, space_id, created_at')
          .in('space_id', spaceIds)
          .order('created_at', { ascending: false })
          .limit(5);
        
        // Fetch space names for tasks
        if (tasks) {
          const tasksWithSpaces = await Promise.all(
            tasks.map(async (task) => {
              const space = userSpaces.find(s => s.id === task.space_id);
              return {
                ...task,
                space_name: space?.name || 'Unknown Space'
              };
            })
          );
          tasksData = tasksWithSpaces;
        }
      }
      setRecentTasks(tasksData);

      // 3. Calculate stats
      const pendingTasks = tasksData.filter(t => t.status === 'todo' || t.status === 'in_progress').length;
      const completedTasks = tasksData.filter(t => t.status === 'done').length;

      // 4. Fetch recent activity (simplified - you can expand this)
      const activity: RecentActivity[] = [];
      
      // Add recent spaces joined
      userSpaces.slice(0, 3).forEach(space => {
        activity.push({
          id: space.id,
          type: 'space_joined',
          title: `Joined ${space.name}`,
          description: 'You became a member',
          created_at: space.created_at,
          space_id: space.id,
        });
      });

      // Add recent tasks created
      tasksData.slice(0, 2).forEach(task => {
        activity.push({
          id: task.id,
          type: 'task_created',
          title: `Created task: ${task.title}`,
          description: `in ${task.space_name}`,
          created_at: task.created_at,
          space_id: task.space_id,
        });
      });

      // Sort by date
      activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivity(activity.slice(0, 5));

      // 5. Set stats
      setStats({
        totalSpaces: userSpaces.length,
        totalTasks: tasksData.length,
        pendingTasks,
        completedTasks,
        totalMembers: userSpaces.length * 3, // Simplified - you can fetch actual member count
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-memu-canvas overflow-y-auto custom-scroll">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back! 👋</h1>
            <p className="text-sm text-gray-500 mt-1">Here's what's happening in your workspace</p>
          </div>
          <button 
            onClick={() => router.push('/?panel=spaces')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <Plus size={16} /> New Space
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<LayoutGrid size={20} />}
            label="Total Spaces"
            value={stats.totalSpaces}
            color="blue"
            trend="+2 this month"
          />
          <StatCard 
            icon={<Target size={20} />}
            label="Total Tasks"
            value={stats.totalTasks}
            color="indigo"
            trend={`${stats.pendingTasks} pending`}
          />
          <StatCard 
            icon={<CheckCircle2 size={20} />}
            label="Completed"
            value={stats.completedTasks}
            color="emerald"
            trend={`${stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% completion`}
          />
          <StatCard 
            icon={<Users size={20} />}
            label="Team Members"
            value={stats.totalMembers}
            color="purple"
            trend="Active collaborators"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Spaces */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <LayoutGrid size={18} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Your Spaces</h2>
              </div>
              <button 
                onClick={() => router.push('/?panel=spaces')}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </button>
            </div>

            {spaces.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-sm text-gray-500 mb-3">You haven't joined any spaces yet</p>
                <button 
                  onClick={() => router.push('/?panel=spaces')}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Browse spaces
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {spaces.slice(0, 4).map((space) => (
                  <div 
                    key={space.id}
                    onClick={() => router.push(`/?panel=space-dashboard&space=${space.id}`)}
                    className="group p-4 bg-white border border-gray-200/60 rounded-xl hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: space.color + '20' }}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: space.color }} />
                      </div>
                      <ArrowRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">{space.name}</h3>
                    <p className="text-xs text-gray-500">Joined {formatDate(space.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <Zap size={18} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      activity.type === 'space_joined' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'task_created' ? 'bg-indigo-100 text-indigo-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.type === 'space_joined' ? <LayoutGrid size={14} /> :
                       activity.type === 'task_created' ? <Target size={14} /> :
                       <MessageSquare size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.description}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                <CheckCircle2 size={18} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Recent Tasks</h2>
            </div>
            <button 
              onClick={() => router.push('/?panel=spaces')}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>

          {recentTasks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-sm text-gray-500">No tasks yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200/60">
                    <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3">Task</th>
                    <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3">Space</th>
                    <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3">Status</th>
                    <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTasks.map((task) => (
                    <tr key={task.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-3">
                        <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-gray-600">{task.space_name}</span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          task.status === 'done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {task.status === 'done' ? <CheckCircle2 size={12} /> :
                           task.status === 'in_progress' ? <Clock size={12} /> :
                           <Circle size={12} />}
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-gray-500">{formatDate(task.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color, trend }: { 
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  trend: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    indigo: 'from-indigo-500 to-purple-600',
    emerald: 'from-emerald-500 to-teal-600',
    purple: 'from-purple-500 to-pink-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-sm`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        <TrendingUp size={16} className="text-emerald-500" />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
      <p className="text-[10px] text-emerald-600 font-semibold">{trend}</p>
    </div>
  );
}

// Missing icon component
function Circle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

<style>{`
  .custom-scroll::-webkit-scrollbar { width: 6px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`}</style>