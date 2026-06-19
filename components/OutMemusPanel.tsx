'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Send, Search, CheckCheck, Clock, AlertCircle, Filter,
  Eye, BookOpen, Reply, CheckCircle, X, ChevronDown, Paperclip, Layers
} from 'lucide-react';

interface OutMemu {
  id: string;
  content: string;
  subject: string;
  recipient_name: string;
  recipient_id?: string;
  status: 'pending' | 'sent' | 'read' | 'failed';
  delivered_at?: string | null;
  opened_at?: string | null;
  read_completely_at?: string | null;
  replied_at?: string | null;
  created_at: string;
  nature?: string;
  attachments?: any[];
}

interface OutMemusPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const filterOptions = [
  { id: 'all', label: 'All memus', icon: <Send size={14} /> },
  { id: 'delivered', label: 'Delivered', icon: <CheckCircle size={14} /> },
  { id: 'opened', label: 'Opened', icon: <Eye size={14} /> },
  { id: 'fully_read', label: 'Fully read', icon: <BookOpen size={14} /> },
  { id: 'replied', label: 'Replied', icon: <Reply size={14} /> },
  { id: 'pending', label: 'Pending', icon: <Clock size={14} /> },
  { id: 'failed', label: 'Failed', icon: <AlertCircle size={14} /> },
];

