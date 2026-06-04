'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Eye, CheckCheck, Clock, BookOpen, CircleCheck, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import MemuReadPanel from './MemuReadPanel';

type StatusType = 'delivered' | 'opened' | 'partially_read' | 'fully_read';

interface InMemusPanelProps {
  isGuest?: boolean;
  requireAuth?: (action: string, callback: () => void) => void;
}

const statusConfig: Record<StatusType, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  delivered: {
    label: 'Delivered',
    icon: <CheckCheck size={11} />,
    color: 'text-[#3b82f6]',
    bgColor: 'bg-[#eff6ff]',
  },
  opened: {
    label: 'Opened',
    icon: <Eye size={11} />,
    color: 'text-[#8b5cf6]',
    bgColor: 'bg-[#f5f3ff]',
  },
  partially_read: {
    label: 'Partially Read',
    icon: <BookOpen size={11} />,
    color: 'text-[#f59e0b]',
    bgColor: 'bg-[#fffbeb]',
  },
  fully_read: {
    label: 'Fully Read',
    icon: <CircleCheck size={11} />,
    color: 'text-[#10b981]',
    bgColor: 'bg-[#ecfdf5]',
  },
};

const natureLabels: Record<string, string> = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
  broadcast: 'Broadcast',
  voice: 'Voice',
  group: 'Group',
};

