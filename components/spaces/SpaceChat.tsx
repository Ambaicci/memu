'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Image, X, File, Download, Smile, AtSign } from 'lucide-react';

interface Message {
  id: number;
  from: string;
  initials: string;
  color: string;
  textColor: string;
  text: string;
  time: string;
  mine: boolean;
  attachments?: { name: string; url: string; size: string; type: string }[];
  replyTo?: number;
  isEdited?: boolean;
}

interface SpaceChatProps {
  spaceId: string;
  spaceName: string;
  initialMessages: Message[];
  onSendMessage?: (message: string, attachments?: File[]) => void;
}

export default function SpaceChat({ spaceId, spaceName, initialMessages, onSendMessage }: SpaceChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Image size={14} />;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <File size={14} />;
    if (['mp4', 'mov', 'webm'].includes(ext || '')) return <File size={14} />;
    return <Paperclip size={14} />;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    setIsUploading(true);
    
    // Process attachments (simulate upload)
    const processedAttachments = await Promise.all(
      attachments.map(async (file) => {
        const reader = new FileReader();
        const fileUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        return {
          name: file.name,
          url: fileUrl,
          size: formatFileSize(file.size),
          type: file.type,
        };
      })
    );

    const newMsg: Message = {
      id: Date.now(),
      from: 'You',
      initials: 'JM',
      color: '#1a1a1a',
      textColor: 'white',
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mine: true,
      attachments: processedAttachments,
      replyTo: replyTo?.id,
    };

    let updatedMessages = [...messages, newMsg];
    
    if (replyTo) {
      // Add reply reference
      updatedMessages = messages.map(m => 
        m.id === replyTo.id ? { ...m, replies: [...(m.replies || []), newMsg] } : m
      );
    }
    
    setMessages(updatedMessages);
    setNewMessage('');
    setAttachments([]);
    setReplyTo(null);
    setIsUploading(false);
    
    onSendMessage?.(newMessage, attachments);
    textareaRef.current?.focus();
  };

  const handleEditMessage = () => {
    if (editingMessage && editText.trim()) {
      setMessages(messages.map(m => 
        m.id === editingMessage.id 
          ? { ...m, text: editText.trim(), isEdited: true, time: `${m.time} (edited)` }
          : m
      ));
      setEditingMessage(null);
      setEditText('');
    }
  };

  const handleDeleteMessage = (messageId: number) => {
    setMessages(messages.filter(m => m.id !== messageId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startEdit = (msg: Message) => {
    setEditingMessage(msg);
    setEditText(msg.text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#f2f1ee] flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-[#aaa]" />
            </div>
            <p className="text-[13px] text-[#777]">No messages yet</p>
            <p className="text-[11px] text-[#aaa] mt-1">Be the first to start a conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`group ${msg.replyTo ? 'ml-6 border-l-2 border-[#e8e7e3] pl-3' : ''}`}>
              <div className={`flex gap-2.5 ${msg.mine ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shadow-sm flex-shrink-0" style={{ background: msg.color, color: msg.textColor }}>
                  {msg.initials}
                </div>
                <div className={`max-w-[75%] ${msg.mine ? 'items-end' : ''}`}>
                  {!msg.mine && <div className="text-[11px] text-[#777] mb-1">{msg.from}</div>}
                  <div className={`relative px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${msg.mine ? 'bg-[#0f0f0f] text-white rounded-br-[4px]' : 'bg-white text-[#0f0f0f] rounded-bl-[4px] border border-[#e8e7e3]'}`}>
                    {msg.replyTo && (
                      <div className="text-[10px] text-[#777] mb-1 pb-1 border-b border-[#e8e7e3]">
                        Replying to {messages.find(m => m.id === msg.replyTo)?.from}
                      </div>
                    )}
                    {editingMessage?.id === msg.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 border border-[#e8e7e3] rounded-lg text-[13px] outline-none focus:border-[#4f46e5]"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={handleEditMessage} className="text-[11px] text-[#4f46e5] hover:underline">Save</button>
                          <button onClick={() => setEditingMessage(null)} className="text-[11px] text-[#777] hover:underline">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      msg.text
                    )}
                    
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-1.5 bg-black/5 rounded-lg">
                            {getFileIcon(att.name)}
                            <span className="text-[11px] truncate flex-1">{att.name}</span>
                            <span className="text-[9px] text-[#aaa]">{att.size}</span>
                            <a href={att.url} download={att.name} className="p-1 rounded hover:bg-black/10 transition">
                              <Download size={12} />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {msg.isEdited && <span className="text-[9px] text-[#aaa] ml-1">(edited)</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`text-[10px] text-[#aaa] ${msg.mine ? 'text-right' : ''}`}>{msg.time}</div>
                    {msg.mine && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => startEdit(msg)} className="text-[9px] text-[#4f46e5] hover:underline">Edit</button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="text-[9px] text-[#dc2626] hover:underline">Delete</button>
                      </div>
                    )}
                    {!msg.mine && (
                      <button onClick={() => setReplyTo(msg)} className="text-[9px] text-[#4f46e5] opacity-0 group-hover:opacity-100 transition">
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Indicator */}
      {replyTo && (
        <div className="px-4 pt-2 border-t border-[#e8e7e3] bg-[#f2f1ee]">
          <div className="flex items-center justify-between text-[11px] text-[#777]">
            <span>Replying to {replyTo.from}</span>
            <button onClick={() => setReplyTo(null)} className="text-[#dc2626]">Cancel</button>
          </div>
          <div className="text-[12px] text-[#777] italic mt-1 pb-2">"{replyTo.text.slice(0, 60)}..."</div>
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

      {/* Input Area */}
      <div className="pt-4 border-t border-[#e8e7e3] bg-white">
        <div className="flex gap-2 items-end">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-[#f2f1ee] transition text-[#777]"
            title="Attach file"
          >
            <Paperclip size={18} />
          </button>
          <input type="file" ref={fileInputRef} multiple onChange={handleFileSelect} className="hidden" />
          <button className="p-2 rounded-full hover:bg-[#f2f1ee] transition text-[#777]" title="Voice message">
            <Mic size={18} />
          </button>
          <button className="p-2 rounded-full hover:bg-[#f2f1ee] transition text-[#777]" title="Emoji">
            <Smile size={18} />
          </button>
          <button className="p-2 rounded-full hover:bg-[#f2f1ee] transition text-[#777]" title="Mention">
            <AtSign size={18} />
          </button>
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${spaceName}...`}
            rows={1}
            className="flex-1 border-0 bg-transparent py-2.5 text-[13.5px] outline-none resize-none placeholder:text-[#aaa] max-h-32 overflow-y-auto"
          />
          <button 
            onClick={handleSendMessage} 
            disabled={isUploading || (!newMessage.trim() && attachments.length === 0)}
            className="w-9 h-9 rounded-full bg-[#0f0f0f] text-white flex items-center justify-center hover:bg-[#2a2a2a] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}