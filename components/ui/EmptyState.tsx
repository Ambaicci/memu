'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center w-full px-4 ${className}`}>
      {/* Animated Icon with Glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 via-indigo-400/20 to-purple-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="relative w-28 h-28 rounded-2xl bg-white shadow-lg border border-gray-100/80 flex items-center justify-center empty-state-icon">
          {icon}
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-3 tracking-tight">
        {title}
      </h3>

      <div style={{ width: '280px', margin: '0 auto 24px auto' }}>
        <p className="text-sm text-gray-500 leading-relaxed text-center">
          {description}
        </p>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition btn-press"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}