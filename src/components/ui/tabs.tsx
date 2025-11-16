import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva(
  'inline-flex items-center justify-center p-1 text-muted-foreground transition-all',
  {
    variants: {
      variant: {
        default: 'h-10 rounded-md bg-muted',
        fantasy:
          'h-12 rounded-lg border border-amber-200/50 bg-gradient-to-r from-[rgba(255,255,250,0.6)] to-[rgba(255,250,240,0.4)] shadow-sm',
        cosmic:
          'h-12 rounded-lg border border-infinite-purple/30 bg-gradient-to-r from-[rgba(45,17,85,0.3)] to-[rgba(15,41,69,0.2)] shadow-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricCyan focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'rounded-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        fantasy:
          'rounded-md data-[state=active]:bg-gradient-to-br data-[state=active]:from-[rgba(255,255,250,0.9)] data-[state=active]:to-[rgba(250,244,230,0.85)] data-[state=active]:text-amber-900 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-200/50 hover:bg-amber-50/30',
        cosmic:
          'rounded-md data-[state=active]:bg-gradient-to-br data-[state=active]:from-[rgba(124,58,237,0.2)] data-[state=active]:to-[rgba(15,41,69,0.3)] data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-infinite-purple/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, variant, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  ),
);
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricCyan focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants };
