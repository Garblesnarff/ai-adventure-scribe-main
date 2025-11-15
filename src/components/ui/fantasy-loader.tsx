/**
 * FantasyLoader Component
 *
 * Themed loading indicators that match the Fantasy-Tech Fusion aesthetic.
 * Replaces generic spinners with immersive animations.
 *
 * Usage:
 * <FantasyLoader type="parchment" />
 * <FantasyLoader type="spell" size="lg" />
 * <FantasyLoader type="dice" label="Rolling..." />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Dice6, Scroll } from 'lucide-react';
import { cn } from '@/lib/utils';

const fantasyLoaderVariants = cva('inline-flex flex-col items-center justify-center gap-3', {
  variants: {
    size: {
      sm: 'text-sm',
      default: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface FantasyLoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fantasyLoaderVariants> {
  /** Type of loader animation */
  type?: 'parchment' | 'spell' | 'dice' | 'cosmic' | 'shimmer' | 'spinner';
  /** Optional label text */
  label?: string;
  /** Show loading tips */
  tip?: string;
}

const FantasyLoader = React.forwardRef<HTMLDivElement, FantasyLoaderProps>(
  ({ className, size, type = 'spell', label, tip, ...props }, ref) => {
    const iconSize = {
      sm: 24,
      default: 32,
      lg: 48,
      xl: 64,
    }[size || 'default'];

    // Parchment Unrolling Animation
    const ParchmentLoader = () => (
      <motion.div className="relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div
          className="flex items-center justify-center"
          animate={{
            rotate: [0, 0, 180, 180, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Scroll className="text-infinite-gold" size={iconSize} strokeWidth={1.5} />
        </motion.div>
      </motion.div>
    );

    // Spell Circle Formation
    const SpellLoader = () => (
      <div className="relative" style={{ width: iconSize, height: iconSize }}>
        {/* Outer circle */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-infinite-purple/30"
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
            scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
        {/* Inner sparkle */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Sparkles className="text-infinite-purple" size={iconSize * 0.6} strokeWidth={1.5} />
        </motion.div>
        {/* Pulsing glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-infinite-purple/10 blur-xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    );

    // Dice Rolling Animation
    const DiceLoader = () => (
      <motion.div
        animate={{
          rotate: [0, 90, 180, 270, 360],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Dice6 className="text-infinite-teal" size={iconSize} strokeWidth={1.5} />
      </motion.div>
    );

    // Cosmic Gradient Spinner
    const CosmicLoader = () => (
      <div className="relative" style={{ width: iconSize, height: iconSize }}>
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, transparent, rgba(124, 58, 237, 0.8), transparent)',
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <div className="absolute inset-1 rounded-full bg-background" />
      </div>
    );

    // Shimmer Loading Bar
    const ShimmerLoader = () => (
      <div className="relative w-48 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-infinite-purple/50 to-transparent"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
    );

    // Default Spinner
    const SpinnerLoader = () => (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <Loader2 className="text-infinite-purple" size={iconSize} strokeWidth={2} />
      </motion.div>
    );

    // Select loader based on type
    const LoaderComponent = {
      parchment: ParchmentLoader,
      spell: SpellLoader,
      dice: DiceLoader,
      cosmic: CosmicLoader,
      shimmer: ShimmerLoader,
      spinner: SpinnerLoader,
    }[type];

    return (
      <div
        ref={ref}
        className={cn(fantasyLoaderVariants({ size }), className)}
        role="status"
        aria-label={label || 'Loading'}
        {...props}
      >
        {/* Loader Animation */}
        <LoaderComponent />

        {/* Label */}
        {label && (
          <motion.div
            className="text-muted-foreground font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {label}
          </motion.div>
        )}

        {/* Loading Tip */}
        {tip && (
          <motion.div
            className="text-xs text-muted-foreground max-w-xs text-center px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="font-semibold">Did you know?</span> {tip}
          </motion.div>
        )}

        {/* Screen reader text */}
        <span className="sr-only">{label || 'Loading'}</span>
      </div>
    );
  },
);

FantasyLoader.displayName = 'FantasyLoader';

export { FantasyLoader, fantasyLoaderVariants };
