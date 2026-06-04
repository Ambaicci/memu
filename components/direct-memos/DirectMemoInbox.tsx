'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Inbox, Send, Reply, CheckCheck, Check, Loader2, User } from 'lucide-react';
import DirectMemoComposer from './DirectMemoComposer';

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
}

interface Memo {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: Profile;
  recipient?: Profile;
}

interface DirectMemoInboxProps {
  onClose: () => void;
}

export default function DirectMemoInbox({ onClose }: DirectMemoInboxProps) {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchMemos(user.id);
      } else {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  // Fetch memos and enrich with profile names
  const fetchMemos = useCallback(async (userId: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data: rawMemos, error } = await supabase
        .from('direct_memos')
        .select('id, sender_id, recipient_id, content, is_read, read_at, created_at')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract unique user IDs to fetch names safely
      const userIds = [...new Set((rawMemos || []).flatMap(m => [m.sender_id, m.recipient_id]).filter(id => id !== userId))];
      
      let profiles: Record<string, Profile> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);
        
        if (profileData) {
          profiles = profileData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        }
      }

      // Map and enrich
      const enrichedMemos: Memo[] = (rawMemos || []).map(m => ({
        ...m,
        sender: m.sender_id === userId ? undefined : (profiles[m.sender_id] || { id: m.sender_id, full_name: 'Colleague', username: null }),
        recipient: m.recipient_id === userId ? undefined : (profiles[m.recipient_id] || { id: m.recipient_id, full_name: 'Colleague', username: null }),
      }));

      setMemos(enrichedMemos);
    } catch (err) {
      console.error('Failed to fetch memos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark as read when inbox opens or memo is clicked
  const markAsRead = async (memoId: string) => {
    const memo = memos.find(m => m.id === memoId);
    if (!memo || memo.is_read || memo.recipient_id !== currentUserId) return;

    const supabase = createClient();
    await supabase
      .from('direct_memos')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', memoId);

    setMemos(prev => prev.map(m => m.id === memoId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m));
  };

  const handleReply = (memo: Memo) => {
    const otherUserId = memo.sender_id === currentUserId ? memo.recipient_id : memo.sender_id;
    const otherUser = memo.sender_id === currentUserId ? memo.recipient : memo.sender;
    setReplyTo({ id: otherUserId, name: otherUser?.full_name || 'Colleague' });
    setComposerOpen(true);
  };

  const formatTime = (dateStr: string) => {
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

  const filteredMemos = memos.filter(m => 
    activeTab === 'inbox' ? m.recipient_id === currentUserId : m.sender_id === currentUserId
  );

  return (
    <>
      {/* Inbox Slide-Over */}
      <div className="fixed inset-y-0 right-0 w-96 bg-[#fafaf8] shadow-2xl z-50 flex flex-col border-l border-[#e8e7e3] animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e7e3] bg-white">
          <h3 className="text-[14px] font-semibold text-[#0f0f0f] flex items-center gap-2">
            <Inbox size={16} className="text-[#4f46e5]" />
            Direct Memos
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#e8e7e3] transition text-[#777]">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e8e7e3] bg-white">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-3 text-[12px] font-medium transition-colors ${
              activeTab === 'inbox' ? 'text-[#4f46e5] border-b-2 border-[#4f46e5] bg-[#ede9fe]/30' : 'text-[#777] hover:bg-[#f2f1ee]'
            }`}
          >
            Inbox ({memos.filter(m => m.recipient_id === currentUserId && !m.is_read).length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-3 text-[12px] font-medium transition-colors ${
              activeTab === 'sent' ? 'text-[#4f46e5] border-b-2 border-[#4f46e5] bg-[#ede9fe]/30' : 'text-[#777] hover:bg-[#f2f1ee]'
            }`}
          >
            Sent
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-[#4f46e5]" />
            </div>
          ) : filteredMemos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6">
              <div className="w-12 h-12 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-3">
                {activeTab === 'inbox' ? <Inbox className="w-6 h-6 text-[#aaa]" /> : <Send className="w-6 h-6 text-[#aaa]" />}
              </div>
              <p className="text-[12px] text-[#777]">
                {activeTab === 'inbox' ? 'No memos yet.' : 'No sent memos.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e8e7e3]/50">
              {filteredMemos.map((memo) => {
                const isMine = memo.sender_id === currentUserId;
                const otherUser = isMine ? memo.recipient : memo.sender;
                const displayName = otherUser?.full_name || otherUser?.username || 'Colleague';

                return (
                  <div
                    key={memo.id}
                    onClick={() => !isMine && markAsRead(memo.id)}
                    className={`p-4 hover:bg-[#f2f1ee] transition cursor-pointer group ${
                      !isMine && !memo.is_read ? 'bg-[#ede9fe]/20' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5] text-[10px] font-bold flex-shrink-0">
                        {displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[13px] font-semibold ${!isMine && !memo.is_read ? 'text-[#0f0f0f]' : 'text-[#3a3a3a]'}`}>
                            {displayName}
                          </span>
                          <span className="text-[10px] text-[#777]">
                            {formatTime(memo.created_at)}
                          </span>
                        </div>
                        
                        <p className={`text-[12px] leading-relaxed mb-2 ${!isMine && !memo.is_read ? 'text-[#0f0f0f] font-medium' : 'text-[#555]'}`}>
                          {memo.content}
                        </p>

                        {/* Read Receipt / Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] text-[#aaa]">
                            {isMine ? (
                              memo.is_read ? (
                                <>
                                  <CheckCheck size={10} className="text-[#4f46e5]" />
                                  Read {memo.read_at ? formatTime(memo.read_at) : 'recently'}
                                </>
                              ) : (
                                <>
                                  <Check size={10} />
                                  Delivered
                                </>
                              )
                            ) : (
                              memo.is_read && <span className="text-[#4f46e5]">Read {memo.read_at ? formatTime(memo.read_at) : ''}</span>
                            )}
                          </div>

                          {/* Reply Button (Only on hover for inbox items) */}
                          {!isMine && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReply(memo); }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-[#e8e7e3] text-[#777] hover:text-[#4f46e5] transition"
                              title="Reply with a new memo"
                            >
                              <Reply size={12} />
                            </button>
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

        {/* Footer: New Memo Button */}
        <div className="p-4 border-t border-[#e8e7e3] bg-white">
          <button
            onClick={() => { setReplyTo(null); setComposerOpen(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4f46e5] text-white rounded-lg text-[13px] font-medium hover:bg-[#4338ca] transition shadow-sm"
          >
            New Direct Memo
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Composer Overlay */}
      {composerOpen && (
        <DirectMemoComposer
          recipientId={replyTo?.id}
          recipientName={replyTo?.name}
          onClose={() => setComposerOpen(false)}
          onSent={() => fetchMemos(currentUserId!)}
        />
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn { animation: slideIn 0.25s ease-out; }
      `}</style>
    </>
  );
}