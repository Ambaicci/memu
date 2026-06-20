'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Paperclip, Mic, Calendar as CalendarIcon, Mail, 
  Maximize2, Minimize2, Users, CheckCircle, AlertCircle, 
  Send, Search, Loader2, Clock, UserPlus, Check, 
  PenLine, Megaphone, Layers, ChevronLeft, Info
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { triggerHaptic } from '@/lib/haptics';

interface ComposePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (memu: { to: string[]; subject: string; nature: string; body: string }) => void;
  prefilledTo?: string[];
  editingDraft?: { to: string[]; toHandles: string[]; subject: string; nature: string; body: string } | null;
  replyToMemuId?: string | null;
}

const natureOptions = [
  { id: 'fyi', label: 'FYI', desc: 'No action required. Just for your information.', style: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200' },
  { id: 'decide', label: 'Decide', desc: 'I need your decision or approval on this.', style: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200' },
  { id: 'resolve', label: 'Resolve', desc: 'Requires discussion to solve a problem.', style: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200' },
  { id: 'urgent', label: 'Urgent', desc: 'Time-sensitive. Needs immediate attention.', style: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' },
];

export default function ComposePanel({ isOpen, onClose, onSend, prefilledTo, editingDraft, replyToMemuId }: ComposePanelProps) {
  // Core State
  const [to, setTo] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [nature, setNature] = useState('decide');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Handle/Contact State
  const [showHandleSelector, setShowHandleSelector] = useState(false);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking'>>({});
  const [handleSearchQuery, setHandleSearchQuery] = useState('');
  const [handleSearchResults, setHandleSearchResults] = useState<any[]>([]);
  const [savedHandlesList, setSavedHandlesList] = useState<any[]>([]);
  const [loadingHandles, setLoadingHandles] = useState(false);
  const [searchingHandles, setSearchingHandles] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [savedHandles, setSavedHandles] = useState<string[]>([]);
  const [unsavedHandle, setUnsavedHandle] = useState<string | null>(null);
  const [isSavingHandle, setIsSavingHandle] = useState(false);
  
  // Modals for Broadcast/Group
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Schedule & Attachments
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size: number; type: string }>>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const schedulePickerRef = useRef<HTMLDivElement>(null);
  const handleDropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Initialize User & Saved Handles
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data } = await supabase.from('handles').select('username').eq('user_id', user.id);
        if (data) setSavedHandles(data.map((h: any) => h.username));
      }
    };
    getCurrentUser();
  }, []);

  // Fetch saved handles ONLY when selector opens
  useEffect(() => {
    if (showHandleSelector && currentUserId) {
      fetchSavedHandles();
    }
  }, [showHandleSelector, currentUserId]);

  const fetchSavedHandles = async () => {
    setLoadingHandles(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('handles').select('*').eq('user_id', currentUserId || '').order('username', { ascending: true });
    if (!error && data) setSavedHandlesList(data);
    setLoadingHandles(false);
  };

  // Search handles
  useEffect(() => {
    if (!showHandleSelector) return;
    if (!handleSearchQuery.trim()) { setHandleSearchResults([]); return; }

    const searchHandles = async () => {
      setSearchingHandles(true);
      const supabase = createClient();
      const filteredSaved = savedHandlesList.filter(h => 
        h.username.toLowerCase().includes(handleSearchQuery.toLowerCase()) ||
        (h.full_name && h.full_name.toLowerCase().includes(handleSearchQuery.toLowerCase()))
      );
      const { data, error } = await supabase.from('profiles').select('id, full_name, username').or(`full_name.ilike.%${handleSearchQuery}%,username.ilike.%${handleSearchQuery}%`).neq('id', currentUserId || '').limit(10);
      
      if (!error && data) {
        const merged = [...filteredSaved, ...data.filter(p => !filteredSaved.some(s => s.username === p.username))];
        setHandleSearchResults(merged);
      } else { setHandleSearchResults(filteredSaved); }
      setSearchingHandles(false);
    };
    const debounce = setTimeout(searchHandles, 300);
    return () => clearTimeout(debounce);
  }, [handleSearchQuery, showHandleSelector, currentUserId, savedHandlesList]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (schedulePickerRef.current && !schedulePickerRef.current.contains(e.target as Node)) setShowSchedulePicker(false);
      if (handleDropdownRef.current && !handleDropdownRef.current.contains(e.target as Node)) setShowHandleSelector(false);
    };
    if (showSchedulePicker || showHandleSelector) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSchedulePicker, showHandleSelector]);

  useEffect(() => {
    if (isOpen) setTimeout(() => toInputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (editingDraft) {
      setTo(editingDraft.toHandles || editingDraft.to || []);
      setSubject(editingDraft.subject || ''); setNature(editingDraft.nature || 'decide'); setBody(editingDraft.body || '');
      setToInput(''); setUnsavedHandle(null);
    } else if (prefilledTo && prefilledTo.length > 0) {
      setTo(prefilledTo); setSubject(''); setNature('decide'); setBody(''); setToInput(''); setUnsavedHandle(null);
    } else {
      setTo([]); setSubject(''); setNature('decide'); setBody(''); setToInput(''); setUnsavedHandle(null);
    }
  }, [editingDraft, prefilledTo]);

  const validateAddress = (address: string): boolean => {
    if (address.endsWith('.memu') && address.startsWith('@')) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
  };

  const checkAndSetValidation = (address: string) => {
    setValidationStatus(prev => ({ ...prev, [address]: 'checking' }));
    setTimeout(() => {
      const isValid = validateAddress(address);
      setValidationStatus(prev => ({ ...prev, [address]: isValid ? 'valid' : 'invalid' }));
    }, 300);
  };

  const handleAddHandle = () => {
    triggerHaptic('selection');
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
      const isEmail = handle.includes('@') && !handle.endsWith('.memu');
      const handleName = handle.replace('@', '').replace('.memu', '');
      if (!isEmail && !savedHandles.includes(handleName)) setUnsavedHandle(handleName);
    }
    setToInput('');
    setTimeout(() => toInputRef.current?.focus(), 0);
  };

  const handleSaveUnsavedHandle = async () => {
    triggerHaptic('medium');
    if (!unsavedHandle) return;
    setIsSavingHandle(true);
    try {
      const res = await fetch('/api/handles/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: unsavedHandle }) });
      const data = await res.json();
      if (data.valid) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('handles').insert({ user_id: user?.id, contact_id: data.user.id, username: data.user.username, full_name: data.user.full_name, avatar_url: data.user.avatar_url });
        setSavedHandles([...savedHandles, unsavedHandle]);
        showToast(`@${unsavedHandle}.memu saved!`, 'success');
      } else { showToast('Handle does not exist.', 'error'); }
    } catch (err) { showToast('Failed to save handle.', 'error'); }
    finally { setIsSavingHandle(false); setUnsavedHandle(null); }
  };

  const handleSelectProfile = (profile: any) => {
    triggerHaptic('selection');
    const handle = `@${profile.username}.memu`;
    if (!to.includes(handle)) {
      setTo([...to, handle]);
      checkAndSetValidation(handle);
      if (!savedHandles.includes(profile.username)) setUnsavedHandle(profile.username);
    }
    setShowHandleSelector(false);
    setHandleSearchQuery('');
    setTimeout(() => toInputRef.current?.focus(), 0);
  };

  const handleRemoveHandle = (handle: string) => {
    triggerHaptic('light');
    setTo(to.filter(h => h !== handle));
    const newValidation = { ...validationStatus };
    delete newValidation[handle];
    setValidationStatus(newValidation);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHandle(); } };
  const isEmail = (handle: string) => handle.includes('@') && !handle.endsWith('.memu');
  
  const getValidationIcon = (address: string) => {
    const status = validationStatus[address];
    if (status === 'valid') return <CheckCircle size={14} strokeWidth={2.5} className="text-emerald-600" />;
    if (status === 'invalid') return <AlertCircle size={14} strokeWidth={2.5} className="text-rose-600" />;
    if (status === 'checking') return <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />;
    return null;
  };

  const handleAttachmentClick = () => { triggerHaptic('light'); fileInputRef.current?.click(); };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append('file', files[0]);
    try {
      const res = await fetch('/api/upload-attachment', { method: 'POST', body: formData });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Upload failed:', res.status, errText);
        throw new Error('Upload failed');
      }
      const data = await res.json();
      setAttachments(prev => [...prev, data]);
      showToast('File attached', 'success');
    } catch (err) { 
      console.error(err);
      showToast('Failed to upload file. Check console for details.', 'error'); 
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => { triggerHaptic('light'); setAttachments(prev => prev.filter((_, i) => i !== index)); };
  const handleVoiceMemo = () => { triggerHaptic('light'); showToast('Voice memos coming soon.', 'info'); };

  const handleSend = async () => {
    triggerHaptic('success');
    if (to.length === 0) { showToast('Please add at least one recipient', 'error'); return; }
    const invalidAddresses = to.filter(addr => validationStatus[addr] === 'invalid');
    if (invalidAddresses.length > 0) { showToast(`Invalid addresses: ${invalidAddresses.join(', ')}`, 'error'); return; }
    if (!subject.trim()) { showToast('Please add a subject', 'error'); return; }
    if (!body.trim()) { showToast('Please write your memu', 'error'); return; }
    
    setSending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast('You must be signed in', 'error'); setSending(false); return; }

    let scheduledFor = null;
    if (showSchedulePicker && scheduledDate) {
      const [year, month, day] = scheduledDate.split('-');
      const [hour, minute] = scheduledTime.split(':');
      scheduledFor = new Date(Number(year), Number(month)-1, Number(day), Number(hour), Number(minute)).toISOString();
      if (new Date(scheduledFor) <= new Date()) { showToast('Scheduled time must be in the future', 'error'); setSending(false); return; }
    }

    let sentCount = 0, pendingCount = 0, failedCount = 0;
    for (const recipient of to) {
      try {
        const handleName = recipient.replace('@', '').replace('.memu', '');
        const { data: profile } = await supabase.from('profiles').select('id').eq('username', handleName).maybeSingle();
        const recipientId = profile?.id || null;
        const memoStatus = recipientId ? (scheduledFor ? 'scheduled' : 'sent') : 'pending';
        
        const { error: dbError } = await supabase.from('memus').insert({
          sender_id: user.id, recipient_id: recipientId, recipient_email: recipient, subject: subject.trim(), body: body.trim(), nature: nature, status: memoStatus, scheduled_for: scheduledFor, attachments: attachments,
        });
        if (dbError) throw dbError;
        if (replyToMemuId) await supabase.from('memus').update({ replied_at: new Date().toISOString() }).eq('id', replyToMemuId);
        
        if (recipientId && isEmail(recipient) && !scheduledFor) {
          try {
            const res = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: recipient, subject: subject.trim(), body: { text: body.trim(), nature: nature } }) });
            if (res.ok) sentCount++; else failedCount++;
          } catch { failedCount++; }
        } else if (recipientId && !scheduledFor) sentCount++;
        else if (!scheduledFor) pendingCount++;
      } catch (err) { failedCount++; }
    }

    const messages: string[] = [];
    if (sentCount > 0) messages.push(`${sentCount} sent`);
    if (pendingCount > 0) messages.push(`${pendingCount} pending`);
    if (failedCount > 0) messages.push(`${failedCount} failed`);
    if (scheduledFor) messages.unshift(` Scheduled for ${new Date(scheduledFor).toLocaleString()}`);
    
    showToast(messages.join(' • '), failedCount > 0 && sentCount === 0 ? 'error' : 'success');
    onSend({ to, subject, nature, body });
    setTo([]); setSubject(''); setNature('decide'); setBody(''); setToInput(''); setValidationStatus({}); setShowSchedulePicker(false); setScheduledDate(''); setScheduledTime('09:00'); setAttachments([]); setUnsavedHandle(null); setSending(false); onClose();
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <>
      {/* ================= MOBILE FULL-SCREEN COMPOSE ================= */}
      <div className="fixed inset-0 bg-white z-50 flex flex-col lg:hidden animate-mobile-compose">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { triggerHaptic('light'); onClose(); }} className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all btn-press">
              <ChevronLeft size={20} strokeWidth={2.5} className="text-gray-700" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow">
                <PenLine size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-serif text-base font-semibold text-gray-900">{editingDraft ? 'Edit draft' : (replyToMemuId ? 'Reply' : 'New memu')}</h3>
            </div>
          </div>
          <button onClick={handleSend} disabled={sending} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full px-5 py-2 text-sm font-semibold flex items-center gap-1.5 hover:shadow-lg transition-all disabled:opacity-50 shadow-md btn-press">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
            {sending ? 'Sending' : (showSchedulePicker && scheduledDate ? 'Schedule' : 'Send')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll pb-24">
          {/* TO Field */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <span className="text-[10px] font-bold text-gray-400 w-10 pt-3 uppercase tracking-wider">TO</span>
              <div className="flex-1 flex flex-wrap gap-2 py-1">
                {to.map(handle => (
                  <div key={handle} className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 transition animate-fade-in-scale ${isEmail(handle) ? (validationStatus[handle] === 'valid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200') : (validationStatus[handle] === 'valid' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-indigo-700 border border-gray-200')}`}>
                    <span className="truncate max-w-[120px]">{handle}</span>
                    {getValidationIcon(handle)}
                    <button onClick={() => handleRemoveHandle(handle)} className="opacity-60 hover:opacity-100 ml-0.5 btn-press">✕</button>
                  </div>
                ))}
                <div className="flex flex-1 gap-2 flex-wrap items-center min-w-[120px]">
                  <input ref={toInputRef} type="text" value={toInput} onChange={(e) => setToInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="@handle or email" className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400 min-h-[44px]" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 ml-13 flex-wrap relative">
              <button onClick={handleAddHandle} className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-all btn-press">Add</button>
              
              {/* Handles Dropdown */}
              <div className="relative" ref={handleDropdownRef}>
                <button onClick={() => { triggerHaptic('light'); setShowHandleSelector(!showHandleSelector); }} className="px-4 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all btn-press flex items-center gap-1.5">
                  <Users size={14} strokeWidth={2.5} /> Handles
                </button>
                {showHandleSelector && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale">
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={handleSearchQuery} onChange={(e) => setHandleSearchQuery(e.target.value)} placeholder="Search handles..." className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" autoFocus />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      {loadingHandles && <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-gray-400" /></div>}
                      {!loadingHandles && !handleSearchQuery && savedHandlesList.length === 0 && <p className="text-xs text-gray-500 text-center py-3">No saved handles</p>}
                      {searchingHandles && <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-gray-400" /></div>}
                      {!searchingHandles && !loadingHandles && handleSearchQuery && handleSearchResults.length === 0 && <p className="text-xs text-gray-500 text-center py-3">No users found</p>}
                      {(handleSearchQuery ? handleSearchResults : savedHandlesList).map((profile) => (
                        <button key={profile.id || profile.username} onClick={() => handleSelectProfile(profile)} className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-indigo-50 rounded-xl transition-all btn-press">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xs">{(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{profile.full_name || profile.username}</div>
                            <div className="text-xs text-gray-500 truncate">@{profile.username}.memu</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => { triggerHaptic('medium'); showToast('Broadcast: Send to multiple individuals at once.', 'info'); }} className="px-4 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all btn-press flex items-center gap-1.5"><Megaphone size={14} strokeWidth={2.5} /> Broadcast</button>
              <button onClick={() => { triggerHaptic('medium'); showToast('Group: Post this memu to a Space feed.', 'info'); }} className="px-4 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all btn-press flex items-center gap-1.5"><Layers size={14} strokeWidth={2.5} /> Group</button>
            </div>
          </div>

          {unsavedHandle && (
            <div className="px-4 py-3 border-b border-gray-100 bg-amber-50/50 animate-fadeIn">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-amber-800">
                  <UserPlus size={16} strokeWidth={2.5} />
                  <span className="text-xs">Save <strong>@{unsavedHandle}.memu</strong>?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setUnsavedHandle(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-amber-100 rounded-full transition-all btn-press">Later</button>
                  <button onClick={handleSaveUnsavedHandle} disabled={isSavingHandle} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-full transition-all disabled:opacity-50 shadow-sm btn-press">
                    {isSavingHandle ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />} Save
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-b border-gray-100">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">SUBJECT</label>
            <input ref={subjectInputRef} type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this about?" className="w-full text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400 min-h-[44px]" />
          </div>

          <div className="px-4 py-4 border-b border-gray-100">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3 flex items-center gap-1.5">NATURE <Info size={12} className="text-gray-400" /></label>
            <div className="flex gap-2 flex-wrap">
              {natureOptions.map((opt) => (
                <div key={opt.id} className="relative group">
                  <button onClick={() => { triggerHaptic('selection'); setNature(opt.id); }} className={`text-xs font-bold px-4 py-2.5 rounded-full transition-all border btn-press ${nature === opt.id ? opt.style + ' shadow-sm scale-105 ring-2 ring-offset-1 ring-gray-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{opt.label}</button>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                    {opt.desc}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 py-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">MESSAGE</label>
            <textarea ref={bodyTextareaRef} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your memu here — no formalities required." className="w-full min-h-[200px] text-sm leading-relaxed outline-none resize-none bg-transparent text-gray-800 placeholder:text-gray-400" />
          </div>

          {attachments.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2 text-xs animate-fade-in-scale">
                  <Paperclip size={12} strokeWidth={2.5} className="text-indigo-600" />
                  <span className="text-gray-700 max-w-[140px] truncate font-medium">{att.name}</span>
                  <button onClick={() => removeAttachment(idx)} className="text-gray-500 hover:text-rose-600 transition-all btn-press">✕</button>
                </div>
              ))}
            </div>
          )}

          {showSchedulePicker && (
            <div ref={schedulePickerRef} className="mx-4 my-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-scale">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} strokeWidth={2.5} className="text-indigo-600" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Schedule delivery</span>
              </div>
              <div className="flex flex-col gap-3">
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={minDate} className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all" />
                <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all" />
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-around sticky bottom-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button onClick={handleAttachmentClick} disabled={uploadingAttachment} className="flex flex-col items-center gap-1 text-gray-500 btn-press disabled:opacity-50">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">{uploadingAttachment ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} strokeWidth={2.5} />}</div>
            <span className="text-[10px] font-semibold">Attach</span>
          </button>
          <button onClick={handleVoiceMemo} className="flex flex-col items-center gap-1 text-gray-500 btn-press">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center"><Mic size={18} strokeWidth={2.5} /></div>
            <span className="text-[10px] font-semibold">Voice</span>
          </button>
          <button onClick={() => { triggerHaptic('light'); setShowSchedulePicker(!showSchedulePicker); }} className={`flex flex-col items-center gap-1 btn-press ${showSchedulePicker ? 'text-indigo-600' : 'text-gray-500'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${showSchedulePicker ? 'bg-indigo-50' : 'bg-gray-100'}`}><CalendarIcon size={18} strokeWidth={2.5} /></div>
            <span className="text-[10px] font-semibold">Schedule</span>
          </button>
        </div>
      </div>

      {/* ================= DESKTOP FLOATING PANEL ================= */}
      <div className={`hidden lg:flex fixed bg-white border border-gray-200/60 shadow-2xl z-50 flex-col transition-all duration-300 animate-compose-up ${isFullscreen ? 'inset-0 w-auto h-auto m-0 rounded-none' : 'bottom-6 right-6 w-[600px] max-w-[600px] rounded-3xl'}`}>
        <div className="px-6 py-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <PenLine size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-serif text-lg font-semibold text-gray-900">{editingDraft ? 'Edit draft' : (replyToMemuId ? 'Reply to memu' : 'New memu')}</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-500 btn-press">
              {isFullscreen ? <Minimize2 size={15} strokeWidth={2.5} /> : <Maximize2 size={15} strokeWidth={2.5} />}
            </button>
            <button onClick={onClose} className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-500 btn-press">
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex items-start gap-3">
          <span className="text-xs font-bold text-gray-400 w-14 pt-3 uppercase tracking-wider">TO</span>
          <div className="flex-1 flex flex-wrap gap-2 py-2">
            {to.map(handle => (
              <div key={handle} className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 transition animate-fade-in-scale ${isEmail(handle) ? (validationStatus[handle] === 'valid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200') : (validationStatus[handle] === 'valid' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-indigo-700 border border-gray-200')}`}>
                <span className="truncate max-w-[140px]">{handle}</span>
                {getValidationIcon(handle)}
                {isEmail(handle) && <Mail size={12} strokeWidth={2.5} className={validationStatus[handle] === 'valid' ? 'text-emerald-600' : 'text-rose-600'} />}
                <button onClick={() => handleRemoveHandle(handle)} className="opacity-60 hover:opacity-100 ml-0.5 btn-press">✕</button>
              </div>
            ))}
            <div className="flex flex-1 gap-2 flex-wrap items-center relative">
              <input ref={toInputRef} type="text" value={toInput} onChange={(e) => setToInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="+ add handle or email" className="flex-1 min-w-[120px] text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400" />
              <button onClick={handleAddHandle} className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap btn-press">Add</button>
              
              {/* Handles Dropdown */}
              <div className="relative" ref={handleDropdownRef}>
                <button onClick={() => setShowHandleSelector(!showHandleSelector)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-all btn-press flex items-center gap-1">
                  <Users size={14} strokeWidth={2.5} /> Handles
                </button>
                {showHandleSelector && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale">
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={handleSearchQuery} onChange={(e) => setHandleSearchQuery(e.target.value)} placeholder="Search handles..." className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" autoFocus />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      {loadingHandles && <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-gray-400" /></div>}
                      {!loadingHandles && !handleSearchQuery && savedHandlesList.length === 0 && <p className="text-xs text-gray-500 text-center py-3">No saved handles</p>}
                      {searchingHandles && <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-gray-400" /></div>}
                      {!searchingHandles && !loadingHandles && handleSearchQuery && handleSearchResults.length === 0 && <p className="text-xs text-gray-500 text-center py-3">No users found</p>}
                      {(handleSearchQuery ? handleSearchResults : savedHandlesList).map((profile) => (
                        <button key={profile.id || profile.username} onClick={() => handleSelectProfile(profile)} className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-indigo-50 rounded-xl transition-all btn-press">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xs">{(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{profile.full_name || profile.username}</div>
                            <div className="text-xs text-gray-500 truncate">@{profile.username}.memu</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => showToast('Broadcast: Send to multiple individuals at once.', 'info')} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-all btn-press flex items-center gap-1"><Megaphone size={14} strokeWidth={2.5} /> Broadcast</button>
              <button onClick={() => showToast('Group: Post this memu to a Space feed.', 'info')} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-all btn-press flex items-center gap-1"><Layers size={14} strokeWidth={2.5} /> Group</button>
            </div>
          </div>
        </div>

        {unsavedHandle && (
          <div className="px-6 py-4 border-b border-gray-100 bg-amber-50/50 animate-fadeIn">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-amber-800">
                <UserPlus size={16} strokeWidth={2.5} />
                <span>You haven't saved <strong>@{unsavedHandle}.memu</strong> to your contacts yet.</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setUnsavedHandle(null)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-amber-100 rounded-full transition-all btn-press">No</button>
                <button onClick={handleSaveUnsavedHandle} disabled={isSavingHandle} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-full transition-all disabled:opacity-50 shadow-sm btn-press">
                  {isSavingHandle ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />} Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 w-14 uppercase tracking-wider">SUBJECT</span>
          <input ref={subjectInputRef} type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this about?" className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400" />
        </div>

        <div className="px-6 py-4 border-b border-gray-100 flex gap-2 flex-wrap">
          {natureOptions.map((opt, idx) => (
            <div key={opt.id} className="relative group">
              <button onClick={() => setNature(opt.id)} className={`text-xs font-bold px-4 py-2 rounded-full transition-all border animate-slide-up ${nature === opt.id ? opt.style + ' shadow-sm scale-105 ring-2 ring-offset-1 ring-gray-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`} style={{ animationDelay: `${idx * 50}ms`, opacity: 0 }}>{opt.label}</button>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                {opt.desc}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 min-h-[180px]">
          <textarea ref={bodyTextareaRef} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your memu here — no formalities required." className="w-full min-h-[150px] text-sm leading-relaxed outline-none resize-none bg-transparent text-gray-800 placeholder:text-gray-400" />
        </div>

        {attachments.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-xs animate-fade-in-scale">
                <Paperclip size={12} strokeWidth={2.5} className="text-indigo-600" />
                <span className="text-gray-700 max-w-[160px] truncate font-medium">{att.name}</span>
                <button onClick={() => removeAttachment(idx)} className="text-gray-500 hover:text-rose-600 transition-all btn-press">✕</button>
              </div>
            ))}
          </div>
        )}

        {showSchedulePicker && (
          <div ref={schedulePickerRef} className="mx-6 mb-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-scale">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} strokeWidth={2.5} className="text-indigo-600" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Schedule delivery</span>
            </div>
            <div className="flex gap-3">
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={minDate} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all" />
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all" />
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <button onClick={handleAttachmentClick} disabled={uploadingAttachment} className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all disabled:opacity-50 btn-press" title="Attach file">
              {uploadingAttachment ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} strokeWidth={2.5} />}
            </button>
            <button onClick={handleVoiceMemo} className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all btn-press" title="Record voice memo">
              <Mic size={15} strokeWidth={2.5} />
            </button>
            <button onClick={() => setShowSchedulePicker(!showSchedulePicker)} className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all btn-press ${showSchedulePicker ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50'}`} title="Schedule for later">
              <CalendarIcon size={15} strokeWidth={2.5} />
            </button>
          </div>
          <button onClick={handleSend} disabled={sending} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full px-6 py-2.5 text-sm font-semibold flex items-center gap-2 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-lg btn-press">
            {sending ? 'Sending...' : (editingDraft ? 'Update' : (replyToMemuId ? 'Reply' : (showSchedulePicker && scheduledDate ? 'Schedule' : 'Send')))}
            <Send size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes composeUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes mobileCompose { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-compose-up { animation: composeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-mobile-compose { animation: mobileCompose 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
      `}</style>
    </>
  );
}