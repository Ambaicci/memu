'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Generate truly unique ID using crypto API + timestamp
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newToast: Toast = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onRemove: () => void;
}

function Toast({ message, type, onRemove }: ToastProps) {
  const bgColor = type === 'success' ? 'bg-[#d1fae5] border-[#059669]' :
                  type === 'error' ? 'bg-[#fee2e2] border-[#dc2626]' :
                  'bg-[#dbeafe] border-[#3b82f6]';
  
  const textColor = type === 'success' ? 'text-[#059669]' :
                    type === 'error' ? 'text-[#dc2626]' :
                    'text-[#3b82f6]';

  return (
    <div className={`fixed bottom-6 right-6 ${bgColor} border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-slideUp z-50`}>
      <span className={`text-[13px] font-medium ${textColor}`}>{message}</span>
      <button onClick={onRemove} className={`${textColor} hover:opacity-70 transition`}>
        ✕
      </button>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.2s ease-out; }
      `}</style>
    </div>
  );
}