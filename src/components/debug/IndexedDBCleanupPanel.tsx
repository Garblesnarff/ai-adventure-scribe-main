/**
 * IndexedDB Cleanup Debug Panel
 *
 * A debug/settings panel component that displays cleanup statistics
 * and provides manual cleanup controls for IndexedDB agent messages.
 *
 * Usage:
 * ```tsx
 * import { IndexedDBCleanupPanel } from '@/components/debug/IndexedDBCleanupPanel';
 *
 * // In your settings or debug page
 * <IndexedDBCleanupPanel />
 * ```
 *
 * @author AI Dungeon Master Team
 */

import { Loader2, Trash2, RefreshCw, Info } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useIndexedDBCleanup,
  formatCleanupStats,
  timeSinceLastCleanup,
} from '@/hooks/use-indexeddb-cleanup';

/**
 * Panel component for IndexedDB cleanup management
 */
export function IndexedDBCleanupPanel() {
  const { stats, manualCleanup, isLoading, error, refreshStats } = useIndexedDBCleanup();
  const [selectedAge, setSelectedAge] = useState<number>(24 * 60 * 60 * 1000); // Default 24 hours

  const formattedStats = formatCleanupStats(stats);
  const timeSince = timeSinceLastCleanup(stats.lastCleanupTime);

  const handleCleanup = async () => {
    try {
      const deletedCount = await manualCleanup(selectedAge);

      toast.success('Cleanup Complete', {
        description: `Removed ${deletedCount} old message${deletedCount !== 1 ? 's' : ''} from storage`,
      });
    } catch (err) {
      toast.error('Cleanup Failed', {
        description: err instanceof Error ? err.message : 'An unknown error occurred',
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          IndexedDB Cleanup
        </CardTitle>
        <CardDescription>
          Manage storage of old agent messages. Cleanup runs automatically every 6 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Last Cleanup</p>
            <p className="text-lg font-semibold">{timeSince}</p>
            <p className="text-xs text-muted-foreground">{formattedStats.lastCleanupText}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Deleted</p>
            <p className="text-lg font-semibold">{formattedStats.totalDeletedText}</p>
            <p className="text-xs text-muted-foreground">All-time total</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Last Cleanup</p>
            <p className="text-lg font-semibold">{formattedStats.lastDeletedText}</p>
            <p className="text-xs text-muted-foreground">Messages removed</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info Box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Cleanup removes acknowledged and sent messages older than the selected age. Pending and
            failed messages are preserved for retry.
          </AlertDescription>
        </Alert>

        {/* Age Selection */}
        <div className="space-y-2">
          <label htmlFor="cleanup-age" className="text-sm font-medium">
            Delete messages older than:
          </label>
          <select
            id="cleanup-age"
            value={selectedAge}
            onChange={(e) => setSelectedAge(Number(e.target.value))}
            className="w-full p-2 border rounded-md bg-background"
            disabled={isLoading}
          >
            <option value={1 * 60 * 60 * 1000}>1 hour</option>
            <option value={6 * 60 * 60 * 1000}>6 hours</option>
            <option value={24 * 60 * 60 * 1000}>24 hours (default)</option>
            <option value={48 * 60 * 60 * 1000}>48 hours</option>
            <option value={7 * 24 * 60 * 60 * 1000}>7 days</option>
            <option value={30 * 24 * 60 * 60 * 1000}>30 days</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleCleanup} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Clean Now
              </>
            )}
          </Button>

          <Button variant="outline" onClick={refreshStats} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Developer Info */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Developer Information</summary>
          <div className="mt-2 p-3 bg-muted rounded-md space-y-1">
            <p>Database: agentMessaging</p>
            <p>Store: messages</p>
            <p>Auto-cleanup interval: 6 hours</p>
            <p>Default max age: 24 hours</p>
            <p>View in DevTools: Application → IndexedDB → agentMessaging → messages</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for embedding in settings
 */
export function IndexedDBCleanupCompact() {
  const { stats, manualCleanup, isLoading } = useIndexedDBCleanup();
  const timeSince = timeSinceLastCleanup(stats.lastCleanupTime);

  const handleQuickCleanup = async () => {
    try {
      const deletedCount = await manualCleanup();
      toast.success(`Removed ${deletedCount} old messages`);
    } catch (err) {
      toast.error('Cleanup failed');
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div>
        <p className="text-sm font-medium">Message Storage Cleanup</p>
        <p className="text-xs text-muted-foreground">
          Last cleanup: {timeSince} ({stats.totalMessagesDeleted} total deleted)
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={handleQuickCleanup} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Clean Now'}
      </Button>
    </div>
  );
}
