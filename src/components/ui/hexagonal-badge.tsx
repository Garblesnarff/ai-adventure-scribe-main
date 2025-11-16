import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const hexagonalBadgeVariants = cva(
  'inline-flex items-center justify-center border font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-electricCyan focus-visible:ring-offset-2 relative hover:scale-105',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-md',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:shadow-md',
        outline: 'text-foreground border-border hover:bg-accent/10 hover:border-accent',
        // Status badges with electricCyan theming
        status:
          'border-electricCyan/40 bg-electricCyan/10 text-electricCyan hover:bg-electricCyan/20 hover:shadow-[0_0_8px_rgba(6,182,212,0.3)]',
        success: 'status-badge-success hover:shadow-md',
        warning: 'status-badge-warning hover:shadow-md',
        danger: 'status-badge-danger hover:shadow-md',
        info: 'status-badge-info hover:shadow-md',
        // Fantasy-themed variants
        purple:
          'border-infinite-purple/30 bg-infinite-purple/10 text-infinite-purple hover:bg-infinite-purple/20 hover:shadow-[0_0_8px_rgba(107,70,193,0.3)]',
        gold: 'border-infinite-gold/30 bg-infinite-gold/10 text-infinite-gold hover:bg-infinite-gold/20 hover:shadow-[0_0_8px_rgba(245,158,11,0.3)]',
        teal: 'border-infinite-teal/30 bg-infinite-teal/10 text-infinite-teal hover:bg-infinite-teal/20 hover:shadow-[0_0_8px_rgba(8,145,178,0.3)]',
        // Stat display (larger, more prominent)
        stat: 'border-2 hover:scale-110 hover:shadow-lg',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
      },
      pulse: {
        true: 'animate-pulse-soft',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      pulse: false,
    },
  },
);

export interface HexagonalBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof hexagonalBadgeVariants> {}

const HexagonalBadge = React.forwardRef<HTMLDivElement, HexagonalBadgeProps>(
  ({ className, variant, size, pulse, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(hexagonalBadgeVariants({ variant, size, pulse }), className)}
        style={{
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
        }}
        {...props}
      />
    );
  },
);
HexagonalBadge.displayName = 'HexagonalBadge';

export { HexagonalBadge, hexagonalBadgeVariants };
