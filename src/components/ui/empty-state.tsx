/**
 * EmptyState Component
 *
 * Friendly empty states with illustrations, messaging, and CTAs.
 * Used when there are no campaigns, characters, sessions, etc.
 *
 * Usage:
 * <EmptyState
 *   illustration="no-campaigns"
 *   title="No campaigns yet"
 *   description="Create your first epic saga to begin"
 *   action={<Button>Create Campaign</Button>}
 * />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Scroll, Users, Swords, BookOpen, Sparkles, Dice6, Map, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const emptyStateVariants = cva(
  'flex flex-col items-center justify-center text-center p-8 rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-muted/30',
        card: 'border-2 border-dashed border-border bg-card',
        minimal: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// Icon mapping for common empty states
const iconMap: Record<string, LucideIcon> = {
  'no-campaigns': Scroll,
  'no-characters': Users,
  'no-sessions': Swords,
  'no-quests': BookOpen,
  'no-items': Sparkles,
  'no-rolls': Dice6,
  'no-locations': Map,
};

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  /** Predefined illustration type or custom icon */
  illustration?: keyof typeof iconMap | React.ReactNode;
  /** Custom icon component (overrides illustration) */
  icon?: React.ReactNode;
  /** Main heading */
  title: string;
  /** Description text */
  description?: string;
  /** Call-to-action button or element */
  action?: React.ReactNode;
  /** Secondary action */
  secondaryAction?: React.ReactNode;
  /** Animate on mount */
  animate?: boolean;
  /** Maximum width of content */
  maxWidth?: 'sm' | 'md' | 'lg';
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      variant,
      illustration = 'no-campaigns',
      icon,
      title,
      description,
      action,
      secondaryAction,
      animate = true,
      maxWidth = 'md',
      children,
      ...props
    },
    ref,
  ) => {
    // Get icon from map if illustration is a string key
    const IconComponent =
      typeof illustration === 'string' && iconMap[illustration] ? iconMap[illustration] : null;

    const maxWidthClass = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
    }[maxWidth];

    const containerVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
          staggerChildren: 0.1,
        },
      },
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.3,
        },
      },
    };

    const Content = (
      <>
        {/* Icon/Illustration */}
        <motion.div
          className="mb-4 flex items-center justify-center"
          variants={animate ? itemVariants : undefined}
        >
          {icon ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {icon}
            </div>
          ) : IconComponent ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-infinite-purple/10 to-infinite-teal/10 text-infinite-purple">
              <IconComponent className="h-10 w-10" strokeWidth={1.5} />
            </div>
          ) : typeof illustration === 'object' ? (
            illustration
          ) : null}
        </motion.div>

        {/* Title */}
        <motion.h3
          className="text-xl font-semibold tracking-tight text-foreground mb-2"
          variants={animate ? itemVariants : undefined}
        >
          {title}
        </motion.h3>

        {/* Description */}
        {description && (
          <motion.p
            className="text-sm text-muted-foreground mb-6 leading-relaxed"
            variants={animate ? itemVariants : undefined}
          >
            {description}
          </motion.p>
        )}

        {/* Custom Content */}
        {children && (
          <motion.div className="mb-4" variants={animate ? itemVariants : undefined}>
            {children}
          </motion.div>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <motion.div
            className="flex flex-col sm:flex-row items-center gap-3"
            variants={animate ? itemVariants : undefined}
          >
            {action}
            {secondaryAction}
          </motion.div>
        )}
      </>
    );

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cn(emptyStateVariants({ variant }), maxWidthClass, 'mx-auto', className)}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          {...props}
        >
          {Content}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(emptyStateVariants({ variant }), maxWidthClass, 'mx-auto', className)}
        {...props}
      >
        {Content}
      </div>
    );
  },
);

EmptyState.displayName = 'EmptyState';

export { EmptyState, emptyStateVariants };
