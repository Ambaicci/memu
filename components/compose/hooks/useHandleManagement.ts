'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { triggerHaptic } from '@/lib/haptics';
import { Profile, ValidationStatus } from '../types';

export function useHandleManagement() {
  const [to, setTo] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [validationStatus, setValidationStatus] = useState<Record<string, ValidationStatus>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [savedHandles, setSavedHandles] = useState<string[]>([]);
  const [unsavedHandle, setUnsavedHandle] = useState<string | null>(null);
  const [isSavingHandle, setIsSavingHandle] = useState(false);
  const { showToast } = useToast();

  // Initialize User & Saved Handles
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data } = await supabase.from('handles').select('username').eq('user_id', user.id);
        // Fix: Removed explicit Handle type since we only select 'username'
        if (data) setSavedHandles(data.map((h) => h.username));
      }
    };
    getCurrentUser();
  }, []);

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
  };

  const handleSaveUnsavedHandle = async () => {
    triggerHaptic('medium');
    if (!unsavedHandle) return;
    setIsSavingHandle(true);
    try {
      const res = await fetch('/api/handles/validate', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ handle: unsavedHandle }) 
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
          avatar_url: data.user.avatar_url 
        });
        setSavedHandles([...savedHandles, unsavedHandle]);
        showToast(`@${unsavedHandle}.memu saved!`, 'success');
      } else { 
        showToast('Handle does not exist.', 'error'); 
      }
    } catch (err) { 
      showToast('Failed to save handle.', 'error'); 
    } finally { 
      setIsSavingHandle(false); 
      setUnsavedHandle(null); 
    }
  };

  const handleSelectProfile = (profile: Profile) => {
    triggerHaptic('selection');
    const handle = `@${profile.username}.memu`;
    if (!to.includes(handle)) {
      setTo([...to, handle]);
      checkAndSetValidation(handle);
      if (!savedHandles.includes(profile.username)) setUnsavedHandle(profile.username);
    }
    setToInput('');
  };

  const handleRemoveHandle = (handle: string) => {
    triggerHaptic('light');
    setTo(to.filter(h => h !== handle));
    const newValidation = { ...validationStatus };
    delete newValidation[handle];
    setValidationStatus(newValidation);
  };

  const isEmail = (handle: string) => handle.includes('@') && !handle.endsWith('.memu');

  const reset = () => {
    setTo([]);
    setToInput('');
    setValidationStatus({});
    setUnsavedHandle(null);
  };

  return {
    to,
    toInput,
    setToInput,
    validationStatus,
    unsavedHandle,
    isSavingHandle,
    currentUserId,
    savedHandles,
    handleAddHandle,
    handleSaveUnsavedHandle,
    handleSelectProfile,
    handleRemoveHandle,
    isEmail,
    setTo,
    setUnsavedHandle,
    reset,
  };
}