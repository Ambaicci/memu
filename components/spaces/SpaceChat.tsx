'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Loader2, AlertCircle, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name: string;
  sender_initials: string;
  sender_color: string;
  sender_avatar_url?: string;
  is_mine: boolean;
}

interface SpaceChatProps {
  spaceId: string;
}

export default function SpaceChat({ spaceId }: SpaceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user and profile
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Fetch current user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('id', user.id)
          .single();
        setCurrentUserProfile(profile);
      }
    };
    getUser();
  }, []);

  // Helper to enrich a message with sender data
  const enrichMessage = useCallback(async (msg: any): Promise<Message> => {
    const supabase = createClient();
    const isMine = msg.sender_id === currentUserId;
    
    let senderName = 'Member';
    let senderInitials = 'MB';
    let senderColor = '#777';
    let senderAvatarUrl: string | undefined;

    if (isMine && currentUserProfile) {
      senderName = 'You';
      senderInitials = (currentUserProfile.full_name || currentUserProfile.username || 'YO').substring(0, 2).toUpperCase();
      senderColor = '#4f46e5';
      senderAvatarUrl = currentUserProfile.avatar_url;
    } else {
      // Fetch sender's profile
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', msg.sender_id)
        .single();

      if (senderProfile) {
        senderName = senderProfile.full_name || senderProfile.username || 'Member';
        senderInitials = (senderProfile.full_name || senderProfile.username || 'MB').substring(0, 2).toUpperCase();
        senderColor = '#059669';
        senderAvatarUrl = senderProfile.avatar_url;
      }
    }

    return {
      id: msg.id,
      content: msg.content,
      sender_id: msg.sender_id,
      created_at: msg.created_at,
      sender_name: senderName,
      sender_initials: senderInitials,
      sender_color: senderColor,
      sender_avatar_url: senderAvatarUrl,
      is_mine: isMine,
    };
  }, [currentUserId, currentUserProfile]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('space_messages')
        .select('id, content, sender_id, created_at')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          setError('CHAT_COMING_SOON');
          setLoading(false);
          return;
        }
        throw error;
      }

      // Enrich all messages with sender data
      const enriched: Message[] = await Promise.all((data || []).map(enrichMessage));
      setMessages(enriched);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [spaceId, currentUserId, enrichMessage]);

  useEffect(() => {
    if (currentUserId && currentUserProfile) fetchMessages();
  }, [fetchMessages, currentUserId, currentUserProfile]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`space-chat-${spaceId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'space_messages', filter: `space_id=eq.${spaceId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          const enrichedMsg = await enrichMessage(newMsg);
          setMessages(prev => [...prev, enrichedMsg]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, currentUserId, enrichMessage]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId) return;
    setSending(true);
    
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('space_messages')
        .insert({
          space_id: spaceId,
          sender_id: currentUserId,
          content: newMessage.trim(),
        });
      
      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  if (error === 'CHAT_COMING_SOON') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-[#aaa]" />
        </div>
        <h3 className="text-lg font-medium text-[#0f0f0f] mb-2">Chat is coming soon</h3>
        <p className="text-sm text-[#777] max-w-md">
          The space messaging backend is being set up. You'll be able to chat here in real-time very soon.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={fetchMessages} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm hover:bg-[#4338ca] transition">
          Retry
        </button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <MessageSquare className="w-8 h-8 text-[#aaa] mb-3" />
        <p className="text-sm text-[#777]">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)]">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
              msg.is_mine 
                ? 'bg-[#4f46e5] text-white rounded-br-none' 
                : 'bg-white border border-[#e8e7e3] text-[#0f0f0f] rounded-bl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {msg.sender_avatar_url ? (
                  <img src={msg.sender_avatar_url} alt={msg.sender_name} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium" style={{ background: msg.sender_color, color: '#fff' }}>
                    {msg.sender_initials}
                  </div>
                )}
                <span className="text-[11px] opacity-75">{msg.sender_name}</span>
              </div>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <div className="text-[9px] opacity-60 mt-1 text-right">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#e8e7e3] bg-white">
        <div className="flex gap-3 items-end">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 border border-[#e8e7e3] rounded-xl px-4 py-2.5 text-[13.5px] resize-none outline-none focus:border-[#4f46e5] transition"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#4f46e5] text-white flex items-center justify-center hover:bg-[#4338ca] transition disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

