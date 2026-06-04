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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    
    const supabase = createClient();
    try {
      // Try to fetch from space_messages table
      const { data, error } = await supabase
        .from('space_messages')
        .select('id, content, sender_id, created_at')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: true });

      if (error) {
        // If table doesn't exist yet (Phase 1), show graceful empty state
        if (error.code === '42P01') {
          setError('CHAT_COMING_SOON');
          setLoading(false);
          return;
        }
        throw error;
      }

      // Enrich with sender info (simplified for now)
      const enriched: Message[] = (data || []).map(msg => ({
        ...msg,
        sender_name: msg.sender_id === currentUserId ? 'You' : 'Member',
        sender_initials: msg.sender_id === currentUserId ? 'YO' : 'MB',
        sender_color: msg.sender_id === currentUserId ? '#4f46e5' : '#777',
        is_mine: msg.sender_id === currentUserId,
      }));

      setMessages(enriched);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [spaceId, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchMessages();
  }, [fetchMessages, currentUserId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`space-chat-${spaceId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'space_messages', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => [...prev, {
            id: newMsg.id,
            content: newMsg.content,
            sender_id: newMsg.sender_id,
            created_at: newMsg.created_at,
            sender_name: newMsg.sender_id === currentUserId ? 'You' : 'Member',
            sender_initials: newMsg.sender_id === currentUserId ? 'YO' : 'MB',
            sender_color: newMsg.sender_id === currentUserId ? '#4f46e5' : '#777',
            is_mine: newMsg.sender_id === currentUserId,
          }]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, currentUserId]);

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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#4f46e5]" />
      </div>
    );
  }

  // Table not ready yet (Phase 1 graceful state)
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

  // Error state
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

  // Empty state
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
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
              msg.is_mine 
                ? 'bg-[#4f46e5] text-white rounded-br-none' 
                : 'bg-white border border-[#e8e7e3] text-[#0f0f0f] rounded-bl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium" style={{ background: msg.sender_color, color: msg.is_mine ? '#fff' : '#fff' }}>
                  {msg.sender_initials}
                </div>
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