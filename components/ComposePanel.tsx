'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Mic, Calendar as CalendarIcon, Mail, Maximize2, Minimize2, Users, CheckCircle, AlertCircle, Send, Search, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';

interface ComposePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (memu: {
    to: string[];
    subject: string;
    nature: string;
    body: string;
  }) => void;
  prefilledTo?: string[];
  editingDraft?: {
    to: string[];
    toHandles: string[];
    subject: string;
    nature: string;
    body: string;
  } | null;
  replyToMemuId?: string | null;
}

const natureOptions = [
  { id: 'fyi', label: 'FYI', color: 'bg-[#fef3c7] text-[#d97706]' },
  { id: 'decide', label: 'Decide', color: 'bg-[#ede9fe] text-[#7c3aed]' },
  { id: 'resolve', label: 'Resolve', color: 'bg-[#fee2e2] text-[#dc2626]' },
  { id: 'urgent', label: 'Urgent', color: 'bg-[#d1fae5] text-[#059669]' },
  { id: 'broadcast', label: 'Broadcast', color: 'bg-[#fce7f3] text-[#be185d]' },
  { id: 'voice', label: 'Voice memu', color: 'bg-[#e0e7ff] text-[#4338ca]' },
  { id: 'group', label: 'Group', color: 'bg-[#ffedd5] text-[#9a3412]' },
];

