'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, Mail, Clock, Loader2, Inbox, CheckCircle, Eye, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface SentMemu {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  subject: string;
  body: string;
  nature: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  fully_read_at: string | null;
  recipient_profile?: { full_name: string | null; username: string | null } | null;
}

interface OutMemusPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

export default function OutMemusPanel({ isGuest, requireAuth }: OutMemusPanelProps = {}) {
  const [memus, setMemus] = useState<SentMemu[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'sent' | 'pending'>('all');
  const { showToast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  const fetchSentMemus = useCallback(async () => {
    if (!currentUserId) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    
    try {
      const { data: memusData, error } = await supabase.from('memus').select('*').eq('sender_id', currentUserId).order('created_at', { ascending: false });
      if (error) throw error;

      const recipientIds = [...new Set((memusData || []).map(m => m.recipient_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (recipientIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, username').in('id', recipientIds);
        if (profilesData) profilesMap = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }

      setMemus((memusData || []).map(m => ({ ...m, recipient_profile: profilesMap[m.recipient_id] || null })));
    } catch (err) {
      console.error(err);
      showToast('Failed to load sent memus', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => { if (currentUserId) fetchSentMemus(); }, [fetchSentMemus, currentUserId]);

  const filteredMemus = memus.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getNatureBadge = (nature: string) => {
    const colors: Record<string, string> = {
      fyi: 'bg-[#fef3c7] text-[#d97706]', decide: 'bg-[#ede9fe] text-[#7c3aed]',
      resolve: 'bg-[#fee2e2] text-[#dc2626]', urgent: 'bg-[#d1fae5] text-[#059669]',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[nature] || 'bg-[#f2f1ee] text-[#777]'}`}>{nature.toUpperCase()}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-[#4f46e5]" /></div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Out-memus</h1>
        <p className="text-[13px] text-[#777] mt-1">{memus.length} sent · {memus.filter(m => m.status === 'pending').length} pending</p>
      </div>

      <div className="px-4 md:px-8 py-4 flex gap-2">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${filter === 'all' ? 'bg-[#0f0f0f] text-white' : 'bg-white border border-[#e8e7e3] text-[#777] hover:border-[#777]'}`}>All</button>
        <button onClick={() => setFilter('sent')} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${filter === 'sent' ? 'bg-[#059669] text-white' : 'bg-white border border-[#e8e7e3] text-[#777] hover:border-[#777]'}`}>Sent</button>
        <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${filter === 'pending' ? 'bg-[#d97706] text-white' : 'bg-white border border-[#e8e7e3] text-[#777] hover:border-[#777]'}`}>Pending</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredMemus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4"><Inbox size={28} className="text-[#aaa]" /></div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">No sent memus</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMemus.map((memu) => (
              <div key={memu.id} className="bg-white border border-[#e8e7e3] rounded-xl p-5 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Send size={14} className="text-[#4f46e5]" />
                      <span className="text-[13px] font-medium text-[#0f0f0f]">To: {memu.recipient_profile?.full_name || memu.recipient_id || 'Unknown'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${memu.status === 'sent' ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#fef3c7] text-[#d97706]'}`}>
                        {memu.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[14px] font-semibold text-[#0f0f0f] mb-1">{memu.subject}</div>
                    <div className="flex items-center gap-2">
                      {getNatureBadge(memu.nature)}
                      <span className="text-[11px] text-[#777] flex items-center gap-1"><Clock size={10} />{formatDate(memu.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[13px] text-[#555] leading-relaxed line-clamp-3 bg-[#fafaf8] rounded-lg p-3 mb-4">{memu.body}</div>

                {/* ========================================== */}
                {/* 3-LEVEL TRACKING PROGRESS BAR              */}
                {/* ========================================== */}
                <div className="pt-3 border-t border-[#f2f1ee]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-[#777] uppercase tracking-wider">Tracking Status</span>
                    {memu.fully_read_at && <span className="text-[10px] text-[#7c3aed] font-medium">Fully read {formatDate(memu.fully_read_at)}</span>}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Level 1: Delivered */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-300 ${memu.delivered_at ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#f2f1ee] text-[#aaa]'}`}>
                      <CheckCircle size={10} /> Delivered
                    </div>
                    
                    <div className="flex-1 h-0.5 bg-[#f2f1ee] rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${memu.opened_at ? 'w-full bg-[#059669]' : 'w-0'}`} />
                    </div>

                    {/* Level 2: Opened */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-300 ${memu.opened_at ? 'bg-[#fef3c7] text-[#d97706]' : 'bg-[#f2f1ee] text-[#aaa]'}`}>
                      <Eye size={10} /> Opened
                    </div>

                    <div className="flex-1 h-0.5 bg-[#f2f1ee] rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${memu.fully_read_at ? 'w-full bg-[#d97706]' : 'w-0'}`} />
                    </div>

                    {/* Level 3: Fully Read */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-300 ${memu.fully_read_at ? 'bg-[#f3e8ff] text-[#7c3aed]' : 'bg-[#f2f1ee] text-[#aaa]'}`}>
                      <BookOpen size={10} /> Fully Read
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}