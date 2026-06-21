'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X, Paperclip, Mic, Calendar as CalendarIcon, Mail,
  Maximize2, Minimize2, Users, CheckCircle, AlertCircle,
  Send, Loader2, Clock, UserPlus, Check,
  PenLine, Megaphone, Layers, ChevronLeft
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { triggerHaptic } from '@/lib/haptics';

// Import modular components
import HandleSelector from './compose/HandleSelector';
import NatureSelector from './compose/NatureSelector';
import AttachmentsDisplay from './compose/AttachmentsDisplay';
import VoiceRecorder from './compose/VoiceRecorder';
import BroadcastModal from './compose/BroadcastModal';
import GroupModal from './compose/GroupModal';

// Import hooks
import { useVoiceRecording } from './compose/hooks/useVoiceRecording';
import { useHandleManagement } from './compose/hooks/useHandleManagement';

// Import types
import { ComposePanelProps, Attachment, Space } from './compose/types';

export default function ComposePanel({
  isOpen,
  onClose,
  onSend,
  prefilledTo,
  editingDraft,
  replyToMemuId,
}: ComposePanelProps) {
  // Core State
  const [subject, setSubject] = useState('');
  const [nature, setNature] = useState('decide');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Schedule & Attachments
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Handle Selector
  const [showHandleSelector, setShowHandleSelector] = useState(false);

  // Hooks
  const voiceRecording = useVoiceRecording();
  const handleManagement = useHandleManagement();
  const { showToast } = useToast();

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const schedulePickerRef = useRef<HTMLDivElement>(null);

  // Initialize from props
  useEffect(() => {
    if (editingDraft) {
      handleManagement.setTo(editingDraft.toHandles || editingDraft.to || []);
      setSubject(editingDraft.subject || '');
      setNature(editingDraft.nature || 'decide');
      setBody(editingDraft.body || '');
    } else if (prefilledTo && prefilledTo.length > 0) {
      handleManagement.setTo(prefilledTo);
      setSubject('');
      setNature('decide');
      setBody('');
    } else {
      handleManagement.reset();
      setSubject('');
      setNature('decide');
      setBody('');
    }
  }, [editingDraft, prefilledTo]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => toInputRef.current?.focus(), 100);
  }, [isOpen]);

  // Close schedule picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (schedulePickerRef.current && !schedulePickerRef.current.contains(e.target as Node)) {
        setShowSchedulePicker(false);
      }
    };
    if (showSchedulePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSchedulePicker]);

  // File attachment handlers
  const handleAttachmentClick = () => {
    triggerHaptic('light');
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
      console.error(err);
      showToast('Failed to upload file', 'error');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    triggerHaptic('light');
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Voice memo handlers
  const handleVoiceMemoUpload = async () => {
    const result = await voiceRecording.uploadVoiceMemo();
    if (result) {
      setAttachments(prev => [...prev, result]);
    }
  };

  // Broadcast handler
  const handleApplyBroadcast = (recipients: string[]) => {
    handleManagement.setTo([...handleManagement.to, ...recipients]);
    setShowBroadcastModal(false);
    showToast(`Added ${recipients.length} recipients`, 'success');
  };

  // Group handler
  const handleApplyGroup = (space: Space) => {
    const groupHandle = `@${space.name.toLowerCase().replace(/\s+/g, '-')}.space`;
    if (!handleManagement.to.includes(groupHandle)) {
      handleManagement.setTo([...handleManagement.to, groupHandle]);
    }
    setShowGroupModal(false);
    showToast(`Posting to ${space.name}`, 'success');
  };

  // Send handler
  const handleSend = async () => {
    triggerHaptic('success');
    if (handleManagement.to.length === 0) {
      showToast('Please add at least one recipient', 'error');
      return;
    }
    const invalidAddresses = handleManagement.to.filter(addr => handleManagement.validationStatus[addr] === 'invalid');
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

    setSending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('You must be signed in', 'error');
      setSending(false);
      return;
    }

    let scheduledFor = null;
    if (showSchedulePicker && scheduledDate) {
      const [year, month, day] = scheduledDate.split('-');
      const [hour, minute] = scheduledTime.split(':');
      scheduledFor = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).toISOString();
      if (new Date(scheduledFor) <= new Date()) {
        showToast('Scheduled time must be in the future', 'error');
        setSending(false);
        return;
      }
    }

    let sentCount = 0, pendingCount = 0, failedCount = 0;
    for (const recipient of handleManagement.to) {
      try {
        const handleName = recipient.replace('@', '').replace('.memu', '').replace('.space', '');
        const isSpace = recipient.endsWith('.space');

        let recipientId = null;
        if (!isSpace) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', handleName)
            .maybeSingle();
          recipientId = profile?.id || null;
        }

        const memoStatus = recipientId ? (scheduledFor ? 'scheduled' : 'sent') : 'pending';

        const { error: dbError } = await supabase.from('memus').insert({
          sender_id: user.id,
          recipient_id: recipientId,
          recipient_email: isSpace ? null : recipient,
          subject: subject.trim(),
          body: body.trim(),
          nature: nature,
          status: memoStatus,
          scheduled_for: scheduledFor,
          attachments: attachments,
          is_space_post: isSpace,
        });
        if (dbError) throw dbError;
        if (replyToMemuId) {
          await supabase
            .from('memus')
            .update({ replied_at: new Date().toISOString() })
            .eq('id', replyToMemuId);
        }

        if (recipientId && handleManagement.isEmail(recipient) && !scheduledFor) {
          try {
            const res = await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: recipient, subject: subject.trim(), body: { text: body.trim(), nature: nature } }),
            });
            if (res.ok) sentCount++;
            else failedCount++;
          } catch {
            failedCount++;
          }
        } else if (recipientId && !scheduledFor) {
          sentCount++;
        } else if (!scheduledFor) {
          pendingCount++;
        }
      } catch (err) {
        failedCount++;
      }
    }

    const messages: string[] = [];
    if (sentCount > 0) messages.push(`${sentCount} sent`);
    if (pendingCount > 0) messages.push(`${pendingCount} pending`);
    if (failedCount > 0) messages.push(`${failedCount} failed`);
    if (scheduledFor) messages.unshift(`Scheduled for ${new Date(scheduledFor).toLocaleString()}`);

    showToast(messages.join(' • '), failedCount > 0 && sentCount === 0 ? 'error' : 'success');
    onSend({ to: handleManagement.to, subject, nature, body });

    // Reset
    handleManagement.reset();
    setSubject('');
    setNature('decide');
    setBody('');
    setAttachments([]);
    setShowSchedulePicker(false);
    setScheduledDate('');
    setScheduledTime('09:00');
    setSending(false);
    onClose();
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const getValidationIcon = (address: string) => {
    const status = handleManagement.validationStatus[address];
    if (status === 'valid') return <CheckCircle size={14} strokeWidth={2.5} className="text-emerald-600" />;
    if (status === 'invalid') return <AlertCircle size={14} strokeWidth={2.5} className="text-rose-600" />;
    if (status === 'checking') return <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />;
    return null;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ================= MOBILE FULL-SCREEN COMPOSE ================= */}
      <div className="fixed inset-0 bg-white z-50 flex flex-col lg:hidden animate-mobile-compose h-screen max-h-screen overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all btn-press"
            >
              <ChevronLeft size={20} strokeWidth={2.5} className="text-gray-700" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow">
                <PenLine size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-serif text-base font-semibold text-gray-900">
                {editingDraft ? 'Edit draft' : replyToMemuId ? 'Reply' : 'New memu'}
              </h3>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={sending}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full px-5 py-2 text-sm font-semibold flex items-center gap-1.5 hover:shadow-lg transition-all disabled:opacity-50 shadow-md btn-press"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
            {sending ? 'Sending' : showSchedulePicker && scheduledDate ? 'Schedule' : 'Send'}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          {/* TO Field */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <span className="text-[10px] font-bold text-gray-400 w-10 pt-3 uppercase tracking-wider">TO</span>
              <div className="flex-1 flex flex-wrap gap-2 py-1">
                {handleManagement.to.map((handle) => (
                  <div
                    key={handle}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 transition animate-fade-in-scale ${
                      handleManagement.isEmail(handle)
                        ? handleManagement.validationStatus[handle] === 'valid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                        : handleManagement.validationStatus[handle] === 'valid'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-gray-100 text-indigo-700 border border-gray-200'
                    }`}
                  >
                    <span className="truncate max-w-[120px]">{handle}</span>
                    {getValidationIcon(handle)}
                    <button
                      onClick={() => handleManagement.handleRemoveHandle(handle)}
                      className="opacity-60 hover:opacity-100 ml-0.5 btn-press"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex flex-1 gap-2 flex-wrap items-center min-w-[120px]">
                  <input
                    ref={toInputRef}
                    type="text"
                    value={handleManagement.toInput}
                    onChange={(e) => handleManagement.setToInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleManagement.handleAddHandle();
                      }
                    }}
                    placeholder="@handle or email"
                    className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400 min-h-[44px]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap relative">
              <button
                onClick={handleManagement.handleAddHandle}
                className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-all btn-press"
              >
                Add
              </button>

              <div className="relative">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowHandleSelector(!showHandleSelector);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all btn-press flex items-center gap-1.5"
                >
                  <Users size={14} strokeWidth={2.5} /> Handles
                </button>
                <HandleSelector
                  isOpen={showHandleSelector}
                  onClose={() => setShowHandleSelector(false)}
                  onSelect={(profile) => {
                    handleManagement.handleSelectProfile(profile);
                    setShowHandleSelector(false);
                  }}
                  currentUserId={handleManagement.currentUserId}
                  position="left"
                />
              </div>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setShowBroadcastModal(true);
                }}
                className="px-4 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all btn-press flex items-center gap-1.5"
              >
                <Megaphone size={14} strokeWidth={2.5} /> Broadcast
              </button>
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setShowGroupModal(true);
                }}
                className="px-4 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all btn-press flex items-center gap-1.5"
              >
                <Layers size={14} strokeWidth={2.5} /> Group
              </button>
            </div>
          </div>

          {handleManagement.unsavedHandle && (
            <div className="px-4 py-3 border-b border-gray-100 bg-amber-50/50 animate-fadeIn">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-amber-800">
                  <UserPlus size={16} strokeWidth={2.5} />
                  <span className="text-xs">
                    Save <strong>@{handleManagement.unsavedHandle}.memu</strong>?
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleManagement.setUnsavedHandle(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-amber-100 rounded-full transition-all btn-press"
                  >
                    Later
                  </button>
                  <button
                    onClick={() => handleManagement.handleSaveUnsavedHandle()}
                    disabled={handleManagement.isSavingHandle}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-full transition-all disabled:opacity-50 shadow-sm btn-press"
                  >
                    {handleManagement.isSavingHandle ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} strokeWidth={2.5} />
                    )}{' '}
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-b border-gray-100">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              SUBJECT
            </label>
            <input
              ref={subjectInputRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              className="w-full text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400 min-h-[44px]"
            />
          </div>

          <div className="px-4 py-4 border-b border-gray-100">
            <NatureSelector selectedNature={nature} onChange={setNature} />
          </div>

          <div className="px-4 py-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              MESSAGE
            </label>
            <textarea
              ref={bodyTextareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your memu here — no formalities required."
              className="w-full min-h-[200px] text-sm leading-relaxed outline-none resize-none bg-transparent text-gray-800 placeholder:text-gray-400"
            />
          </div>

          <AttachmentsDisplay
            attachments={attachments}
            isUploading={uploadingAttachment}
            onRemove={removeAttachment}
          />

          <VoiceRecorder
            isRecording={voiceRecording.isRecording}
            recordingTime={voiceRecording.recordingTime}
            hasRecording={!!voiceRecording.audioBlob}
            isUploading={voiceRecording.isUploading}
            onStart={voiceRecording.startRecording}
            onStop={voiceRecording.stopRecording}
            onUpload={handleVoiceMemoUpload}
            onDiscard={voiceRecording.discardRecording}
            formatTime={voiceRecording.formatRecordingTime}
          />

          {showSchedulePicker && (
            <div ref={schedulePickerRef} className="mx-4 my-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-scale">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} strokeWidth={2.5} className="text-indigo-600" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Schedule delivery
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={minDate}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Action Bar */}
        <div
          className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-around flex-shrink-0"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button
            onClick={handleAttachmentClick}
            disabled={uploadingAttachment}
            className="flex flex-col items-center gap-1 text-gray-500 btn-press disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              {uploadingAttachment ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} strokeWidth={2.5} />}
            </div>
            <span className="text-[10px] font-semibold">Attach</span>
          </button>
          <button
            onClick={voiceRecording.isRecording ? voiceRecording.stopRecording : voiceRecording.startRecording}
            className={`flex flex-col items-center gap-1 btn-press ${voiceRecording.isRecording ? 'text-rose-600' : 'text-gray-500'}`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                voiceRecording.isRecording ? 'bg-rose-100 animate-pulse' : 'bg-gray-100'
              }`}
            >
              <Mic size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-semibold">{voiceRecording.isRecording ? 'Stop' : 'Voice'}</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowSchedulePicker(!showSchedulePicker);
            }}
            className={`flex flex-col items-center gap-1 btn-press ${showSchedulePicker ? 'text-indigo-600' : 'text-gray-500'}`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                showSchedulePicker ? 'bg-indigo-50' : 'bg-gray-100'
              }`}
            >
              <CalendarIcon size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-semibold">Schedule</span>
          </button>
        </div>
      </div>

      {/* ================= DESKTOP FLOATING PANEL ================= */}
      <div
        className={`hidden lg:flex fixed bg-white border border-gray-200/60 shadow-2xl z-50 flex-col transition-all duration-300 animate-compose-up overflow-hidden ${
          isFullscreen
            ? 'inset-0 w-auto h-auto m-0 rounded-none'
            : 'bottom-6 right-6 w-[600px] max-w-[600px] h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] rounded-3xl'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <PenLine size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-serif text-lg font-semibold text-gray-900">
              {editingDraft ? 'Edit draft' : replyToMemuId ? 'Reply to memu' : 'New memu'}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          <div className="px-6 py-3 border-b border-gray-100 flex items-start gap-3">
            <span className="text-xs font-bold text-gray-400 w-14 pt-3 uppercase tracking-wider">TO</span>
            <div className="flex-1 flex flex-wrap gap-2 py-2">
              {handleManagement.to.map((handle) => (
                <div
                  key={handle}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 transition animate-fade-in-scale ${
                    handleManagement.isEmail(handle)
                      ? handleManagement.validationStatus[handle] === 'valid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                      : handleManagement.validationStatus[handle] === 'valid'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-gray-100 text-indigo-700 border border-gray-200'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{handle}</span>
                  {getValidationIcon(handle)}
                  {handleManagement.isEmail(handle) && (
                    <Mail
                      size={12}
                      strokeWidth={2.5}
                      className={handleManagement.validationStatus[handle] === 'valid' ? 'text-emerald-600' : 'text-rose-600'}
                    />
                  )}
                  <button
                    onClick={() => handleManagement.handleRemoveHandle(handle)}
                    className="opacity-60 hover:opacity-100 ml-0.5 btn-press"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex flex-1 gap-2 flex-wrap items-center relative">
                <input
                  ref={toInputRef}
                  type="text"
                  value={handleManagement.toInput}
                  onChange={(e) => handleManagement.setToInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManagement.handleAddHandle();
                    }
                  }}
                  placeholder="+ add handle or email"
                  className="flex-1 min-w-[120px] text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
                />
                <button
                  onClick={handleManagement.handleAddHandle}
                  className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap btn-press"
                >
                  Add
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowHandleSelector(!showHandleSelector)}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-all btn-press flex items-center gap-1"
                  >
                    <Users size={14} strokeWidth={2.5} /> Handles
                  </button>
                  <HandleSelector
                    isOpen={showHandleSelector}
                    onClose={() => setShowHandleSelector(false)}
                    onSelect={(profile) => {
                      handleManagement.handleSelectProfile(profile);
                      setShowHandleSelector(false);
                    }}
                    currentUserId={handleManagement.currentUserId}
                    position="right"
                  />
                </div>

                <button
                  onClick={() => setShowBroadcastModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-all btn-press flex items-center gap-1"
                >
                  <Megaphone size={14} strokeWidth={2.5} /> Broadcast
                </button>
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-all btn-press flex items-center gap-1"
                >
                  <Layers size={14} strokeWidth={2.5} /> Group
                </button>
              </div>
            </div>
          </div>

          {handleManagement.unsavedHandle && (
            <div className="px-6 py-4 border-b border-gray-100 bg-amber-50/50 animate-fadeIn">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-amber-800">
                  <UserPlus size={16} strokeWidth={2.5} />
                  <span>
                    You haven't saved <strong>@{handleManagement.unsavedHandle}.memu</strong> to your contacts yet.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleManagement.setUnsavedHandle(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-amber-100 rounded-full transition-all btn-press"
                  >
                    No
                  </button>
                  <button
                    onClick={() => handleManagement.handleSaveUnsavedHandle()}
                    disabled={handleManagement.isSavingHandle}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-full transition-all disabled:opacity-50 shadow-sm btn-press"
                  >
                    {handleManagement.isSavingHandle ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} strokeWidth={2.5} />
                    )}{' '}
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 w-14 uppercase tracking-wider">SUBJECT</span>
            <input
              ref={subjectInputRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div className="px-6 py-4 border-b border-gray-100">
            <NatureSelector selectedNature={nature} onChange={setNature} />
          </div>

          <div className="p-6">
            <textarea
              ref={bodyTextareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your memu here — no formalities required."
              className="w-full min-h-[150px] text-sm leading-relaxed outline-none resize-none bg-transparent text-gray-800 placeholder:text-gray-400"
            />
          </div>

          <AttachmentsDisplay
            attachments={attachments}
            isUploading={uploadingAttachment}
            onRemove={removeAttachment}
          />

          <VoiceRecorder
            isRecording={voiceRecording.isRecording}
            recordingTime={voiceRecording.recordingTime}
            hasRecording={!!voiceRecording.audioBlob}
            isUploading={voiceRecording.isUploading}
            onStart={voiceRecording.startRecording}
            onStop={voiceRecording.stopRecording}
            onUpload={handleVoiceMemoUpload}
            onDiscard={voiceRecording.discardRecording}
            formatTime={voiceRecording.formatRecordingTime}
          />

          {showSchedulePicker && (
            <div ref={schedulePickerRef} className="mx-6 mb-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-scale">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} strokeWidth={2.5} className="text-indigo-600" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Schedule delivery
                </span>
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
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
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
              onClick={voiceRecording.isRecording ? voiceRecording.stopRecording : voiceRecording.startRecording}
              className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all btn-press ${
                voiceRecording.isRecording
                  ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={voiceRecording.isRecording ? 'Stop recording' : 'Record voice memo'}
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
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full px-6 py-2.5 text-sm font-semibold flex items-center gap-2 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-lg btn-press"
          >
            {sending
              ? 'Sending...'
              : editingDraft
              ? 'Update'
              : replyToMemuId
              ? 'Reply'
              : showSchedulePicker && scheduledDate
              ? 'Schedule'
              : 'Send'}
            <Send size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        onApply={handleApplyBroadcast}
      />
      <GroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onApply={handleApplyGroup}
        currentUserId={handleManagement.currentUserId}
      />

      <style>{`
        @keyframes composeUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes mobileCompose {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-compose-up { animation: composeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-mobile-compose { animation: mobileCompose 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
        .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 10px; }
      `}</style>
    </>
  );
}