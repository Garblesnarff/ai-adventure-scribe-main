/**
 * Feature Flags for LangGraph Migration
 *
 * Controls gradual rollout of LangGraph-based DM agent system.
 * Supports three migration phases:
 * 1. Development testing (LangGraph only in dev)
 * 2. Hybrid mode (LangGraph primary, legacy fallback)
 * 3. Production (LangGraph only)
 *
 * @module lib/feature-flags
 */

/**
 * LangGraph Migration Feature Flags
 *
 * Environment Variables:
 * - VITE_USE_LANGGRAPH: Enable LangGraph DM agent (default: false)
 * - VITE_USE_LEGACY_AGENTS: Keep legacy agent system (default: true)
 * - VITE_HYBRID_MODE: Enable automatic fallback to legacy on errors (default: false)
 *
 * Migration Phases:
 *
 * Phase 1 - Development Testing:
 * ```env
 * VITE_USE_LANGGRAPH=true
 * VITE_USE_LEGACY_AGENTS=true
 * VITE_HYBRID_MODE=true
 * ```
 *
 * Phase 2 - Production Rollout (Canary):
 * ```env
 * VITE_USE_LANGGRAPH=true
 * VITE_USE_LEGACY_AGENTS=true
 * VITE_HYBRID_MODE=false
 * ```
 *
 * Phase 3 - Full Migration:
 * ```env
 * VITE_USE_LANGGRAPH=true
 * VITE_USE_LEGACY_AGENTS=false
 * VITE_HYBRID_MODE=false
 * ```
 */
export const LANGGRAPH_FLAGS = {
  /**
   * Enable LangGraph-based DM agent system
   *
   * When true, components will attempt to use LangGraph for AI responses.
   * When false, legacy agent system is used exclusively.
   *
   * @default false
   */
  USE_LANGGRAPH: import.meta.env.VITE_USE_LANGGRAPH === 'true',

  /**
   * Keep legacy agent system available
   *
   * When true, legacy agents remain loaded for fallback or comparison.
   * When false, legacy agent code is not initialized (memory savings).
   *
   * @default true
   */
  USE_LEGACY_AGENTS: import.meta.env.VITE_USE_LEGACY_AGENTS !== 'false',

  /**
   * Enable hybrid mode with automatic fallback
   *
   * When true, if LangGraph fails, automatically fall back to legacy agents.
   * When false, LangGraph errors are surfaced to the user.
   *
   * Recommended for initial rollout to production.
   *
   * @default false
   */
  HYBRID_MODE: import.meta.env.VITE_HYBRID_MODE === 'true',
} as const;

/**
 * Derived flags for simplified logic
 */
export const MIGRATION_STATE = {
  /**
   * True if LangGraph should be the primary AI system
   */
  LANGGRAPH_PRIMARY: LANGGRAPH_FLAGS.USE_LANGGRAPH,

  /**
   * True if legacy agents should be used as fallback
   */
  LEGACY_FALLBACK: LANGGRAPH_FLAGS.USE_LEGACY_AGENTS && LANGGRAPH_FLAGS.HYBRID_MODE,

  /**
   * True if only legacy system should be used
   */
  LEGACY_ONLY: !LANGGRAPH_FLAGS.USE_LANGGRAPH && LANGGRAPH_FLAGS.USE_LEGACY_AGENTS,

  /**
   * True if only LangGraph should be used (no fallback)
   */
  LANGGRAPH_ONLY: LANGGRAPH_FLAGS.USE_LANGGRAPH && !LANGGRAPH_FLAGS.USE_LEGACY_AGENTS,
} as const;

/**
 * Type-safe feature flag access
 */
export type LangGraphFlags = typeof LANGGRAPH_FLAGS;
export type MigrationState = typeof MIGRATION_STATE;

/**
 * Get human-readable migration phase name
 *
 * @returns Current migration phase name
 */
export function getMigrationPhase(): string {
  if (MIGRATION_STATE.LEGACY_ONLY) {
    return 'Legacy Only (Pre-migration)';
  }

  if (LANGGRAPH_FLAGS.USE_LANGGRAPH && LANGGRAPH_FLAGS.HYBRID_MODE) {
    return 'Hybrid Mode (Testing)';
  }

  if (LANGGRAPH_FLAGS.USE_LANGGRAPH && LANGGRAPH_FLAGS.USE_LEGACY_AGENTS) {
    return 'LangGraph Primary (Canary)';
  }

  if (MIGRATION_STATE.LANGGRAPH_ONLY) {
    return 'LangGraph Only (Complete)';
  }

  return 'Unknown';
}

/**
 * Check if a feature flag is enabled
 *
 * @param flag - Feature flag name
 * @returns True if flag is enabled
 */
export function isEnabled(flag: keyof LangGraphFlags): boolean {
  return LANGGRAPH_FLAGS[flag];
}

/**
 * Get all feature flags for debugging
 *
 * @returns Object with all flag values
 */
export function getAllFlags() {
  return {
    flags: LANGGRAPH_FLAGS,
    state: MIGRATION_STATE,
    phase: getMigrationPhase(),
  };
}

/**
 * Log current migration state (for debugging)
 */
export function logMigrationState(): void {
  if (import.meta.env.DEV) {
    console.log('[FeatureFlags] LangGraph Migration State:', {
      phase: getMigrationPhase(),
      flags: LANGGRAPH_FLAGS,
      derived: MIGRATION_STATE,
    });
  }
}

// Auto-log in development
if (import.meta.env.DEV) {
  logMigrationState();
}