const getNatureStyles = (nature: string) => {
  switch (nature) {
    case 'fyi': return { border: 'border-amber-200/60', badge: 'bg-amber-50 text-amber-700 border border-amber-100' };
    case 'decide': return { border: 'border-indigo-200/60', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-100' };
    case 'resolve': return { border: 'border-rose-200/60', badge: 'bg-rose-50 text-rose-700 border border-rose-100' };
    case 'urgent': return { border: 'border-emerald-200/60', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    case 'broadcast': return { border: 'border-pink-200/60', badge: 'bg-pink-50 text-pink-700 border border-pink-100' };
    default: return { border: 'border-gray-200/60', badge: 'bg-gray-50 text-gray-700 border border-gray-100' };
  }
};

const getStatusStyles = (memu: OutMemu) => {
  if (memu.replied_at) return { label: 'Replied', icon: Reply, color: 'text-purple-600' };
  if (memu.read_completely_at) return { label: 'Fully read', icon: BookOpen, color: 'text-emerald-600' };
  if (memu.opened_at) return { label: 'Opened', icon: Eye, color: 'text-blue-600' };
  if (memu.delivered_at || memu.status === 'sent') return { label: 'Delivered', icon: CheckCircle, color: 'text-indigo-600' };
  if (memu.status === 'pending') return { label: 'Pending', icon: Clock, color: 'text-gray-500' };
  if (memu.status === 'failed') return { label: 'Failed', icon: AlertCircle, color: 'text-rose-600' };
  return { label: 'Sent', icon: CheckCheck, color: 'text-gray-500' };
};

const getInitials = (name: string) => name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 65%, 55%)`;
};

const OutMemusSkeleton = () => (
  <div className="space-y-3 px-6 md:px-10 pt-8">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white border border-gray-200/60 rounded-2xl p-4 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg" />
            <div className="w-24 h-3 bg-gray-100 rounded" />
          </div>
          <div className="w-12 h-3 bg-gray-100 rounded" />
        </div>
        <div className="w-3/4 h-4 bg-gray-100 rounded mb-2" />
        <div className="w-full h-3 bg-gray-100 rounded" />
      </div>
    ))}
  </div>
);

export default function OutMemusPanel({ isGuest, requireAuth }: OutMemusPanelProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedMemu, setSelectedMemu] = useState<OutMemu | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
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

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase.channel(`user-notifications:${currentUserId}`);
    channel.on('broadcast', { event: 'memu_opened' }, ({ payload }) => showToast(`📬 Memu "${payload.subject}" was opened.`, 'info'));
    channel.on('broadcast', { event: 'memu_fully_read' }, ({ payload }) => showToast(`✅ Memu "${payload.subject}" was fully read.`, 'success'));
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, showToast]);

  const { data: memus = [], isLoading } = useQuery({
    queryKey: ['outmemus', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const supabase = createClient();
      const { data: memusData, error } = await supabase.from('memus').select('*').eq('sender_id', currentUserId).order('created_at', { ascending: false });
      if (error) throw error;
      if (!memusData || memusData.length === 0) return [];
      
      const recipientIds = [...new Set(memusData.map(m => m.recipient_id).filter(id => id))];
      let profilesMap: Record<string, any> = {};
      if (recipientIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, username').in('id', recipientIds);
        if (profilesData) profilesMap = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }
      
      return memusData.map((m: any) => ({
        id: m.id, content: m.body || m.content || '', subject: m.subject || '(no subject)',
        recipient_name: profilesMap[m.recipient_id]?.full_name || profilesMap[m.recipient_id]?.username || m.recipient_email || 'Unknown',
        recipient_id: m.recipient_id, status: m.status || 'sent',
        delivered_at: m.delivered_at || null, opened_at: m.opened_at || null,
        read_completely_at: m.read_completely_at || null, replied_at: m.replied_at || null,
        created_at: m.created_at, nature: m.nature || 'fyi', attachments: m.attachments || [],
      })) as OutMemu[];
    },
    enabled: !!currentUserId,
    staleTime: 60 * 1000,
  });

  const filteredMemus = memus.filter(m => {
    const matchesSearch = (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) || m.recipient_name.toLowerCase().includes(searchQuery.toLowerCase());
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

  if (isLoading) return <OutMemusSkeleton />;

  return (
    <>
      <div className="flex flex-col h-full bg-memu-canvas animate-page-enter">
        {/* Header Section */}
        <div className="px-6 md:px-10 pt-8 pb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-indigo-600">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <Send size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-bold uppercase tracking-wider">Sent</span>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">Out-memus</h1>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="text-sm text-gray-500 font-medium">{memus.length} sent</span>
                {stats.delivered > 0 && (<><span className="text-gray-300">·</span><span className="text-sm text-gray-500 font-medium">{stats.delivered} delivered</span></>)}
                {stats.opened > 0 && (<><span className="text-gray-300">·</span><span className="text-sm text-gray-500 font-medium">{stats.opened} opened</span></>)}
                {stats.fullyRead > 0 && (<><span className="text-gray-300">·</span><span className="text-sm text-emerald-600 font-bold">{stats.fullyRead} fully read</span></>)}
                {stats.replied > 0 && (<><span className="text-gray-300">·</span><span className="text-sm text-purple-600 font-bold">{stats.replied} replied</span></>)}
              </div>
            </div>
            
            <div className="relative" ref={filterRef}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 transition-all shadow-sm btn-press">
                <Filter size={15} /><span>{currentFilterLabel}</span><ChevronDown size={13} />
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-20 animate-fadeIn">
                  <div className="py-2">
                    {filterOptions.map((opt) => (
                      <button key={opt.id} onClick={() => { setFilterStatus(opt.id); setIsFilterOpen(false); }} className={`w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition ${filterStatus === opt.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search sent memus..." className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400" />
          </div>
        </div>

        {/* Memus List */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
          {filteredMemus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-scale">
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl blur-2xl animate-pulse"></div>
                <div className="relative bg-white rounded-3xl w-32 h-32 flex items-center justify-center shadow-xl border border-gray-200">
                  <Send size={48} className="text-indigo-500" strokeWidth={2} />
                </div>
              </div>
              <h3 className="font-serif text-xl font-semibold text-gray-900 mb-3">
                {searchQuery ? 'No matching memus' : 'No sent memus yet'}
              </h3>
              <p className="text-gray-500 text-sm max-w-md">
                {searchQuery ? 'Try a different search term.' : 'When you send a memu, it will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemus.map((memu, idx) => {
                const statusStyles = getStatusStyles(memu);
                const StatusIcon = statusStyles.icon;
                const natureStyles = getNatureStyles(memu.nature || 'fyi');
                const recipientInitials = getInitials(memu.recipient_name);
                const avatarColor = stringToColor(memu.recipient_id || memu.recipient_name);
                
                return (
                  <div
                    key={memu.id}
                    onClick={() => setSelectedMemu(memu)}
                    className={`group relative bg-white rounded-2xl border-[1px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${natureStyles.border} p-4 cursor-pointer animate-slide-up btn-press`}
                    style={{ animationDelay: `${idx * 60}ms`, opacity: 0 }}
                  >
                    {/* 1. Header: Recipient & Time */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shadow-sm" style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}>
                          {recipientInitials}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">To: {memu.recipient_name}</div>
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium">{formatDate(memu.created_at)}</div>
                    </div>

                    {/* 2. Content: Subject & Body */}
                    <div className="mb-3">
                      <h3 className="font-serif text-[15px] font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {memu.subject}
                      </h3>
                      <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                        {memu.content}
                      </p>
                    </div>

                    {/* 3. Footer: Nature, Status, Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${natureStyles.badge}`}>
                          {memu.nature}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${statusStyles.color}`}>
                          <StatusIcon size={10} strokeWidth={2.5} /> {statusStyles.label}
                        </span>
                        {memu.attachments && memu.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Paperclip size={10} /> {memu.attachments.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all btn-press" title="View Details">
                          <Eye size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Premium Detail Modal */}
      {selectedMemu && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setSelectedMemu(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 animate-fade-in-scale" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md text-white font-bold" style={{ background: `linear-gradient(135deg, ${stringToColor(selectedMemu.recipient_id || selectedMemu.recipient_name)}, ${stringToColor(selectedMemu.recipient_id || selectedMemu.recipient_name)}dd)` }}>
                  {getInitials(selectedMemu.recipient_name)}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">To: {selectedMemu.recipient_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getNatureStyles(selectedMemu.nature || 'fyi').badge}`}>
                      {selectedMemu.nature}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedMemu(null)} className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-500 btn-press">
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Subject</div>
                <div className="font-serif text-xl font-semibold text-gray-900">{selectedMemu.subject}</div>
              </div>
              
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Content</div>
                <div className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedMemu.content}
                </div>
              </div>
              
              {selectedMemu.attachments && selectedMemu.attachments.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Attachments</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemu.attachments.map((att: any, idx: number) => (
                      <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-gray-50 rounded-full px-4 py-2 border border-gray-100 transition-all hover:shadow-md hover:scale-105 btn-press">
                        <Paperclip size={13} strokeWidth={2.5} /> {att.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-5 border-t border-gray-100">
                <div className="flex flex-wrap gap-5 text-xs text-gray-500">
                  <span className="flex items-center gap-2"><Clock size={13} strokeWidth={2.5} /><span className="font-medium">Sent: {new Date(selectedMemu.created_at).toLocaleString()}</span></span>
                  {selectedMemu.delivered_at && (<span className="flex items-center gap-2"><CheckCircle size={13} strokeWidth={2.5} className="text-indigo-600" /><span className="font-medium">Delivered: {new Date(selectedMemu.delivered_at).toLocaleString()}</span></span>)}
                  {selectedMemu.opened_at && (<span className="flex items-center gap-2"><Eye size={13} strokeWidth={2.5} className="text-blue-600" /><span className="font-medium">Opened: {new Date(selectedMemu.opened_at).toLocaleString()}</span></span>)}
                  {selectedMemu.read_completely_at && (<span className="flex items-center gap-2"><BookOpen size={13} strokeWidth={2.5} className="text-emerald-600" /><span className="font-medium">Fully read: {new Date(selectedMemu.read_completely_at).toLocaleString()}</span></span>)}
                  {selectedMemu.replied_at && (<span className="flex items-center gap-2"><Reply size={13} strokeWidth={2.5} className="text-purple-600" /><span className="font-medium">Replied: {new Date(selectedMemu.replied_at).toLocaleString()}</span></span>)}
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
      `}</style>
    </>
  );
}