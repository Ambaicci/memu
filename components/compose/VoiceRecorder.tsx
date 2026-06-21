'use client';

import { Mic, StopCircle, Check, Loader2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface VoiceRecorderProps {
  isRecording: boolean;
  recordingTime: number;
  hasRecording: boolean;
  isUploading: boolean;
  onStart: () => void;
  onStop: () => void;
  onUpload: () => void;
  onDiscard: () => void;
  formatTime: (seconds: number) => string;
}

export default function VoiceRecorder({
  isRecording,
  recordingTime,
  hasRecording,
  isUploading,
  onStart,
  onStop,
  onUpload,
  onDiscard,
  formatTime,
}: VoiceRecorderProps) {
  // Only show if recording or has a recording
  if (!isRecording && !hasRecording) return null;

  return (
    <div className="px-4 md:px-6 py-3 border-t border-gray-100 bg-indigo-50/50 animate-fadeIn">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isRecording ? (
            <>
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-sm font-semibold text-gray-900">
                Recording {formatTime(recordingTime)}
              </span>
            </>
          ) : hasRecording ? (
            <>
              <Mic size={16} strokeWidth={2.5} className="text-indigo-600" />
              <span className="text-sm font-semibold text-gray-900">
                Voice memo ({formatTime(recordingTime)})
              </span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isRecording ? (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-full transition-all btn-press"
            >
              <StopCircle size={12} strokeWidth={2.5} /> Stop
            </button>
          ) : hasRecording ? (
            <>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onDiscard();
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-indigo-100 rounded-full transition-all btn-press"
              >
                Discard
              </button>
              <button
                onClick={onUpload}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-all disabled:opacity-50 btn-press"
              >
                {isUploading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} strokeWidth={2.5} />
                )}
                Attach
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}