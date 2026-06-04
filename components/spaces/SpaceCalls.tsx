'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { Video, Phone, Plus, Calendar, Users, Loader2, AlertCircle } from 'lucide-react';

interface CallRecord {
  id: string;
  title: string;
  type: 'video' | 'audio';
  scheduled_at: string;
  duration_minutes: number | null;
  status: 'scheduled' | 'completed' | 'missed';
  participants_count: number;
}

interface SpaceCallsProps {
  spaceId: string;
}

export default function SpaceCalls({ spaceId }: SpaceCallsProps) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch calls
  const fetchCalls = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('space_calls')
        .select('id, title, type, scheduled_at, duration_minutes, status, participants_count')
        .eq('space_id', spaceId)
        .order('scheduled_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setError('TABLE_MISSING');
          setLoading(false);
          return;
        }
        throw error;
      }

      setCalls(data || []);
    } catch (err: any) {
      console.error('Failed to fetch calls:', JSON.stringify(err, null, 2));
      
      // Handle missing table or empty error gracefully (Phase 1 fallback)
      const errorCode = err?.code || err?.toString() || '';
      if (errorCode.includes('42P01') || errorCode.includes('relation') || errorCode === '{}' || !errorCode) {
        setError('TABLE_MISSING');
      } else {
        setError(err?.message || 'Failed to load calls');
      }
    } finally {
      setLoading(false);
    }
  }, [spaceId, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchCalls();
  }, [fetchCalls, currentUserId]);

  // Format date/time
  const formatCallTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.setDate(now.getDate() + 1)).toDateString() === date.toDateString();
    
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${time}`;
    if (isTomorrow) return `Tomorrow at ${time}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${time}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  // Table missing or empty error state (Phase 1 fallback)
  if (error === 'TABLE_MISSING' || error === '{}') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
          <Video className="w-8 h-8 text-[#aaa]" />
        </div>
        <h3 className="text-lg font-medium text-[#0f0f0f] mb-2">Calls is coming soon</h3>
        <p className="text-sm text-[#777] max-w-md">
          Video and audio calling is being set up. You'll be able to schedule and join calls here shortly.
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
        <button onClick={fetchCalls} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition">
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <Video className="w-8 h-8 text-[#aaa] mb-3" />
        <p className="text-sm text-[#777] mb-4">No calls scheduled. Start a meeting to collaborate in real-time.</p>
        <button
          onClick={() => showToast('Call scheduling coming in Phase 2', 'success')}
          className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition"
        >
          <Plus size={14} /> New Call
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#0f0f0f]">Calls ({calls.length})</h2>
        <button
          onClick={() => showToast('Call scheduling coming in Phase 2', 'success')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-sm hover:bg-[#2a2a2a] transition"
        >
          <Plus size={14} /> New Call
        </button>
      </div>

      {/* Call List */}
      {calls.map((call) => (
        <div
          key={call.id}
          className="bg-white border border-[#e8e7e3] rounded-xl p-4 flex items-center gap-4 group hover:border-[#d0cfc9] transition"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            call.status === 'completed' ? 'bg-[#d1fae5] text-[#059669]' :
            call.status === 'missed' ? 'bg-[#fee2e2] text-[#dc2626]' :
            'bg-[#ede9fe] text-[#7c3aed]'
          }`}>
            {call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-semibold text-[#0f0f0f] truncate">
              {call.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-[12px] text-[#777]">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatCallTime(call.scheduled_at)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {call.participants_count} participants
              </span>
              {call.duration_minutes && (
                <span className="bg-[#f2f1ee] px-2 py-0.5 rounded-full text-[10px]">
                  {call.duration_minutes}m
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
            <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
              call.status === 'completed' ? 'bg-[#d1fae5] text-[#059669]' :
              call.status === 'missed' ? 'bg-[#fee2e2] text-[#dc2626]' :
              'bg-[#ede9fe] text-[#7c3aed]'
            }`}>
              {call.status}
            </span>
            <button
              onClick={() => showToast('Joining call coming in Phase 2', 'success')}
              className="px-3 py-1.5 bg-[#4f46e5] text-white rounded-lg text-xs font-medium hover:bg-[#4338ca] transition"
            >
              {call.status === 'scheduled' ? 'Join' : 'View'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}