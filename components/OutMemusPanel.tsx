'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, CheckCheck, Eye, Send, Mail, AtSign, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import MemuReadPanel from '@/components/MemuReadPanel';

type StatusType = 'sent' | 'pending' | 'delivered' | 'read' | 'replied' | 'failed';

interface OutMemusPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const statusConfig: Record<StatusType, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  sent: { label: 'Sent', icon: <Send size={11} />, color: 'text-[#6b7280]', bgColor: 'bg-[#f3f4f6]' },
  pending: { label: 'Pending', icon: <Clock size={11} />, color: 'text-[#f59e0b]', bgColor: 'bg-[#fef3c7]' },
  delivered: { label: 'Delivered', icon: <CheckCheck size={11} />, color: 'text-[#3b82f6]', bgColor: 'bg-[#eff6ff]' },
  read: { label: 'Read', icon: <Eye size={11} />, color: 'text-[#8b5cf6]', bgColor: 'bg-[#f5f3ff]' },
  replied: { label: 'Replied', icon: <CheckCheck size={11} />, color: 'text-[#10b981]', bgColor: 'bg-[#ecfdf5]' },
  failed: { label: 'Failed', icon: <Send size={11} />, color: 'text-[#dc2626]', bgColor: 'bg-[#fee2e2]' },
};

const natureLabels: Record<string, string> = {
  fyi: 'FYI', decide: 'Decide', resolve: 'Resolve', urgent: 'Urgent',
  broadcast: 'Broadcast', voice: 'Voice', group: 'Group',
};

const natureStyles: Record<string, { bg: string; text: string }> = {
  fyi: { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]' },
  decide: { bg: 'bg-[#ede9fe]', text: 'text-[#7c3aed]' },
  resolve: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]' },
  urgent: { bg: 'bg-[#d1fae5]', text: 'text-[#059669]' },
  broadcast: { bg: 'bg-[#e0e7ff]', text: 'text-[#4338ca]' },
  voice: { bg: 'bg-[#fce7f3]', text: 'text-[#be185d]' },
  group: { bg: 'bg-[#e6e6fa]', text: 'text-[#5b21b6]' },
};

