/**
 * ProgressBar Component
 *
 * Themed progress bars for HP, XP, spell slots, encumbrance, etc.
 * Supports animated fills, gradients, and status indicators.
 *
 * Usage:
 * <ProgressBar value={45} max={60} label="HP" showValue />
 * <ProgressBar value={750} max={1000} variant="xp" />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const progressBarVariants = cva('fantasy-progress relative w-full overflow-hidden', {
  variants: {
    variant: {
      default: '',
      hp: 'border-red-500/30',
      xp: 'border-infinite-purple/30',
      spell: 'border-infinite-teal/30',
      stamina: 'border-infinite-gold/30',
    },
    size: {
      sm: 'h-2',
      default: 'h-3',
      lg: 'h-4',
      xl: 'h-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const progressFillVariants = cva(
  'fantasy-progress-fill h-full transition-all duration-500 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-infinite-purple to-infinite-teal',
        hp: 'bg-gradient-to-r from-red-600 to-red-400',
        xp: 'bg-gradient-to-r from-infinite-purple to-infinite-purple-light',
        spell: 'bg-gradient-to-r from-infinite-teal to-infinite-teal-light',
        stamina: 'bg-gradient-to-r from-infinite-gold to-infinite-gold-light',
      },
      status: {
        normal: '',
        low: '!bg-gradient-to-r from-yellow-600 to-yellow-400',
        critical: '!bg-gradient-to-r from-red-600 to-red-500 animate-glow-pulse',
      },
    },
    defaultVariants: {
      variant: 'default',
      status: 'normal',
    },
  },
);

export interface ProgressBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'value'>,
    VariantProps<typeof progressBarVariants> {
  /** Current value */
  value: number;
  /** Maximum value */
  max: number;
  /** Label to display */
  label?: string;
  /** Show numeric value */
  showValue?: boolean;
  /** Show as percentage */
  showPercentage?: boolean;
  /** Animate the fill */
  animate?: boolean;
  /** Custom fill color (overrides variant) */
  fillColor?: string;
  /** Low threshold (0-1) */
  lowThreshold?: number;
  /** Critical threshold (0-1) */
  criticalThreshold?: number;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      variant,
      size,
      value,
      max,
      label,
      showValue = false,
      showPercentage = false,
      animate = true,
      fillColor,
      lowThreshold = 0.3,
      criticalThreshold = 0.1,
      ...props
    },
    ref,
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const ratio = percentage / 100;

    // Determine status based on thresholds
    const status =
      ratio <= criticalThreshold ? 'critical' : ratio <= lowThreshold ? 'low' : 'normal';

    return (
      <div ref={ref} className="w-full space-y-1" {...props}>
        {/* Label and Value Row */}
        {(label || showValue || showPercentage) && (
          <div className="flex items-center justify-between text-sm">
            {label && <span className="font-medium text-foreground">{label}</span>}
            {(showValue || showPercentage) && (
              <span className="text-muted-foreground tabular-nums">
                {showPercentage ? `${Math.round(percentage)}%` : `${value} / ${max}`}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className={cn(progressBarVariants({ variant, size }), className)}>
          <motion.div
            className={cn(
              progressFillVariants({ variant, status }),
              fillColor && `bg-${fillColor}`,
            )}
            initial={animate ? { width: 0 } : { width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={animate ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] } : { duration: 0 }}
          />
        </div>
      </div>
    );
  },
);

ProgressBar.displayName = 'ProgressBar';

export { ProgressBar, progressBarVariants };
