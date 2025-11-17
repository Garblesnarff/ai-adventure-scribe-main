/**
 * Condition Icons Utility
 *
 * Maps D&D 5e conditions to icon components and visual properties.
 * Provides configuration for displaying conditions on battle map tokens.
 *
 * @module utils/condition-icons
 */

import {
  Eye,
  EyeOff,
  Heart,
  Ear,
  EarOff,
  Sparkles,
  Zap,
  AlertTriangle,
  Skull,
  Moon,
  Shield,
  Link,
  Activity,
  XCircle,
  ShieldAlert,
  Hourglass,
  type LucideIcon,
} from 'lucide-react';

import type { ConditionName } from '@/types/combat';

/**
 * Condition visual configuration
 */
export interface ConditionIconConfig {
  /** The icon component from lucide-react */
  icon: LucideIcon;
  /** Display color (tailwind or hex) */
  color: string;
  /** CSS background color for icon container */
  backgroundColor: string;
  /** Display priority (lower = shown first when stacking) */
  priority: number;
  /** Short description for tooltip */
  description: string;
  /** Icon size in pixels */
  size?: number;
}

/**
 * Map condition names to their visual configurations
 */
export const CONDITION_ICONS: Record<ConditionName, ConditionIconConfig> = {
  blinded: {
    icon: EyeOff,
    color: '#ffffff',
    backgroundColor: '#64748b', // slate-500
    priority: 5,
    description: 'Cannot see, auto-fail sight checks, attacks have disadvantage',
    size: 16,
  },
  charmed: {
    icon: Heart,
    color: '#ffffff',
    backgroundColor: '#ec4899', // pink-500
    priority: 6,
    description: "Can't attack charmer, charmer has advantage on social checks",
    size: 16,
  },
  deafened: {
    icon: EarOff,
    color: '#ffffff',
    backgroundColor: '#94a3b8', // slate-400
    priority: 8,
    description: 'Cannot hear, auto-fail hearing checks',
    size: 16,
  },
  frightened: {
    icon: AlertTriangle,
    color: '#ffffff',
    backgroundColor: '#f59e0b', // amber-500
    priority: 4,
    description: 'Disadvantage on checks/attacks while source is in sight, cannot move closer',
    size: 16,
  },
  grappled: {
    icon: Link,
    color: '#ffffff',
    backgroundColor: '#8b5cf6', // violet-500
    priority: 7,
    description: 'Speed becomes 0, cannot benefit from speed bonuses',
    size: 16,
  },
  incapacitated: {
    icon: XCircle,
    color: '#ffffff',
    backgroundColor: '#ef4444', // red-500
    priority: 2,
    description: 'Cannot take actions or reactions',
    size: 16,
  },
  invisible: {
    icon: Eye,
    color: '#ffffff',
    backgroundColor: '#06b6d4', // cyan-500
    priority: 9,
    description: 'Cannot be seen, attacks have advantage, attacks against have disadvantage',
    size: 16,
  },
  paralyzed: {
    icon: Zap,
    color: '#ffffff',
    backgroundColor: '#eab308', // yellow-500
    priority: 1,
    description: 'Incapacitated, auto-fail STR/DEX saves, attacks have advantage, hits are crits',
    size: 16,
  },
  petrified: {
    icon: Shield,
    color: '#ffffff',
    backgroundColor: '#71717a', // zinc-500
    priority: 1,
    description: 'Incapacitated, resistance to all damage, immune to poison/disease',
    size: 16,
  },
  poisoned: {
    icon: ShieldAlert,
    color: '#ffffff',
    backgroundColor: '#22c55e', // green-500
    priority: 5,
    description: 'Disadvantage on attack rolls and ability checks',
    size: 16,
  },
  prone: {
    icon: Moon,
    color: '#ffffff',
    backgroundColor: '#0ea5e9', // sky-500
    priority: 6,
    description: 'Disadvantage on attacks, melee attacks against have advantage',
    size: 16,
  },
  restrained: {
    icon: Activity,
    color: '#ffffff',
    backgroundColor: '#f97316', // orange-500
    priority: 3,
    description: 'Speed = 0, disadvantage on DEX saves, attacks against have advantage',
    size: 16,
  },
  stunned: {
    icon: Sparkles,
    color: '#ffffff',
    backgroundColor: '#fbbf24', // amber-400
    priority: 2,
    description: 'Incapacitated, auto-fail STR/DEX saves, attacks against have advantage',
    size: 16,
  },
  unconscious: {
    icon: Skull,
    color: '#ffffff',
    backgroundColor: '#1f2937', // gray-800
    priority: 0,
    description: 'Incapacitated, prone, drops held items, auto-fail STR/DEX saves, attacks are crits',
    size: 16,
  },
  exhaustion: {
    icon: Hourglass,
    color: '#ffffff',
    backgroundColor: '#7c3aed', // violet-600
    priority: 3,
    description: 'Cumulative penalties based on exhaustion level',
    size: 16,
  },
  surprised: {
    icon: AlertTriangle,
    color: '#ffffff',
    backgroundColor: '#fb923c', // orange-400
    priority: 10,
    description: "Can't move or take actions on first turn of combat",
    size: 16,
  },
};

/**
 * Get sorted conditions by priority for display
 * Lower priority numbers are shown first
 */
export function getSortedConditions(conditions: ConditionName[]): ConditionName[] {
  return [...conditions].sort((a, b) => {
    const priorityA = CONDITION_ICONS[a]?.priority ?? 999;
    const priorityB = CONDITION_ICONS[b]?.priority ?? 999;
    return priorityA - priorityB;
  });
}

/**
 * Get the most important condition (lowest priority number)
 */
export function getPrimaryCondition(conditions: ConditionName[]): ConditionName | null {
  if (conditions.length === 0) return null;
  return getSortedConditions(conditions)[0];
}

/**
 * Get condition icon configuration
 */
export function getConditionIcon(condition: ConditionName): ConditionIconConfig | null {
  return CONDITION_ICONS[condition] || null;
}

/**
 * Get exhaustion level from condition
 */
export function getExhaustionLevel(
  conditions: Array<{ name: ConditionName; level?: number }>,
): number {
  const exhaustion = conditions.find((c) => c.name === 'exhaustion');
  return exhaustion?.level ?? 0;
}

/**
 * Format exhaustion description with level
 */
export function formatExhaustionDescription(level: number): string {
  const effects = [
    'No effect',
    'Disadvantage on ability checks',
    'Speed halved',
    'Disadvantage on attack rolls and saving throws',
    'Hit point maximum halved',
    'Speed reduced to 0',
    'Death',
  ];
  return `Exhaustion Level ${level}: ${effects[level] || 'Unknown'}`;
}

/**
 * Check if condition should pulse/animate
 */
export function shouldConditionPulse(condition: ConditionName): boolean {
  // High-priority/severe conditions should pulse to draw attention
  const pulsing: ConditionName[] = [
    'unconscious',
    'paralyzed',
    'stunned',
    'petrified',
    'incapacitated',
  ];
  return pulsing.includes(condition);
}

/**
 * Get condition border color for token highlighting
 */
export function getConditionBorderColor(conditions: ConditionName[]): string | null {
  if (conditions.length === 0) return null;

  // Priority order for border colors (most severe shown)
  const primary = getPrimaryCondition(conditions);
  if (!primary) return null;

  const config = CONDITION_ICONS[primary];
  return config?.backgroundColor || null;
}