export default function ComposePanel({ isOpen, onClose, onSend, prefilledTo, editingDraft, replyToMemuId }: ComposePanelProps) {
  const [to, setTo] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [nature, setNature] = useState('decide');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHandleSelector, setShowHandleSelector] = useState(false);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking'>>({});
  const [handleSearchQuery, setHandleSearchQuery] = useState('');
  const [handleSearchResults, setHandleSearchResults] = useState<any[]>([]);
  const [searchingHandles, setSearchingHandles] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Scheduling state
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');

  // Attachments state
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size: number; type: string }>>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { showToast } = useToast();
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const schedulePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (schedulePickerRef.current && !schedulePickerRef.current.contains(e.target as Node)) {
        setShowSchedulePicker(false);
      }
    };
    if (showSchedulePicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSchedulePicker]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!showHandleSelector || !handleSearchQuery.trim() || handleSearchQuery.length < 2) {
      setHandleSearchResults([]);
      return;
    }
    const searchHandles = async () => {
      setSearchingHandles(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .or(`full_name.ilike.%${handleSearchQuery}%,username.ilike.%${handleSearchQuery}%`)
        .neq('id', currentUserId || '')
        .limit(10);
      if (!error && data) setHandleSearchResults(data);
      else setHandleSearchResults([]);
      setSearchingHandles(false);
    };
    const debounce = setTimeout(searchHandles, 300);
    return () => clearTimeout(debounce);
  }, [handleSearchQuery, showHandleSelector, currentUserId]);

  const validateAddress = (address: string): boolean => {
    if (address.endsWith('.memu') && address.startsWith('@')) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(address);
  };

  const checkAndSetValidation = (address: string) => {
    setValidationStatus(prev => ({ ...prev, [address]: 'checking' }));
    setTimeout(() => {
      const isValid = validateAddress(address);
      setValidationStatus(prev => ({ ...prev, [address]: isValid ? 'valid' : 'invalid' }));
    }, 300);
  };

  useEffect(() => {
    if (editingDraft) {
      setTo(editingDraft.toHandles || editingDraft.to || []);
      setSubject(editingDraft.subject || '');
      setNature(editingDraft.nature || 'decide');
      setBody(editingDraft.body || '');
      setToInput('');
      editingDraft.toHandles?.forEach(h => checkAndSetValidation(h));
    } else if (prefilledTo && prefilledTo.length > 0) {
      setTo(prefilledTo);
      setSubject('');
      setNature('decide');
      setBody('');
      setToInput('');
      prefilledTo.forEach(h => checkAndSetValidation(h));
    } else {
      setTo([]);
      setSubject('');
      setNature('decide');
      setBody('');
      setToInput('');
    }
  }, [editingDraft, prefilledTo]);

  useEffect(() => {
    if (isOpen) setTimeout(() => toInputRef.current?.focus(), 100);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddHandle = () => {
    const trimmed = toInput.trim();
    if (!trimmed) return;
    let handle = trimmed;
    if (!handle.includes('@')) {
      if (!handle.startsWith('@')) handle = '@' + handle;
      if (!handle.endsWith('.memu')) handle += '.memu';
    }
    if (!to.includes(handle)) {
      setTo([...to, handle]);
      checkAndSetValidation(handle);
    }
    setToInput('');
    setTimeout(() => toInputRef.current?.focus(), 0);
  };

  const handleSelectProfile = (profile: any) => {
    const handle = `@${profile.username}.memu`;
    if (!to.includes(handle)) {
      setTo([...to, handle]);
      checkAndSetValidation(handle);
    }
    setShowHandleSelector(false);
    setHandleSearchQuery('');
    setTimeout(() => toInputRef.current?.focus(), 0);
  };

  const handleRemoveHandle = (handle: string) => {
    setTo(to.filter(h => h !== handle));
    const newValidation = { ...validationStatus };
    delete newValidation[handle];
    setValidationStatus(newValidation);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddHandle(); }
  };

  const isEmailAddress = (address: string) => address.includes('@') && !address.endsWith('.memu');
  const getValidationIcon = (address: string) => {
    const status = validationStatus[address];
    if (status === 'valid') return <CheckCircle size={12} className="text-[#10b981]" />;
    if (status === 'invalid') return <AlertCircle size={12} className="text-[#dc2626]" />;
    if (status === 'checking') return <div className="w-3 h-3 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />;
    return null;
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append('file', files[0]);
    try {
      const res = await fetch('/api/upload-attachment', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setAttachments(prev => [...prev, data]);
      showToast('File attached', 'success');
    } catch (err) {
      showToast('Failed to upload file', 'error');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceMemo = () => {
    showToast('Voice memos coming soon.', 'info');
  };

  const handleSend = async () => {
    if (to.length === 0) { showToast('Please add at least one recipient', 'error'); return; }
    const invalidAddresses = to.filter(addr => validationStatus[addr] === 'invalid');
    if (invalidAddresses.length > 0) { showToast(`Invalid addresses: ${invalidAddresses.join(', ')}`, 'error'); return; }
    if (!subject.trim()) { showToast('Please add a subject', 'error'); return; }
    if (!body.trim()) { showToast('Please write your memu', 'error'); return; }
    
    setSending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast('You must be signed in to send a memu', 'error'); setSending(false); return; }

    let scheduledFor = null;
    if (showSchedulePicker && scheduledDate) {
      const [year, month, day] = scheduledDate.split('-');
      const [hour, minute] = scheduledTime.split(':');
      scheduledFor = new Date(Number(year), Number(month)-1, Number(day), Number(hour), Number(minute)).toISOString();
      if (new Date(scheduledFor) <= new Date()) {
        showToast('Scheduled time must be in the future', 'error');
        setSending(false);
        return;
      }
    }

    let sentCount = 0, pendingCount = 0, failedCount = 0;
    for (const recipient of to) {
      try {
        const handleName = recipient.replace('@', '').replace('.memu', '');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', handleName)
          .maybeSingle();
        const recipientId = profile?.id || null;
        const memoStatus = recipientId ? (scheduledFor ? 'scheduled' : 'sent') : 'pending';
        const insertData = {
          sender_id: user.id,
          recipient_id: recipientId,
          recipient_email: recipient,
          subject: subject.trim(),
          body: body.trim(),
          nature: nature,
          status: memoStatus,
          scheduled_for: scheduledFor,
          attachments: attachments, // store attachments as JSONB
        };
        const { error: dbError } = await supabase.from('memus').insert(insertData);
        if (dbError) throw dbError;
        if (replyToMemuId) {
          await supabase.from('memus').update({ replied_at: new Date().toISOString() }).eq('id', replyToMemuId);
        }
        if (recipientId && isEmailAddress(recipient) && !scheduledFor) {
          try {
            const res = await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: recipient, subject: subject.trim(), body: { text: body.trim(), nature: nature } }),
            });
            if (res.ok) sentCount++; else failedCount++;
          } catch { failedCount++; }
        } else if (recipientId && !scheduledFor) sentCount++;
        else if (!scheduledFor) pendingCount++;
      } catch (err) { failedCount++; }
    }
    const messages: string[] = [];
    if (sentCount > 0) messages.push(`${sentCount} sent`);
    if (pendingCount > 0) messages.push(`${pendingCount} pending (delivers when they join)`);
    if (failedCount > 0) messages.push(`${failedCount} failed`);
    if (scheduledFor) messages.unshift(`📅 Scheduled for ${new Date(scheduledFor).toLocaleString()}`);
    showToast(messages.join(' • '), failedCount > 0 && sentCount === 0 ? 'error' : 'success');
    onSend({ to, subject, nature, body });
    setTo([]); setSubject(''); setNature('decide'); setBody(''); setToInput(''); setValidationStatus({});
    setShowSchedulePicker(false); setScheduledDate(''); setScheduledTime('09:00');
    setAttachments([]);
    setSending(false);
    onClose();
  };

  const isEmail = (handle: string) => handle.includes('@') && !handle.endsWith('.memu');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className={`fixed bottom-4 md:bottom-6 right-4 md:right-6 bg-white border border-[#e8e7e3] rounded-xl shadow-2xl z-50 flex flex-col transition-all duration-300 ${
      isFullscreen ? 'inset-0 w-auto h-auto m-0 rounded-none' : 'w-[calc(100%-32px)] md:w-[560px] max-w-[560px]'
    }`} style={{ animation: 'composeUp 0.22s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* Header */}
      <div className="px-4 md:px-5 py-3 md:py-4 pb-2 md:pb-3 border-b border-[#f2f1ee] flex items-center justify-between">
        <h3 className="font-['Playfair_Display'] text-base italic text-[#0f0f0f]">
          {editingDraft ? 'Edit draft' : (replyToMemuId ? 'Reply to memu' : 'New memu')}
        </h3>
        <div className="flex gap-1.5">
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-7 h-7 border border-[#e8e7e3] rounded-md flex items-center justify-center hover:border-[#777] transition">
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button onClick={onClose} className="w-7 h-7 border border-[#e8e7e3] rounded-md flex items-center justify-center hover:border-[#777] transition"><X size={13} /></button>
        </div>
      </div>

      {/* TO Field */}
      <div className="px-4 md:px-5 py-2 border-b border-[#f2f1ee] flex items-start gap-2">
        <span className="text-[11.5px] font-medium text-[#777] w-10 md:w-12 pt-2.5">TO</span>
        <div className="flex-1 flex flex-wrap gap-1.5 py-2">
          {to.map(handle => {
            const isValid = validationStatus[handle] === 'valid';
            const isInvalid = validationStatus[handle] === 'invalid';
            return (
              <div key={handle} className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 transition ${
                isEmail(handle) 
                  ? isValid ? 'bg-[#d1fae5] text-[#059669]' : isInvalid ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#d1fae5] text-[#059669]'
                  : isValid ? 'bg-[#ede9fe] text-[#4f46e5]' : isInvalid ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#f2f1ee] text-[#4f46e5]'
              }`}>
                <span className="truncate max-w-[120px] md:max-w-none">{handle}</span>
                {getValidationIcon(handle)}
                {isEmail(handle) && <Mail size={10} className={isValid ? 'text-[#059669]' : isInvalid ? 'text-[#dc2626]' : 'text-[#059669]'} />}
                <button onClick={() => handleRemoveHandle(handle)} className="opacity-60 hover:opacity-100 ml-0.5">✕</button>
              </div>
            );
          })}
          <div className="flex flex-1 gap-1 flex-wrap">
            <input ref={toInputRef} type="text" value={toInput} onChange={(e) => setToInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="+ add handle or email" className="flex-1 min-w-[100px] text-[13.5px] outline-none bg-transparent" />
            <button onClick={handleAddHandle} className="px-2 py-1 text-[11px] bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-md hover:from-[#5b21b6] hover:to-[#06b6d4] transition whitespace-nowrap">Add</button>
            <button onClick={() => setShowHandleSelector(!showHandleSelector)} className="px-2 py-1 text-[11px] bg-[#f2f1ee] text-[#777] rounded-md hover:bg-[#e8e7e3] transition" title="Select from contacts"><Users size={12} /></button>
          </div>
        </div>
      </div>

      {/* Handle Selector */}
      {showHandleSelector && (
        <div className="px-4 md:px-5 py-3 border-b border-[#f2f1ee] bg-[#fafaf8]">
          <div className="relative"><Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#aaa]" /><input type="text" value={handleSearchQuery} onChange={(e) => setHandleSearchQuery(e.target.value)} placeholder="Search by name or @username..." className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-[#e8e7e3] rounded-md focus:outline-none focus:border-[#4f46e5] transition" autoFocus /></div>
          <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
            {searchingHandles && <div className="flex justify-center py-2"><Loader2 size={14} className="animate-spin text-[#aaa]" /></div>}
            {!searchingHandles && handleSearchResults.length === 0 && handleSearchQuery.length >= 2 && <p className="text-[11px] text-[#777] text-center py-2">No users found</p>}
            {handleSearchResults.map((profile) => (
              <button key={profile.id} onClick={() => handleSelectProfile(profile)} className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-[#ede9fe] rounded-md transition">
                <div className="w-6 h-6 rounded-full bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5] font-medium text-[10px]">{(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}</div>
                <div className="flex-1"><div className="font-medium text-[#1a1a1a]">{profile.full_name || profile.username}</div><div className="text-[10px] text-[#777]">@{profile.username}.memu</div></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SUBJECT */}
      <div className="px-4 md:px-5 py-2.5 border-b border-[#f2f1ee] flex items-center gap-2">
        <span className="text-[11.5px] font-medium text-[#777] w-10 md:w-12">SUBJECT</span>
        <input ref={subjectInputRef} type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this about?" className="flex-1 text-[13.5px] outline-none bg-transparent" />
      </div>

      {/* Nature */}
      <div className="px-4 md:px-5 py-3 border-b border-[#f2f1ee] flex gap-1.5 flex-wrap">
        {natureOptions.map(opt => (
          <button key={opt.id} onClick={() => setNature(opt.id)} className={`text-[11px] font-medium px-3 py-1 rounded-full transition ${nature === opt.id ? opt.color + ' border-transparent ring-1 ring-[#4f46e5]/40' : 'bg-white text-[#777] border border-[#e8e7e3] hover:border-[#777]'}`}>{opt.label}</button>
        ))}
      </div>

      {/* Body */}
      <div className="p-4 md:p-5 min-h-[120px] md:min-h-[160px]">
        <textarea ref={bodyTextareaRef} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your memu here — no formalities required." className="w-full min-h-[100px] md:min-h-[130px] text-[13.5px] leading-relaxed outline-none resize-none bg-transparent font-['DM_Sans']" />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 md:px-5 py-2 border-t border-[#f2f1ee] flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-[#f2f1ee] rounded-full px-2 py-1 text-xs">
              <Paperclip size={10} className="text-[#4f46e5]" />
              <span className="text-[#777] max-w-[150px] truncate">{att.name}</span>
              <button onClick={() => removeAttachment(idx)} className="text-[#777] hover:text-[#dc2626]">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Picker */}
      {showSchedulePicker && (
        <div ref={schedulePickerRef} className="mx-4 md:mx-5 mb-2 p-3 bg-[#fafaf8] rounded-lg border border-[#e8e7e3] shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={12} className="text-[#4f46e5]" />
            <span className="text-[11px] font-medium text-[#777]">Schedule delivery</span>
          </div>
          <div className="flex gap-2">
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={minDate} className="flex-1 px-3 py-1.5 text-sm border border-[#e8e7e3] rounded-full focus:outline-none focus:border-[#4f46e5] bg-white" />
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-[#e8e7e3] rounded-full focus:outline-none focus:border-[#4f46e5] bg-white" />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 md:px-5 py-3 border-t border-[#f2f1ee] flex items-center justify-between">
        <div className="flex gap-1.5">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button onClick={handleAttachmentClick} disabled={uploadingAttachment} className="w-8 h-8 border border-[#e8e7e3] rounded-md flex items-center justify-center text-[#777] hover:border-[#777] hover:text-[#0f0f0f] transition disabled:opacity-50" title="Attach file">
            {uploadingAttachment ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
          </button>
          <button onClick={handleVoiceMemo} className="w-8 h-8 border border-[#e8e7e3] rounded-md flex items-center justify-center text-[#777] hover:border-[#777] hover:text-[#0f0f0f] transition" title="Record voice memo"><Mic size={13} /></button>
          <button onClick={() => setShowSchedulePicker(!showSchedulePicker)} className={`w-8 h-8 border border-[#e8e7e3] rounded-md flex items-center justify-center transition ${showSchedulePicker ? 'bg-[#ede9fe] text-[#4f46e5] border-[#4f46e5]' : 'text-[#777] hover:border-[#777] hover:text-[#0f0f0f]'}`} title="Schedule for later"><CalendarIcon size={13} /></button>
        </div>
        <button onClick={handleSend} disabled={sending} className="bg-gradient-to-r from-[#4f46e5] to-[#0891b2] text-white rounded-md px-3 md:px-5 py-1.5 md:py-2 text-[12px] md:text-[13px] font-medium flex items-center gap-1.5 hover:from-[#5b21b6] hover:to-[#06b6d4] hover:-translate-y-0.5 transition disabled:opacity-50 shadow-sm">
          {sending ? 'Sending...' : (editingDraft ? 'Update' : (replyToMemuId ? 'Reply' : (showSchedulePicker && scheduledDate ? 'Schedule' : 'Send')))}
          <Send size={13} />
        </button>
      </div>

      <style>{`
        @keyframes composeUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}