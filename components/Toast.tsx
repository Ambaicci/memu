'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={18} className="text-[#10b981]" />,
    error: <AlertCircle size={18} className="text-[#dc2626]" />,
    info: <Info size={18} className="text-[#4f46e5]" />,
  };

  const bgColors = {
    success: 'bg-white border-l-4 border-l-[#10b981]',
    error: 'bg-white border-l-4 border-l-[#dc2626]',
    info: 'bg-white border-l-4 border-l-[#4f46e5]',
  };

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${bgColors[type]}`}>
        {icons[type]}
        <span className="text-[13px] text-[#1a1a1a]">{message}</span>
        <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} className="ml-2 text-[#aaa] hover:text-[#777]">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}