'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, Lock, Users, Plus, X, ChevronLeft, Trash2, UserMinus, Search, 
  Pin, PinOff, MessageSquare, AtSign, Paperclip, Image, File, Download, 
  Check, AlertCircle, Upload, Eye, MoreHorizontal, Reply, Star
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BoardKanbanPanel from './BoardKanbanPanel';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: string;
  storagePath?: string;
}

interface Message {
  id: string;
  user_id: string;
  message: string;
  attachments: Attachment[];
  mentions: string[];
  is_pinned: boolean;
  reply_to: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
  replies?: Message[];
}

interface Member {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  textColor: string;
  role: 'owner' | 'member';
}

interface BoardViewProps {
  board: {
    id: string;
    name: string;
    color: string;
    members: Member[];
    messages: Message[];
  };
  onBack: () => void;
  currentUser: string;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 60%, 65%)`;
};

export default function BoardView({ board, onBack, currentUser }: BoardViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(0);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [boardMembers, setBoardMembers] = useState<Member[]>(board.members);
  const [isOwner, setIsOwner] = useState(false);
  
  // NEW: Tab state for switching between Discussion and Kanban
  const [activeView, setActiveView] = useState<'discussion' | 'kanban'>('discussion');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user ID and check ownership
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const member = boardMembers.find(m => m.id === user.id);
        setIsOwner(member?.role === 'owner');
      }
    };
    getUser();
  }, [boardMembers]);

  // Fetch messages with realtime
  useEffect(() => {
    if (!currentUserId) return;

    const fetchMessages = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('board_messages')
        .select(`
          *,
          user:user_id (full_name, username, avatar_url)
        `)
        .eq('board_id', board.id)
        .order('created_at', { ascending: true });
      if (error) console.error('Error fetching messages:', error);
      else setMessages(data || []);
    };
    fetchMessages();

    // Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`board:${board.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_messages', filter: `board_id=eq.${board.id}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [board.id, currentUserId]);

  // Fetch board members on load
  useEffect(() => {
    const fetchMembers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('board_members')
        .select('user_id, role, profiles(full_name, username)')
        .eq('board_id', board.id);
      if (!error && data) {
        const membersList: Member[] = data.map(m => ({
          id: m.user_id,
          name: (m.profiles as any)?.full_name || 'Unknown',
          handle: (m.profiles as any)?.username || '',
          initials: getInitials((m.profiles as any)?.full_name || 'U'),
          color: stringToColor(m.user_id),
          textColor: '#fff',
          role: m.role === 'admin' ? 'owner' : 'member',
        }));
        setBoardMembers(membersList);
      }
    };
    fetchMembers();
  }, [board.id]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachments([...attachments, ...Array.from(e.target.files)]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext||'')) return <Image size={14} />;
    if (['pdf','doc','docx','txt','md'].includes(ext||'')) return <File size={14} />;
    return <Paperclip size={14} />;
  };

  const uploadAttachment = async (file: File): Promise<Attachment | null> => {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${fileExt}`;
    const filePath = `boards/${board.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('airshare') 
      .upload(filePath, file);
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }
    const { data: urlData } = supabase.storage.from('airshare').getPublicUrl(filePath);
    return {
      name: file.name,
      url: urlData.publicUrl,
      type: file.type,
      size: formatFileSize(file.size),
      storagePath: filePath,
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!currentUserId) return;
    const supabase = createClient();
    setUploading(true);
    const uploadedAttachments: Attachment[] = [];
    for (const file of attachments) {
      const att = await uploadAttachment(file);
      if (att) uploadedAttachments.push(att);
    }
    const mentionRegex = /@(\w+)/g;
    const mentions = [...newMessage.matchAll(mentionRegex)].map(m => m[1]);
    const { error } = await supabase.from('board_messages').insert({
      board_id: board.id,
      user_id: currentUserId,
      message: newMessage.trim(),
      attachments: uploadedAttachments,
      mentions,
      reply_to: replyingTo?.id || null,
    });
    if (error) console.error('Send error:', error?.message, error?.details, error?.hint);
    else {
      setNewMessage('');
      setAttachments([]);
      setReplyingTo(null);
    }
    setUploading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    if (e.key === '@') { setShowMentions(true); setMentionStart(newMessage.length); }
  };

  const handleMentionSelect = (member: Member) => {
    const before = newMessage.slice(0, mentionStart);
    const after = newMessage.slice(mentionStart);
    setNewMessage(`${before}@${member.name} ${after}`);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handlePinMessage = async (messageId: string, currentPinned: boolean) => {
    if (!isOwner) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('board_messages')
      .update({ is_pinned: !currentPinned })
      .eq('id', messageId);
    if (error) console.error('Pin error:', error);
  };

  const handleDeleteMessage = async (messageId: string) => {
    const supabase = createClient();
    if (!isOwner && messages.find(m => m.id === messageId)?.user_id !== currentUserId) return;
    if (!confirm('Delete this message?')) return;
    const { error } = await supabase.from('board_messages').delete().eq('id', messageId);
    if (error) console.error('Delete error:', error);
  };

  const handleAddMember = async (emailOrHandle: string) => {
    alert('Member addition will be implemented with user search');
  };

  const pinnedMessages = messages.filter(m => m.is_pinned);
  const regularMessages = messages.filter(m => !m.is_pinned);

  const renderMessage = (msg: Message, isReply: boolean = false) => {
    const user = msg.user as any;
    const senderName = user?.full_name || 'Anonymous';
    const initials = getInitials(senderName);
    const avatarColor = stringToColor(msg.user_id);
    const isMine = msg.user_id === currentUserId;

    return (
      <div key={msg.id} className={`group ${isReply ? 'ml-6 border-l-2 border-[#e8e7e3] pl-3 mt-2' : ''}`}>
        <div className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shadow-sm flex-shrink-0" style={{ background: avatarColor, color: '#fff' }}>
            {initials}
          </div>
          <div className={`max-w-[75%] ${isMine ? 'items-end' : ''}`}>
            {!isMine && <div className="text-[11px] text-[#777] mb-1">{senderName}</div>}
            <div className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${isMine ? 'bg-[#0f0f0f] text-white rounded-br-[4px]' : 'bg-white text-[#0f0f0f] rounded-bl-[4px] border border-[#e8e7e3]'}`}>
              {msg.message}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 bg-black/5 rounded-lg cursor-pointer hover:bg-black/10 transition" onClick={() => setPreviewAttachment(att)}>
                      {getFileIcon(att.name)}
                      <span className="text-[11px] truncate flex-1">{att.name}</span>
                      <span className="text-[9px] text-[#aaa]">{att.size}</span>
                      <button onClick={(e) => { e.stopPropagation(); window.open(att.url, '_blank'); }} className="p-1 rounded hover:bg-black/10"><Download size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setPreviewAttachment(att); }} className="p-1 rounded hover:bg-black/10"><Eye size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`text-[10px] text-[#aaa] ${isMine ? 'text-right' : ''}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
              <button onClick={() => setReplyingTo(msg)} className="text-[9px] text-[#4f46e5] opacity-0 group-hover:opacity-100 transition">Reply</button>
              {isOwner && (
                <button onClick={() => handlePinMessage(msg.id, msg.is_pinned)} className="text-[9px] text-[#777] opacity-0 group-hover:opacity-100 transition">
                  {msg.is_pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              {(isOwner || isMine) && (
                <button onClick={() => handleDeleteMessage(msg.id)} className="text-[9px] text-red-500 opacity-0 group-hover:opacity-100 transition">Delete</button>
              )}
            </div>
            {msg.replies && msg.replies.length > 0 && (
              <div className="mt-2 space-y-2">{msg.replies.map(r => renderMessage(r, true))}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#fafaf8]">
      {/* Header with Tabs */}
      <div className="px-6 py-4 border-b border-[#e8e7e3] bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 hover:bg-[#f2f1ee] rounded-md"><ChevronLeft size={18} className="text-[#777]" /></button>
            <div className="w-3 h-3 rounded-full" style={{ background: board.color }} />
            <div><h3 className="text-[16px] font-medium text-[#0f0f0f]">{board.name}</h3></div>
          </div>
          <button onClick={() => setShowMemberList(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#f2f1ee]">
            <Users size={14} className="text-[#777]" />
            <span className="text-[12px] text-[#777]">{boardMembers.length}</span>
          </button>
        </div>
        
        {/* View Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('discussion')}
            className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${
              activeView === 'discussion'
                ? 'text-[#4f46e5] bg-[#ede9fe]'
                : 'text-[#777] hover:text-[#0f0f0f] hover:bg-[#f2f1ee]'
            }`}
          >
            💬 Discussion
          </button>
          <button
            onClick={() => setActiveView('kanban')}
            className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${
              activeView === 'kanban'
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-[#777] hover:text-[#0f0f0f] hover:bg-[#f2f1ee]'
            }`}
          >
             Kanban Board
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeView === 'discussion' ? (
        <>
          {/* Member List Sidebar */}
          {showMemberList && (
            <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-[#e8e7e3] shadow-xl z-40 flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-[15px] font-medium">Members</h3>
                <button onClick={() => setShowMemberList(false)} className="p-1 hover:bg-[#f2f1ee] rounded"><X size={16} /></button>
              </div>
              {isOwner && (
                <button onClick={() => setShowAddMember(true)} className="mx-4 mt-4 flex items-center justify-center gap-2 py-2 border border-dashed rounded-xl text-[12px] text-[#4f46e5] hover:border-[#4f46e5]">
                  <Plus size={14} /> Add Member
                </button>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {boardMembers.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-[#f2f1ee]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium" style={{ background: m.color, color: '#fff' }}>{m.initials}</div>
                      <div><div className="text-[13px] font-medium">{m.name}</div><div className="text-[10px] text-[#777]">{m.handle}</div></div>
                    </div>
                    {isOwner && m.role !== 'owner' && <button className="p-1 rounded hover:bg-red-100"><UserMinus size={14} className="text-[#777] hover:text-red-500" /></button>}
                    {m.role === 'owner' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f2f1ee]">Owner</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Member Modal */}
          {showAddMember && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddMember(false)}>
              <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-[16px] font-semibold mb-4">Add Member</h3>
                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input type="text" placeholder="Search by email or name" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddMember(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                  <button onClick={() => handleAddMember(searchQuery)} className="px-4 py-2 bg-[#0f0f0f] text-white rounded-lg text-sm">Add</button>
                </div>
              </div>
            </div>
          )}

          {/* Pinned Messages */}
          {pinnedMessages.length > 0 && (
            <div className="border-b border-[#e8e7e3] bg-[#fef3c7]/30 p-3">
              <div className="flex items-center gap-2 mb-2"><Pin size={12} className="text-[#d97706]" /><span className="text-[11px] font-medium text-[#d97706]">Pinned</span></div>
              <div className="space-y-2">{pinnedMessages.map(msg => renderMessage(msg))}</div>
            </div>
          )}

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {regularMessages.map(msg => renderMessage(msg))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Indicator */}
          {replyingTo && (
            <div className="px-4 pt-2 border-t bg-[#f2f1ee]">
              <div className="flex justify-between text-[11px] text-[#777]">
                <span>Replying to {replyingTo.user?.full_name}</span>
                <button onClick={() => setReplyingTo(null)} className="text-red-500">Cancel</button>
              </div>
              <div className="text-[12px] text-[#777] italic pb-2">"{replyingTo.message.slice(0,60)}..."</div>
            </div>
          )}

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-4 pt-2 border-t bg-white">
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#f2f1ee] rounded-lg px-2 py-1">
                    {getFileIcon(file.name)}<span className="text-[11px] truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => handleRemoveAttachment(idx)} className="text-red-500"><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t bg-white relative">
            <div className="flex gap-2 items-end">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-[#f2f1ee]"><Paperclip size={18} className="text-[#777]" /></button>
              <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
              <textarea ref={textareaRef} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Message #${board.name}... Use @ to mention`} rows={1} className="flex-1 border rounded-xl px-4 py-2.5 text-[13.5px] outline-none resize-none focus:border-[#4f46e5]" />
              <button onClick={handleSendMessage} disabled={uploading} className="w-9 h-9 rounded-full bg-[#0f0f0f] text-white flex items-center justify-center disabled:opacity-50">{uploading ? <Upload size={14} className="animate-spin" /> : <Send size={14} />}</button>
            </div>
            {showMentions && (
              <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border rounded-xl shadow-lg z-50">
                <div className="p-2 border-b"><input type="text" value={mentionQuery} onChange={e => setMentionQuery(e.target.value)} placeholder="Search members..." className="w-full text-xs outline-none" autoFocus /></div>
                <div className="max-h-48 overflow-y-auto">
                  {boardMembers.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).map(m => (
                    <button key={m.id} onClick={() => handleMentionSelect(m)} className="w-full flex items-center gap-3 p-2 hover:bg-[#f2f1ee] text-left">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px]" style={{ background: m.color, color: '#fff' }}>{m.initials}</div>
                      <div><div className="text-[12px] font-medium">{m.name}</div><div className="text-[10px] text-[#777]">{m.handle}</div></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachment Preview Modal */}
          {previewAttachment && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setPreviewAttachment(null)}>
              <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                  <div><h3 className="text-[14px] font-medium">{previewAttachment.name}</h3><p className="text-[11px] text-[#777]">{previewAttachment.size}</p></div>
                  <button onClick={() => setPreviewAttachment(null)}><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-auto p-6 text-center">
                  {previewAttachment.type.startsWith('image/') && <img src={previewAttachment.url} alt="preview" className="max-w-full max-h-[70vh] object-contain mx-auto" />}
                  {previewAttachment.type === 'application/pdf' && <iframe src={previewAttachment.url} className="w-full h-[70vh]" />}
                  {!previewAttachment.type.startsWith('image/') && previewAttachment.type !== 'application/pdf' && (
                    <div className="py-12"><p className="text-[#777]">Preview not available. <a href={previewAttachment.url} target="_blank" className="text-[#4f46e5] underline">Download</a></p></div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 overflow-hidden">
          <BoardKanbanPanel boardId={board.id} boardColor={board.color} />
        </div>
      )}
    </div>
  );
}