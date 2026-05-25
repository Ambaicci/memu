'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, Lock, Users, Plus, X, ChevronLeft, Trash2, UserMinus, Search, 
  Pin, PinOff, MessageSquare, AtSign, Paperclip, Image, File, Download, 
  Check, AlertCircle, Upload, Eye
} from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: string;
  file: File;
}

interface Message {
  id: number;
  from: string;
  initials: string;
  color: string;
  textColor: string;
  text: string;
  time: string;
  mine: boolean;
  isPinned?: boolean;
  replyTo?: number;
  replies?: Message[];
  attachments?: Attachment[];
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

export default function BoardView({ board, onBack, currentUser }: BoardViewProps) {
  const [messages, setMessages] = useState<Message[]>(board.messages);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return <Image size={14} />;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) return <File size={14} />;
    if (['mp4', 'mov', 'webm', 'avi'].includes(ext || '')) return <Video size={14} />;
    return <Paperclip size={14} />;
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.click();
  };

  const handlePreview = (attachment: Attachment) => {
    setPreviewAttachment(attachment);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    
    const mentionRegex = /@(\w+)/g;
    const mentions = [...newMessage.matchAll(mentionRegex)].map(m => m[1]);
    
    const processedAttachments: Attachment[] = [];
    for (const file of attachments) {
      const reader = new FileReader();
      const fileUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      processedAttachments.push({
        name: file.name,
        url: fileUrl,
        type: file.type,
        size: formatFileSize(file.size),
        file: file,
      });
    }
    
    const newMsg: Message = {
      id: Date.now(),
      from: 'You',
      initials: currentUser.charAt(0),
      color: '#1a1a1a',
      textColor: 'white',
      text: newMessage.trim(),
      time: 'now',
      mine: true,
      replyTo: replyingTo?.id,
      attachments: processedAttachments,
    };
    
    if (replyingTo) {
      setMessages(messages.map(msg => 
        msg.id === replyingTo.id 
          ? { ...msg, replies: [...(msg.replies || []), newMsg] }
          : msg
      ));
    } else {
      setMessages([...messages, newMsg]);
    }
    
    setNewMessage('');
    setAttachments([]);
    setReplyingTo(null);
    
    if (mentions.length > 0) {
      alert(`🔔 Mentioned: ${mentions.join(', ')}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    
    if (e.key === '@') {
      setShowMentions(true);
      setMentionStart(newMessage.length);
    }
  };

  const handleMentionSelect = (member: Member) => {
    const beforeMention = newMessage.slice(0, mentionStart);
    const afterMention = newMessage.slice(mentionStart);
    setNewMessage(`${beforeMention}@${member.name} ${afterMention}`);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handlePinMessage = (messageId: number) => {
    setMessages(messages.map(msg => 
      msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
    ));
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    textareaRef.current?.focus();
  };

  const pinnedMessages = messages.filter(m => m.isPinned);
  const regularMessages = messages.filter(m => !m.isPinned);

  const filteredMembers = board.members.filter(m => 
    m.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    m.handle.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const isOwner = board.members.find(m => m.name === currentUser)?.role === 'owner';

  const renderMessage = (msg: Message, isReply: boolean = false) => (
    <div key={msg.id} className={`group ${isReply ? 'ml-6 border-l-2 border-[#e8e7e3] pl-3 mt-2' : ''}`}>
      <div className={`flex gap-2.5 ${msg.mine ? 'flex-row-reverse' : ''}`}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shadow-sm flex-shrink-0" style={{ background: msg.color, color: msg.textColor }}>
          {msg.initials}
        </div>
        <div className={`max-w-[75%] ${msg.mine ? 'items-end' : ''}`}>
          {!msg.mine && <div className="text-[11px] text-[#777] mb-1">{msg.from}</div>}
          <div className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${msg.mine ? 'bg-[#0f0f0f] text-white rounded-br-[4px]' : 'bg-white text-[#0f0f0f] rounded-bl-[4px] border border-[#e8e7e3]'}`}>
            {msg.text}
            
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {msg.attachments.map((att, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 p-1.5 bg-black/5 rounded-lg cursor-pointer hover:bg-black/10 transition" 
                    onClick={() => handlePreview(att)}
                  >
                    {getFileIcon(att.name)}
                    <span className="text-[11px] truncate flex-1">{att.name}</span>
                    <span className="text-[9px] text-[#aaa]">{att.size}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(att);
                      }}
                      className="p-1 rounded hover:bg-black/10 transition"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(att);
                      }}
                      className="p-1 rounded hover:bg-black/10 transition"
                    >
                      <Eye size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <div className={`text-[10px] text-[#aaa] ${msg.mine ? 'text-right' : ''}`}>{msg.time}</div>
            <button
              onClick={() => handleReply(msg)}
              className="text-[9px] text-[#4f46e5] opacity-0 group-hover:opacity-100 transition"
            >
              Reply
            </button>
            {isOwner && (
              <button
                onClick={() => handlePinMessage(msg.id)}
                className="text-[9px] text-[#777] opacity-0 group-hover:opacity-100 transition"
              >
                {msg.isPinned ? 'Unpin' : 'Pin'}
              </button>
            )}
          </div>
          
          {msg.replies && msg.replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {msg.replies.map(reply => renderMessage(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#fafaf8]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#e8e7e3] bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 hover:bg-[#f2f1ee] rounded-md transition">
              <ChevronLeft size={18} className="text-[#777]" />
            </button>
            <div className="w-3 h-3 rounded-full" style={{ background: board.color }} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-medium text-[#0f0f0f]">{board.name}</h3>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f2f1ee]">
                  <Lock size={10} className="text-[#777]" />
                  <span className="text-[10px] text-[#777]">Private</span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowMemberList(!showMemberList)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#f2f1ee] transition"
          >
            <Users size={14} className="text-[#777]" />
            <span className="text-[12px] text-[#777]">{board.members.length}</span>
          </button>
        </div>
      </div>

      {/* Member List Sidebar */}
      {showMemberList && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-[#e8e7e3] shadow-xl z-40 flex flex-col">
          <div className="p-4 border-b border-[#e8e7e3] flex items-center justify-between">
            <h3 className="text-[15px] font-medium text-[#0f0f0f]">Members</h3>
            <button onClick={() => setShowMemberList(false)} className="p-1 hover:bg-[#f2f1ee] rounded-md">
              <X size={16} />
            </button>
          </div>
          
          {isOwner && (
            <button
              onClick={() => setShowAddMember(true)}
              className="mx-4 mt-4 flex items-center justify-center gap-2 py-2 border border-dashed border-[#e8e7e3] rounded-xl text-[12px] text-[#4f46e5] hover:border-[#4f46e5] transition"
            >
              <Plus size={14} />
              Add Member
            </button>
          )}
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {board.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#f2f1ee]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium" style={{ background: member.color, color: member.textColor }}>
                    {member.initials}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#0f0f0f]">{member.name}</div>
                    <div className="text-[10px] text-[#777]">{member.handle}</div>
                  </div>
                </div>
                {isOwner && member.role !== 'owner' && (
                  <button className="p-1 rounded hover:bg-red-100 transition">
                    <UserMinus size={14} className="text-[#777] hover:text-[#dc2626]" />
                  </button>
                )}
                {member.role === 'owner' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f2f1ee] text-[#777]">Owner</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddMember(false)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-[#0f0f0f]">Add Members</h3>
              <button onClick={() => setShowAddMember(false)} className="p-1 rounded-lg hover:bg-[#f2f1ee]"><X size={16} /></button>
            </div>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#e8e7e3] rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]"
                placeholder="Search by name or @handle"
              />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#f2f1ee]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ede9fe] flex items-center justify-center text-[11px] font-medium text-[#5b21b6]">JD</div>
                  <div>
                    <div className="text-[13px] font-medium text-[#0f0f0f]">Jane Doe</div>
                    <div className="text-[10px] text-[#777]">@jane.memu</div>
                  </div>
                </div>
                <button className="px-2 py-1 text-[10px] bg-[#0f0f0f] text-white rounded-md hover:bg-[#2a2a2a] transition">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Messages Section */}
      {pinnedMessages.length > 0 && (
        <div className="border-b border-[#e8e7e3] bg-[#fef3c7]/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Pin size={12} className="text-[#d97706]" />
            <span className="text-[11px] font-medium text-[#d97706] uppercase tracking-wide">Pinned</span>
          </div>
          <div className="space-y-2">
            {pinnedMessages.map((msg) => (
              <div key={msg.id} className="text-[12px] text-[#777] bg-white/50 rounded-lg p-2">
                <span className="font-medium text-[#0f0f0f]">{msg.from}:</span> {msg.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {regularMessages.map(msg => renderMessage(msg))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Indicator */}
      {replyingTo && (
        <div className="px-4 pt-2 border-t border-[#e8e7e3] bg-[#f2f1ee]">
          <div className="flex items-center justify-between text-[11px] text-[#777]">
            <span>Replying to {replyingTo.from}</span>
            <button onClick={() => setReplyingTo(null)} className="text-[#dc2626]">Cancel</button>
          </div>
          <div className="text-[12px] text-[#777] italic mt-1 pb-2">"{replyingTo.text.slice(0, 60)}..."</div>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 pt-2 border-t border-[#e8e7e3] bg-white">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-[#f2f1ee] rounded-lg px-2 py-1">
                {getFileIcon(file.name)}
                <span className="text-[11px] text-[#777] truncate max-w-[150px]">{file.name}</span>
                <span className="text-[9px] text-[#aaa]">{formatFileSize(file.size)}</span>
                <button onClick={() => handleRemoveAttachment(idx)} className="text-[#dc2626] hover:text-[#b91c1c]">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-[#e8e7e3] bg-white relative">
        <div className="flex gap-2 items-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-[#f2f1ee] transition text-[#777]"
            title="Attach file"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${board.name}... Use @ to mention someone, 📎 to attach files`}
            rows={1}
            className="flex-1 border border-[#e8e7e3] rounded-xl px-4 py-2.5 text-[13.5px] outline-none resize-none focus:border-[#4f46e5] transition"
          />
          <button
            onClick={handleSendMessage}
            disabled={uploading}
            className="w-9 h-9 rounded-full bg-[#0f0f0f] text-white flex items-center justify-center hover:bg-[#2a2a2a] transition shadow-sm disabled:opacity-50"
          >
            {uploading ? <Upload size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>

        {/* Mention Suggestions Dropdown */}
        {showMentions && (
          <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-[#e8e7e3] rounded-xl shadow-lg z-50">
            <div className="p-2 border-b border-[#f2f1ee]">
              <div className="flex items-center gap-2">
                <AtSign size={12} className="text-[#777]" />
                <input
                  type="text"
                  value={mentionQuery}
                  onChange={(e) => setMentionQuery(e.target.value)}
                  placeholder="Search members..."
                  className="flex-1 text-[12px] outline-none bg-transparent"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMentionSelect(member)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-[#f2f1ee] transition"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium" style={{ background: member.color, color: member.textColor }}>
                    {member.initials}
                  </div>
                  <div className="text-left">
                    <div className="text-[12px] font-medium text-[#0f0f0f]">{member.name}</div>
                    <div className="text-[10px] text-[#777]">{member.handle}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setPreviewAttachment(null)}>
          <div className="bg-white rounded-2xl w-[90vw] max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-[#e8e7e3] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(previewAttachment.name)}
                <div>
                  <h3 className="text-[14px] font-medium text-[#0f0f0f]">{previewAttachment.name}</h3>
                  <p className="text-[11px] text-[#777]">{previewAttachment.size}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(previewAttachment)}
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] transition"
                  title="Download"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-2 rounded-lg hover:bg-[#f2f1ee] transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {previewAttachment.type.startsWith('image/') && (
                <img src={previewAttachment.url} alt={previewAttachment.name} className="max-w-full max-h-[70vh] object-contain mx-auto" />
              )}
              {previewAttachment.type === 'application/pdf' && (
                <iframe src={previewAttachment.url} className="w-full h-[70vh] rounded-lg" title={previewAttachment.name} />
              )}
              {previewAttachment.type.startsWith('text/') && (
                <div className="bg-[#f2f1ee] p-4 rounded-lg font-mono text-[12px] whitespace-pre-wrap overflow-auto max-h-[70vh]">
                  {previewAttachment.url.split(',')[1] ? atob(previewAttachment.url.split(',')[1]) : 'Preview not available'}
                </div>
              )}
              {previewAttachment.type.startsWith('video/') && (
                <video src={previewAttachment.url} controls className="w-full max-h-[70vh] rounded-lg" />
              )}
              {!previewAttachment.type.startsWith('image/') && 
               !previewAttachment.type.startsWith('text/') && 
               !previewAttachment.type.startsWith('video/') &&
               previewAttachment.type !== 'application/pdf' && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-[#f2f1ee] flex items-center justify-center mx-auto mb-4">
                    <File size={32} className="text-[#aaa]" />
                  </div>
                  <p className="text-[14px] text-[#0f0f0f] mb-2">Preview not available for this file type</p>
                  <p className="text-[12px] text-[#777] mb-4">Open with memu Office when available</p>
                  <button
                    onClick={() => {
                      alert(`Opening ${previewAttachment.name} with memu Office (coming soon!) ✨`);
                    }}
                    className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-[13px] font-medium hover:bg-[#4338ca] transition"
                  >
                    Open with memu Office
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}