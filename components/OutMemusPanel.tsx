'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { 
  Send, Search, CheckCheck, Clock, AlertCircle, Filter,
  Eye, BookOpen, Reply, CheckCircle, X, Paperclip, Sparkles
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

const natureStyles: Record<string, string> = {
  fyi: 'bg-amber-100 text-amber-800 border-amber-200',
  decide: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  resolve: 'bg-rose-100 text-rose-800 border-rose-200',
  urgent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  broadcast: 'bg-pink-100 text-pink-800 border-pink-200',
};

const natureLabels: Record<string, string> = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
  broadcast: 'Broadcast',
};

const statusLabels: Record<string, string> = {
  all: 'All',
  delivered: 'Delivered',
  opened: 'Opened',
  fully_read: 'Fully Read',
  replied: 'Replied',
  pending: 'Pending',
  failed: 'Failed',
};

const OutMemusSkeleton = () => (
  <div className="flex flex-col h-full bg-memu-canvas p-6 md:p-10 animate-fadeIn">
    <div className="mb-8 space-y-3">
      <div className="w-48 h-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-xl animate-shimmer" />
      <div className="w-32 h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-md animate-shimmer" />
    </div>
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
          <div className="flex-1 space-y-3 py-1">
            <div className="w-3/4 h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
            <div className="w-full h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
            <div className="w-1/2 h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function OutMemusPanel({ isGuest, requireAuth }: OutMemusPanelProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedMemu, setSelectedMemu] = useState<OutMemu | null>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu]);

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

  const getStatusLabel = (memu: OutMemu) => {
    if (memu.replied_at) return 'Replied';
    if (memu.read_completely_at) return 'Fully read';
    if (memu.opened_at) return 'Opened';
    if (memu.delivered_at || memu.status === 'sent') return 'Delivered';
    if (memu.status === 'pending') return 'Pending';
    if (memu.status === 'failed') return 'Failed';
    return 'Sent';
  };

  const getStatusIcon = (memu: OutMemu) => {
    if (memu.replied_at) return Reply;
    if (memu.read_completely_at) return BookOpen;
    if (memu.opened_at) return Eye;
    if (memu.delivered_at || memu.status === 'sent') return CheckCircle;
    if (memu.status === 'pending') return Clock;
    if (memu.status === 'failed') return AlertCircle;
    return CheckCheck;
  };

  const getStatusColor = (memu: OutMemu) => {
    if (memu.replied_at) return 'text-purple-600';
    if (memu.read_completely_at) return 'text-emerald-600';
    if (memu.opened_at) return 'text-blue-600';
    if (memu.delivered_at || memu.status === 'sent') return 'text-indigo-600';
    if (memu.status === 'pending') return 'text-gray-500';
    if (memu.status === 'failed') return 'text-rose-600';
    return 'text-gray-500';
  };

  const filteredMemus = memus.filter(m => {
    // Search filter
    const matchesSearch = !searchQuery || 
      (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (m.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.recipient_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    let matchesStatus = filterStatus === 'all';
    if (!matchesStatus) {
      if (filterStatus === 'delivered') matchesStatus = !!(m.delivered_at || m.status === 'sent') && !m.opened_at;
      else if (filterStatus === 'opened') matchesStatus = !!m.opened_at && !m.read_completely_at;
      else if (filterStatus === 'fully_read') matchesStatus = !!m.read_completely_at;
      else if (filterStatus === 'replied') matchesStatus = !!m.replied_at;
      else matchesStatus = m.status === filterStatus;
    }
    
    return matchesSearch && matchesStatus;
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

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setSearchQuery('');
    setShowSearch(false);
  };

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
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">Out-memus</h1>
              </div>
              <p className="text-sm text-gray-500 font-medium">
                {filteredMemus.length} {filteredMemus.length === 1 ? 'message' : 'messages'}
                {filterStatus !== 'all' && ` • ${statusLabels[filterStatus]}`}
                {searchQuery && ` • Search: "${searchQuery}"`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button 
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (showSearch) setSearchQuery('');
                }}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm btn-press ${
                  showSearch ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200'
                }`}
              >
                <Search size={18} strokeWidth={2.5} />
              </button>

              {/* Filter Button with Dropdown */}
              <div className="relative" ref={filterMenuRef}>
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm btn-press ${
                    filterStatus !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200'
                  }`}
                >
                  <Filter size={18} strokeWidth={2.5} />
                </button>

                {/* Filter Dropdown Menu */}
                {showFilterMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale">
                    <div className="p-2">
                      <button
                        onClick={() => { setFilterStatus('all'); setShowFilterMenu(false); }}
                        className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press ${
                          filterStatus === 'all' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        All Messages
                      </button>
                      <button
                        onClick={() => { setFilterStatus('delivered'); setShowFilterMenu(false); }}
                        className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                          filterStatus === 'delivered' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <CheckCircle size={14} /> Delivered
                      </button>
                      <button
                        onClick={() => { setFilterStatus('opened'); setShowFilterMenu(false); }}
                        className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                          filterStatus === 'opened' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Eye size={14} /> Opened
                      </button>
                      <button
                        onClick={() => { setFilterStatus('fully_read'); setShowFilterMenu(false); }}
                        className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                          filterStatus === 'fully_read' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <BookOpen size={14} /> Fully Read
                      </button>
                      <button
                        onClick={() => { setFilterStatus('replied'); setShowFilterMenu(false); }}
                        className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                          filterStatus === 'replied' ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Reply size={14} /> Replied
                      </button>
                      <button
                        onClick={() => { setFilterStatus('pending'); setShowFilterMenu(false); }}
                        className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                          filterStatus === 'pending' ? 'bg-gray-50 text-gray-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Clock size={14} /> Pending
                      </button>
                      <button
                        onClick={() => { setFilterStatus('failed'); setShowFilterMenu(false); }}
                        className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                          filterStatus === 'failed' ? 'bg-rose-50 text-rose-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <AlertCircle size={14} /> Failed
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="mb-4 animate-fadeIn">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by recipient, subject, or content..."
                  className="w-full pl-12 pr-12 py-3 text-sm bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 btn-press"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Filters Display */}
          {(filterStatus !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 mb-4 animate-fadeIn">
              {filterStatus !== 'all' && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {statusLabels[filterStatus]}
                  <button onClick={() => setFilterStatus('all')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
                </div>
              )}
              {searchQuery && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100 btn-press">✕</button>
                </div>
              )}
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 btn-press"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Memus List */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-24 custom-scroll">
          {filteredMemus.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in-scale">
              <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-4">
                {memus.length === 0 ? <Sparkles size={32} className="text-indigo-400" /> : <Filter size={32} className="text-indigo-400" />}
              </div>
              <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
                {memus.length === 0 ? 'No sent memus yet' : 'No messages found'}
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                {memus.length === 0 
                  ? 'When you send a memu, it will appear here with delivery tracking.'
                  : 'Try adjusting your filters or search query.'
                }
              </p>
              {(filterStatus !== 'all' || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all btn-press"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemus.map((memu) => {
                const StatusIcon = getStatusIcon(memu);
                const statusColor = getStatusColor(memu);
                
                return (
                  <div
                    key={memu.id}
                    onClick={() => setSelectedMemu(memu)}
                    className="group bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer btn-press animate-slide-up"
                  >
                    <div className="flex gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-sm">
                          {getInitial(memu.recipient_name)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate text-base">
                            To: {memu.recipient_name}
                          </h3>
                          <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(memu.created_at)}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-gray-800 mb-2 truncate">
                          {memu.subject}
                        </p>

                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                          {memu.content}
                        </p>

                        {/* Nature & Status Badges */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${natureStyles[memu.nature || 'fyi'] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {natureLabels[memu.nature || 'fyi'] || memu.nature}
                          </span>
                          
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                            <StatusIcon size={10} strokeWidth={3} /> {getStatusLabel(memu)}
                          </span>

                          {memu.attachments && memu.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 text-[10px] font-bold border border-gray-200">
                              <Paperclip size={10} /> {memu.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedMemu && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setSelectedMemu(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 animate-fade-in-scale" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold shadow-md">
                  {getInitial(selectedMemu.recipient_name)}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">To: {selectedMemu.recipient_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${natureStyles[selectedMemu.nature || 'fyi'] || 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                      {natureLabels[selectedMemu.nature || 'fyi'] || selectedMemu.nature}
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
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </>
  );
}