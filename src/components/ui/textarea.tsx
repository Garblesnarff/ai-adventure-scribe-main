import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'fantasy';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          variant === 'fantasy'
            ? 'min-h-[160px] border-2 bg-white/80 backdrop-blur-sm border-amber-200 hover:border-amber-300 focus-visible:border-infinite-purple focus-visible:ring-infinite-purple/30 transition-all duration-200 ease-in-out font-serif text-base leading-relaxed'
            : 'border border-input bg-background focus-visible:ring-electricCyan',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
