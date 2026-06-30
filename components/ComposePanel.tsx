'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Paperclip,
  Mic,
  Calendar as CalendarIcon,
  Send,
  Loader2,
  Clock,
  UserPlus,
  Check,
  PenLine,
  ChevronLeft,
  Users,
  Megaphone,
  Layers,
  Maximize2,
  Minimize2,
  AtSign,
  Mail as MailIcon,
  AlertCircle,
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

  // ============================================
  // 🔍 DEBUG-INSTRUMENTED SEND HANDLER
  // ============================================
  const handleSend = async () => {
    console.log('🚀 [handleSend] ===== STARTED =====');
    triggerHaptic('success');

    // --- Validation ---
    console.log('📋 [handleSend] Recipients:', handleManagement.to);
    if (handleManagement.to.length === 0) {
      console.error('❌ [handleSend] No recipients provided');
      showToast('Please add at least one recipient', 'error');
      return;
    }

    const invalidAddresses = handleManagement.to.filter(
      addr => handleManagement.validationStatus[addr] === 'invalid'
    );
    if (invalidAddresses.length > 0) {
      console.error('❌ [handleSend] Invalid addresses:', invalidAddresses);
      showToast(`Invalid addresses: ${invalidAddresses.join(', ')}`, 'error');
      return;
    }

    if (!subject.trim()) {
      console.error('❌ [handleSend] Subject is empty');
      showToast('Please add a subject', 'error');
      return;
    }
    if (!body.trim()) {
      console.error('❌ [handleSend] Body is empty');
      showToast('Please write your memu', 'error');
      return;
    }

    console.log('✅ [handleSend] Validation passed. Subject:', subject.trim());

    setSending(true);
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ [handleSend] Auth error or no user:', userError);
      showToast('You must be signed in', 'error');
      setSending(false);
      return;
    }
    console.log('✅ [handleSend] Authenticated as user:', user.id);

    // --- Schedule handling ---
    let scheduledFor = null;
    if (showSchedulePicker && scheduledDate) {
      const [year, month, day] = scheduledDate.split('-');
      const [hour, minute] = scheduledTime.split(':');
      scheduledFor = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute)
      ).toISOString();
      if (new Date(scheduledFor) <= new Date()) {
        console.error('❌ [handleSend] Scheduled time is in the past');
        showToast('Scheduled time must be in the future', 'error');
        setSending(false);
        return;
      }
      console.log('⏰ [handleSend] Scheduled for:', scheduledFor);
    }

    let sentCount = 0, pendingCount = 0, failedCount = 0;

    for (const recipient of handleManagement.to) {
      try {
        console.log(`\n📤 [handleSend] --- Processing recipient: "${recipient}" ---`);
        const handleName = recipient
  .replace('@', '')
  .replace('.space', '');       const isSpace = recipient.endsWith('.space');
        const isEmail = handleManagement.isEmail(recipient);

        console.log(` 🔍 Parsed: handleName="${handleName}", isSpace=${isSpace}, isEmail=${isEmail}`);

        let recipientId = null;
        if (!isSpace) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', handleName)
            .maybeSingle();

          if (profileErr) {
            console.warn('⚠️ [handleSend] Profile lookup error:', profileErr);
          }
          recipientId = profile?.id || null;
          console.log(` 👤 Profile lookup result: recipientId=${recipientId}`);
        }

        const memoStatus = recipientId
          ? scheduledFor
            ? 'scheduled'
            : 'sent'
          : 'pending';
        console.log(` 📊 Insert payload:`, {
          sender_id: user.id,
          recipient_id: recipientId,
          recipient_email: isSpace ? null : recipient,
          subject: subject.trim(),
          nature,
          status: memoStatus,
          scheduled_for: scheduledFor,
          is_space_post: isSpace,
        });

        const { data: insertedMemu, error: dbError } = await supabase
          .from('memus')
          .insert({
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
          })
          .select('id')
          .single();

        if (dbError) {
          console.error('❌ [handleSend] DB INSERT FAILED:', dbError);
          console.error('   Error details:', {
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint,
            code: dbError.code,
          });
          showToast(`DB Error: ${dbError.message}`, 'error');
          failedCount++;
          continue;
        }

        console.log('✅ [handleSend] DB INSERT SUCCESS. Memu ID:', insertedMemu?.id);

        // Handle reply tracking
        if (replyToMemuId) {
          const { error: replyErr } = await supabase
            .from('memus')
            .update({ replied_at: new Date().toISOString(), is_replied: true })
            .eq('id', replyToMemuId);
          if (replyErr) {
            console.warn('⚠️ [handleSend] Reply tracking failed:', replyErr);
          } else {
            console.log('✅ [handleSend] Reply tracking updated for:', replyToMemuId);
          }
        }

        // Handle email sending
        if (recipientId && isEmail && !scheduledFor) {
          console.log('📧 [handleSend] Sending email to:', recipient);
          try {
            const res = await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: recipient,
                subject: subject.trim(),
                body: { text: body.trim(), nature: nature },
                memuId: insertedMemu.id,
              }),
            });
            if (res.ok) {
              console.log('✅ [handleSend] Email sent successfully');
              sentCount++;
            } else {
              const errText = await res.text();
              console.error('❌ [handleSend] Email API failed:', res.status, errText);
              failedCount++;
            }
          } catch (emailErr) {
            console.error('❌ [handleSend] Email fetch error:', emailErr);
            failedCount++;
          }
        } else if (recipientId && !scheduledFor) {
          console.log('✅ [handleSend] Counted as sent (in-app recipient)');
          sentCount++;
        } else if (!scheduledFor) {
          console.log('⏳ [handleSend] Counted as pending (unknown recipient)');
          pendingCount++;
        } else {
          console.log('⏰ [handleSend] Counted as scheduled');
        }
      } catch (err) {
        console.error('❌ [handleSend] Unexpected error in recipient loop:', err);
        failedCount++;
      }
    }

    // --- Final summary ---
    const messages: string[] = [];
    if (sentCount > 0) messages.push(`${sentCount} sent`);
    if (pendingCount > 0) messages.push(`${pendingCount} pending`);
    if (failedCount > 0) messages.push(`${failedCount} failed`);
    if (scheduledFor) messages.unshift(`Scheduled for ${new Date(scheduledFor).toLocaleString()}`);

    console.log(`\n📊 [handleSend] ===== SUMMARY =====`);
    console.log(`   Sent: ${sentCount}, Pending: ${pendingCount}, Failed: ${failedCount}`);
    console.log('🚀 [handleSend] ===== FINISHED =====\n');

    showToast(
      messages.join(' • ') || 'Sent!',
      failedCount > 0 && sentCount === 0 ? 'error' : 'success'
    );
    onSend({ to: handleManagement.to, subject, nature, body });

    // Reset form
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

    // Notify other panels to refresh
    window.dispatchEvent(new CustomEvent('refreshPanel'));
  };

  const getValidationIcon = (address: string) => {
    const status = handleManagement.validationStatus[address];
    if (status === 'valid') return <Check size={14} strokeWidth={2.5} className="text-emerald-600" />;
    if (status === 'invalid') return <AlertCircle size={14} strokeWidth={2.5} className="text-rose-600" />;
    if (status === 'checking') return <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    return null;
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <>
      {/* ================= MOBILE FULL-SCREEN COMPOSE ================= */}
      <div className="fixed inset-0 bg-white z-50 flex flex-col lg:hidden animate-mobile-compose h-screen max-h-screen overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100/60 flex items-center justify-between bg-white/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-gray-100/80 transition-all btn-press"
            >
              <ChevronLeft size={20} strokeWidth={2.5} className="text-gray-700" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                <PenLine size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 tracking-tight">
                {editingDraft ? 'Edit draft' : replyToMemuId ? 'Reply' : 'New memu'}
              </h3>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={sending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-5 py-2 text-sm font-medium flex items-center gap-1.5 hover:shadow-md transition-all disabled:opacity-50 shadow-sm btn-press"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
            {sending ? 'Sending' : showSchedulePicker && scheduledDate ? 'Schedule' : 'Send'}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-20">
          {/* TO Field */}
          <div className="py-4 border-b border-gray-100/60">
            <div className="flex items-start gap-3">
              <span className="text-xs font-semibold text-gray-500 w-10 pt-2 tracking-wide">To</span>
              <div className="flex-1 flex flex-wrap gap-1.5 py-1">
                {handleManagement.to.map((handle) => (
                  <div
                    key={handle}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 transition ${
                      handleManagement.isEmail(handle)
                        ? handleManagement.validationStatus[handle] === 'valid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        : handleManagement.validationStatus[handle] === 'valid'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        : 'bg-gray-100 text-blue-700 border border-gray-200/60'
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
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={handleManagement.handleAddHandle}
                className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:shadow-md transition btn-press"
              >
                Add
              </button>
              <button
                onClick={() => setShowHandleSelector(!showHandleSelector)}
                className="px-4 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition btn-press flex items-center gap-1.5"
              >
                <Users size={14} strokeWidth={2.5} /> Handles
              </button>
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="px-4 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition btn-press flex items-center gap-1.5"
              >
                <Megaphone size={14} strokeWidth={2.5} /> Broadcast
              </button>
              <button
                onClick={() => setShowGroupModal(true)}
                className="px-4 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition btn-press flex items-center gap-1.5"
              >
                <Layers size={14} strokeWidth={2.5} /> Group
              </button>
            </div>
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

          {/* Unsaved handle prompt */}
          {handleManagement.unsavedHandle && (
            <div className="py-3 border-b border-gray-100/60 bg-amber-50/50 animate-fadeIn">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <UserPlus size={14} strokeWidth={2.5} />
                  <span className="text-xs">
                    Save <strong>@{handleManagement.unsavedHandle}.memu</strong>?
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleManagement.setUnsavedHandle(null)}
                    className="px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-amber-100 rounded-full transition btn-press"
                  >
                    Later
                  </button>
                  <button
                    onClick={() => handleManagement.handleSaveUnsavedHandle()}
                    disabled={handleManagement.isSavingHandle}
                    className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-full transition disabled:opacity-50 shadow-sm btn-press"
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

          {/* Subject */}
          <div className="py-3 border-b border-gray-100/60">
            <label className="text-xs font-semibold text-gray-500 tracking-wide block mb-1">Subject</label>
            <input
              ref={subjectInputRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              className="w-full text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400 min-h-[44px]"
            />
          </div>

          {/* Nature selector */}
          <div className="py-3 border-b border-gray-100/60">
            <NatureSelector selectedNature={nature} onChange={setNature} />
          </div>

          {/* Body */}
          <div className="py-4">
            <label className="text-xs font-semibold text-gray-500 tracking-wide block mb-2">Message</label>
            <textarea
              ref={bodyTextareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your memu here — no formalities required."
              className="w-full min-h-[160px] text-sm leading-relaxed outline-none resize-none bg-transparent text-gray-800 placeholder:text-gray-400"
            />
          </div>

          {/* Attachments & Voice */}
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

          {/* Schedule picker */}
          {showSchedulePicker && (
            <div ref={schedulePickerRef} className="mt-4 p-4 bg-gray-50/80 rounded-2xl border border-gray-200/60 shadow-sm animate-fade-in-scale">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} strokeWidth={2.5} className="text-blue-600" />
                <span className="text-xs font-semibold text-gray-500 tracking-wide">Schedule delivery</span>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={minDate}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div
          className="px-4 py-3 border-t border-gray-100/60 bg-white flex items-center justify-around flex-shrink-0"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button
            onClick={handleAttachmentClick}
            disabled={uploadingAttachment}
            className="flex flex-col items-center gap-1 text-gray-500 btn-press disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100/80 flex items-center justify-center hover:bg-gray-200/80 transition">
              {uploadingAttachment ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} strokeWidth={2.5} />}
            </div>
            <span className="text-[10px] font-semibold">Attach</span>
          </button>
          <button
            onClick={voiceRecording.isRecording ? voiceRecording.stopRecording : voiceRecording.startRecording}
            className={`flex flex-col items-center gap-1 btn-press ${voiceRecording.isRecording ? 'text-rose-600' : 'text-gray-500'}`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                voiceRecording.isRecording ? 'bg-rose-100/80 animate-pulse' : 'bg-gray-100/80 hover:bg-gray-200/80'
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
            className={`flex flex-col items-center gap-1 btn-press ${showSchedulePicker ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                showSchedulePicker ? 'bg-blue-50/80' : 'bg-gray-100/80 hover:bg-gray-200/80'
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
        className={`hidden lg:flex fixed bg-white/95 backdrop-blur-xl border border-gray-200/40 shadow-2xl z-50 flex-col transition-all duration-300 animate-compose-up overflow-hidden ${
          isFullscreen
            ? 'inset-0 w-auto h-auto m-0 rounded-none'
            : 'bottom-6 right-6 w-[600px] max-w-[600px] h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] rounded-3xl'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100/60 flex items-center justify-between flex-shrink-0 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <PenLine size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
              {editingDraft ? 'Edit draft' : replyToMemuId ? 'Reply to memu' : 'New memu'}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-9 h-9 border border-gray-200/60 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50/80 transition text-gray-500 btn-press"
            >
              {isFullscreen ? <Minimize2 size={15} strokeWidth={2.5} /> : <Maximize2 size={15} strokeWidth={2.5} />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 border border-gray-200/60 rounded-xl flex items-center justify-center hover:border-gray-300 hover:bg-gray-50/80 transition text-gray-500 btn-press"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          {/* TO Field */}
          <div className="px-6 py-4 border-b border-gray-100/60">
            <div className="flex items-start gap-3">
              <span className="text-xs font-semibold text-gray-500 w-14 pt-2 tracking-wide">To</span>
              <div className="flex-1 flex flex-wrap gap-1.5 py-1">
                {handleManagement.to.map((handle) => (
                  <div
                    key={handle}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 transition ${
                      handleManagement.isEmail(handle)
                        ? handleManagement.validationStatus[handle] === 'valid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        : handleManagement.validationStatus[handle] === 'valid'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        : 'bg-gray-100 text-blue-700 border border-gray-200/60'
                    }`}
                  >
                    <span className="truncate max-w-[140px]">{handle}</span>
                    {getValidationIcon(handle)}
                    <button
                      onClick={() => handleManagement.handleRemoveHandle(handle)}
                      className="opacity-60 hover:opacity-100 ml-0.5 btn-press"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex flex-1 gap-2 flex-wrap items-center">
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
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap items-center">
              <button
                onClick={handleManagement.handleAddHandle}
                className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:shadow-md transition btn-press"
              >
                Add
              </button>
              <button
                onClick={() => setShowHandleSelector(!showHandleSelector)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition btn-press flex items-center gap-1"
              >
                <Users size={14} strokeWidth={2.5} /> Handles
              </button>
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition btn-press flex items-center gap-1"
              >
                <Megaphone size={14} strokeWidth={2.5} /> Broadcast
              </button>
              <button
                onClick={() => setShowGroupModal(true)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition btn-press flex items-center gap-1"
              >
                <Layers size={14} strokeWidth={2.5} /> Group
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
          </div>

          {/* Unsaved handle prompt */}
          {handleManagement.unsavedHandle && (
            <div className="px-6 py-3 border-b border-gray-100/60 bg-amber-50/50 animate-fadeIn">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <UserPlus size={14} strokeWidth={2.5} />
                  <span className="text-xs">
                    You haven't saved <strong>@{handleManagement.unsavedHandle}.memu</strong> to your contacts yet.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleManagement.setUnsavedHandle(null)}
                    className="px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-amber-100 rounded-full transition btn-press"
                  >
                    No
                  </button>
                  <button
                    onClick={() => handleManagement.handleSaveUnsavedHandle()}
                    disabled={handleManagement.isSavingHandle}
                    className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-full transition disabled:opacity-50 shadow-sm btn-press"
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

          {/* Subject */}
          <div className="px-6 py-3 border-b border-gray-100/60 flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 w-14 tracking-wide">Subject</span>
            <input
              ref={subjectInputRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Nature selector */}
          <div className="px-6 py-3 border-b border-gray-100/60">
            <NatureSelector selectedNature={nature} onChange={setNature} />
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <textarea
              ref={bodyTextareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your memu here — no formalities required."
              className="w-full min-h-[200px] text-sm leading-relaxed outline-none resize-none bg-transparent text-gray-800 placeholder:text-gray-400"
            />
          </div>

          {/* Attachments & Voice */}
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

          {/* Schedule picker */}
          {showSchedulePicker && (
            <div ref={schedulePickerRef} className="mx-6 mb-4 p-4 bg-gray-50/80 rounded-2xl border border-gray-200/60 shadow-sm animate-fade-in-scale">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} strokeWidth={2.5} className="text-blue-600" />
                <span className="text-xs font-semibold text-gray-500 tracking-wide">Schedule delivery</span>
              </div>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={minDate}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100/60 flex items-center justify-between flex-shrink-0 bg-white/50 backdrop-blur-sm">
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <button
              onClick={handleAttachmentClick}
              disabled={uploadingAttachment}
              className="w-10 h-10 border border-gray-200/60 rounded-xl flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50/80 transition disabled:opacity-50 btn-press"
              title="Attach file"
            >
              {uploadingAttachment ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} strokeWidth={2.5} />}
            </button>
            <button
              onClick={voiceRecording.isRecording ? voiceRecording.stopRecording : voiceRecording.startRecording}
              className={`w-10 h-10 border rounded-xl flex items-center justify-center transition btn-press ${
                voiceRecording.isRecording
                  ? 'bg-rose-50 text-rose-600 border-rose-200/60 animate-pulse'
                  : 'border-gray-200/60 text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50/80'
              }`}
              title={voiceRecording.isRecording ? 'Stop recording' : 'Record voice memo'}
            >
              <Mic size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setShowSchedulePicker(!showSchedulePicker)}
              className={`w-10 h-10 border rounded-xl flex items-center justify-center transition btn-press ${
                showSchedulePicker
                  ? 'bg-blue-50 text-blue-600 border-blue-200/60'
                  : 'border-gray-200/60 text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50/80'
              }`}
              title="Schedule for later"
            >
              <CalendarIcon size={15} strokeWidth={2.5} />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={sending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium flex items-center gap-2 hover:shadow-md transition disabled:opacity-50 shadow-sm btn-press"
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
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </>
  );
}