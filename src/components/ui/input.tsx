import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'> & { variant?: 'default' | 'fantasy' }
>(({ className, type, variant = 'default', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        variant === 'fantasy'
          ? 'h-12 border-2 bg-white/80 backdrop-blur-sm border-amber-200 hover:border-amber-300 focus-visible:border-infinite-gold focus-visible:ring-infinite-gold/30 transition-all duration-200 ease-in-out'
          : 'border border-input bg-background focus-visible:ring-electricCyan',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
