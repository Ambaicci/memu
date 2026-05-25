'use client';

type ShortcutAction = 
  | 'search'
  | 'newMemu'
  | 'showShortcuts'
  | 'goToInMemus'
  | 'goToOutMemus'
  | 'goToDrafts'
  | 'goToConnections'
  | 'goToSpaces'
  | 'goToHandles'
  | 'goToCalendar'
  | 'goToConfer'
  | 'goToAirShare'
  | 'goToDocs'
  | 'goToSlides'
  | 'goToSheets'
  | 'goToBoards'
  | 'closeModal'
  | 'save'
  | 'openProfile';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: ShortcutAction;
  description: string;
}

export const shortcuts: Shortcut[] = [
  // Navigation - Global
  { key: 'k', meta: true, action: 'search', description: 'Open Global Search' },
  { key: 'k', ctrl: true, action: 'search', description: 'Open Global Search' },
  { key: 'n', meta: true, action: 'newMemu', description: 'New Memu' },
  { key: 'n', ctrl: true, action: 'newMemu', description: 'New Memu' },
  { key: '/', meta: true, action: 'showShortcuts', description: 'Show Keyboard Shortcuts' },
  { key: '/', ctrl: true, action: 'showShortcuts', description: 'Show Keyboard Shortcuts' },
  { key: ',', meta: true, action: 'openProfile', description: 'Open Profile Settings' },
  { key: ',', ctrl: true, action: 'openProfile', description: 'Open Profile Settings' },
  { key: 'Escape', action: 'closeModal', description: 'Close Modal / Cancel' },
  { key: 's', meta: true, action: 'save', description: 'Save (in editors)' },
  { key: 's', ctrl: true, action: 'save', description: 'Save (in editors)' },
  
  // Quick Navigation - G then key
  { key: 'g', action: 'goToInMemus', description: 'G then I → In-memus' },
  { key: 'g', action: 'goToOutMemus', description: 'G then O → Out-memus' },
  { key: 'g', action: 'goToDrafts', description: 'G then D → Drafts' },
  { key: 'g', action: 'goToConnections', description: 'G then C → Connections' },
  { key: 'g', action: 'goToSpaces', description: 'G then S → Spaces' },
  { key: 'g', action: 'goToHandles', description: 'G then H → Handles' },
  { key: 'g', action: 'goToCalendar', description: 'G then L → Calendar' },
  { key: 'g', action: 'goToConfer', description: 'G then F → Confer' },
  { key: 'g', action: 'goToAirShare', description: 'G then A → AirShare' },
  { key: 'g', action: 'goToDocs', description: 'G then D (in Office) → Docs' },
  { key: 'g', action: 'goToSlides', description: 'G then S (in Office) → Slides' },
  { key: 'g', action: 'goToSheets', description: 'G then E → Sheets' },
  { key: 'g', action: 'goToBoards', description: 'G then B → Boards' },
];

class KeyboardShortcutsService {
  private listeners: Map<ShortcutAction, (() => void)[]> = new Map();
  private waitingForG = false;
  private gTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
  }

  on(action: ShortcutAction, callback: () => void) {
    if (!this.listeners.has(action)) {
      this.listeners.set(action, []);
    }
    this.listeners.get(action)!.push(callback);
  }

  off(action: ShortcutAction, callback: () => void) {
    const callbacks = this.listeners.get(action);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private trigger(action: ShortcutAction) {
    const callbacks = this.listeners.get(action);
    if (callbacks) {
      callbacks.forEach(cb => cb());
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Escape to cancel even in inputs
      if (event.key === 'Escape') {
        this.trigger('closeModal');
      }
      return;
    }

    // Handle G then key navigation
    if (this.waitingForG) {
      if (this.gTimeout) clearTimeout(this.gTimeout);
      this.waitingForG = false;
      
      const key = event.key.toLowerCase();
      switch (key) {
        case 'i': this.trigger('goToInMemus'); break;
        case 'o': this.trigger('goToOutMemus'); break;
        case 'd': this.trigger('goToDrafts'); break;
        case 'c': this.trigger('goToConnections'); break;
        case 's': this.trigger('goToSpaces'); break;
        case 'h': this.trigger('goToHandles'); break;
        case 'l': this.trigger('goToCalendar'); break;
        case 'f': this.trigger('goToConfer'); break;
        case 'a': this.trigger('goToAirShare'); break;
        case 'e': this.trigger('goToSheets'); break;
        case 'b': this.trigger('goToBoards'); break;
      }
      return;
    }

    // Handle G key
    if (event.key === 'g' || event.key === 'G') {
      this.waitingForG = true;
      if (this.gTimeout) clearTimeout(this.gTimeout);
      this.gTimeout = setTimeout(() => {
        this.waitingForG = false;
      }, 500);
      event.preventDefault();
      return;
    }

    // Handle modifier shortcuts
    const isMeta = event.metaKey;
    const isCtrl = event.ctrlKey;
    const key = event.key.toLowerCase();

    if ((isMeta || isCtrl) && key === 'k') {
      event.preventDefault();
      this.trigger('search');
    } else if ((isMeta || isCtrl) && key === 'n') {
      event.preventDefault();
      this.trigger('newMemu');
    } else if ((isMeta || isCtrl) && key === '/') {
      event.preventDefault();
      this.trigger('showShortcuts');
    } else if ((isMeta || isCtrl) && key === ',') {
      event.preventDefault();
      this.trigger('openProfile');
    } else if ((isMeta || isCtrl) && key === 's') {
      event.preventDefault();
      this.trigger('save');
    } else if (key === 'escape') {
      this.trigger('closeModal');
    }
  }
}

export const keyboardShortcuts = new KeyboardShortcutsService();