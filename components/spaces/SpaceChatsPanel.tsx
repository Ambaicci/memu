'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { Send, Paperclip, Smile, Sparkles, Loader2 } from 'lucide-react';

interface SpaceChatsPanelProps {
  space: any;
  currentUserId: string | null;
}

export default function SpaceChatsPanel({ space, currentUserId }: SpaceChatsPanelProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (space) {
      fetchMessages();
    }
  }, [space]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // We only select '*' because we already have the member details in 'space.members'
    const { data, error } = await supabase
      .from('space_messages')
      .select('*') 
      .eq('space_id', space.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const formattedMessages = data.map((msg: any, idx: number) => {
        // Match the message to the space member we already fetched!
        const member = space.members.find((m: any) => m.id === msg.user_id) || {
          id: msg.user_id,
          name: 'Unknown User',
          handle: '@unknown',
          initials: '??',
          color: ['#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6'][idx % 5],
          textColor: '#ffffff',
        };
        return {
          id: msg.id,
          text: msg.message,         
          user: member,
          timestamp: new Date(msg.created_at),
        };
      });
      setMessages(formattedMessages);
    } else if (error) {
      console.error('Error fetching messages:', error.message, error.details);
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !space || !currentUserId) return;
    
    const supabase = createClient();
    const currentUser = space.members.find((m: any) => m.id === currentUserId) || {
      id: currentUserId,
      name: 'You',
      handle: '@you',
      initials: 'ME',
      color: '#4f46e5',
      textColor: '#ffffff',
    };
    
    // We only select '*' because we already have the current user's details
    const { data, error } = await supabase
      .from('space_messages')
      .insert({
        space_id: space.id,
        user_id: currentUserId,
        message: message.trim(),
      })
      .select() 
      .single();

    if (!error && data) {
      const newMsg = {
        id: data.id,
        text: data.message,
        user: currentUser,
        timestamp: new Date(data.created_at),
      };
      setMessages(prev => [...prev, newMsg]);
      setMessage('');
      showToast('Message sent!', 'success');
    } else {
      console.error('Error sending message:', error?.message, error?.details);
      showToast('Failed to send message', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      <div className="flex-1 space-y-4 mb-6 overflow-y-auto pr-2">
        {messages.length > 0 ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
            {messages.map((msg, idx) => (
              <div key={msg.id} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0" style={{ backgroundColor: msg.user.color, color: msg.user.textColor }}>
                  {msg.user.initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{msg.user.name}</span>
                    <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm border border-gray-100 max-w-md">
                    <p className="text-sm text-gray-700 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-sm animate-in zoom-in-95 duration-500">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full w-24 h-24 flex items-center justify-center shadow-inner">
                  <Sparkles size={36} className="text-indigo-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to {space.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">Start the conversation — share ideas, ask questions, and collaborate with your team.</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="sticky bottom-4 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg p-2 flex items-center gap-1 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
        <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"><Paperclip size={18} /></button>
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400 py-2.5" />
        <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"><Smile size={18} /></button>
        <button onClick={handleSendMessage} disabled={!message.trim()} className={`p-2.5 rounded-xl transition-all shadow-sm ${message.trim() ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-md hover:-translate-y-0.5' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}