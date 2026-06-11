'use client';

import React from 'react';
import { cn } from '@/lib/utils'; // Note: If you don't have cn utility, see note below*

/* ==========================================
   MEMU DESIGN SYSTEM - PRIMITIVES
   ========================================== */

// 1. CARD (The standard container)
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div 
      className={`bg-white border border-[#e8e7e3] rounded-xl p-5 hover:shadow-md transition-all duration-200 ${className || ''}`} 
      {...props}
    >
      {children}
    </div>
  );
}

// 2. BUTTON (Standardized actions)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#0f0f0f] text-white hover:bg-[#2a2a2a] shadow-sm",
    secondary: "bg-[#f2f1ee] text-[#0f0f0f] hover:bg-[#e8e7e3]",
    ghost: "bg-transparent text-[#777] hover:bg-[#f2f1ee] hover:text-[#0f0f0f]",
    danger: "bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[11.5px]",
    md: "px-4 py-2 text-[13px]",
    lg: "px-5 py-2.5 text-[14px]",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`} {...props}>
      {children}
    </button>
  );
}

// 3. BADGE (For Nature, Status, Tags)
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'indigo' | 'green' | 'amber' | 'red' | 'purple' | 'pink' | 'gray';
  children: React.ReactNode;
}

export function Badge({ color = 'gray', className, children, ...props }: BadgeProps) {
  const colors = {
    indigo: 'bg-[#ede9fe] text-[#7c3aed]',
    green: 'bg-[#d1fae5] text-[#059669]',
    amber: 'bg-[#fef3c7] text-[#d97706]',
    red: 'bg-[#fee2e2] text-[#dc2626]',
    purple: 'bg-[#f3e8ff] text-[#9333ea]',
    pink: 'bg-[#fce7f3] text-[#be185d]',
    gray: 'bg-[#f2f1ee] text-[#777]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[color]} ${className || ''}`} {...props}>
      {children}
    </span>
  );
}

// 4. AVATAR (For Handles/Users)
interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizes = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-lg',
  };

  // Simple hash for consistent colors
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash) % 360;
  const bgColor = `hsl(${hue}, 60%, 70%)`;

  return (
    <div 
      className={`${sizes[size]} rounded-full flex items-center justify-center font-medium shadow-sm text-white flex-shrink-0 ${className || ''}`}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
}

// 5. INPUT (Standardized text inputs)
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-[11px] font-semibold text-[#777] uppercase tracking-wider mb-1.5">{label}</label>}
      <input 
        className={`w-full px-3.5 py-2 bg-[#f2f1ee] border border-transparent rounded-lg text-[13.5px] outline-none focus:border-[#4f46e5] focus:bg-white transition ${className || ''}`}
        {...props}
      />
    </div>
  );
}

// 6. STAT CARD (For Analytics)
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

export function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white border border-[#e8e7e3] rounded-xl p-4 hover:shadow-md transition-all duration-200">
      <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <div className="text-[24px] font-semibold text-[#0f0f0f] mb-0.5">{value}</div>
      <div className="text-[11px] text-[#777] font-medium">{label}</div>
    </div>
  );
}