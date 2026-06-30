'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { Send, Paperclip, Smile, Sparkles, Loader2 } from 'lucide-react';

interface SpaceChatsPanelProps {
  space: any;
  currentUserId: string | null;
}

const getUserColor = (id: string) => {
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-purple-500 to-violet-600',
    'from-cyan-500 to-blue-600',
  ];
  const index = id ? id.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export default function SpaceChatsPanel({ space, currentUserId }: SpaceChatsPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (space?.id) fetchMessages();
  }, [space?.id]);

  useEffect(() => {
    if (!space?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`space-chat-${space.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'space_messages',
          filter: `space_id=eq.${space.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          
          if (messages.some(m => m.id === newMsg.id)) return;

          const sender = space.members?.find((m: any) => m.id === newMsg.sender_id);
          
          const formattedMsg = {
            id: newMsg.id,
            content: newMsg.content,
            sender_id: newMsg.sender_id,
            created_at: newMsg.created_at,
            sender: {
              name: sender?.name || 'Unknown User',
              handle: sender?.handle || '@unknown',
              initials: getInitials(sender?.name || 'U'),
              color: getUserColor(newMsg.sender_id),
            }
          };

          setMessages(prev => [...prev, formattedMsg]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [space?.id, space?.members, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('space_messages')
      .select('*') 
      .eq('space_id', space.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const formatted = data.map((msg: any) => {
        const sender = space.members?.find((m: any) => m.id === msg.sender_id);
        return {
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          sender: {
            name: sender?.name || 'Unknown User',
            handle: sender?.handle || '@unknown',
            initials: getInitials(sender?.name || 'U'),
            color: getUserColor(msg.sender_id),
          }
        };
      });
      setMessages(formatted);
    } else if (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentUserId || sending) return;
    
    setSending(true);
    const supabase = createClient();
    const text = input.trim();
    setInput('');
    
    const { error } = await supabase
      .from('space_messages')
      .insert({
        space_id: space.id,
        sender_id: currentUserId,
        content: text,
      });

    if (error) {
      console.error('Send error:', error);
      showToast('Failed to send message', 'error');
      setInput(text);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[500px] max-h-[calc(100vh-250px)]">
      
      {/* ================= MESSAGE LIST ================= */}
      <div className="flex-1 overflow-y-auto custom-scroll px-3 md:px-4 py-4 space-y-3 md:space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 md:py-20 text-center animate-fadeIn">
            <div 
              className="w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center mb-4 md:mb-6 shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${space.color || '#2563EB'}22, ${space.color || '#2563EB'}11)`,
                border: `1px solid ${space.color || '#2563EB'}33`,
              }}
            >
              <Sparkles size={32} className="md:hidden" style={{ color: space.color || '#2563EB' }} strokeWidth={1.5} />
              <Sparkles size={36} className="hidden md:block" style={{ color: space.color || '#2563EB' }} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 tracking-tight">
              Start the conversation
            </h3>
            <p className="text-xs md:text-sm text-gray-500 max-w-xs leading-relaxed px-4">
              No messages yet in <span className="font-medium text-gray-700">{space.name}</span>. 
              Say hello to your team!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            
            return (
              <div 
                key={msg.id} 
                className={`flex gap-2 md:gap-3 group animate-fadeIn ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar – Only show for others */}
                {!isMe && (
                  <div 
                    className={`w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br ${msg.sender.color} flex items-center justify-center text-white text-[10px] md:text-xs font-bold shadow-sm flex-shrink-0`}
                  >
                    {msg.sender.initials}
                  </div>
                )}

                {/* Content */}
                <div className={`flex-1 min-w-0 max-w-[85%] md:max-w-[80%] ${isMe ? 'flex flex-col items-end' : ''}`}>
                  <div className={`flex items-baseline gap-1.5 md:gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs md:text-sm font-bold text-gray-900 tracking-tight">
                      {isMe ? 'You' : msg.sender.name}
                    </span>
                    <span className="text-[10px] md:text-[11px] text-gray-400 font-medium">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  
                  <div 
                    className={`rounded-2xl px-3 md:px-4 py-2.5 md:py-3 shadow-sm border inline-block max-w-full ${
                      isMe 
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-500/20 rounded-tr-none'
                        : 'bg-white text-gray-700 border-gray-200/60 rounded-tl-none'
                    }`}
                  >
                    <p className={`text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words ${isMe ? 'text-white' : 'text-gray-700'}`}>
                      {msg.content}
                    </p>
                  </div>
                </div>

                {/* Avatar for self (small, on the right) */}
                {isMe && (
                  <div 
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] md:text-xs font-bold shadow-sm flex-shrink-0"
                  >
                    {getInitials('You')}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ================= INPUT AREA – MOBILE OPTIMIZED ================= */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/40 p-3 md:p-4 rounded-t-3xl shadow-lg">
        <div 
          className="relative bg-gray-50/80 border border-gray-200/60 rounded-2xl focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all shadow-sm"
        >
          {/* Input Row */}
          <div className="flex items-end gap-1.5 md:gap-2 p-1.5 md:p-2">
            {/* Attachment Button */}
            <button 
              className="p-3 md:p-2.5 rounded-xl active:bg-gray-200/60 text-gray-500 active:text-gray-700 transition-colors btn-press flex-shrink-0"
              title="Attach file"
              aria-label="Attach file"
            >
              <Paperclip size={18} strokeWidth={2} />
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${space.name}...`}
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none text-sm text-gray-900 placeholder:text-gray-400 py-2.5 px-2 max-h-32 min-h-[40px]"
              style={{ minHeight: '40px' }}
            />
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Emoji Button */}
              <button 
                className="p-3 md:p-2.5 rounded-xl active:bg-gray-200/60 text-gray-500 active:text-gray-700 transition-colors btn-press"
                title="Emoji"
                aria-label="Emoji"
              >
                <Smile size={18} strokeWidth={2} />
              </button>
              
              {/* Send Button */}
              <button 
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className={`p-3 md:p-2.5 rounded-xl transition-all btn-press ${
                  input.trim() 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md active:shadow-lg' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                style={{
                  boxShadow: input.trim() ? `0 4px 12px ${space.color || '#2563EB'}44` : 'none',
                }}
                aria-label="Send message"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Subtle footer - Hidden on mobile */}
        <p className="hidden md:block text-[10px] text-gray-400 text-center mt-2 font-medium">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-[9px] font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-[9px] font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .btn-press:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}