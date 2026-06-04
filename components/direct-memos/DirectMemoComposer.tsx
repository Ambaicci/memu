'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { Send, X, AlertCircle, Search, UserX } from 'lucide-react';

interface DirectMemoComposerProps {
  recipientId?: string;
  recipientName?: string;
  onClose: () => void;
  onSent?: () => void;
}

const MAX_CHARS = 280;
const WARNING_THRESHOLD = 260;

export default function DirectMemoComposer({ 
  recipientId, 
  recipientName, 
  onClose, 
  onSent 
}: DirectMemoComposerProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // User Picker State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  // Initialize current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('✅ Current User ID:', user.id);
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  // If replying, lock recipient immediately
  useEffect(() => {
    if (recipientId && recipientName) {
      setSelectedUser({ id: recipientId, full_name: recipientName });
    }
  }, [recipientId, recipientName]);

  // Search Handles (profiles)
  useEffect(() => {
    if (selectedUser || !searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const supabase = createClient();
    console.log(' Searching for:', searchQuery);
    
    supabase
      .from('profiles')
      .select('id, full_name, username')
      .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
      .neq('id', currentUserId)
      .limit(5)
      .then(({ data, error }) => {
        if (error) console.error(' Search Error:', error);
        else console.log('✅ Search Results:', data);
        setSearchResults(data || []);
      });
  }, [searchQuery, selectedUser, currentUserId]);

  const charCount = content.length;
  const isOverLimit = charCount >= MAX_CHARS;
  const isNearLimit = charCount >= WARNING_THRESHOLD && !isOverLimit;

  const handleSend = async () => {
    if (!content.trim() || !currentUserId || !selectedUser) {
      console.warn('⚠️ Send blocked:', { content: !!content, userId: !!currentUserId, selectedUser });
      return;
    }
    if (isOverLimit) return;

    setSending(true);
    setError(null);
    const supabase = createClient();

    console.log(' Sending memo to:', selectedUser.id);

    try {
      const { error } = await supabase
        .from('direct_memos')
        .insert({
          sender_id: currentUserId,
          recipient_id: selectedUser.id,
          content: content.trim(),
        });

      if (error) throw error;

      showToast('Direct memo sent', 'success');
      if (onSent) onSent();
      onClose();
    } catch (err: any) {
      console.error('❌ Failed to send memo:', err);
      if (err.message?.includes('memo_length_cap')) {
        setError('Memo exceeds 280 characters.');
      } else if (err.message?.includes('no_self_memos')) {
        setError("You can't send a memo to yourself.");
      } else {
        setError(err.message || 'Failed to send memo.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isOverLimit && content.trim() && !sending && selectedUser) handleSend();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-[#e8e7e3] animate-slideIn">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e7e3] bg-[#fafaf8]">
        <h3 className="text-[14px] font-semibold text-[#0f0f0f]">New Direct Memo</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#e8e7e3] transition text-[#777]">
          <X size={18} />
        </button>
      </div>

      {/* Recipient Picker Area */}
      {!selectedUser ? (
        <div className="p-4 border-b border-[#e8e7e3] bg-white">
          <label className="block text-[10px] font-semibold text-[#777] uppercase tracking-wider mb-2">To: (Search Handles)</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type 'Test' or 'AMBAICCI'..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#f2f1ee] border border-transparent focus:border-[#4f46e5] focus:bg-white rounded-lg text-[13px] outline-none transition"
              autoFocus
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white border border-[#e8e7e3] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto z-10">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => { setSelectedUser(user); setSearchQuery(''); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f2f1ee] transition text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5] text-[10px] font-bold flex-shrink-0">
                    {(user.full_name || user.username || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#0f0f0f] truncate">
                      {user.full_name || 'Unnamed User'}
                    </div>
                    <div className="text-[11px] text-[#777] truncate">
                      @{user.username || 'no-handle'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="mt-2 text-center text-[11px] text-[#777] py-2">No users found matching "{searchQuery}"</div>
          )}
        </div>
      ) : (
        <div className="px-6 py-3 border-b border-[#e8e7e3] bg-[#ede9fe]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-[10px] font-bold">
              {(selectedUser.full_name || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] text-[#777] uppercase tracking-wider">To:</p>
              <p className="text-[13px] font-semibold text-[#0f0f0f]">{selectedUser.full_name || selectedUser.username}</p>
            </div>
          </div>
          {!recipientId && (
            <button onClick={() => { setSelectedUser(null); setSearchQuery(''); }} className="text-[11px] text-[#4f46e5] hover:underline">
              Change
            </button>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-6 gap-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-[12px] text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder={selectedUser ? "Brief note... (e.g., 'Hey, need to see you in office')" : "Draft your memo below..."}
          className={`flex-1 w-full resize-none outline-none text-[14px] leading-relaxed placeholder:text-[#aaa] bg-transparent ${
            isOverLimit ? 'text-red-600' : 'text-[#0f0f0f]'
          }`}
        />
      </div>

      {/* Footer: Counter + Send */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-[#f2f1ee] bg-white">
        <div className="flex items-center gap-3">
          <div className={`text-[11px] font-medium tabular-nums transition-colors ${
            isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-[#aaa]'
          }`}>
            {charCount}/{MAX_CHARS}
          </div>
          
          {!selectedUser && (
            <div className="flex items-center gap-1 text-[10px] text-[#d97706]">
              <UserX size={10} /> Select recipient
            </div>
          )}
        </div>
        
        <button
          onClick={handleSend}
          disabled={!content.trim() || isOverLimit || sending || !selectedUser}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
            !content.trim() || isOverLimit || sending || !selectedUser
              ? 'bg-[#f2f1ee] text-[#aaa] cursor-not-allowed'
              : 'bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-sm hover:shadow-md'
          }`}
        >
          {sending ? 'Sending...' : (
            <>Send Memo <Send size={14} /></>
          )}
        </button>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slideIn { animation: slideIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}