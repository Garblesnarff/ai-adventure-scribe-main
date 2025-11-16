import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricCyan focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'border-transparent hover:bg-accent hover:text-accent-foreground',
        link: 'border-transparent text-primary underline-offset-4 hover:underline',
        fantasy:
          'border-infinite-gold bg-gradient-to-r from-amber-50 to-yellow-50 text-infinite-gold hover:bg-amber-100/50 transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-0.5',
        cosmic:
          'border-infinite-purple/30 bg-gradient-to-br from-[rgba(45,17,85,0.95)] to-[rgba(15,41,69,0.92)] text-white hover:from-[rgba(45,17,85,1)] hover:to-[rgba(15,41,69,0.98)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all duration-300',
        parchment:
          'border-amber-200/50 bg-gradient-to-br from-[rgba(255,255,250,0.9)] to-[rgba(250,244,230,0.85)] text-amber-900 hover:from-[rgba(255,255,250,1)] hover:to-[rgba(250,244,230,0.95)] hover:shadow-lg transition-all duration-300',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
