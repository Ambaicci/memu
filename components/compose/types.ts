export interface ComposePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (memu: { to: string[]; subject: string; nature: string; body: string }) => void;
  prefilledTo?: string[];
  editingDraft?: { to: string[]; toHandles: string[]; subject: string; nature: string; body: string } | null;
  replyToMemuId?: string | null;
}

export interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url?: string | null;
}

export interface Space {
  id: string;
  name: string;
  description: string | null;
  color?: string;
}

export interface Handle {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export type ValidationStatus = 'valid' | 'invalid' | 'checking';

export interface NatureOption {
  id: string;
  label: string;
  desc: string;
  style: string;
}