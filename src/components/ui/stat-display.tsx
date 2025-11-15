/**
 * StatDisplay Component
 *
 * Displays D&D statistics (ability scores, HP, AC, modifiers) with
 * visual flair and hover interactions.
 *
 * Usage:
 * <StatDisplay value={16} label="STR" modifier={+3} size="default" />
 * <StatDisplay value={45} label="HP" max={60} variant="progress" />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const statDisplayVariants = cva(
  'stat-display relative inline-flex flex-col items-center justify-center transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'stat-display',
        large: 'stat-display-large',
        small: 'stat-display-small',
        circular: 'rounded-full border-2',
        hexagon: 'stat-display aspect-square',
      },
      color: {
        default: '',
        purple:
          'border-infinite-purple hover:border-infinite-purple hover:shadow-[0_0_16px_rgba(124,58,237,0.3)]',
        gold: 'border-infinite-gold hover:border-infinite-gold hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]',
        teal: 'border-infinite-teal hover:border-infinite-teal hover:shadow-[0_0_16px_rgba(8,145,178,0.3)]',
        danger: 'border-red-500 hover:border-red-500 hover:shadow-[0_0_16px_rgba(239,68,68,0.3)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      color: 'default',
    },
  },
);

export interface StatDisplayProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statDisplayVariants> {
  /** The primary value to display */
  value: number | string;
  /** Label for the stat (e.g., "STR", "HP", "AC") */
  label: string;
  /** Optional modifier (e.g., +3, -1) */
  modifier?: number | string;
  /** Maximum value (for progress-based stats like HP) */
  max?: number;
  /** Show as percentage filled */
  showProgress?: boolean;
  /** Animate on mount */
  animate?: boolean;
}

const StatDisplay = React.forwardRef<HTMLDivElement, StatDisplayProps>(
  (
    {
      className,
      variant,
      color,
      value,
      label,
      modifier,
      max,
      showProgress = false,
      animate = true,
      ...props
    },
    ref,
  ) => {
    const percentage = max ? (Number(value) / max) * 100 : 100;
    const isLow = percentage < 30;
    const isCritical = percentage < 10;

    const containerVariants = {
      hidden: { opacity: 0, scale: 0.8 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        },
      },
    };

    const valueVariants = {
      hidden: { scale: 0.5, opacity: 0 },
      visible: {
        scale: 1,
        opacity: 1,
        transition: {
          delay: 0.1,
          duration: 0.2,
        },
      },
    };

    const Content = (
      <div className="flex flex-col items-center justify-center gap-0.5">
        <motion.div
          className="stat-display-value"
          variants={animate ? valueVariants : undefined}
          initial={animate ? 'hidden' : undefined}
          animate={animate ? 'visible' : undefined}
        >
          {value}
        </motion.div>

        {label && <div className="stat-display-label">{label}</div>}

        {modifier !== undefined && (
          <div className="stat-display-modifier">
            {typeof modifier === 'number' ? (modifier >= 0 ? `+${modifier}` : modifier) : modifier}
          </div>
        )}

        {showProgress && max && (
          <div className="mt-1 w-full px-2">
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full transition-colors',
                  isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-infinite-purple',
                )}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="text-[0.625rem] text-muted-foreground text-center mt-0.5">
              {value}/{max}
            </div>
          </div>
        )}
      </div>
    );

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cn(statDisplayVariants({ variant, color }), className)}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          whileHover={{
            scale: 1.05,
            transition: { duration: 0.2 },
          }}
          {...props}
        >
          {Content}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={cn(statDisplayVariants({ variant, color }), className)} {...props}>
        {Content}
      </div>
    );
  },
);

StatDisplay.displayName = 'StatDisplay';

export { StatDisplay, statDisplayVariants };
