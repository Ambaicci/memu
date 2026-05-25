'use client';

import { X, Keyboard } from 'lucide-react';
import { shortcuts } from '@/lib/shortcuts/keyboardShortcuts';

interface ShortcutsHelpProps {
  onClose: () => void;
}

export default function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  const globalShortcuts = shortcuts.filter(s => 
    !s.action.startsWith('goTo') || s.key === 'g'
  );
  const navShortcuts = shortcuts.filter(s => 
    s.action.startsWith('goTo') && s.key === 'g'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[500px] max-w-[90%] max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[#e8e7e3] p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-[#4f46e5]" />
            <h2 className="text-[18px] font-semibold text-[#0f0f0f]">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f2f1ee] transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
          <div className="mb-6">
            <h3 className="text-[13px] font-medium text-[#777] mb-3">Global Shortcuts</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">Open Search</span>
                <kbd className="px-2 py-1 bg-[#f2f1ee] rounded text-[11px] font-mono text-[#777]">⌘K</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">New Memu</span>
                <kbd className="px-2 py-1 bg-[#f2f1ee] rounded text-[11px] font-mono text-[#777]">⌘N</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">Show Shortcuts</span>
                <kbd className="px-2 py-1 bg-[#f2f1ee] rounded text-[11px] font-mono text-[#777]">⌘/</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">Open Profile</span>
                <kbd className="px-2 py-1 bg-[#f2f1ee] rounded text-[11px] font-mono text-[#777]">⌘,</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">Close Modal</span>
                <kbd className="px-2 py-1 bg-[#f2f1ee] rounded text-[11px] font-mono text-[#777]">ESC</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">Save (in editors)</span>
                <kbd className="px-2 py-1 bg-[#f2f1ee] rounded text-[11px] font-mono text-[#777]">⌘S</kbd>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-medium text-[#777] mb-3">Quick Navigation</h3>
            <p className="text-[11px] text-[#aaa] mb-3">Press G then a letter:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then I → In-memus</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then O → Out-memus</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then D → Drafts</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then C → Connections</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then S → Spaces</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then H → Handles</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then L → Calendar</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then F → Confer</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then A → AirShare</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then B → Boards</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#f2f1ee]">
                <span className="text-[13px] text-[#0f0f0f]">G then E → Sheets</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#e8e7e3] p-4 bg-[#fafaf8]">
          <p className="text-[11px] text-[#aaa] text-center">
            Press ⌘/ or Ctrl+/ to show this help screen
          </p>
        </div>
      </div>
    </div>
  );
}