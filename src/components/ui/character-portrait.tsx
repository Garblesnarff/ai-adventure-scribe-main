/**
 * CharacterPortrait Component
 *
 * Unified character avatar display with optional stats overlay.
 * Used in campaign cards, character sheets, game session headers, etc.
 *
 * Usage:
 * <CharacterPortrait
 *   name="Aragorn"
 *   race="Human"
 *   class="Ranger"
 *   level={5}
 *   size="md"
 *   showStats
 * />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { User, Heart, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';

const characterPortraitVariants = cva(
  'relative inline-flex items-center justify-center rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/60 transition-all duration-300',
  {
    variants: {
      size: {
        xs: 'h-8 w-8 text-xs',
        sm: 'h-12 w-12 text-sm',
        md: 'h-16 w-16 text-base',
        lg: 'h-24 w-24 text-lg',
        xl: 'h-32 w-32 text-xl',
        '2xl': 'h-40 w-40 text-2xl',
      },
      variant: {
        default: 'border-2 border-border',
        fantasy: 'border-2 border-amber-200/50 shadow-md',
        cosmic: 'border-2 border-infinite-purple/30 shadow-lg shadow-infinite-purple/20',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

export interface CharacterPortraitProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof characterPortraitVariants> {
  /** Character name */
  name: string;
  /** Character race */
  race?: string;
  /** Character class */
  class?: string;
  /** Character level */
  level?: number;
  /** Image URL */
  imageUrl?: string;
  /** Show stats overlay */
  showStats?: boolean;
  /** HP (current) */
  hp?: number;
  /** HP (max) */
  maxHp?: number;
  /** AC */
  ac?: number;
  /** Initiative */
  initiative?: number;
  /** Status effects */
  status?: string[];
  /** Show character details on hover */
  showDetailsOnHover?: boolean;
  /** Animate on mount */
  animate?: boolean;
}

const CharacterPortrait = React.forwardRef<HTMLDivElement, CharacterPortraitProps>(
  (
    {
      className,
      size,
      variant,
      name,
      race,
      class: characterClass,
      level,
      imageUrl,
      showStats = false,
      hp,
      maxHp,
      ac,
      initiative,
      status = [],
      showDetailsOnHover = false,
      animate = true,
      ...props
    },
    ref,
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);

    // Generate initials from name
    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Calculate HP percentage for color
    const hpPercentage = hp && maxHp ? (hp / maxHp) * 100 : 100;
    const hpColor =
      hpPercentage <= 25
        ? 'text-red-500'
        : hpPercentage <= 50
          ? 'text-yellow-500'
          : 'text-green-500';

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

    const Content = (
      <>
        {/* Avatar */}
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex items-center justify-center text-muted-foreground font-semibold">
            {initials || <User className="h-1/2 w-1/2" />}
          </div>
        )}

        {/* Level Badge */}
        {level !== undefined && (
          <div className="absolute top-1 left-1 z-10">
            <Badge variant="purple" className="text-xs font-bold px-1.5 py-0.5">
              {level}
            </Badge>
          </div>
        )}

        {/* Stats Overlay (Bottom) */}
        {showStats && (hp !== undefined || ac !== undefined || initiative !== undefined) && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-1.5 backdrop-blur-sm">
            <div className="flex items-center justify-around gap-1 text-white text-[0.625rem]">
              {hp !== undefined && maxHp !== undefined && (
                <div className="flex items-center gap-0.5">
                  <Heart className={cn('h-3 w-3', hpColor)} fill="currentColor" />
                  <span className="font-semibold tabular-nums">
                    {hp}/{maxHp}
                  </span>
                </div>
              )}
              {ac !== undefined && (
                <div className="flex items-center gap-0.5">
                  <Shield className="h-3 w-3 text-blue-400" />
                  <span className="font-semibold tabular-nums">{ac}</span>
                </div>
              )}
              {initiative !== undefined && (
                <div className="flex items-center gap-0.5">
                  <Zap className="h-3 w-3 text-yellow-400" />
                  <span className="font-semibold tabular-nums">+{initiative}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Effects */}
        {status.length > 0 && (
          <div className="absolute top-1 right-1 z-10 flex flex-col gap-1">
            {status.slice(0, 3).map((effect, index) => (
              <Badge key={index} variant="warning" className="text-[0.625rem] px-1 py-0">
                {effect}
              </Badge>
            ))}
          </div>
        )}

        {/* Hover Details */}
        {showDetailsOnHover && isHovered && (race || characterClass) && (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-2 text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center">
              <div className="font-semibold text-sm">{name}</div>
              {level && <div className="text-xs text-muted-foreground">Level {level}</div>}
              {race && characterClass && (
                <div className="text-xs text-muted-foreground">
                  {race} {characterClass}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Glow Effect on Hover */}
        <div
          className={cn(
            'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none',
            'bg-gradient-to-br from-infinite-purple/20 to-infinite-teal/20',
            isHovered && 'opacity-100',
          )}
        />
      </>
    );

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cn(characterPortraitVariants({ size, variant }), className)}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.05 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          {...props}
        >
          {Content}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(characterPortraitVariants({ size, variant }), className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {Content}
      </div>
    );
  },
);

CharacterPortrait.displayName = 'CharacterPortrait';

export { CharacterPortrait, characterPortraitVariants };
