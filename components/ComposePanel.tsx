'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Mic, Calendar as CalendarIcon, Mail, Maximize2, Minimize2, Users, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';


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

// Mock handles list
const availableHandles = [
  '@aisha.memu',
  '@david.memu',
  '@zara.memu',
  '@tobias.memu',
  '@amara.memu',
  '@nairobi-design.memu',
  '@mum.memu',
  '@maria.memu',
  '@kofi.memu',
];

export default function ComposePanel({ isOpen, onClose, onSend, prefilledTo, editingDraft }: ComposePanelProps) {
  const [to, setTo] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [nature, setNature] = useState('decide');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHandleSelector, setShowHandleSelector] = useState(false);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking'>>({});
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  const { showToast } = useToast();
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  // Validate email/handle format
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

  // Populate form when editing a draft or using prefilled handle
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
    setIsScheduled(false);
    setScheduleDate('');
    setScheduleTime('');
  }, [editingDraft, prefilledTo]);

  // Focus management when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        toInputRef.current?.focus();
      }, 100);
    }
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

  const handleSelectHandle = (handle: string) => {
    if (!to.includes(handle)) {
      setTo([...to, handle]);
      checkAndSetValidation(handle);
    }
    setShowHandleSelector(false);
    setTimeout(() => toInputRef.current?.focus(), 0);
  };

  const handleRemoveHandle = (handle: string) => {
    setTo(to.filter(h => h !== handle));
    const newValidation = { ...validationStatus };
    delete newValidation[handle];
    setValidationStatus(newValidation);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHandle();
    }
  };

  const isEmailAddress = (address: string) => {
    return address.includes('@') && !address.endsWith('.memu');
  };

  const getValidationIcon = (address: string) => {
    const status = validationStatus[address];
    if (status === 'valid') return <CheckCircle size={12} className="text-[#10b981]" />;
    if (status === 'invalid') return <AlertCircle size={12} className="text-[#dc2626]" />;
    if (status === 'checking') return <div className="w-3 h-3 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />;
    return null;
  };

  const handleSend = async () => {
    if (to.length === 0) {
      showToast('Please add at least one recipient', 'error');
      return;
    }
    
    const invalidAddresses = to.filter(addr => validationStatus[addr] === 'invalid');
    if (invalidAddresses.length > 0) {
      showToast(`Invalid addresses: ${invalidAddresses.join(', ')}`, 'error');
      return;
    }
    
    if (!subject.trim()) {
      showToast('Please add a subject', 'error');
      return;
    }
    if (!body.trim()) {
      showToast('Please write your memu', 'error');
      return;
    }
    
    // Handle scheduled memu
    if (isScheduled && scheduleDate && scheduleTime) {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      
      if (scheduledDateTime <= new Date()) {
        showToast('Please select a future date and time', 'error');
        return;
      }
      
      // Save to scheduled memus
      const scheduledMemus = JSON.parse(localStorage.getItem('scheduled_memus') || '[]');
      scheduledMemus.push({
        id: Date.now(),
        to,
        subject,
        nature,
        body,
        scheduledFor: scheduledDateTime.toISOString(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('scheduled_memus', JSON.stringify(scheduledMemus));
      
      showToast(`📅 Memu scheduled for ${scheduledDateTime.toLocaleString()}`, 'success');
      onClose();
      return;
    }
    
    setSending(true);
    
    let currentUser = { name: 'memu User', handle: '@user.memu' };
    const savedUser = localStorage.getItem('memu_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      currentUser = { name: parsed.name, handle: parsed.handle };
    }
    
    const emailRecipients = to.filter(t => isEmailAddress(t));
    const memuRecipients = to.filter(t => !isEmailAddress(t));
    
    for (const email of emailRecipients) {
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: subject,
            body: { text: body, nature: nature },
            fromName: currentUser.name,
            fromHandle: currentUser.handle,
          }),
        });
      } catch (err) {
        console.error(`Failed to send to ${email}:`, err);
      }
    }
    
    if (memuRecipients.length > 0) {
      console.log('Internal memu recipients:', memuRecipients);
    }
    
    onSend({ to, subject, nature, body });
    showToast(`✨ Memu sent to ${to.join(', ')}`, 'success');
    
    setTo([]);
    setSubject('');
    setNature('decide');
    setBody('');
    setToInput('');
    setValidationStatus({});
    setSending(false);
    setIsScheduled(false);
    setScheduleDate('');
    setScheduleTime('');
    onClose();
  };

  const isEmail = (handle: string) => {
    return handle.includes('@') && !handle.endsWith('.memu');
  };

  return (
    <div className={`fixed bottom-4 md:bottom-6 right-4 md:right-6 bg-white border border-[#e8e7e3] rounded-xl shadow-2xl z-50 flex flex-col transition-all duration-300 ${
      isFullscreen 
        ? 'inset-0 w-auto h-auto m-0 rounded-none' 
        : 'w-[calc(100%-32px)] md:w-[560px] max-w-[560px]'
    }`} style={{ animation: 'composeUp 0.22s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* Header */}
      <div className="px-4 md:px-5 py-3 md:py-4 pb-2 md:pb-3 border-b border-[#f2f1ee] flex items-center justify-between">
        <h3 className="font-['Playfair_Display'] text-base italic text-[#0f0f0f]">
          {editingDraft ? 'Edit draft' : (isScheduled ? 'Schedule Memu' : 'New memu')}
        </h3>
        <div className="flex gap-1.5">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-7 h-7 border border-[#e8e7e3] rounded-md flex items-center justify-center hover:border-[#777] transition"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button onClick={onClose} className="w-7 h-7 border border-[#e8e7e3] rounded-md flex items-center justify-center hover:border-[#777] transition">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* TO Field */}
      <div className="px-4 md:px-5 py-2 border-b border-[#f2f1ee] flex items-start gap-2">
        <span className="text-[11.5px] font-medium text-[#777] w-10 md:w-12 pt-2.5">TO</span>
        <div className="flex-1 flex-wrap gap-1.5 py-2">
          {to.map(handle => {
            const isValid = validationStatus[handle] === 'valid';
            const isInvalid = validationStatus[handle] === 'invalid';
            return (
              <div 
                key={handle} 
                className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full gap-1.5 transition ${
                  isEmail(handle) 
                    ? isValid ? 'bg-[#d1fae5] text-[#059669]' : isInvalid ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#d1fae5] text-[#059669]'
                    : isValid ? 'bg-[#ede9fe] text-[#4f46e5]' : isInvalid ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#f2f1ee] text-[#4f46e5]'
                }`}
              >
                <span className="truncate max-w-[120px] md:max-w-none">{handle}</span>
                {getValidationIcon(handle)}
                {isEmail(handle) && <Mail size={10} className={isValid ? 'text-[#059669]' : isInvalid ? 'text-[#dc2626]' : 'text-[#059669]'} />}
                <button onClick={() => handleRemoveHandle(handle)} className="opacity-60 hover:opacity-100 ml-0.5">✕</button>
              </div>
            );
          })}
          <div className="inline-flex gap-1 flex-wrap">
            <input
              ref={toInputRef}
              type="text"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="+ add handle, email"
              className="flex-1 min-w-[100px] text-[13.5px] outline-none bg-transparent"
            />
            <button
              onClick={handleAddHandle}
              className="px-2 py-1 text-[11px] bg-[#4f46e5] text-white rounded-md hover:bg-[#4338ca] transition whitespace-nowrap"
            >
              Add
            </button>
            <button
              onClick={() => setShowHandleSelector(!showHandleSelector)}
              className="px-2 py-1 text-[11px] bg-[#f2f1ee] text-[#777] rounded-md hover:bg-[#e8e7e3] transition"
              title="Select from contacts"
            >
              <Users size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Handle Selector Dropdown */}
      {showHandleSelector && (
        <div className="px-4 md:px-5 py-2 border-b border-[#f2f1ee] bg-[#fafaf8]">
          <div className="text-[10px] font-medium text-[#777] uppercase mb-2">Select a handle</div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {availableHandles.filter(h => !to.includes(h)).map(handle => (
              <button
                key={handle}
                onClick={() => handleSelectHandle(handle)}
                className="text-xs px-2.5 py-1 rounded-full bg-white border border-[#e8e7e3] text-[#4f46e5] hover:border-[#4f46e5] transition"
              >
                {handle}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SUBJECT Field */}
      <div className="px-4 md:px-5 py-2.5 border-b border-[#f2f1ee] flex items-center gap-2">
        <span className="text-[11.5px] font-medium text-[#777] w-10 md:w-12">SUBJECT</span>
        <input
          ref={subjectInputRef}
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What is this about?"
          className="flex-1 text-[13.5px] outline-none bg-transparent"
        />
      </div>

      {/* Nature Selector */}
      <div className="px-4 md:px-5 py-3 border-b border-[#f2f1ee] flex gap-1.5 flex-wrap">
        {natureOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setNature(opt.id)}
            className={`text-[11px] font-medium px-3 py-1 rounded-full transition ${
              nature === opt.id
                ? opt.color + ' border-transparent'
                : 'bg-white text-[#777] border border-[#e8e7e3] hover:border-[#777]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-4 md:p-5 min-h-[120px] md:min-h-[160px]">
        <textarea
          ref={bodyTextareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your memu here — no formalities required."
          className="w-full min-h-[100px] md:min-h-[130px] text-[13.5px] leading-relaxed outline-none resize-none bg-transparent font-['DM_Sans']"
        />
      </div>

      {/* Footer */}
      <div className="px-4 md:px-5 py-3 border-t border-[#f2f1ee] flex items-center justify-between">
        <div className="flex gap-1.5">
          <button className="w-8 h-8 border border-[#e8e7e3] rounded-md flex items-center justify-center text-[#777] hover:border-[#777] hover:text-[#0f0f0f] transition">
            <Paperclip size={13} />
          </button>
          <button className="w-8 h-8 border border-[#e8e7e3] rounded-md flex items-center justify-center text-[#777] hover:border-[#777] hover:text-[#0f0f0f] transition">
            <Mic size={13} />
          </button>
          
          {/* Schedule Button */}
          <div className="relative">
            <button
              onClick={() => setIsScheduled(!isScheduled)}
              className={`w-8 h-8 border rounded-md flex items-center justify-center transition ${
                isScheduled 
                  ? 'border-[#4f46e5] bg-[#ede9fe] text-[#4f46e5]' 
                  : 'border-[#e8e7e3] text-[#777] hover:border-[#777]'
              }`}
              title="Schedule for later"
            >
              <CalendarIcon size={13} />
            </button>
            
            <button
  onClick={() => {
    const template = {
      name: subject || 'Untitled Template',
      to: to,
      subject: subject,
      nature: nature,
      body: body,
      category: 'general',
    };
    const templates = JSON.parse(localStorage.getItem('memu_templates') || '[]');
    templates.unshift({
      id: Date.now().toString(),
      ...template,
      isStarred: false,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('memu_templates', JSON.stringify(templates));
    showToast('✨ Saved as template', 'success');
  }}
  className="w-8 h-8 border border-[#e8e7e3] rounded-md flex items-center justify-center text-[#777] hover:border-[#777] hover:text-[#4f46e5] transition"
  title="Save as template"
>
  <FileText size={13} />
</button>
            {isScheduled && (
              <div className="absolute bottom-full left-0 mb-2 p-3 bg-white rounded-xl shadow-lg border border-[#e8e7e3] z-50 w-64">
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#777] block mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-1.5 border border-[#e8e7e3] rounded-lg text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#777] block mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#e8e7e3] rounded-lg text-[13px]"
                    />
                  </div>
                  <div className="text-[10px] text-[#aaa] text-center">
                    {scheduleDate && scheduleTime ? (
                      `Sending on ${new Date(scheduleDate).toLocaleDateString()} at ${scheduleTime}`
                    ) : (
                      'Select date and time'
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={handleSend}
          disabled={sending}
          className="bg-[#0f0f0f] text-white rounded-md px-3 md:px-5 py-1.5 md:py-2 text-[12px] md:text-[13px] font-medium flex items-center gap-1.5 hover:bg-[#2a2a2a] hover:-translate-y-0.5 transition disabled:opacity-50"
        >
          {sending ? 'Sending...' : (isScheduled ? 'Schedule' : (editingDraft ? 'Update' : 'Send'))}
          {!isScheduled && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round"/>
            </svg>
          )}
          {isScheduled && <Clock size={13} />}
        </button>
      </div>

      <style>{`
        @keyframes composeUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}