const natureStyles: Record<string, { bg: string; text: string; border: string }> = {
  fyi: { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]', border: 'border-[#fde68a]' },
  decide: { bg: 'bg-[#ede9fe]', text: 'text-[#7c3aed]', border: 'border-[#c4b5fd]' },
  resolve: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]', border: 'border-[#fecaca]' },
  urgent: { bg: 'bg-[#d1fae5]', text: 'text-[#059669]', border: 'border-[#a7f3d0]' },
  broadcast: { bg: 'bg-[#e0e7ff]', text: 'text-[#4338ca]', border: 'border-[#c7d2fe]' },
  voice: { bg: 'bg-[#fce7f3]', text: 'text-[#be185d]', border: 'border-[#fbcfe8]' },
  group: { bg: 'bg-[#e6e6fa]', text: 'text-[#5b21b6]', border: 'border-[#d8b4fe]' },
};

interface MemuWithSender {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  nature: string;
  status: string;
  created_at: string;
  read_at: string | null;
  delivered_at: string | null;
  opened_at?: string | null;
  sender: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

// Helper to generate initials from full name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Helper to get a consistent colour from a string (for avatar background)
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 60%, 70%)`;
};

export default function InMemusPanel({ isGuest, requireAuth }: InMemusPanelProps = {}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [memus, setMemus] = useState<MemuWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemu, setSelectedMemu] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch memus where current user is recipient
  useEffect(() => {
    if (!currentUserId) return;

    const fetchMemus = async () => {
      const supabase = createClient();
      setLoading(true);
      const { data, error } = await supabase
        .from('memus')
        .select(`
          id,
          sender_id,
          recipient_id,
          subject,
          body,
          nature,
          status,
          created_at,
          read_at,
          delivered_at,
          opened_at,
          sender:sender_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('recipient_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memus:', error);
      } else {
        setMemus(data as MemuWithSender[]);
      }
      setLoading(false);
    };

    fetchMemus();

    // Optional: subscribe to realtime changes for this user
    const supabase = createClient();
    const channel = supabase
      .channel('inmemus-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memus',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        () => {
          fetchMemus(); // re-fetch when something changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Mark memu as read when opened
  const markAsRead = async (memuId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('memus')
      .update({ read_at: new Date().toISOString(), status: 'read' })
      .eq('id', memuId)
      .eq('recipient_id', currentUserId);
    if (error) console.error('Error marking as read:', error);
    else {
      // Update local state
      setMemus(prev =>
        prev.map(m =>
          m.id === memuId
            ? { ...m, read_at: new Date().toISOString(), status: 'read' }
            : m
        )
      );
    }
  };

  const handleMemuClick = async (memu: MemuWithSender) => {
    if (isGuest && requireAuth) {
      requireAuth('read memu', () => {
        setSelectedMemu(memu);
        if (!memu.read_at) markAsRead(memu.id);
      });
    } else {
      setSelectedMemu(memu);
      if (!memu.read_at) markAsRead(memu.id);
    }
  };

  const handleReply = (replyText: string) => {
    console.log('Reply sent:', replyText);
    setSelectedMemu(null);
  };

  const handleOpenCompose = () => {
    window.dispatchEvent(new CustomEvent('openCompose'));
  };

  // Filtering logic
  const filteredMemus = memus.filter(m => {
    const matchesFilter = filter === 'all' || m.nature === filter;
    const matchesSearch =
      m.sender.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = memus.filter(m => !m.read_at).length;
  const totalCount = memus.length;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5]" />
      </div>
    );
  }

  // Empty State
  if (memus.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f2f1ee] to-[#e8e7e3] flex items-center justify-center mx-auto mb-6">
          <Inbox size={36} className="text-[#aaa]" />
        </div>
        <h3 className="text-[18px] font-medium text-[#0f0f0f] mb-2">Your inbox is empty</h3>
        <p className="text-[13px] text-[#777] max-w-sm mb-6">
          When someone sends you a memu, it will appear here. Start the conversation by writing your first memu.
        </p>
        <button
          onClick={handleOpenCompose}
          className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-xl text-[13px] font-medium hover:shadow-lg transition"
        >
          ✨ Write your first memu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-0">
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-normal tracking-tight text-[#0f0f0f]">In-memus</h1>
        <p className="text-[13px] text-[#777] mt-1">{unreadCount} unread · {totalCount} total</p>
      </div>

      {/* Search Bar */}
      <div className="px-4 md:px-8 py-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 flex items-center gap-2.5 bg-[#f2f1ee] border border-[#e8e7e3] rounded-md px-3.5 py-2">
            <Search size={15} className="text-[#777]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memus..."
              className="flex-1 text-[13.5px] outline-none bg-transparent"
            />
          </div>
          <button className="w-8.5 h-8.5 border border-[#e8e7e3] bg-white rounded-md flex items-center justify-center hover:border-[#777] transition">
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="px-4 md:px-8 py-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-200 ${
            filter === 'all'
              ? 'bg-[#0f0f0f] text-white shadow-md'
              : 'bg-[#f2f1ee] text-[#3a3a3a] hover:bg-[#e8e7e3]'
          }`}
        >
          All
        </button>
        {Object.entries(natureLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-200 ${
              filter === key
                ? `${natureStyles[key].bg} ${natureStyles[key].text} shadow-md`
                : 'bg-[#f2f1ee] text-[#3a3a3a] hover:bg-[#e8e7e3]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Memus List */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        {filteredMemus.map((memu) => {
          const senderName = memu.sender.full_name;
          const senderHandle = memu.sender.username;
          const initials = getInitials(senderName);
          const avatarColor = stringToColor(senderName);
          const isUnread = !memu.read_at;
          // Determine status badge based on read status
          let statusType: StatusType = 'delivered';
          if (memu.read_at) statusType = 'fully_read';
          else if (memu.opened_at) statusType = 'opened';
          const status = statusConfig[statusType];

          return (
            <div
              key={memu.id}
              onClick={() => handleMemuClick(memu)}
              className="bg-white border border-[#e8e7e3] rounded-xl p-4 mb-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-medium shadow-sm"
                    style={{ background: avatarColor, color: '#fff' }}
                  >
                    {initials}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[13.5px] ${isUnread ? 'font-semibold text-[#0f0f0f]' : 'font-medium text-[#0f0f0f]'}`}>
                        {senderName}
                      </span>
                      <span className="text-[11px] text-[#777]">{senderHandle}</span>
                    </div>
                    <span className="text-[11.5px] text-[#777] flex-shrink-0">
                      {new Date(memu.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-[13px] text-[#3a3a3a] font-medium mb-1 line-clamp-1">
                    {memu.subject}
                  </div>

                  <div className="text-[12.5px] text-[#777] line-clamp-1 mb-2">
                    {memu.body.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Nature Tag */}
                    <span className={`text-[10.5px] font-medium px-2.5 py-0.5 rounded-full ${natureStyles[memu.nature]?.bg || 'bg-gray-100'} ${natureStyles[memu.nature]?.text || 'text-gray-700'}`}>
                      {natureLabels[memu.nature] || memu.nature}
                    </span>

                    {/* Status Badge */}
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bgColor}`}>
                      {status.icon}
                      <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredMemus.length === 0 && memus.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
              <Search size={28} className="text-[#aaa]" />
            </div>
            <h3 className="text-[15px] font-medium text-[#0f0f0f] mb-1">No matching memus</h3>
            <p className="text-[13px] text-[#777]">Try a different search or filter</p>
          </div>
        )}
      </div>

      <style>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {selectedMemu && (
        <MemuReadPanel
          memu={selectedMemu}
          onClose={() => setSelectedMemu(null)}
          onReply={handleReply}
        />
      )}
    </div>
  );
}