interface SentMemu {
  id: string;
  recipient_id: string | null;
  recipient_email: string | null;
  subject: string;
  body: string;
  nature: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 60%, 65%)`;
};

export default function OutMemusPanel({ isGuest, requireAuth }: OutMemusPanelProps = {}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [memus, setMemus] = useState<SentMemu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemu, setSelectedMemu] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchSentMemus = async () => {
      const supabase = createClient();
      setLoading(true);
      
      // Query with LEFT JOIN to profiles (handles NULL recipient_id)
      const { data, error } = await supabase
        .from('memus')
        .select(`
          id,
          recipient_id,
          recipient_email,
          subject,
          body,
          nature,
          status,
          created_at,
          delivered_at,
          profiles!memus_recipient_id_fkey (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('sender_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent memus:', JSON.stringify(error, null, 2));
      } else {
        setMemus((data || []) as SentMemu[]);
      }
      setLoading(false);
    };

    fetchSentMemus();

    // Real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel('outmemus-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'memus', 
        filter: `sender_id=eq.${currentUserId}` 
      }, fetchSentMemus)
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const filteredMemus = memus.filter(m => {
    const matchesFilter = filter === 'all' || m.nature === filter || (filter === 'pending' && m.status === 'pending');
    const recipientName = m.profiles?.full_name || m.recipient_email || 'Unknown';
    const matchesSearch = recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    return matchesFilter && matchesSearch;
  });

  const handleMemuClick = (memu: SentMemu) => {
    if (isGuest && requireAuth) requireAuth('read sent memu', () => setSelectedMemu(memu));
    else setSelectedMemu(memu);
  };

  const handleReply = (replyText: string) => {
    console.log('Reply sent:', replyText);
    setSelectedMemu(null);
  };

  const handleOpenCompose = () => window.dispatchEvent(new CustomEvent('openCompose'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5]" />
      </div>
    );
  }

  if (memus.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Send size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">No sent memus</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">Your sent memus will appear here.</p>
        <button onClick={handleOpenCompose} className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition">
          ✨ Write a memu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">Out-memus</h1>
        <p className="text-[13px] text-[#777] mt-1">{memus.length} sent</p>
      </div>

      <div className="px-4 md:px-8 py-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 flex items-center gap-2.5 bg-[#f2f1ee] border border-[#e8e7e3] rounded-md px-3.5 py-2">
            <Search size={15} className="text-[#777]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search sent memus..." className="flex-1 text-[13.5px] outline-none bg-transparent" />
          </div>
          <button className="w-8.5 h-8.5 border border-[#e8e7e3] bg-white rounded-md flex items-center justify-center hover:border-[#777]"><Filter size={14} /></button>
        </div>
      </div>

      <div className="px-4 md:px-8 py-4 flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition ${filter === 'all' ? 'bg-[#0f0f0f] text-white shadow-md' : 'bg-[#f2f1ee] text-[#3a3a3a] hover:bg-[#e8e7e3]'}`}>All</button>
        <button onClick={() => setFilter('pending')} className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition ${filter === 'pending' ? 'bg-[#fef3c7] text-[#f59e0b] shadow-md' : 'bg-[#f2f1ee] text-[#3a3a3a] hover:bg-[#e8e7e3]'}`}>Pending</button>
        {Object.entries(natureLabels).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition ${filter === key ? `${natureStyles[key].bg} ${natureStyles[key].text} shadow-md` : 'bg-[#f2f1ee] text-[#3a3a3a] hover:bg-[#e8e7e3]'}`}>{label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredMemus.map((memu) => {
          const isExternal = !!memu.recipient_email && !memu.recipient_id;
          const recipientName = memu.profiles?.full_name || memu.recipient_email || 'Unknown';
          const recipientHandle = memu.profiles?.username || (isExternal ? 'email' : '');
          const avatarColor = stringToColor(recipientName);
          const initials = getInitials(recipientName);
          const status = statusConfig[memu.status as StatusType] || statusConfig.sent;

          return (
            <div key={memu.id} onClick={() => handleMemuClick(memu)} className="bg-white border border-[#e8e7e3] rounded-xl p-4 mb-3 transition-all duration-200 hover:shadow-md cursor-pointer">
              <div className="flex items-start gap-3.5">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-medium shadow-sm" style={{ background: avatarColor, color: '#fff' }}>
                    {initials}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-medium text-[#0f0f0f]">
                        To: {recipientName}
                        {isExternal && <Mail size={12} className="inline ml-1 text-[#777]" />}
                      </span>
                      {recipientHandle && <span className="text-[11px] text-[#777]">@{recipientHandle}</span>}
                    </div>
                    <span className="text-[11.5px] text-[#777] flex-shrink-0">{new Date(memu.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-[13px] text-[#3a3a3a] font-medium mb-1 line-clamp-1">{memu.subject}</div>
                  <div className="text-[12.5px] text-[#777] line-clamp-1 mb-2">{memu.body.replace(/<[^>]*>/g, '').substring(0, 100)}...</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10.5px] font-medium px-2.5 py-0.5 rounded-full ${natureStyles[memu.nature]?.bg || 'bg-gray-100'} ${natureStyles[memu.nature]?.text || 'text-gray-700'}`}>
                      {natureLabels[memu.nature] || memu.nature}
                    </span>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bgColor}`}>
                      {status.icon}
                      <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    {memu.status === 'pending' && (
                      <span className="text-[10px] text-[#f59e0b] italic">Delivers when they join</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredMemus.length === 0 && memus.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4"><Search size={28} className="text-[#aaa]" /></div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">No matching memus</h3>
            <p className="text-[13px] text-[#777]">Try a different search or filter</p>
          </div>
        )}
      </div>
      <style>{`.line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }`}</style>
      {selectedMemu && <MemuReadPanel memu={selectedMemu} onClose={() => setSelectedMemu(null)} onReply={handleReply} />}
    </div>
  );
}