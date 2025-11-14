/**
 * Error Tracking Service
 *
 * This file defines the ErrorTrackingService class, responsible for tracking
 * errors within the application. It maintains in-memory statistics for errors,
 * persists error information to a database (Supabase), and provides basic
 * analysis for detecting error patterns.
 *
 * Main Class:
 * - ErrorTrackingService: Tracks and analyzes application errors.
 *
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - Error types from '../types'.
 *
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project Types
import { ErrorCategory, ErrorMetadata } from '../types';
import { logger } from '../../../lib/logger';

export class ErrorTrackingService {
  private errorStats: Map<
    string,
    {
      count: number;
      firstSeen: number;
      lastSeen: number;
    }
  > = new Map();

  public async trackError(
    error: Error,
    category: ErrorCategory,
    context: string,
    metadata?: ErrorMetadata,
  ): Promise<void> {
    // Update in-memory stats
    this.updateErrorStats(error, context);

    // Persist error information
    await this.persistError(error, category, context, metadata);

    // Analyze error patterns
    this.analyzeErrorPatterns(context);
  }

  private updateErrorStats(error: Error, context: string): void {
    const key = `${context}:${error.message}`;
    const now = Date.now();

    if (this.errorStats.has(key)) {
      const stats = this.errorStats.get(key)!;
      stats.count++;
      stats.lastSeen = now;
    } else {
      this.errorStats.set(key, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
      });
    }
  }

  private async persistError(
    error: Error,
    category: ErrorCategory,
    context: string,
    metadata?: ErrorMetadata,
  ): Promise<void> {
    await supabase.from('agent_communications').insert({
      message_type: 'error_tracked',
      content: {
        error: error.message,
        stack: error.stack,
        category,
        context,
        metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private analyzeErrorPatterns(context: string): void {
    const threshold = 5; // Number of errors to trigger pattern analysis
    const timeWindow = 300000; // 5 minutes in milliseconds

    for (const [key, stats] of this.errorStats.entries()) {
      if (
        key.startsWith(context) &&
        stats.count >= threshold &&
        stats.lastSeen - stats.firstSeen <= timeWindow
      ) {
        logger.warn(
          `[ErrorTrackingService] Error pattern detected in ${context}: ` +
            `${stats.count} occurrences in ${(stats.lastSeen - stats.firstSeen) / 1000}s`,
        );
      }
    }
  }

  public getErrorStats(context: string): Array<{
    error: string;
    stats: { count: number; firstSeen: number; lastSeen: number };
  }> {
    return Array.from(this.errorStats.entries())
      .filter(([key]) => key.startsWith(context))
      .map(([key, stats]) => ({
        error: key.split(':')[1],
        stats,
      }));
  }
}
