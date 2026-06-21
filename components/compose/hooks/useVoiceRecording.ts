'use client';

import { useState, useRef, useEffect } from 'react';
import { triggerHaptic } from '@/lib/haptics';
import { useToast } from '@/contexts/ToastContext';

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    triggerHaptic('medium');
    
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Voice recording is not supported in this browser', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      showToast('Recording started', 'info');
    } catch (err) {
      // Handle specific error types with friendly messages
      // No console.error to avoid triggering Next.js dev overlay
      const error = err as DOMException;
      
      if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        showToast('No microphone found on this device', 'error');
      } else if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        showToast('Microphone access denied. Please enable it in your browser settings.', 'error');
      } else if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
        showToast('Microphone is in use by another application', 'error');
      } else if (error?.name === 'OverconstrainedError') {
        showToast('No suitable microphone configuration available', 'error');
      } else if (error?.name === 'AbortError') {
        showToast('Recording was cancelled', 'info');
      } else if (error?.name === 'TypeError') {
        showToast('Invalid audio configuration', 'error');
      } else {
        // Generic fallback for unknown errors
        showToast('Unable to access microphone. Please check your device.', 'error');
      }
    }
  };

  const stopRecording = () => {
    triggerHaptic('medium');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    showToast('Recording stopped', 'success');
  };

  const uploadVoiceMemo = async (): Promise<{ url: string; name: string; size: number; type: string } | null> => {
    if (!audioBlob) return null;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', audioBlob, `voice-memo-${Date.now()}.webm`);
    
    try {
      const res = await fetch('/api/upload-attachment', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setAudioBlob(null);
      setRecordingTime(0);
      showToast('Voice memo attached', 'success');
      return data;
    } catch (err) {
      // Use console.warn instead of console.error to avoid dev overlay
      console.warn('Voice memo upload failed:', err);
      showToast('Failed to upload voice memo', 'error');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const discardRecording = () => {
    triggerHaptic('light');
    setAudioBlob(null);
    setRecordingTime(0);
    showToast('Recording discarded', 'info');
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    recordingTime,
    audioBlob,
    isUploading,
    startRecording,
    stopRecording,
    uploadVoiceMemo,
    discardRecording,
    formatRecordingTime,
  };
}