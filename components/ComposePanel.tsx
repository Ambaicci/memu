'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Mic, Calendar as CalendarIcon, Mail, Maximize2, Minimize2, Users, CheckCircle, AlertCircle, Send, Search, Loader2, Clock, UserPlus, Check, Layers } from 'lucide-react';
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

// VIBRANT & EXPRESSIVE NATURE OPTIONS
const natureOptions = [
  { id: 'fyi', label: 'FYI', style: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200' },
  { id: 'decide', label: 'Decide', style: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200' },
  { id: 'resolve', label: 'Resolve', style: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200' },
  { id: 'urgent', label: 'Urgent', style: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' },
  { id: 'broadcast', label: 'Broadcast', style: 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200' },
  { id: 'voice', label: 'Voice', style: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200' },
  { id: 'group', label: 'Group', style: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200' },
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
  
  const [savedHandles, setSavedHandles] = useState<string[]>([]);
  const [unsavedHandle, setUnsavedHandle] = useState<string | null>(null);
  const [isSavingHandle, setIsSavingHandle] = useState(false);
  
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');

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
      if (user) {
        setCurrentUserId(user.id);
        const { data } = await supabase
          .from('handles')
          .select('username')
          .eq('user_id', user.id);
        if (data) {
          setSavedHandles(data.map((h: any) => h.username));
        }
      }
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
      setUnsavedHandle(null);
      editingDraft.toHandles?.forEach(h => checkAndSetValidation(h));
    } else if (prefilledTo && prefilledTo.length > 0) {
      setTo(prefilledTo);
      setSubject('');
      setNature('decide');
      setBody('');
      setToInput('');
      setUnsavedHandle(null);
      prefilledTo.forEach(h => checkAndSetValidation(h));
    } else {
      setTo([]);
      setSubject('');
      setNature('decide');
      setBody('');
      setToInput('');
      setUnsavedHandle(null);
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
      
      const handleName = handle.replace('@', '').replace('.memu', '');
      if (!savedHandles.includes(handleName)) {
        setUnsavedHandle(handleName);
      }
    }
    setToInput('');
    setTimeout(() => toInputRef.current?.focus(), 0);
  };

  const handleSaveUnsavedHandle = async () => {
    if (!unsavedHandle) return;
    setIsSavingHandle(true);

    try {
      const res = await fetch('/api/handles/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: unsavedHandle }),
      });
      const data = await res.json();

      if (data.valid) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('handles').insert({
          user_id: user?.id,
          contact_id: data.user.id,
          username: data.user.username,
          full_name: data.user.full_name,
          avatar_url: data.user.avatar_url,
        });

        setSavedHandles([...savedHandles, unsavedHandle]);
        showToast(`@${unsavedHandle}.memu saved to contacts!`, 'success');
      } else {
        showToast('Handle does not exist on Memu.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save handle.', 'error');
    } finally {
      setIsSavingHandle(false);
      setUnsavedHandle(null);
    }
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
    if (status === 'valid') return <CheckCircle size={14} strokeWidth={2.5} className="text-emerald-600" />;
    if (status === 'invalid') return <AlertCircle size={14} strokeWidth={2.5} className="text-rose-600" />;
    if (status === 'checking') return <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />;
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
          attachments: attachments,
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
    setUnsavedHandle(null);
    setSending(false);
    onClose();
  };

  const isEmail = (handle: string) => handle.includes('@') && !handle.endsWith('.memu');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className={`fixed bottom-4 md:bottom-6 right-4 md:right-6 bg-white border border-gray-200/60 rounded-3xl shadow-2xl z-50 flex flex-col transition-all duration-300 ${
      isFullscreen ? 'inset-0 w-auto h-auto m-0 rounded-none' : 'w-[calc(100%-32px)] md:w-[600px] max-w-[600px]'
    }`} style={{ animation: 'composeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* Header */}
      <div className="px-5 md:px-6 py-4 md:py-5 pb-3 md:pb-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Layers size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <h3 className="font-serif text-lg font-semibold text-gray-900">
            {editingDraft ? 'Edit draft' : (replyToMemuId ? 'Reply to memu' : 'New memu')}
          </h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-500 btn-press"
          >
            {isFullscreen ? <Minimize2 size={15} strokeWidth={2.5} /> : <Maximize2 size={15} strokeWidth={2.5} />}
          </button>
          <button 
            onClick={onClose} 
            className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-500 btn-press"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* TO Field */}
      <div className="px-5 md:px-6 py-3 border-b border-gray-100 flex items-start gap-3">
        <span className="text-xs font-bold text-gray-400 w-12 md:w-14 pt-3 uppercase tracking-wider">TO</span>
        <div className="flex-1 flex flex-wrap gap-2 py-2">
          {to.map(handle => {
            const isValid = validationStatus[handle] === 'valid';
            const isInvalid = validationStatus[handle] === 'invalid';
            return (
              <div key={handle} className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 transition animate-fade-in-scale ${
                isEmail(handle) 
                  ? isValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isInvalid ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isValid ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : isInvalid ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-gray-100 text-indigo-700 border border-gray-200'
              }`}>
                <span className="truncate max-w-[140px] md:max-w-none">{handle}</span>
                {getValidationIcon(handle)}
                {isEmail(handle) && <Mail size={12} strokeWidth={2.5} className={isValid ? 'text-emerald-600' : isInvalid ? 'text-rose-600' : 'text-emerald-600'} />}
                <button onClick={() => handleRemoveHandle(handle)} className="opacity-60 hover:opacity-100 ml-0.5 btn-press">✕</button>
              </div>
            );
          })}
          <div className="flex flex-1 gap-2 flex-wrap items-center">
            <input 
              ref={toInputRef} 
              type="text" 
              value={toInput} 
              onChange={(e) => setToInput(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder="+ add handle or email" 
              className="flex-1 min-w-[120px] text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400" 
            />
            <button 
              onClick={handleAddHandle} 
              className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap btn-press"
            >
              Add
            </button>
            <button 
              onClick={() => setShowHandleSelector(!showHandleSelector)} 
              className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-all btn-press" 
              title="Select from contacts"
            >
              <Users size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Save Handle Prompt */}
      {unsavedHandle && (
        <div className="px-5 md:px-6 py-4 border-b border-gray-100 bg-amber-50/50 animate-fadeIn">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-amber-800">
              <UserPlus size={16} strokeWidth={2.5} />
              <span>You haven't saved <strong>@{unsavedHandle}.memu</strong> to your contacts yet.</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setUnsavedHandle(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-amber-100 rounded-full transition-all btn-press"
              >
                No
              </button>
              <button 
                onClick={handleSaveUnsavedHandle}
                disabled={isSavingHandle}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-full transition-all disabled:opacity-50 shadow-sm btn-press"
              >
                {isSavingHandle ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handle Selector */}
      {showHandleSelector && (
        <div className="px-5 md:px-6 py-4 border-b border-gray-100 bg-gray-50 animate-fade-in-scale">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={handleSearchQuery} 
              onChange={(e) => setHandleSearchQuery(e.target.value)} 
              placeholder="Search by name or @username..." 
              className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
              autoFocus 
            />
          </div>
          <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5">
            {searchingHandles && <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-gray-400" /></div>}
            {!searchingHandles && handleSearchResults.length === 0 && handleSearchQuery.length >= 2 && <p className="text-xs text-gray-500 text-center py-3">No users found</p>}
            {handleSearchResults.map((profile) => (
              <button 
                key={profile.id} 
                onClick={() => handleSelectProfile(profile)} 
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-indigo-50 rounded-xl transition-all btn-press"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  {(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{profile.full_name || profile.username}</div>
                  <div className="text-xs text-gray-500">@{profile.username}.memu</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SUBJECT */}
      <div className="px-5 md:px-6 py-3 border-b border-gray-100 flex items-center gap-3">
        <span className="text-xs font-bold text-gray-400 w-12 md:w-14 uppercase tracking-wider">SUBJECT</span>
        <input 
          ref={subjectInputRef} 
          type="text" 
          value={subject} 
          onChange={(e) => setSubject(e.target.value)} 
          placeholder="What is this about?" 
          className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400" 
        />
      </div>

      {/* VIBRANT Nature Selector */}
      <div className="px-5 md:px-6 py-4 border-b border-gray-100 flex gap-2 flex-wrap">
        {natureOptions.map((opt, idx) => (
          <button 
            key={opt.id} 
            onClick={() => setNature(opt.id)} 
            className={`text-xs font-bold px-4 py-2 rounded-full transition-all border animate-slide-up ${
              nature === opt.id 
                ? opt.style + ' shadow-sm scale-105 ring-2 ring-offset-1 ring-gray-200' 
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            style={{ animationDelay: `${idx * 50}ms`, opacity: 0 }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-5 md:p-6 min-h-[140px] md:min-h-[180px]">
        <textarea 
          ref={bodyTextareaRef} 
          value={body} 
          onChange={(e) => setBody(e.target.value)} 
          placeholder="Write your memu here — no formalities required." 
          className="w-full min-h-[120px] md:min-h-[150px] text-sm leading-relaxed outline-none resize-none bg-transparent text-gray-800 placeholder:text-gray-400" 
        />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-5 md:px-6 py-3 border-t border-gray-100 flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-xs animate-fade-in-scale">
              <Paperclip size={12} strokeWidth={2.5} className="text-indigo-600" />
              <span className="text-gray-700 max-w-[160px] truncate font-medium">{att.name}</span>
              <button onClick={() => removeAttachment(idx)} className="text-gray-500 hover:text-rose-600 transition-all btn-press">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Picker */}
      {showSchedulePicker && (
        <div ref={schedulePickerRef} className="mx-5 md:mx-6 mb-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-scale">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} strokeWidth={2.5} className="text-indigo-600" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Schedule delivery</span>
          </div>
          <div className="flex gap-3">
            <input 
              type="date" 
              value={scheduledDate} 
              onChange={(e) => setScheduledDate(e.target.value)} 
              min={minDate} 
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all" 
            />
            <input 
              type="time" 
              value={scheduledTime} 
              onChange={(e) => setScheduledTime(e.target.value)} 
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all" 
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 md:px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button 
            onClick={handleAttachmentClick} 
            disabled={uploadingAttachment} 
            className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all disabled:opacity-50 btn-press" 
            title="Attach file"
          >
            {uploadingAttachment ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} strokeWidth={2.5} />}
          </button>
          <button 
            onClick={handleVoiceMemo} 
            className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all btn-press" 
            title="Record voice memo"
          >
            <Mic size={15} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setShowSchedulePicker(!showSchedulePicker)} 
            className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all btn-press ${
              showSchedulePicker 
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200' 
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50'
            }`} 
            title="Schedule for later"
          >
            <CalendarIcon size={15} strokeWidth={2.5} />
          </button>
        </div>
        <button 
          onClick={handleSend} 
          disabled={sending} 
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full px-5 md:px-6 py-2.5 text-sm font-semibold flex items-center gap-2 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-lg btn-press"
        >
          {sending ? 'Sending...' : (editingDraft ? 'Update' : (replyToMemuId ? 'Reply' : (showSchedulePicker && scheduledDate ? 'Schedule' : 'Send')))}
          <Send size={15} strokeWidth={2.5} />
        </button>
      </div>

      <style>{`
        @keyframes composeUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}