/**
 * Combat Components Public API
 *
 * Exports all combat-related UI components for use outside the feature.
 */

// Combat UI Components (default exports)
export { default as CombatInterface } from './ui/CombatInterface';
export { default as InitiativeTracker } from './ui/InitiativeTracker';
export { default as CombatLog } from './ui/CombatLog';
export { default as EnemyCard } from './ui/EnemyCard';

// Combat UI Components (named exports)
export { CombatStatus } from './ui/CombatStatus';

// Combat Panels (named exports)
export { ActionPanel } from './ui/ActionPanel';
export { CombatActionPanel } from './ui/CombatActionPanel';
export { MovementActionPanel } from './ui/MovementActionPanel';
export { SpellCastingPanel } from './ui/SpellCastingPanel';
export { AttackSelectionPanel } from './ui/AttackSelectionPanel';
export { WeaponManagementPanel } from './ui/WeaponManagementPanel';
export { GrappleActionPanel } from './ui/GrappleActionPanel';
export { RestActionPanel } from './ui/RestActionPanel';
export { ResourceConsumptionPanel } from './ui/ResourceConsumptionPanel';
export { ReactionOpportunityPanel } from './ui/ReactionOpportunityPanel';

// Combat Utilities (named exports)
export { HPTracker } from './ui/HPTracker';
export { DeathSaveManager } from './ui/DeathSaveManager';
export { CombatMessage, InitiativeMessage, CombatSummaryMessage } from './ui/CombatMessage';
export { AttackRollVisualization } from './ui/AttackRollVisualization';
export { CriticalHitIndicator } from './ui/CriticalHitIndicator';
export { CombatTrackerSkeleton } from './ui/CombatTrackerSkeleton';

// Test Components (development only)
export { CombatTestPage } from './ui/CombatTestPage';
