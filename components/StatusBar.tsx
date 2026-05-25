'use client';

import { CheckCheck, Eye, Clock, CircleCheck } from 'lucide-react';

export type ReadStatus = 'sent' | 'delivered' | 'opened' | 'read';

interface StatusBarProps {
  status: ReadStatus;
  deliveredAt?: string;
  openedAt?: string;
  readAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

const statusConfig = {
  sent: {
    label: 'Sent',
    icon: <CheckCheck size={12} />,
    description: 'Memu has been sent',
    color: '#9ca3af',
    bgColor: 'bg-[#f3f4f6]',
    textColor: 'text-[#6b7280]',
    borderColor: 'border-[#e5e7eb]',
  },
  delivered: {
    label: 'Delivered',
    icon: <CheckCheck size={12} />,
    description: 'Memu has reached recipient\'s inbox',
    color: '#3b82f6',
    bgColor: 'bg-[#eff6ff]',
    textColor: 'text-[#3b82f6]',
    borderColor: 'border-[#bfdbfe]',
  },
  opened: {
    label: 'Opened',
    icon: <Eye size={12} />,
    description: 'Recipient has opened the memu',
    color: '#8b5cf6',
    bgColor: 'bg-[#f5f3ff]',
    textColor: 'text-[#8b5cf6]',
    borderColor: 'border-[#ddd6fe]',
  },
  read: {
    label: 'Read',
    icon: <CircleCheck size={12} />,
    description: 'Recipient has read through the memu',
    color: '#10b981',
    bgColor: 'bg-[#ecfdf5]',
    textColor: 'text-[#10b981]',
    borderColor: 'border-[#a7f3d0]',
  },
};

const statusOrder: ReadStatus[] = ['sent', 'delivered', 'opened', 'read'];

export default function StatusBar({ status, deliveredAt, openedAt, readAt, size = 'md', showLabels = true }: StatusBarProps) {
  const currentIndex = statusOrder.indexOf(status);
  
  const getStepClass = (stepStatus: ReadStatus, stepIndex: number) => {
    const isActive = stepIndex <= currentIndex;
    const config = statusConfig[stepStatus];
    
    return {
      line: isActive ? `bg-[${config.color}]` : 'bg-[#e8e7e3]',
      circle: isActive 
        ? `${config.bgColor} ${config.textColor} border-[${config.color}]` 
        : 'bg-[#f2f1ee] text-[#aaa] border-[#e8e7e3]',
      label: isActive ? config.textColor : 'text-[#aaa]',
    };
  };

  const getTimeForStep = (stepStatus: ReadStatus) => {
    switch (stepStatus) {
      case 'sent': return null;
      case 'delivered': return deliveredAt;
      case 'opened': return openedAt;
      case 'read': return readAt;
      default: return null;
    }
  };

  const sizeClasses = {
    sm: { container: 'gap-1', circle: 'w-5 h-5 text-[10px]', line: 'h-0.5', label: 'text-[9px]', time: 'text-[8px]' },
    md: { container: 'gap-2', circle: 'w-6 h-6 text-[11px]', line: 'h-0.5', label: 'text-[10px]', time: 'text-[9px]' },
    lg: { container: 'gap-3', circle: 'w-7 h-7 text-[12px]', line: 'h-1', label: 'text-[11px]', time: 'text-[10px]' },
  };

  const sz = sizeClasses[size];

  return (
    <div className="flex items-center gap-1">
      {statusOrder.map((step, idx) => {
        const isActive = idx <= currentIndex;
        const isLast = idx === statusOrder.length - 1;
        const config = statusConfig[step];
        const stepClass = getStepClass(step, idx);
        const stepTime = getTimeForStep(step);
        
        // For sent status, show a different icon
        const getIcon = () => {
          if (step === 'sent') return <CheckCheck size={10} />;
          if (step === 'delivered') return <CheckCheck size={10} />;
          if (step === 'opened') return <Eye size={10} />;
          return <CircleCheck size={10} />;
        };
        
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div 
                className={`${sz.circle} rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? `${config.bgColor} ${config.textColor} shadow-sm` 
                    : 'bg-[#f2f1ee] text-[#ccc]'
                }`}
                title={config.description}
              >
                {getIcon()}
              </div>
              {showLabels && (
                <>
                  <span className={`${sz.label} font-medium mt-1 ${stepClass.label}`}>
                    {config.label}
                  </span>
                  {stepTime && (
                    <span className={`${sz.time} text-[#aaa] mt-0.5`}>{stepTime}</span>
                  )}
                </>
              )}
            </div>
            
            {!isLast && (
              <div className={`flex-1 h-[2px] mx-1 rounded-full transition-all duration-500 ${
                isActive ? config.bgColor : 'bg-[#e8e7e3]'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}