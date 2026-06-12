'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Send, Search, Loader2, CheckCheck, Clock, AlertCircle, Filter,
  Eye, BookOpen, Reply, CheckCircle, X, ChevronDown, Sparkles, Paperclip
} from 'lucide-react';

interface OutMemu {
  id: string;
  content: string;
  subject: string;
  recipient_name: string;
  status: 'pending' | 'sent' | 'read' | 'failed';
  delivered_at?: string | null;
  opened_at?: string | null;
  read_completely_at?: string | null;
  replied_at?: string | null;
  created_at: string;
  nature?: string;
  attachments?: any[];
}

const filterOptions = [
  { id: 'all', label: 'All memus', icon: <Send size={12} /> },
  { id: 'delivered', label: 'Delivered', icon: <CheckCircle size={12} /> },
  { id: 'opened', label: 'Partially read', icon: <Eye size={12} /> },
  { id: 'fully_read', label: 'Fully read', icon: <BookOpen size={12} /> },
  { id: 'replied', label: 'Replied', icon: <Reply size={12} /> },
  { id: 'pending', label: 'Pending', icon: <Clock size={12} /> },
  { id: 'failed', label: 'Failed', icon: <AlertCircle size={12} /> },
];

export default function OutMemusPanel() {
  const [memus, setMemus] = useState<OutMemu[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedMemu, setSelectedMemu] = useState<OutMemu | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Listen for real-time notifications from recipients
  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase.channel(`user-notifications:${currentUserId}`);
    channel.on('broadcast', { event: 'memu_opened' }, ({ payload }) => {
      showToast(`📬 Memu "${payload.subject}" was opened by the recipient.`, 'info');
    });
    channel.on('broadcast', { event: 'memu_fully_read' }, ({ payload }) => {
      showToast(`✅ Memu "${payload.subject}" was fully read by the recipient.`, 'success');
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, showToast]);

  const fetchOutMemus = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: memusData, error } = await supabase
        .from('memus')
        .select('*')
        .eq('sender_id', currentUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!memusData || memusData.length === 0) {
        setMemus([]);
        setLoading(false);
        return;
      }
      const recipientIds = [...new Set(memusData.map(m => m.recipient_id).filter(id => id))];
      let profilesMap: Record<string, any> = {};
      if (recipientIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', recipientIds);
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        }
      }
      const formattedMemus: OutMemu[] = memusData.map((m: any) => {
        const profile = m.recipient_id ? profilesMap[m.recipient_id] : null;
        return {
          id: m.id,
          content: m.body || m.content || '',
          subject: m.subject || '(no subject)',
          recipient_name: profile?.full_name || profile?.username || m.recipient_email || 'Unknown',
          status: m.status || 'sent',
          delivered_at: m.delivered_at || null,
          opened_at: m.opened_at || null,
          read_completely_at: m.read_completely_at || null,
          replied_at: m.replied_at || null,
          created_at: m.created_at,
          nature: m.nature || 'fyi',
          attachments: m.attachments || [],
        };
      });
      setMemus(formattedMemus);
    } catch (err) {
      console.error('Error fetching out memus:', err);
      showToast('Failed to load sent memus', 'error');
      setMemus([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    if (currentUserId) fetchOutMemus();
  }, [fetchOutMemus, currentUserId]);

  const getDetailedStatus = (memu: OutMemu) => {
    if (memu.replied_at) return { label: 'Replied', icon: Reply, color: 'text-[#8b5cf6]', bg: 'bg-[#ede9fe]/50' };
    if (memu.read_completely_at) return { label: 'Fully read', icon: BookOpen, color: 'text-[#059669]', bg: 'bg-[#d1fae5]/50' };
    if (memu.opened_at) return { label: 'Partially read', icon: Eye, color: 'text-[#d97706]', bg: 'bg-[#fef3c7]/50' };
    if (memu.delivered_at || memu.status === 'sent') return { label: 'Delivered', icon: CheckCircle, color: 'text-[#4f46e5]', bg: 'bg-[#ede9fe]/50' };
    if (memu.status === 'pending') return { label: 'Pending', icon: Clock, color: 'text-[#777]', bg: 'bg-[#f2f1ee]/50' };
    if (memu.status === 'failed') return { label: 'Failed', icon: AlertCircle, color: 'text-[#dc2626]', bg: 'bg-[#fee2e2]/50' };
    return { label: 'Sent', icon: CheckCheck, color: 'text-[#777]', bg: 'bg-[#f2f1ee]/50' };
  };

  const getNatureBadge = (nature: string) => {
    const colors: Record<string, string> = {
      fyi: 'bg-[#fef3c7] text-[#d97706]',
      decide: 'bg-[#ede9fe] text-[#7c3aed]',
      resolve: 'bg-[#fee2e2] text-[#dc2626]',
      urgent: 'bg-[#d1fae5] text-[#059669]',
      broadcast: 'bg-[#fce7f3] text-[#be185d]',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[nature] || 'bg-[#f2f1ee] text-[#777]'}`}>
        {nature.toUpperCase()}
      </span>
    );
  };

  const filteredMemus = memus.filter(m => {
    const matchesSearch = 
      (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (m.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.recipient_name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesFilter = filterStatus === 'all';
    if (!matchesFilter) {
      if (filterStatus === 'delivered') matchesFilter = !!(m.delivered_at || m.status === 'sent') && !m.opened_at;
      else if (filterStatus === 'opened') matchesFilter = !!m.opened_at && !m.read_completely_at;
      else if (filterStatus === 'fully_read') matchesFilter = !!m.read_completely_at;
      else if (filterStatus === 'replied') matchesFilter = !!m.replied_at;
      else matchesFilter = m.status === filterStatus;
    }
    return matchesSearch && matchesFilter;
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

  const stats = {
    delivered: memus.filter(m => m.delivered_at || m.status === 'sent').length,
    opened: memus.filter(m => m.opened_at).length,
    fullyRead: memus.filter(m => m.read_completely_at).length,
    replied: memus.filter(m => m.replied_at).length,
  };

  const currentFilterLabel = filterOptions.find(f => f.id === filterStatus)?.label || 'All memus';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-[#fafaf8]">
        <div className="px-6 md:px-10 pt-8 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
            <div>
              <h1 className="heading-gradient font-['Playfair_Display'] text-3xl md:text-4xl font-medium tracking-tight">Out-memus</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs text-[#777]">{memus.length} sent</span>
                {stats.delivered > 0 && <span className="text-xs text-[#777]">· {stats.delivered} delivered</span>}
                {stats.opened > 0 && <span className="text-xs text-[#777]">· {stats.opened} opened</span>}
                {stats.fullyRead > 0 && <span className="text-xs text-[#777]">· {stats.fullyRead} fully read</span>}
                {stats.replied > 0 && <span className="text-xs text-[#777]">· {stats.replied} replied</span>}
              </div>
            </div>
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-[#e8e7e3] rounded-full text-sm text-[#777] hover:border-[#4f46e5] transition shadow-sm"
              >
                <Filter size={12} />
                <span>{currentFilterLabel}</span>
                <ChevronDown size={10} />
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-[#e8e7e3] overflow-hidden z-20 animate-fadeIn">
                  <div className="py-1">
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { setFilterStatus(opt.id); setIsFilterOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition ${
                          filterStatus === opt.id ? 'bg-[#ede9fe] text-[#4f46e5]' : 'text-[#777] hover:bg-[#fafaf8]'
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sent memus..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#e8e7e3] rounded-full text-sm outline-none focus:border-[#4f46e5] transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
          {filteredMemus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
                <Send size={28} className="text-[#aaa]" />
              </div>
              <h3 className="text-[17px] font-medium text-[#1a1a1a] mb-1">
                {searchQuery ? 'No matching memus' : 'No sent memus yet'}
              </h3>
              <p className="text-[13px] text-[#777] max-w-sm">
                {searchQuery ? 'Try a different search term.' : 'When you send a memu, it will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMemus.map((memu) => {
                const detail = getDetailedStatus(memu);
                const DetailIcon = detail.icon;
                return (
                  <div
                    key={memu.id}
                    onClick={() => setSelectedMemu(memu)}
                    className="group bg-white rounded-2xl border border-[#e8e7e3] p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-[#1a1a1a]">To: {memu.recipient_name}</span>
                        {getNatureBadge(memu.nature || 'fyi')}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${detail.bg} ${detail.color} backdrop-blur-sm`}>
                          <DetailIcon size={11} />
                          {detail.label}
                        </span>
                      </div>
                      <span className="text-meta text-[10px] text-[#777]">
                        {formatDate(memu.created_at)}
                      </span>
                    </div>
                    <div className="text-[15px] font-semibold text-[#1a1a1a] mb-1 line-clamp-1">
                      {memu.subject}
                    </div>
                    <p className="text-[13px] text-[#555] leading-relaxed line-clamp-2">
                      {memu.content}
                    </p>
                    {/* Attachments */}
                    {memu.attachments && memu.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {memu.attachments.map((att: any, idx: number) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] text-[#4f46e5] hover:underline bg-[#f2f1ee] rounded-full px-2.5 py-1 transition hover:bg-[#e8e7e3]"
                          >
                            <Paperclip size={10} /> {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                    {(memu.opened_at || memu.read_completely_at || memu.replied_at) && (
                      <div className="mt-3 pt-2 border-t border-[#e8e7e3] flex gap-3 text-[10px] text-[#777]">
                        {memu.opened_at && <span className="flex items-center gap-1"><Eye size={10} /> Opened {formatDate(memu.opened_at)}</span>}
                        {memu.read_completely_at && <span className="flex items-center gap-1"><BookOpen size={10} /> Fully read {formatDate(memu.read_completely_at)}</span>}
                        {memu.replied_at && <span className="flex items-center gap-1"><Reply size={10} /> Replied {formatDate(memu.replied_at)}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Memu Detail Modal */}
      {selectedMemu && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedMemu(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#f2f1ee]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-medium text-[#777]">To: {selectedMemu.recipient_name}</span>
                {getNatureBadge(selectedMemu.nature || 'fyi')}
              </div>
              <button onClick={() => setSelectedMemu(null)} className="p-1.5 rounded-full hover:bg-[#f2f1ee] transition">
                <X size={18} className="text-[#777]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <div className="text-[11px] text-[#777] uppercase tracking-wide">Subject</div>
                <div className="text-[18px] font-semibold text-[#1a1a1a]">{selectedMemu.subject}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#777] uppercase tracking-wide">Content</div>
                <div className="text-[14px] text-[#3a3a3a] leading-relaxed whitespace-pre-wrap">
                  {selectedMemu.content}
                </div>
              </div>
              {selectedMemu.attachments && selectedMemu.attachments.length > 0 && (
                <div>
                  <div className="text-[11px] text-[#777] uppercase tracking-wide mb-2">Attachments</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemu.attachments.map((att: any, idx: number) => (
                      <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-[#4f46e5] hover:underline bg-[#f2f1ee] rounded-full px-3 py-1.5">
                        <Paperclip size={12} /> {att.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-3 border-t border-[#e8e7e3]">
                <div className="flex flex-wrap gap-4 text-[11px] text-[#777]">
                  <span>Sent: {new Date(selectedMemu.created_at).toLocaleString()}</span>
                  {selectedMemu.delivered_at && <span>Delivered: {new Date(selectedMemu.delivered_at).toLocaleString()}</span>}
                  {selectedMemu.opened_at && <span>Opened: {new Date(selectedMemu.opened_at).toLocaleString()}</span>}
                  {selectedMemu.read_completely_at && <span>Fully read: {new Date(selectedMemu.read_completely_at).toLocaleString()}</span>}
                  {selectedMemu.replied_at && <span>Replied: {new Date(selectedMemu.replied_at).toLocaleString()}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .text-meta { font-size: 11px; color: #777; }
      `}</style>
    </>
  );
}