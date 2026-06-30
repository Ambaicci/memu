'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  TrendingUp,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Sparkles,
  Calendar,
  BarChart3,
  Loader2,
  Send,
  Inbox,
  PieChart,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  memusSent: number;
  memusReceived: number;
  directMemosSent: number;
  directMemosReceived: number;
  pendingMemus: number;
  responseRate: number;
  avgResponseTime: string;
  natureBreakdown: Record<string, number>;
  weeklyActivity: { day: string; sent: number; received: number }[];
  topSpaces: { name: string; color: string; count: number }[];
}

export default function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchAnalytics(user.id);
      } else {
        setLoading(false);
        setError('Please sign in to view analytics.');
      }
    };
    getUser();
  }, []);

  const fetchAnalytics = async (userId: string) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const [sentMemusRes, receivedMemusRes, sentMemosRes, receivedMemosRes, membershipsRes] = await Promise.all([
        supabase.from('memus').select('*').eq('sender_id', userId),
        supabase.from('memus').select('*').eq('recipient_id', userId),
        supabase.from('direct_memos').select('*').eq('sender_id', userId),
        supabase.from('direct_memos').select('*').eq('recipient_id', userId),
        supabase.from('space_members').select('space_id, spaces(name, color)').eq('user_id', userId),
      ]);

      const sentMemus = sentMemusRes.data || [];
      const receivedMemus = receivedMemusRes.data || [];
      const sentMemos = sentMemosRes.data || [];
      const receivedMemos = receivedMemosRes.data || [];

      const pendingMemus = receivedMemus.filter(m => m.status === 'pending').length;
      const repliedCount = receivedMemus.filter(m => m.is_replied === true).length;
      const responseRate = receivedMemus.length > 0 ? Math.round((repliedCount / receivedMemus.length) * 100) : 0;

      let avgResponseTime = 'N/A';
      if (repliedCount > 0) {
        const repliedMemus = receivedMemus.filter(m => m.is_replied && m.replied_at);
        if (repliedMemus.length > 0) {
          const totalMs = repliedMemus.reduce((acc, m) => {
            const received = new Date(m.created_at).getTime();
            const replied = new Date(m.replied_at).getTime();
            return acc + (replied - received);
          }, 0);
          const avgMs = totalMs / repliedMemus.length;
          const hours = Math.floor(avgMs / (1000 * 60 * 60));
          const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
          avgResponseTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
      }

      const natureBreakdown: Record<string, number> = {};
      sentMemus.forEach(m => {
        const nature = m.nature || 'unknown';
        natureBreakdown[nature] = (natureBreakdown[nature] || 0) + 1;
      });

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyActivity = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dayStart = date.toISOString();
        const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
        const sent = sentMemus.filter(m => m.created_at >= dayStart && m.created_at <= dayEnd).length;
        const received = receivedMemus.filter(m => m.created_at >= dayStart && m.created_at <= dayEnd).length;
        weeklyActivity.push({ day: days[date.getDay()], sent, received });
      }

      // Top spaces – count memus with space_id if available
      const spaceActivityMap: Record<string, { name: string; color: string; count: number }> = {};
      const memusWithSpace = sentMemus.filter(m => m.space_id);
      if (memusWithSpace.length > 0) {
        memusWithSpace.forEach(m => {
          if (!spaceActivityMap[m.space_id]) {
            const membership = membershipsRes.data?.find((ms: any) => ms.space_id === m.space_id);
            // FIX: Handle both array and object cases for spaces
            const spaceData = Array.isArray(membership?.spaces) ? membership.spaces[0] : membership?.spaces;
            const name = spaceData?.name || 'Unknown';
            const color = spaceData?.color || '#4f46e5';
            spaceActivityMap[m.space_id] = { name, color, count: 0 };
          }
          if (spaceActivityMap[m.space_id]) {
            spaceActivityMap[m.space_id].count++;
          }
        });
      } else {
        // Fallback: show memberships with 0 activity
        membershipsRes.data?.forEach((m: any) => {
          // FIX: Handle both array and object cases for spaces
          const spaceData = Array.isArray(m.spaces) ? m.spaces[0] : m.spaces;
          const name = spaceData?.name || 'Unknown';
          const color = spaceData?.color || '#4f46e5';
          spaceActivityMap[m.space_id] = { name, color, count: 0 };
        });
      }

      const topSpaces = Object.values(spaceActivityMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setData({
        memusSent: sentMemus.length,
        memusReceived: receivedMemus.length,
        directMemosSent: sentMemos.length,
        directMemosReceived: receivedMemos.length,
        pendingMemus,
        responseRate,
        avgResponseTime,
        natureBreakdown,
        weeklyActivity,
        topSpaces,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (currentUserId) fetchAnalytics(currentUserId);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" strokeWidth={2} />
        <p className="text-sm text-gray-500 mt-4">Loading your insights...</p>
      </div>
    );
  }

  // Error state — fixed width to prevent vertical stacking
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center">
        <AlertCircle size={40} strokeWidth={1.5} className="text-rose-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load analytics</h3>
        <div style={{ width: '300px', margin: '0 auto' }}>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition btn-press"
        >
          <RefreshCw size={16} strokeWidth={2} /> Retry
        </button>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center">
        <Inbox size={40} strokeWidth={1.5} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No data yet</h3>
        <div style={{ width: '280px', margin: '0 auto' }}>
          <p className="text-sm text-gray-500">Start sending memus to see your analytics here.</p>
        </div>
      </div>
    );
  }

  const maxWeeklyActivity = Math.max(...data.weeklyActivity.map(d => Math.max(d.sent, d.received)), 1);
  const totalNature = Object.values(data.natureBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full bg-memu-canvas overflow-y-auto w-full animate-page-enter">
      {/* HEADER */}
      <div className="px-6 md:px-10 pt-8 pb-4 w-full">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <BarChart3 size={20} strokeWidth={2} className="text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Analytics</h1>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition btn-press"
          >
            <RefreshCw size={14} strokeWidth={2} /> Refresh
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1 font-medium">Your personal insights</p>
      </div>

      {/* STATS GRID */}
      <div className="px-6 md:px-10 pb-6 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Send size={18} strokeWidth={2} />}
            label="Memus sent"
            value={data.memusSent}
            color="from-blue-500 to-indigo-600"
          />
          <StatCard
            icon={<Inbox size={18} strokeWidth={2} />}
            label="Memus received"
            value={data.memusReceived}
            color="from-bridge to-purple-600"
          />
          <StatCard
            icon={<MessageSquare size={18} strokeWidth={2} />}
            label="Direct memos"
            value={data.directMemosSent + data.directMemosReceived}
            color="from-amber-400 to-orange-500"
          />
          <StatCard
            icon={<CheckCircle size={18} strokeWidth={2} />}
            label="Response rate"
            value={`${data.responseRate}%`}
            color="from-emerald-500 to-teal-600"
          />
        </div>
      </div>

      {/* PENDING ALERT */}
      {data.pendingMemus > 0 && (
        <div className="px-6 md:px-10 pb-6 w-full">
          <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3 border border-amber-200">
            <AlertCircle size={18} strokeWidth={2} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {data.pendingMemus} pending memu{data.pendingMemus > 1 ? 's' : ''} waiting for delivery
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                These will be delivered when recipients join memu
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY ACTIVITY CHART */}
      <div className="px-6 md:px-10 pb-6 w-full">
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} strokeWidth={2} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Weekly Activity</h3>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {data.weeklyActivity.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5 items-center">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t transition-all"
                    style={{ height: `${(day.sent / maxWeeklyActivity) * 100}%`, minHeight: day.sent > 0 ? '4px' : '0' }}
                    title={`${day.sent} sent`}
                  />
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 to-teal-500 rounded-b transition-all"
                    style={{ height: `${(day.received / maxWeeklyActivity) * 100}%`, minHeight: day.received > 0 ? '4px' : '0' }}
                    title={`${day.received} received`}
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-medium mt-1">{day.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" /> Sent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" /> Received
            </span>
          </div>
        </div>
      </div>

      {/* NATURE BREAKDOWN & TOP SPACES */}
      <div className="px-6 md:px-10 pb-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nature Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={16} strokeWidth={2} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Nature Breakdown</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(data.natureBreakdown).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No memus sent yet</p>
            ) : (
              Object.entries(data.natureBreakdown).map(([nature, count]) => {
                const percentage = totalNature > 0 ? Math.round((count / totalNature) * 100) : 0;
                const colors: Record<string, string> = {
                  fyi: 'bg-amber-400',
                  decide: 'bg-blue-400',
                  resolve: 'bg-rose-400',
                  urgent: 'bg-red-400',
                  broadcast: 'bg-purple-400',
                };
                return (
                  <div key={nature}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 capitalize">{nature}</span>
                      <span className="text-gray-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[nature] || 'bg-gray-300'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Spaces */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} strokeWidth={2} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-900">Your Spaces</h3>
          </div>
          {data.topSpaces.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No spaces yet</p>
          ) : (
            <div className="space-y-3">
              {data.topSpaces.map((space, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: space.color }} />
                  <span className="flex-1 text-sm font-medium text-gray-900 truncate">{space.name}</span>
                  <span className="text-xs text-gray-500">{space.count} activities</span>
                </div>
              ))}
              {data.topSpaces.every(s => s.count === 0) && (
                <p className="text-xs text-gray-400 italic">No activity recorded in spaces yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-semibold text-gray-900 leading-tight">{value}</div>
      <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
    </div>
  );
}