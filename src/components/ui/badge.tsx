import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-electricCyan focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Status badges
        success: 'status-badge-success',
        warning: 'status-badge-warning',
        danger: 'status-badge-danger',
        info: 'status-badge-info',
        // Fantasy-themed variants
        purple:
          'border-infinite-purple/30 bg-infinite-purple/10 text-infinite-purple hover:bg-infinite-purple/20',
        gold: 'border-infinite-gold/30 bg-infinite-gold/10 text-infinite-gold hover:bg-infinite-gold/20',
        teal: 'border-infinite-teal/30 bg-infinite-teal/10 text-infinite-teal hover:bg-infinite-teal/20',
        // Stat display (larger, more prominent)
        stat: 'px-3 py-1 text-sm font-bold border-2 hover:scale-105 hover:shadow-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  },
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
