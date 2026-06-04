'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { Mail, AlertCircle, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface Memu {
  id: string;
  subject: string;
  nature: string;
  status: string;
  body: string;
  sender_id: string;
  created_at: string;
  sender_name: string;
  sender_initials: string;
}

interface SpaceMemusProps {
  spaceId: string;
}

const natureColors: Record<string, string> = {
  fyi: 'bg-[#fef3c7] text-[#d97706]',
  decide: 'bg-[#ede9fe] text-[#7c3aed]',
  resolve: 'bg-[#fee2e2] text-[#dc2626]',
  urgent: 'bg-[#d1fae5] text-[#059669]',
};

const statusIcons: Record<string, React.ReactNode> = {
  sent: <CheckCircle2 size={14} className="text-[#059669]" />,
  delivered: <Clock size={14} className="text-[#d97706]" />,
  read: <CheckCircle2 size={14} className="text-[#4f46e5]" />,
  failed: <XCircle size={14} className="text-[#dc2626]" />,
};

export default function SpaceMemus({ spaceId }: SpaceMemusProps) {
  const [memus, setMemus] = useState<Memu[]>([]);
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

  // Fetch space-specific memus
  const fetchMemus = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    try {
      // Try to fetch memus filtered by space_id
      const { data, error } = await supabase
        .from('memus')
        .select('id, subject, nature, status, body, sender_id, created_at')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (error) {
        // If space_id column doesn't exist yet (Phase 1), show graceful state
        if (error.code === '42703' || error.code === '42P01') {
          setError('COLUMN_MISSING');
          setLoading(false);
          return;
        }
        throw error;
      }

      // Enrich with sender info
      const enriched: Memu[] = (data || []).map(m => ({
        ...m,
        sender_name: m.sender_id === currentUserId ? 'You' : 'Space Member',
        sender_initials: m.sender_id === currentUserId ? 'YO' : 'SM',
      }));

      setMemus(enriched);
    } catch (err: any) {
      console.error('Failed to fetch space memus:', err);
      setError(err.message || 'Failed to load memus');
    } finally {
      setLoading(false);
    }
  }, [spaceId, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchMemus();
  }, [fetchMemus, currentUserId]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  // Schema not ready yet
  if (error === 'COLUMN_MISSING') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-[#aaa]" />
        </div>
        <h3 className="text-lg font-medium text-[#0f0f0f] mb-2">Space Memus is coming soon</h3>
        <p className="text-sm text-[#777] max-w-md">
          Space-specific messaging is being set up. Soon you'll be able to send structured memus directly to this space.
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
        <button onClick={fetchMemus} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition">
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (memus.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <Mail className="w-8 h-8 text-[#aaa] mb-3" />
        <p className="text-sm text-[#777] mb-4">No memus in this space yet. Start a structured thread to keep things organized.</p>
        <button
          onClick={() => showToast('Compose for space coming in Phase 2', 'success')}
          className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition"
        >
          <Mail size={14} /> Compose Space Memu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[#0f0f0f]">Space Memus ({memus.length})</h2>
        <button
          onClick={() => showToast('Compose for space coming in Phase 2', 'success')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-sm hover:bg-[#2a2a2a] transition"
        >
          <Mail size={14} /> New Memu
        </button>
      </div>

      {/* Memu List */}
      {memus.map((memu) => (
        <div
          key={memu.id}
          className="bg-white border border-[#e8e7e3] rounded-xl p-4 hover:border-[#d0cfc9] transition cursor-pointer"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${natureColors[memu.nature?.toLowerCase()] || 'bg-[#f2f1ee] text-[#777]'}`}>
                  {memu.nature?.toUpperCase() || 'FYI'}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#777]">
                  {statusIcons[memu.status?.toLowerCase()] || <Clock size={14} className="text-[#aaa]" />}
                  {memu.status}
                </span>
              </div>
              
              <h3 className="text-[14px] font-semibold text-[#0f0f0f] mb-1 truncate">
                {memu.subject || '(No subject)'}
              </h3>
              
              <p className="text-[12px] text-[#777] line-clamp-1 mb-2">
                {memu.body.replace(/<[^>]*>/g, '').slice(0, 120)}...
              </p>

              <div className="flex items-center gap-3 text-[11px] text-[#777]">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#ede9fe] flex items-center justify-center text-[9px] font-medium text-[#4f46e5]">
                    {memu.sender_initials}
                  </div>
                  <span>{memu.sender_name}</span>
                </div>
                <span>•</span>
                <span>{formatDate(memu.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}