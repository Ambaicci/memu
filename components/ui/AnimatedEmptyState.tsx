'use client';

import { motion } from 'framer-motion';
import EmptyState from './EmptyState';
import LottieIllustration from './LottieIllustration';
import { ReactNode } from 'react';

interface AnimatedEmptyStateProps {
  /** The icon or Lottie animation to display */
  icon?: ReactNode;
  /** Path to Lottie JSON file (overrides icon if provided) */
  lottieSrc?: string;
  /** Title of the empty state */
  title: string;
  /** Description of the empty state */
  description: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional className */
  className?: string;
  /** Width of the illustration (default: 120) */
  illustrationWidth?: number;
  /** Height of the illustration (default: 120) */
  illustrationHeight?: number;
}

export default function AnimatedEmptyState({
  icon,
  lottieSrc,
  title,
  description,
  action,
  className,
  illustrationWidth = 120,
  illustrationHeight = 120,
}: AnimatedEmptyStateProps) {
  // Determine what to render in the icon slot
  const renderIcon = () => {
    // If Lottie source is provided, use it
    if (lottieSrc) {
      return (
        <LottieIllustration
          src={lottieSrc}
          width={illustrationWidth}
          height={illustrationHeight}
          fallback={icon}
        />
      );
    }
    // Otherwise fall back to the regular icon
    return icon;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="w-full"
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <EmptyState
          icon={renderIcon()}
          title={title}
          description={description}
          action={action}
          className={className}
        />
      </motion.div>
    </motion.div>
  );
}