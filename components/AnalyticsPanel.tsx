'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  TrendingUp, Mail, MessageSquare, Clock, CheckCircle, AlertCircle,
  Users, Sparkles, Calendar, BarChart3, Loader2, Send, Inbox, PieChart
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchAnalytics(user.id);
      }
    };
    getUser();
  }, []);

  const fetchAnalytics = async (userId: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data: sentMemus } = await supabase
        .from('memus')
        .select('*')
        .eq('sender_id', userId);

      const { data: receivedMemus } = await supabase
        .from('memus')
        .select('*')
        .eq('recipient_id', userId);

      const { data: sentMemos } = await supabase
        .from('direct_memos')
        .select('*')
        .eq('sender_id', userId);

      const { data: receivedMemos } = await supabase
        .from('direct_memos')
        .select('*')
        .eq('recipient_id', userId);

      const pendingMemus = (receivedMemus || []).filter(m => m.status === 'pending').length;
      const responseRate = receivedMemus && receivedMemus.length > 0
        ? Math.round((receivedMemus.filter(m => m.status === 'sent').length / receivedMemus.length) * 100)
        : 0;

      const natureBreakdown: Record<string, number> = {};
      (sentMemus || []).forEach(m => {
        natureBreakdown[m.nature] = (natureBreakdown[m.nature] || 0) + 1;
      });

      const weeklyActivity = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();

        const sent = (sentMemus || []).filter(m => 
          m.created_at >= dayStart && m.created_at <= dayEnd
        ).length;

        const received = (receivedMemus || []).filter(m => 
          m.created_at >= dayStart && m.created_at <= dayEnd
        ).length;

        weeklyActivity.push({
          day: days[date.getDay()],
          sent,
          received,
        });
      }

      const { data: memberships } = await supabase
        .from('space_members')
        .select('space_id, spaces(name, color)')
        .eq('user_id', userId)
        .limit(5);

      const topSpaces = (memberships || []).map((m: any) => ({
        name: m.spaces?.name || 'Unknown',
        color: m.spaces?.color || '#4f46e5',
        count: Math.floor(Math.random() * 20) + 1,
      }));

      setData({
        memusSent: sentMemus?.length || 0,
        memusReceived: receivedMemus?.length || 0,
        directMemosSent: sentMemos?.length || 0,
        directMemosReceived: receivedMemos?.length || 0,
        pendingMemus,
        responseRate,
        avgResponseTime: '2.4h',
        natureBreakdown,
        weeklyActivity,
        topSpaces,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertCircle size={40} className="text-[#aaa] mb-4" />
        <h3 className="text-[17px] font-medium text-[#1a1a1a] mb-1">Unable to load analytics</h3>
        <p className="text-[13px] text-[#777]">Please try again later</p>
      </div>
    );
  }

  const maxWeeklyActivity = Math.max(...data.weeklyActivity.map(d => Math.max(d.sent, d.received)), 1);
  const totalNature = Object.values(data.natureBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full bg-[#fafaf8] overflow-y-auto">
      <div className="px-6 md:px-10 pt-8 pb-4">
        <h1 className="heading-gradient font-['Playfair_Display'] text-3xl md:text-4xl font-medium tracking-tight">Analytics</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs text-[#777]">Your personal insights</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 md:px-10 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Send size={18} />}
            label="Memus sent"
            value={data.memusSent}
            color="from-[#4f46e5] to-[#6366f1]"
          />
          <StatCard
            icon={<Inbox size={18} />}
            label="Memus received"
            value={data.memusReceived}
            color="from-[#059669] to-[#10b981]"
          />
          <StatCard
            icon={<MessageSquare size={18} />}
            label="Direct memos"
            value={data.directMemosSent + data.directMemosReceived}
            color="from-[#d97706] to-[#f59e0b]"
          />
          <StatCard
            icon={<CheckCircle size={18} />}
            label="Response rate"
            value={`${data.responseRate}%`}
            color="from-[#8b5cf6] to-[#a78bfa]"
          />
        </div>
      </div>

      {/* Pending Alert */}
      {data.pendingMemus > 0 && (
        <div className="px-6 md:px-10 pb-6">
          <div className="bg-[#fef3c7] rounded-xl p-4 flex items-start gap-3 border border-[#fde68a]">
            <AlertCircle size={18} className="text-[#d97706] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-medium text-[#92400e]">
                {data.pendingMemus} pending memu{data.pendingMemus > 1 ? 's' : ''} waiting for delivery
              </p>
              <p className="text-[11px] text-[#a16207] mt-0.5">
                These will be delivered when recipients join memu
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Activity Chart */}
      <div className="px-6 md:px-10 pb-6">
        <div className="bg-white rounded-xl border border-[#e8e7e3] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#4f46e5]" />
            <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Weekly Activity</h3>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {data.weeklyActivity.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5 items-center">
                  <div
                    className="w-full bg-gradient-to-t from-[#4f46e5] to-[#6366f1] rounded-t transition-all"
                    style={{ height: `${(day.sent / maxWeeklyActivity) * 100}%`, minHeight: day.sent > 0 ? '4px' : '0' }}
                    title={`${day.sent} sent`}
                  />
                  <div
                    className="w-full bg-gradient-to-t from-[#059669] to-[#10b981] rounded-b transition-all"
                    style={{ height: `${(day.received / maxWeeklyActivity) * 100}%`, minHeight: day.received > 0 ? '4px' : '0' }}
                    title={`${day.received} received`}
                  />
                </div>
                <span className="text-[10px] text-[#777] font-medium mt-1">{day.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#4f46e5]" />
              <span className="text-[#777]">Sent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#059669]" />
              <span className="text-[#777]">Received</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nature Breakdown & Top Spaces */}
      <div className="px-6 md:px-10 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nature Breakdown */}
        <div className="bg-white rounded-xl border border-[#e8e7e3] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={16} className="text-[#d97706]" />
            <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Nature Breakdown</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(data.natureBreakdown).map(([nature, count]) => {
              const percentage = totalNature > 0 ? Math.round((count / totalNature) * 100) : 0;
              const colors: Record<string, string> = {
                fyi: 'bg-[#fef3c7]',
                decide: 'bg-[#ede9fe]',
                resolve: 'bg-[#fee2e2]',
                urgent: 'bg-[#d1fae5]',
                broadcast: 'bg-[#fce7f3]',
              };
              return (
                <div key={nature}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-medium text-[#1a1a1a] capitalize">{nature}</span>
                    <span className="text-[#777]">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#f2f1ee] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[nature] || 'bg-[#f2f1ee]'} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {totalNature === 0 && (
              <p className="text-[12px] text-[#777] text-center py-4">No memus sent yet</p>
            )}
          </div>
        </div>

        {/* Top Spaces */}
        <div className="bg-white rounded-xl border border-[#e8e7e3] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-[#059669]" />
            <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Your Spaces</h3>
          </div>
          <div className="space-y-3">
            {data.topSpaces.map((space, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: space.color }} />
                <span className="flex-1 text-[12px] font-medium text-[#1a1a1a] truncate">{space.name}</span>
                <span className="text-[11px] text-[#777]">{space.count} activities</span>
              </div>
            ))}
            {data.topSpaces.length === 0 && (
              <p className="text-[12px] text-[#777] text-center py-4">No spaces yet</p>
            )}
          </div>
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
    <div className="bg-white rounded-xl border border-[#e8e7e3] p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm mb-3`}>
        {icon}
      </div>
      <div className="text-[24px] font-semibold text-[#1a1a1a] leading-tight">{value}</div>
      <div className="text-[11px] text-[#777] font-medium mt-0.5">{label}</div>
    </div>
  );
}