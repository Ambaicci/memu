'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  TrendingUp, Mail, MessageSquare, Clock, CheckCircle, AlertCircle,
  Users, Sparkles, Calendar, BarChart3, Loader2
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
      // Fetch memus sent
      const { data: sentMemus } = await supabase
        .from('memus')
        .select('*')
        .eq('sender_id', userId);

      // Fetch memus received
      const { data: receivedMemus } = await supabase
        .from('memus')
        .select('*')
        .eq('recipient_id', userId);

      // Fetch direct memos sent
      const { data: sentMemos } = await supabase
        .from('direct_memos')
        .select('*')
        .eq('sender_id', userId);

      // Fetch direct memos received
      const { data: receivedMemos } = await supabase
        .from('direct_memos')
        .select('*')
        .eq('recipient_id', userId);

      // Calculate pending memus
      const pendingMemus = (receivedMemus || []).filter(m => m.status === 'pending').length;

      // Calculate response rate (memus received that were replied to)
      const responseRate = receivedMemus && receivedMemus.length > 0
        ? Math.round((receivedMemus.filter(m => m.status === 'sent').length / receivedMemus.length) * 100)
        : 0;

      // Nature breakdown
      const natureBreakdown: Record<string, number> = {};
      (sentMemus || []).forEach(m => {
        natureBreakdown[m.nature] = (natureBreakdown[m.nature] || 0) + 1;
      });

      // Weekly activity (last 7 days)
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

      // Top spaces (simplified - just show space count)
      const { data: memberships } = await supabase
        .from('space_members')
        .select('space_id, spaces(name, color)')
        .eq('user_id', userId)
        .limit(5);

      const topSpaces = (memberships || []).map((m: any) => ({
        name: m.spaces?.name || 'Unknown',
        color: m.spaces?.color || '#4f46e5',
        count: Math.floor(Math.random() * 20) + 1, // Mock activity count
      }));

      setData({
        memusSent: sentMemus?.length || 0,
        memusReceived: receivedMemus?.length || 0,
        directMemosSent: sentMemos?.length || 0,
        directMemosReceived: receivedMemos?.length || 0,
        pendingMemus,
        responseRate,
        avgResponseTime: '2.4h', // Mock for now
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
        <Loader2 className="w-8 h-8 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle size={48} className="text-[#aaa] mx-auto mb-4" />
          <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-2">Unable to load analytics</h3>
          <p className="text-[13px] text-[#777]">Please try again later</p>
        </div>
      </div>
    );
  }

  const maxWeeklyActivity = Math.max(...data.weeklyActivity.map(d => Math.max(d.sent, d.received)));

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-4">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Analytics</h1>
        <p className="text-[13px] text-[#777] mt-1">Your personal productivity insights</p>
      </div>

      {/* Stats Grid */}
      <div className="px-4 md:px-8 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Mail size={20} />}
            label="Memus Sent"
            value={data.memusSent}
            color="bg-[#4f46e5]"
          />
          <StatCard
            icon={<Mail size={20} />}
            label="Memus Received"
            value={data.memusReceived}
            color="bg-[#059669]"
          />
          <StatCard
            icon={<MessageSquare size={20} />}
            label="Direct Memos"
            value={data.directMemosSent + data.directMemosReceived}
            color="bg-[#d97706]"
          />
          <StatCard
            icon={<CheckCircle size={20} />}
            label="Response Rate"
            value={`${data.responseRate}%`}
            color="bg-[#8b5cf6]"
          />
        </div>
      </div>

      {/* Pending Items Alert */}
      {data.pendingMemus > 0 && (
        <div className="px-4 md:px-8 pb-6">
          <div className="bg-[#fef3c7] border border-[#fde68a] rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-[#d97706] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#92400e]">
                You have {data.pendingMemus} pending memu{data.pendingMemus > 1 ? 's' : ''} waiting for delivery
              </p>
              <p className="text-[11px] text-[#a16207] mt-0.5">
                These will be delivered when recipients join memu
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Activity Chart */}
      <div className="px-4 md:px-8 pb-6">
        <div className="bg-white border border-[#e8e7e3] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#4f46e5]" />
            <h3 className="text-[14px] font-semibold text-[#0f0f0f]">Weekly Activity</h3>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {data.weeklyActivity.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5 items-center">
                  <div
                    className="w-full bg-[#4f46e5] rounded-t transition-all"
                    style={{ height: `${(day.sent / maxWeeklyActivity) * 100}%`, minHeight: day.sent > 0 ? '4px' : '0' }}
                    title={`${day.sent} sent`}
                  />
                  <div
                    className="w-full bg-[#059669] rounded-b transition-all"
                    style={{ height: `${(day.received / maxWeeklyActivity) * 100}%`, minHeight: day.received > 0 ? '4px' : '0' }}
                    title={`${day.received} received`}
                  />
                </div>
                <span className="text-[10px] text-[#777] font-medium">{day.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-[#4f46e5] rounded" />
              <span className="text-[#777]">Sent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-[#059669] rounded" />
              <span className="text-[#777]">Received</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nature Breakdown & Top Spaces */}
      <div className="px-4 md:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nature Breakdown */}
        <div className="bg-white border border-[#e8e7e3] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-[#d97706]" />
            <h3 className="text-[14px] font-semibold text-[#0f0f0f]">Nature Breakdown</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(data.natureBreakdown).map(([nature, count]) => {
              const total = Object.values(data.natureBreakdown).reduce((a, b) => a + b, 0);
              const percentage = Math.round((count / total) * 100);
              const colors: Record<string, string> = {
                fyi: 'bg-[#fef3c7]',
                decide: 'bg-[#ede9fe]',
                resolve: 'bg-[#fee2e2]',
                urgent: 'bg-[#d1fae5]',
                broadcast: 'bg-[#fce7f3]',
              };
              return (
                <div key={nature}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-[#0f0f0f] capitalize">{nature}</span>
                    <span className="text-[11px] text-[#777]">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#f2f1ee] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[nature] || 'bg-[#f2f1ee]'} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(data.natureBreakdown).length === 0 && (
              <p className="text-[12px] text-[#777] text-center py-4">No memus sent yet</p>
            )}
          </div>
        </div>

        {/* Top Spaces */}
        <div className="bg-white border border-[#e8e7e3] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-[#059669]" />
            <h3 className="text-[14px] font-semibold text-[#0f0f0f]">Your Spaces</h3>
          </div>
          <div className="space-y-3">
            {data.topSpaces.map((space, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: space.color }}
                />
                <span className="flex-1 text-[12px] font-medium text-[#0f0f0f] truncate">
                  {space.name}
                </span>
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
    <div className="bg-white border border-[#e8e7e3] rounded-xl p-4 hover:shadow-md transition-all duration-200">
      <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <div className="text-[24px] font-semibold text-[#0f0f0f] mb-0.5">{value}</div>
      <div className="text-[11px] text-[#777] font-medium">{label}</div>
    </div>
  );
}