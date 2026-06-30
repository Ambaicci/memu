'use client';

import React, { forwardRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

// Import the new components
import EmptyState from './EmptyState';
import AnimatedEmptyState from './AnimatedEmptyState';
import LottieIllustration from './LottieIllustration';

/* ==========================================
   MEMU DESIGN SYSTEM v3.1 - UI PRIMITIVES
   Blue-Primary • Purple-Secondary • Glossy
   ========================================== */

// ==========================================
// 1. CARD (Standard container with blue accent)
// ==========================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-[#e8e7e3] rounded-xl p-5 hover:border-blue-200/60 hover:shadow-md transition-all duration-200 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ==========================================
// 2. BUTTON (Standardized actions - Blue Primary)
// ==========================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-gradient-to-r from-blue-600 to-bridge text-white shadow-md hover:shadow-lg hover:-translate-y-0.5',
      secondary:
        'bg-[#f2f1ee] text-[#0f0f0f] hover:bg-[#e8e7e3] hover:text-blue-600',
      ghost:
        'bg-transparent text-[#777] hover:bg-blue-50 hover:text-blue-600',
      danger:
        'bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-[11.5px]',
      md: 'px-4 py-2 text-[13px]',
      lg: 'px-5 py-2.5 text-[14px]',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ==========================================
// 3. BADGE (For Nature, Status, Tags - Blue/Purple variants)
// ==========================================

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'blue' | 'purple' | 'bridge' | 'green' | 'amber' | 'red' | 'gray' | 'gold';
  children: React.ReactNode;
}

export function Badge({ color = 'gray', className, children, ...props }: BadgeProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border border-purple-200',
    bridge: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
    green: 'bg-[#d1fae5] text-[#059669]',
    amber: 'bg-[#fef3c7] text-[#d97706]',
    red: 'bg-[#fee2e2] text-[#dc2626]',
    gold: 'bg-amber-50 text-amber-600 border border-amber-200',
    gray: 'bg-[#f2f1ee] text-[#777]',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[color]} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  );
}

// ==========================================
// 4. AVATAR (For Handles/Users - consistent blue-ish colors)
// ==========================================

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizes = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-lg',
  };

  // Consistent color generation - shifted toward blue/purple spectrum
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash) % 60 + 210; // 210-270 range (blue to purple)
  const bgColor = `hsl(${hue}, 60%, 60%)`;

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-medium shadow-sm text-white flex-shrink-0 ${className || ''}`}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
}

// ==========================================
// 5. INPUT (Standardized text inputs)
// ==========================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[11px] font-semibold text-[#777] uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3.5 py-2 bg-[#f2f1ee] border border-transparent rounded-lg text-[13.5px] outline-none focus:border-blue-400 focus:bg-white transition ${className || ''}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

// ==========================================
// 6. STAT CARD (For Analytics - with blue accent)
// ==========================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ icon, label, value, color = 'from-blue-600 to-bridge' }: StatCardProps) {
  return (
    <div className="bg-white border border-[#e8e7e3] rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center text-white mb-3 shadow-sm`}>
        {icon}
      </div>
      <div className="text-[24px] font-semibold text-[#0f0f0f] mb-0.5">{value}</div>
      <div className="text-[11px] text-[#777] font-medium">{label}</div>
    </div>
  );
}

// ==========================================
// 7. GLOSSY HERO (Premium hero section)
// ==========================================

interface GlossyHeroProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'bridge' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

export function GlossyHero({
  children,
  className = '',
  glowColor = 'bridge',
  size = 'lg'
}: GlossyHeroProps) {
  const glowColors = {
    blue: 'from-blue-600/20 to-blue-400/10',
    purple: 'from-purple-600/20 to-purple-400/10',
    bridge: 'from-bridge/25 to-blue-500/15',
    gold: 'from-amber-500/20 to-yellow-400/10',
  };

  const sizes = {
    sm: 'p-6 md:p-8',
    md: 'p-8 md:p-12',
    lg: 'p-10 md:p-16',
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-blue-900 via-bridge/80 to-purple-900 rounded-3xl shadow-2xl ${sizes[size]} ${className}`}>
      {/* Glow Effects */}
      <div className={`absolute inset-0 bg-gradient-to-br ${glowColors[glowColor]} blur-3xl opacity-60`} />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// ==========================================
// 8. GLOSSY CARD (Glassmorphism premium card)
// ==========================================

interface GlossyCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'solid' | 'premium';
  hover?: boolean;
}

export function GlossyCard({
  children,
  className = '',
  variant = 'glass',
  hover = true
}: GlossyCardProps) {
  const variants = {
    glass: 'bg-white/10 backdrop-blur-xl border border-white/10',
    solid: 'bg-white/5 backdrop-blur-sm border border-white/5',
    premium: 'bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl',
  };

  const hoverClasses = hover ? 'hover:-translate-y-1 hover:shadow-2xl transition-all duration-300' : '';

  return (
    <div className={`rounded-2xl p-6 ${variants[variant]} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
}

// ==========================================
// 9. GLOSSY BADGE (Premium badge with glow)
// ==========================================

interface GlossyBadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'purple' | 'bridge' | 'gold' | 'pink' | 'green';
  size?: 'sm' | 'md';
  glow?: boolean;
  className?: string;
}

export function GlossyBadge({
  children,
  variant = 'blue',
  size = 'md',
  glow = true,
  className = ''
}: GlossyBadgeProps) {
  const variants = {
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
    bridge: 'bg-bridge/20 border-bridge/30 text-indigo-300',
    gold: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
    pink: 'bg-pink-500/20 border-pink-500/30 text-pink-300',
    green: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-[10px]',
    md: 'px-4 py-2 text-[11px]',
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {glow && (
        <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-md animate-pulse" />
      )}
      <span className={`relative inline-flex items-center gap-2 rounded-full border backdrop-blur-sm font-semibold ${variants[variant]} ${sizes[size]}`}>
        {children}
      </span>
    </div>
  );
}

// ==========================================
// 10. GLOSSY BUTTON (Premium CTA)
// ==========================================

interface GlossyButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function GlossyButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  onClick,
  className = '',
  type = 'button'
}: GlossyButtonProps) {
  const variants = {
    primary: 'bg-white text-blue-900 hover:shadow-xl hover:-translate-y-0.5 shadow-lg',
    secondary: 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:-translate-y-0.5',
    ghost: 'text-white/80 hover:text-white hover:bg-white/10',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`group inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-300 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
      {icon && (
        <span className="group-hover:translate-x-1 transition-transform">
          {icon}
        </span>
      )}
    </button>
  );
}

// ==========================================
// 11. NAMED EXPORTS (for direct imports)
// ==========================================

// The components are already exported above as named exports.
// Additionally, we re-export EmptyState, AnimatedEmptyState, LottieIllustration
// for convenience (they are imported at the top).
export { EmptyState, AnimatedEmptyState, LottieIllustration };

// ==========================================
// 12. DEFAULT EXPORT (backward compatibility)
// ==========================================

export default {
  Card,
  Button,
  Badge,
  Avatar,
  Input,
  StatCard,
  GlossyHero,
  GlossyCard,
  GlossyBadge,
  GlossyButton,
  EmptyState,
  AnimatedEmptyState,
  LottieIllustration,
};