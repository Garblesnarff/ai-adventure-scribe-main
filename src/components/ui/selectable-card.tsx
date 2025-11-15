/**
 * SelectableCard Component
 *
 * Interactive card for selections (race, class, genre, background, etc.)
 * with hover previews, animations, and visual feedback.
 *
 * Usage:
 * <SelectableCard
 *   title="Human"
 *   description="Versatile and ambitious"
 *   selected={selectedRace === 'human'}
 *   onSelect={() => setSelectedRace('human')}
 *   icon={<UserIcon />}
 * />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const selectableCardVariants = cva(
  'relative group cursor-pointer rounded-lg border-2 p-4 transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-card hover:bg-card-hover border-border hover:border-primary/50',
        fantasy: 'fantasy-card border-amber-200/50 hover:border-infinite-gold/60',
        cosmic:
          'border-infinite-purple/30 bg-gradient-to-br from-[rgba(45,17,85,0.1)] to-[rgba(15,41,69,0.05)] hover:from-[rgba(45,17,85,0.2)] hover:to-[rgba(15,41,69,0.1)]',
      },
      size: {
        sm: 'p-3 min-h-[80px]',
        default: 'p-4 min-h-[120px]',
        lg: 'p-6 min-h-[160px]',
        xl: 'p-8 min-h-[200px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface SelectableCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof selectableCardVariants> {
  /** Card title */
  title: string;
  /** Card description */
  description?: string;
  /** Whether card is selected */
  selected?: boolean;
  /** Callback when card is selected */
  onSelect?: () => void;
  /** Optional icon/image */
  icon?: React.ReactNode;
  /** Optional badge (e.g., "Recommended", "New") */
  badge?: string;
  /** Disable selection */
  disabled?: boolean;
  /** Show hover preview */
  showPreview?: boolean;
  /** Preview content (shown on hover) */
  previewContent?: React.ReactNode;
  /** Animate on mount */
  animate?: boolean;
}

const SelectableCard = React.forwardRef<HTMLDivElement, SelectableCardProps>(
  (
    {
      className,
      variant,
      size,
      title,
      description,
      selected = false,
      onSelect,
      icon,
      badge,
      disabled = false,
      showPreview = false,
      previewContent,
      animate = true,
      children,
      ...props
    },
    ref,
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const cardVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        },
      },
    };

    const handleClick = () => {
      if (!disabled && onSelect) {
        onSelect();
      }
    };

    const CardContent = (
      <>
        {/* Selection Indicator */}
        {selected && (
          <motion.div
            className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-infinite-purple text-white shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <Check className="h-4 w-4" />
          </motion.div>
        )}

        {/* Badge */}
        {badge && !selected && (
          <div className="absolute top-2 right-2 z-10 rounded-full bg-infinite-gold px-2 py-0.5 text-xs font-semibold text-white shadow-md">
            {badge}
          </div>
        )}

        {/* Main Content */}
        <div className="relative z-0 flex flex-col items-start space-y-2">
          {/* Icon */}
          {icon && (
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 text-infinite-purple group-hover:bg-infinite-purple/10 transition-colors"
              whileHover={{ scale: 1.1 }}
            >
              {icon}
            </motion.div>
          )}

          {/* Title */}
          <h3 className="text-lg font-semibold tracking-tight text-foreground group-hover:text-infinite-purple transition-colors">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}

          {/* Additional Content */}
          {children}
        </div>

        {/* Hover Glow Effect */}
        {!disabled && (
          <div
            className={cn(
              'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100',
              'bg-gradient-to-br from-infinite-purple/5 to-infinite-teal/5 pointer-events-none',
            )}
          />
        )}

        {/* Selected Border Glow */}
        {selected && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-infinite-purple pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </>
    );

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cn(
            selectableCardVariants({ variant, size }),
            selected &&
              'border-infinite-purple bg-infinite-purple/5 shadow-lg shadow-infinite-purple/20',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={
            !disabled
              ? {
                  y: -4,
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15)',
                  transition: { duration: 0.2 },
                }
              : undefined
          }
          whileTap={!disabled ? { scale: 0.98 } : undefined}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          {...props}
        >
          {CardContent}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          selectableCardVariants({ variant, size }),
          selected &&
            'border-infinite-purple bg-infinite-purple/5 shadow-lg shadow-infinite-purple/20',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {CardContent}
      </div>
    );
  },
);

SelectableCard.displayName = 'SelectableCard';

export { SelectableCard, selectableCardVariants };
