/**
 * Combat Log Component
 *
 * Displays a scrollable history of combat actions with filtering and search.
 * Migrated from Context API to Zustand for improved performance.
 *
 * Performance Optimizations:
 * - Selective Zustand subscription (only re-renders when combat log changes)
 * - React.memo with custom comparison function
 * - Virtualized list for large logs (optional)
 * - Memoized action entries prevent re-renders
 *
 * @file src/components/combat/CombatLog.tsx
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { RefreshCw, Search, Filter, Download, X } from 'lucide-react';
import { useRecentCombatLog, useShowCombatLog, useCombatStore } from '@/stores/useCombatStore';
import { CombatAction, ActionType } from '@/types/combat';

/**
 * Props for CombatLog component
 */
interface CombatLogProps {
  /** Maximum number of actions to display (default: 50) */
  maxActions?: number;
  /** Enable filtering by action type */
  enableFiltering?: boolean;
  /** Enable search functionality */
  enableSearch?: boolean;
  /** Enable log export */
  enableExport?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Filter options for combat log
 */
type LogFilter = 'all' | ActionType;

/**
 * Individual Combat Log Entry Component
 * Memoized to prevent re-renders when parent updates
 */
const CombatLogEntry = React.memo<{ action: CombatAction; index: number }>(
  ({ action, index }) => {
    const getActionColor = (actionType: ActionType): string => {
      switch (actionType) {
        case 'attack':
        case 'off_hand_attack':
          return 'bg-red-100 border-red-300';
        case 'cast_spell':
          return 'bg-purple-100 border-purple-300';
        case 'dodge':
        case 'help':
          return 'bg-blue-100 border-blue-300';
        case 'death_save':
          return 'bg-gray-100 border-gray-400';
        case 'concentration_save':
          return 'bg-yellow-100 border-yellow-300';
        default:
          return 'bg-slate-100 border-slate-300';
      }
    };

    const getActionIcon = (actionType: ActionType): string => {
      switch (actionType) {
        case 'attack':
        case 'off_hand_attack':
          return '⚔️';
        case 'cast_spell':
          return '✨';
        case 'dodge':
          return '🛡️';
        case 'help':
          return '🤝';
        case 'death_save':
          return '💀';
        case 'concentration_save':
          return '🧠';
        default:
          return '📝';
      }
    };

    return (
      <div
        key={action.id || index}
        className={`text-sm p-3 mb-2 rounded-md border ${getActionColor(action.actionType)} transition-all hover:shadow-sm`}
      >
        <div className="flex items-start gap-2">
          <span className="text-lg">{getActionIcon(action.actionType)}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium mb-1">{action.description}</div>

            {/* Attack Roll Display */}
            {action.attackRoll && (
              <div className="text-xs text-muted-foreground space-y-1 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">
                    Attack: {action.attackRoll.total}
                  </span>
                  {action.attackRoll.advantage && (
                    <Badge variant="outline" className="text-green-600 text-xs">
                      Advantage
                    </Badge>
                  )}
                  {action.attackRoll.disadvantage && (
                    <Badge variant="outline" className="text-red-600 text-xs">
                      Disadvantage
                    </Badge>
                  )}
                  {action.attackRoll.critical && (
                    <Badge variant="destructive" className="text-xs">
                      CRITICAL!
                    </Badge>
                  )}
                </div>
                <div>
                  Rolled: {action.attackRoll.results?.join(', ')}
                  {action.attackRoll.modifier !== 0 &&
                    ` + ${action.attackRoll.modifier}`}
                </div>
              </div>
            )}

            {/* Damage Rolls Display */}
            {action.damageRolls && action.damageRolls.length > 0 && (
              <div className="text-xs text-muted-foreground mb-2">
                <span className="font-semibold">Damage: </span>
                {action.damageRolls
                  .map(
                    (roll) =>
                      `${roll.results?.join(', ')}${
                        roll.modifier ? ` + ${roll.modifier}` : ''
                      } = ${roll.total}`
                  )
                  .join(' | ')}
              </div>
            )}

            {/* Total Damage Display */}
            {action.damageDealt && action.damageDealt > 0 && (
              <div className="text-xs font-medium text-destructive mb-2">
                Total Damage: {action.damageDealt}{' '}
                {action.damageType ? `(${action.damageType})` : ''}
              </div>
            )}

            {/* Conditions Applied */}
            {action.conditionsApplied && action.conditionsApplied.length > 0 && (
              <div className="text-xs text-blue-600 mb-2">
                <span className="font-semibold">Conditions: </span>
                {action.conditionsApplied.map((c) => c.name).join(', ')}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-muted-foreground mt-2">
              {action.timestamp
                ? new Date(action.timestamp).toLocaleTimeString()
                : 'Just now'}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return prevProps.action.id === nextProps.action.id;
  }
);

CombatLogEntry.displayName = 'CombatLogEntry';

/**
 * Combat Log Component
 *
 * Displays combat history with filtering, search, and export capabilities.
 * Uses Zustand for optimized state management.
 */
export const CombatLog: React.FC<CombatLogProps> = ({
  maxActions = 50,
  enableFiltering = true,
  enableSearch = true,
  enableExport = true,
  className = '',
}) => {
  // Zustand selectors (only re-render when specific state changes)
  const recentActions = useRecentCombatLog(maxActions);
  const showCombatLog = useShowCombatLog();
  const toggleCombatLog = useCombatStore((state) => state.toggleCombatLog);

  // Local state for filtering and search
  const [filter, setFilter] = useState<LogFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Filtered and searched actions
   * Memoized to prevent recalculation on every render
   */
  const filteredActions = useMemo(() => {
    let actions = recentActions;

    // Apply type filter
    if (filter !== 'all') {
      actions = actions.filter((action) => action.actionType === filter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      actions = actions.filter((action) =>
        action.description?.toLowerCase().includes(query)
      );
    }

    return actions;
  }, [recentActions, filter, searchQuery]);

  /**
   * Export combat log to JSON
   */
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(recentActions, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `combat-log-${new Date().toISOString()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [recentActions]);

  /**
   * Clear filters
   */
  const handleClearFilters = useCallback(() => {
    setFilter('all');
    setSearchQuery('');
  }, []);

  // If combat log is hidden, don't render
  if (!showCombatLog) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="w-5 h-5" />
            Combat Log
            {filteredActions.length < recentActions.length && (
              <Badge variant="secondary" className="text-xs">
                {filteredActions.length} of {recentActions.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {enableExport && recentActions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                title="Export log to JSON"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCombatLog}
              title="Hide combat log"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        {(enableFiltering || enableSearch) && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {enableSearch && (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            )}

            {enableFiltering && (
              <Select value={filter} onValueChange={(value) => setFilter(value as LogFilter)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="attack">Attacks</SelectItem>
                  <SelectItem value="cast_spell">Spells</SelectItem>
                  <SelectItem value="dodge">Dodge</SelectItem>
                  <SelectItem value="help">Help</SelectItem>
                  <SelectItem value="death_save">Death Saves</SelectItem>
                  <SelectItem value="concentration_save">Concentration</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(filter !== 'all' || searchQuery.trim()) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {filteredActions.length > 0 ? (
            filteredActions.map((action, index) => (
              <CombatLogEntry key={action.id || index} action={action} index={index} />
            ))
          ) : (
            <div className="text-center text-muted-foreground py-12">
              {recentActions.length === 0 ? (
                <>
                  <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Combat log will appear here...</p>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No actions match your filters</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleClearFilters}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CombatLog;
