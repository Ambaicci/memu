'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface MemuReadPanelProps {
  memu: {
    id: string;
    from: string;
    handle: string;
    initials: string;
    color: string;
    textColor: string;
    subject: string;
    time: string;
    nature: string;
    body: string;
    status?: string;
    deliveredAt?: string;
    openedAt?: string;
    readAt?: string;
    sender_id: string;
    recipient_id: string;
  } | null;
  onClose: () => void;
  onReply: (replyText: string) => void;
  onMarkOpened?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  currentUserId?: string | null;
}

const natureLabels: Record<string, string> = {
  fyi: 'FYI',
  decide: 'Decide',
  resolve: 'Resolve',
  urgent: 'Urgent',
};

export default function MemuReadPanel({ 
  memu, 
  onClose, 
  onReply, 
  onMarkOpened, 
  onMarkRead,
  currentUserId 
}: MemuReadPanelProps) {
  const [replyText, setReplyText] = useState('');
  const [hasMarkedOpened, setHasMarkedOpened] = useState(false);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localMemu, setLocalMemu] = useState<typeof memu>(memu);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Fetch fresh memu data on mount (in case status changed)
  useEffect(() => {
    if (!memu?.id) return;
    
    const fetchFreshMemu = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('memus')
        .select('*')
        .eq('id', memu.id)
        .single();
      
      if (!error && data) {
        setLocalMemu(prev => prev ? {
          ...prev,
          status: data.status,
          deliveredAt: data.delivered_at,
          openedAt: data.opened_at,
          readAt: data.read_at,
        } : null);
      }
      setLoading(false);
    };
    
    fetchFreshMemu();
  }, [memu?.id]);

  // Mark as opened when panel opens
  useEffect(() => {
    if (localMemu && !hasMarkedOpened && localMemu.recipient_id === currentUserId) {
      markAsOpened(localMemu.id);
      setHasMarkedOpened(true);
      onMarkOpened?.(localMemu.id);
    }
  }, [localMemu, hasMarkedOpened, currentUserId, onMarkOpened]);

  // Track scroll for fully read
  useEffect(() => {
    const handleScroll = () => {
      if (!localMemu || hasMarkedRead || localMemu.recipient_id !== currentUserId) return;
      if (localMemu.readAt) return;
      
      const scrollElement = scrollRef.current;
      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const percentRead = (scrollTop + clientHeight) / scrollHeight;
        
        // Mark as fully read when user scrolls to 80% of content
        if (percentRead > 0.8) {
          markAsRead(localMemu.id);
          setHasMarkedRead(true);
          onMarkRead?.(localMemu.id);
        }
      }
    };
    
    const scrollElement = scrollRef.current;
    scrollElement?.addEventListener('scroll', handleScroll);
    return () => scrollElement?.removeEventListener('scroll', handleScroll);
  }, [localMemu, hasMarkedRead, currentUserId, onMarkRead]);

  // Mark memu as opened in Supabase
  const markAsOpened = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('memus')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', id)
      .eq('recipient_id', currentUserId);
    
    if (error) console.error('Error marking as opened:', error);
  }, [currentUserId]);

  // Mark memu as read in Supabase
  const markAsRead = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('memus')
      .update({ 
        read_at: new Date().toISOString(),
        status: 'read'
      })
      .eq('id', id)
      .eq('recipient_id', currentUserId);
    
    if (error) console.error('Error marking as read:', error);
  }, [currentUserId]);

  if (!localMemu) return null;

  const handleReply = async () => {
    if (!replyText.trim() || !currentUserId) return;
    
    try {
      const supabase = createClient();
      
      // Insert reply as new memu with parent reference
      const { error } = await supabase
        .from('memus')
        .insert({
          sender_id: currentUserId,
          recipient_id: localMemu.sender_id, // Reply to original sender
          subject: `Re: ${localMemu.subject}`,
          body: replyText.trim(),
          nature: localMemu.nature, // Keep same nature
          status: 'sent',
          parent_memu_id: localMemu.id, // Thread reference
          delivered_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('Error sending reply:', error);
        showToast('Failed to send reply', 'error');
        return;
      }
      
      showToast('Reply sent', 'success');
      onReply(replyText);
      setReplyText('');
      
      // Refresh memu data to show reply in thread (Phase 2: add replies fetch)
    } catch (err) {
      console.error('Unexpected error sending reply:', err);
      showToast('Failed to send reply', 'error');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed top-0 right-0 w-[52%] h-screen bg-white border-l border-[#e8e7e3] flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5]" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed top-0 right-0 w-[52%] h-screen bg-white border-l border-[#e8e7e3] flex flex-col items-center justify-center z-50 p-8 text-center">
        <p className="text-[#dc2626] mb-4">{error}</p>
        <button onClick={onClose} className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg">Close</button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 w-[52%] h-screen bg-white border-l border-[#e8e7e3] flex flex-col z-50 animate-slideIn">
      {/* Header */}
      <div className="px-7 py-6 pb-4 border-b border-[#f2f1ee]">
        <button onClick={onClose} className="flex items-center gap-1.5 text-[12px] text-[#777] hover:text-[#0f0f0f] transition mb-4">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round"/>
          </svg>
          Back
        </button>

        {/* Nature Tags */}
        <div className="flex gap-1.5 mb-3.5">
          {['fyi', 'decide', 'resolve', 'urgent'].map((n) => (
            <span
              key={n}
              className={`text-[11px] font-medium px-3 py-1 rounded-full transition ${
                localMemu.nature === n ? `nature-${n} opacity-100` : 'bg-[#f2f1ee] text-[#aaa] opacity-35'
              }`}
            >
              {natureLabels[n]}
            </span>
          ))}
        </div>

        <h2 className="font-['Playfair_Display'] text-[22px] font-normal text-[#0f0f0f] mb-3 leading-tight">
          {localMemu.subject}
        </h2>

        {/* From row */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium"
            style={{ background: localMemu.color, color: localMemu.textColor }}
          >
            {localMemu.initials}
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-medium text-[#0f0f0f]">{localMemu.from}</div>
            <div className="text-[12px] text-[#777]">{localMemu.handle}</div>
          </div>
          <div className="text-[12px] text-[#777]">{localMemu.time}</div>
        </div>
      </div>

      {/* Body with scroll tracking */}
      <div ref={scrollRef} id="read-body-scroll" className="flex-1 overflow-y-auto px-7 py-6">
        <div dangerouslySetInnerHTML={{ __html: localMemu.body }} className="prose prose-sm max-w-none" />
      </div>

      {/* Footer with reply */}
      <div className="p-7 pt-4 border-t border-[#f2f1ee]">
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 border border-[#e8e7e3] rounded-md p-2.5 font-['DM_Sans'] text-[13.5px] text-[#0f0f0f] bg-[#f2f1ee] resize-none outline-none focus:border-[#777] focus:bg-white transition"
            placeholder="Write a reply…"
            rows={2}
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim()}
            className="px-5 py-2 bg-[#0f0f0f] text-white rounded-md text-[12.5px] font-medium hover:bg-[#2a2a2a] transition self-end disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nature-fyi { background: #fef3c7; color: #d97706; }
        .nature-decide { background: #ede9fe; color: #7c3aed; }
        .nature-resolve { background: #fee2e2; color: #dc2626; }
        .nature-urgent { background: #d1fae5; color: #059669; }
        .prose p { font-size: 14.5px; line-height: 1.75; color: #3a3a3a; margin-bottom: 16px; }
      `}</style>
    </div>
  );
}