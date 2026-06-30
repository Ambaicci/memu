'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Inbox,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  Zap,
  X,
  Calendar,
  Reply,
  Eye,
  EyeOff,
  Send,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { EmptyState } from '@/components/ui';

interface Sender {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Memu {
  id: string;
  sender_id: string;
  subject: string;
  body: string;
  nature: string;
  status: string;
  is_read: boolean;
  read_percentage?: number;
  is_replied: boolean;
  created_at: string;
  sender?: Sender | null;
}

interface InMemusPanelProps {
  isGuest: boolean;
  requireAuth: (action: string, callback: () => void) => void;
}

const natureStyles: Record<string, { bg: string; text: string; border: string; icon: any; tint: string }> = {
  fyi: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Mail,
    tint: 'bg-amber-500/5',
  },
  decide: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: CheckCircle,
    tint: 'bg-blue-500/5',
  },
  resolve: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: AlertCircle,
    tint: 'bg-rose-500/5',
  },
  urgent: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: Zap,
    tint: 'bg-red-500/5',
  },
};

const natureLabels: Record<string, string> = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
};

const dateLabels: Record<string, string> = {
  all: 'All Time',
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};

export default function InMemusPanel({ isGuest, requireAuth }: InMemusPanelProps) {
  const [memus, setMemus] = useState<Memu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMemu, setSelectedMemu] = useState<Memu | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const { showToast } = useToast();

  const filterMenuRef = useRef<HTMLDivElement>(null);

  const fetchMemus = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: memusData, error: memusError } = await supabase
      .from('memus')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (memusError) {
      console.error('Error fetching memus:', memusError);
      setLoading(false);
      return;
    }

    if (!memusData || memusData.length === 0) {
      setMemus([]);
      setLoading(false);
      return;
    }

    const senderIds = [...new Set(memusData.map((m) => m.sender_id).filter(Boolean))];
    let sendersMap: Record<string, Sender> = {};

    if (senderIds.length > 0) {
      const { data: sendersData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', senderIds);

      if (sendersData) {
        sendersData.forEach((s) => {
          sendersMap[s.id] = s;
        });
      }
    }

    const merged: Memu[] = memusData.map((m) => ({
      ...m,
      sender: sendersMap[m.sender_id] || null,
    }));
    setMemus(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchMemus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    if (showFilterMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  const { isRefreshing } = usePullToRefresh(fetchMemus);

  const isWithinDateRange = (dateStr: string, range: string) => {
    if (range === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    if (range === 'today') return date.toDateString() === now.toDateString();
    if (range === 'week') return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (range === 'month') return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return true;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitial = (sender: Sender | null | undefined) => {
    if (!sender) return '?';
    return (sender.full_name || sender.username || '?').charAt(0).toUpperCase();
  };

  const getDisplayName = (sender: Sender | null | undefined) => {
    if (!sender) return 'Unknown Sender';
    return sender.full_name || sender.username || 'Unknown Sender';
  };

  const getReadStatus = (memu: Memu) => {
    if (!memu.is_read) return { label: 'Unread', color: 'text-gray-400', bg: 'bg-gray-100', icon: <EyeOff size={10} strokeWidth={2} /> };
    if (memu.read_percentage && memu.read_percentage < 100) {
      return { label: 'Partial', color: 'text-amber-600', bg: 'bg-amber-50', icon: <Eye size={10} strokeWidth={2} /> };
    }
    return { label: 'Read', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Eye size={10} strokeWidth={2} /> };
  };

  const getReplyStatus = (memu: Memu) => {
    return memu.is_replied
      ? { label: 'Replied', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Reply size={10} strokeWidth={2} /> }
      : { label: 'Reply', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Reply size={10} strokeWidth={2} /> };
  };

  const markAsRead = async (memuId: string) => {
    const supabase = createClient();
    await supabase.from('memus').update({ is_read: true, read_percentage: 100 }).eq('id', memuId);
    setMemus((prev) =>
      prev.map((m) => (m.id === memuId ? { ...m, is_read: true, read_percentage: 100 } : m))
    );
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMemu) return;
    setIsReplying(true);
    const supabase = createClient();

    const { error } = await supabase.from('memus').insert({
      sender_id: selectedMemu.sender_id,
      recipient_id: selectedMemu.sender_id,
      subject: `Re: ${selectedMemu.subject}`,
      body: replyText,
      nature: 'fyi',
      status: 'sent',
      is_read: false,
      is_replied: false,
    });

    if (error) {
      showToast('Failed to send reply', 'error');
    } else {
      await supabase.from('memus').update({ is_replied: true }).eq('id', selectedMemu.id);
      setMemus((prev) =>
        prev.map((m) => (m.id === selectedMemu.id ? { ...m, is_replied: true } : m))
      );
      showToast('Reply sent successfully', 'success');
      setReplyText('');
      setIsReplying(false);
      setIsReplyModalOpen(false);
      setSelectedMemu(null);
    }
  };

  const openReplyModal = (memu: Memu, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemu(memu);
    setReplyText('');
    setIsReplyModalOpen(true);
  };

  const filteredMemus = memus.filter((memu) => {
    if (activeFilter !== 'all' && memu.nature !== activeFilter) return false;
    if (!isWithinDateRange(memu.created_at, filterDate)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        getDisplayName(memu.sender).toLowerCase().includes(query) ||
        memu.subject.toLowerCase().includes(query) ||
        memu.body.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const clearFilters = () => {
    setActiveFilter('all');
    setFilterDate('all');
    setSearchQuery('');
    setShowSearch(false);
  };

  const hasActiveFilters = activeFilter !== 'all' || filterDate !== 'all' || searchQuery;

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full bg-memu-canvas p-6 md:p-10 animate-page-enter">
        <div className="mb-8 space-y-3">
          <SkeletonLoader width="w-48" height="h-8" rounded="rounded-xl" />
          <SkeletonLoader width="w-32" height="h-4" />
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-200/60 shadow-sm">
              <SkeletonLoader width="w-12" height="h-12" circle />
              <div className="flex-1 space-y-3 py-1">
                <SkeletonLoader width="w-3/4" height="h-4" />
                <SkeletonLoader width="w-full" height="h-3" />
                <SkeletonLoader width="w-1/2" height="h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-memu-canvas animate-page-enter">
      {isRefreshing && (
        <div className="flex justify-center py-4 animate-fadeIn">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="px-6 md:px-10 pt-8 pb-4 w-full">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                <Inbox size={20} strokeWidth={2} className="text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">InMemus</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {filteredMemus.length} {filteredMemus.length === 1 ? 'message' : 'messages'}
              {activeFilter !== 'all' && ` • ${natureLabels[activeFilter]}`}
              {filterDate !== 'all' && ` • ${dateLabels[filterDate]}`}
              {searchQuery && ` • Search: "${searchQuery}"`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all btn-press ${
                showSearch ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Search size={18} strokeWidth={2} />
            </button>

            <div className="relative" ref={filterMenuRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all btn-press ${
                  hasActiveFilters ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Filter size={18} strokeWidth={2} />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale">
                  <div className="p-2 max-h-96 overflow-y-auto no-scrollbar">
                    <div className="px-3 py-2 text-[11px] font-bold text-blue-600 tracking-widest uppercase">Nature</div>
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all btn-press ${
                        activeFilter === 'all' ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All Messages
                    </button>
                    {['fyi', 'decide', 'resolve', 'urgent'].map((nature) => {
                      const style = natureStyles[nature];
                      const Icon = style.icon;
                      return (
                        <button
                          key={nature}
                          onClick={() => setActiveFilter(nature)}
                          className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                            activeFilter === nature
                              ? 'bg-blue-600 text-white font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon size={14} className={activeFilter === nature ? 'text-white' : style.text} />
                          {natureLabels[nature]}
                        </button>
                      );
                    })}
                    <div className="my-2 border-t border-gray-100" />
                    <div className="px-3 py-2 text-[11px] font-bold text-purple-600 tracking-widest uppercase">Time Range</div>
                    {['all', 'today', 'week', 'month'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setFilterDate(range)}
                        className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all btn-press flex items-center gap-2 ${
                          filterDate === range
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Calendar size={14} strokeWidth={2} /> {dateLabels[range]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showSearch && (
          <div className="mb-4 animate-fadeIn w-full">
            <div className="relative w-full">
              <Search size={18} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-12 pr-12 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition text-gray-900 placeholder:text-gray-400"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 btn-press"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-4 animate-fadeIn">
            {activeFilter !== 'all' && (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${natureStyles[activeFilter].bg} ${natureStyles[activeFilter].text} ${natureStyles[activeFilter].border}`}
              >
                {natureLabels[activeFilter]}
                <button onClick={() => setActiveFilter('all')} className="opacity-60 hover:opacity-100 btn-press">
                  ✕
                </button>
              </div>
            )}
            {filterDate !== 'all' && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                {dateLabels[filterDate]}
                <button onClick={() => setFilterDate('all')} className="opacity-60 hover:opacity-100 btn-press">
                  ✕
                </button>
              </div>
            )}
            {searchQuery && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100 btn-press">
                  ✕
                </button>
              </div>
            )}
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 btn-press"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* MEMU LIST */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-24 custom-scroll w-full">
        {filteredMemus.length === 0 ? (
          <EmptyState
            icon={<Inbox size={40} strokeWidth={1.5} className="text-blue-500" />}
            title={memus.length === 0 ? 'Your inbox is empty' : 'No messages found'}
            description={
              memus.length === 0
                ? 'When memus arrive, they will appear here with crystal clear progress tracking.'
                : 'Try adjusting your filters or search query.'
            }
            action={
              hasActiveFilters
                ? { label: 'Clear Filters', onClick: clearFilters }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredMemus.map((memu, idx) => {
              const style = natureStyles[memu.nature] || natureStyles.fyi;
              const readStatus = getReadStatus(memu);

              return (
                <div
                  key={memu.id}
                  className={`
                    group relative rounded-2xl border border-gray-200/50 
                    shadow-[0_1px_3px_rgba(0,0,0,0.03)]
                    hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]
                    hover:-translate-y-0.5 hover:border-blue-200/40
                    transition-all duration-300 ease-out cursor-pointer
                    animate-slide-up
                    ${style.tint}
                  `}
                  style={{ animationDelay: `${idx * 60}ms`, opacity: 0 }}
                  onClick={() => {
                    setSelectedMemu(memu);
                    markAsRead(memu.id);
                  }}
                >
                  <div className="p-5 flex gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {memu.sender?.avatar_url ? (
                        <img
                          src={memu.sender.avatar_url}
                          alt={getDisplayName(memu.sender)}
                          className="w-11 h-11 rounded-xl object-cover border border-gray-200/80 shadow-sm group-hover:shadow-md transition-shadow"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
                          {getInitial(memu.sender)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm tracking-tight truncate">
                          {getDisplayName(memu.sender)}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1 font-medium tracking-tight">
                          <Clock size={10} strokeWidth={2} />
                          {formatDate(memu.created_at)}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-gray-800 mb-1 truncate tracking-tight">
                        {memu.subject || '(No subject)'}
                      </p>

                      <p className="text-sm text-gray-500 font-light leading-relaxed line-clamp-2 mb-3">
                        {memu.body}
                      </p>

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100/50">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Nature Badge */}
                          <span
                            className={`
                              inline-flex items-center gap-1.5 px-3 py-1 rounded-full 
                              text-[10px] font-semibold tracking-tight
                              border ${style.border} ${style.bg} ${style.text}
                              shadow-sm
                            `}
                          >
                            <style.icon size={10} strokeWidth={3} />
                            {natureLabels[memu.nature]}
                          </span>

                          {/* Read Status */}
                          <span
                            className={`
                              inline-flex items-center gap-1 px-2.5 py-1 rounded-full 
                              text-[10px] font-medium tracking-tight
                              ${readStatus.bg} ${readStatus.color}
                            `}
                          >
                            {readStatus.icon}
                            {readStatus.label}
                          </span>
                        </div>

                        {/* Reply Button */}
                        <button
                          onClick={(e) => openReplyModal(memu, e)}
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                            text-[10px] font-semibold tracking-tight transition-all
                            ${
                              memu.is_replied
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }
                            hover:shadow-sm
                          `}
                        >
                          <Reply size={10} strokeWidth={2.5} />
                          {memu.is_replied ? 'Replied' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/[0.02] group-hover:to-indigo-500/[0.02] transition-all duration-500 pointer-events-none" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW MEMU MODAL */}
      {selectedMemu && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => setSelectedMemu(null)}
          style={{ minHeight: '100vh', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-scale border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {selectedMemu.sender?.avatar_url ? (
                  <img
                    src={selectedMemu.sender.avatar_url}
                    alt={getDisplayName(selectedMemu.sender)}
                    className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {getInitial(selectedMemu.sender)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    From: {getDisplayName(selectedMemu.sender)}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={10} strokeWidth={2} />
                    {formatDate(selectedMemu.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMemu(null)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-xl font-semibold text-gray-900 mb-2 break-words">
                  {selectedMemu.subject || '(No subject)'}
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide border bg-white ${natureStyles[selectedMemu.nature]?.bg} ${natureStyles[selectedMemu.nature]?.text} ${natureStyles[selectedMemu.nature]?.border}`}
                >
                  {natureLabels[selectedMemu.nature]}
                </span>
              </div>

              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {selectedMemu.body}
              </div>

              {!selectedMemu.is_replied && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Reply size={14} strokeWidth={2} className="text-blue-600" />
                    <p className="text-xs font-medium text-gray-700">Reply to this memu</p>
                  </div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition min-h-[100px] resize-y"
                  />
                  <div className="flex justify-end gap-3 mt-3">
                    <button
                      onClick={() => {
                        setReplyText('');
                        setSelectedMemu(null);
                      }}
                      className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition btn-press"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim() || isReplying}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition btn-press disabled:opacity-50"
                    >
                      {isReplying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2} />}
                      {isReplying ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REPLY MODAL */}
      {isReplyModalOpen && selectedMemu && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => {
            setIsReplyModalOpen(false);
            setSelectedMemu(null);
          }}
          style={{ minHeight: '100vh', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Reply size={14} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Reply to {getDisplayName(selectedMemu.sender)}</p>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">
                    Re: {selectedMemu.subject || '(No subject)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsReplyModalOpen(false);
                  setSelectedMemu(null);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1 font-medium">{getDisplayName(selectedMemu.sender)} wrote:</p>
                <p className="text-sm text-gray-600 line-clamp-2 italic">{selectedMemu.body}</p>
              </div>

              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                className="w-full p-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition min-h-[120px] resize-y"
                autoFocus
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setIsReplyModalOpen(false);
                    setSelectedMemu(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition btn-press"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || isReplying}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition btn-press disabled:opacity-50"
                >
                  {isReplying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2} />}
                  {isReplying ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}