/**
 * Migration Monitoring Service
 *
 * Tracks metrics and performance during the LangGraph migration.
 * Provides insights into:
 * - Which system is being used (legacy vs LangGraph)
 * - Success rates for each system
 * - Performance comparisons
 * - Error rates and types
 * - Feature flag adoption
 *
 * This data helps make informed decisions about the migration rollout.
 *
 * @module services/migration-monitoring
 */

import logger from '@/lib/logger';

/**
 * System type being used
 */
export type SystemType = 'legacy' | 'langgraph' | 'crewai';

/**
 * Outcome of an AI interaction
 */
export type InteractionOutcome = 'success' | 'error' | 'fallback';

/**
 * Metrics for a single interaction
 */
export interface InteractionMetrics {
  system: SystemType;
  outcome: InteractionOutcome;
  durationMs: number;
  messageLength: number;
  responseLength: number;
  errorType?: string;
  errorMessage?: string;
  sessionId?: string;
  timestamp: Date;
}

/**
 * Aggregated metrics for a system
 */
export interface SystemMetrics {
  system: SystemType;
  totalInteractions: number;
  successCount: number;
  errorCount: number;
  fallbackCount: number;
  averageDurationMs: number;
  averageResponseLength: number;
  successRate: number;
  lastUpdated: Date;
}

/**
 * Migration Monitoring Service
 *
 * Singleton service that collects and aggregates metrics about the migration.
 */
class MigrationMonitoringService {
  private metrics: Map<SystemType, InteractionMetrics[]> = new Map();
  private readonly MAX_METRICS_PER_SYSTEM = 1000; // Keep last 1000 interactions per system

  constructor() {
    this.metrics.set('legacy', []);
    this.metrics.set('langgraph', []);
    this.metrics.set('crewai', []);
  }

  /**
   * Record an interaction with the AI system
   *
   * @param metrics - Metrics for the interaction
   */
  recordInteraction(metrics: InteractionMetrics): void {
    const systemMetrics = this.metrics.get(metrics.system) || [];

    // Add new metrics
    systemMetrics.push(metrics);

    // Trim to max size (FIFO)
    if (systemMetrics.length > this.MAX_METRICS_PER_SYSTEM) {
      systemMetrics.shift();
    }

    this.metrics.set(metrics.system, systemMetrics);

    // Log important events
    if (metrics.outcome === 'error') {
      logger.warn('[MigrationMonitoring] Error recorded:', {
        system: metrics.system,
        error: metrics.errorMessage,
        sessionId: metrics.sessionId,
      });
    }

    if (metrics.outcome === 'fallback') {
      logger.info('[MigrationMonitoring] Fallback occurred:', {
        from: metrics.system,
        to: 'legacy',
        sessionId: metrics.sessionId,
      });
    }

    // Log periodic summary (every 10 interactions)
    const totalInteractions = this.getTotalInteractions();
    if (totalInteractions % 10 === 0) {
      this.logSummary();
    }
  }

  /**
   * Start timing an interaction
   *
   * Returns a function to stop timing and record the interaction.
   *
   * @param system - The system being used
   * @param messageLength - Length of the input message
   * @param sessionId - Optional session ID
   * @returns Function to stop timing and record
   */
  startTiming(
    system: SystemType,
    messageLength: number,
    sessionId?: string,
  ): (outcome: InteractionOutcome, responseLength: number, error?: Error) => void {
    const startTime = Date.now();

    return (outcome: InteractionOutcome, responseLength: number, error?: Error) => {
      const durationMs = Date.now() - startTime;

      this.recordInteraction({
        system,
        outcome,
        durationMs,
        messageLength,
        responseLength,
        errorType: error?.name,
        errorMessage: error?.message,
        sessionId,
        timestamp: new Date(),
      });
    };
  }

  /**
   * Get aggregated metrics for a system
   *
   * @param system - The system to get metrics for
   * @returns Aggregated metrics
   */
  getSystemMetrics(system: SystemType): SystemMetrics {
    const interactions = this.metrics.get(system) || [];

    if (interactions.length === 0) {
      return {
        system,
        totalInteractions: 0,
        successCount: 0,
        errorCount: 0,
        fallbackCount: 0,
        averageDurationMs: 0,
        averageResponseLength: 0,
        successRate: 0,
        lastUpdated: new Date(),
      };
    }

    const successCount = interactions.filter((m) => m.outcome === 'success').length;
    const errorCount = interactions.filter((m) => m.outcome === 'error').length;
    const fallbackCount = interactions.filter((m) => m.outcome === 'fallback').length;

    const totalDuration = interactions.reduce((sum, m) => sum + m.durationMs, 0);
    const totalResponseLength = interactions.reduce((sum, m) => sum + m.responseLength, 0);

    return {
      system,
      totalInteractions: interactions.length,
      successCount,
      errorCount,
      fallbackCount,
      averageDurationMs: totalDuration / interactions.length,
      averageResponseLength: totalResponseLength / interactions.length,
      successRate: successCount / interactions.length,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get metrics for all systems
   */
  getAllMetrics(): Record<SystemType, SystemMetrics> {
    return {
      legacy: this.getSystemMetrics('legacy'),
      langgraph: this.getSystemMetrics('langgraph'),
      crewai: this.getSystemMetrics('crewai'),
    };
  }

  /**
   * Get comparison between LangGraph and legacy systems
   */
  getComparison(): {
    langgraph: SystemMetrics;
    legacy: SystemMetrics;
    comparison: {
      performanceImprovement: number; // Positive = LangGraph faster
      successRateImprovement: number; // Positive = LangGraph more reliable
      langgraphAdoption: number; // Percentage of requests using LangGraph
    };
  } {
    const langgraph = this.getSystemMetrics('langgraph');
    const legacy = this.getSystemMetrics('legacy');

    const totalRequests = langgraph.totalInteractions + legacy.totalInteractions;
    const langgraphAdoption =
      totalRequests > 0 ? (langgraph.totalInteractions / totalRequests) * 100 : 0;

    const performanceImprovement =
      legacy.averageDurationMs > 0
        ? ((legacy.averageDurationMs - langgraph.averageDurationMs) / legacy.averageDurationMs) *
          100
        : 0;

    const successRateImprovement =
      legacy.successRate > 0
        ? ((langgraph.successRate - legacy.successRate) / legacy.successRate) * 100
        : 0;

    return {
      langgraph,
      legacy,
      comparison: {
        performanceImprovement,
        successRateImprovement,
        langgraphAdoption,
      },
    };
  }

  /**
   * Get total number of interactions across all systems
   */
  getTotalInteractions(): number {
    return Array.from(this.metrics.values()).reduce(
      (sum, interactions) => sum + interactions.length,
      0,
    );
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics.set('legacy', []);
    this.metrics.set('langgraph', []);
    this.metrics.set('crewai', []);
    logger.info('[MigrationMonitoring] Metrics cleared');
  }

  /**
   * Log a summary of current metrics
   */
  logSummary(): void {
    const all = this.getAllMetrics();
    const comparison = this.getComparison();

    logger.info('[MigrationMonitoring] Summary:', {
      totalInteractions: this.getTotalInteractions(),
      langgraphAdoption: `${comparison.comparison.langgraphAdoption.toFixed(1)}%`,
      systems: {
        legacy: {
          total: all.legacy.totalInteractions,
          success: all.legacy.successCount,
          errors: all.legacy.errorCount,
          successRate: `${(all.legacy.successRate * 100).toFixed(1)}%`,
          avgDuration: `${all.legacy.averageDurationMs.toFixed(0)}ms`,
        },
        langgraph: {
          total: all.langgraph.totalInteractions,
          success: all.langgraph.successCount,
          errors: all.langgraph.errorCount,
          fallbacks: all.langgraph.fallbackCount,
          successRate: `${(all.langgraph.successRate * 100).toFixed(1)}%`,
          avgDuration: `${all.langgraph.averageDurationMs.toFixed(0)}ms`,
        },
      },
      improvements: {
        performance: `${comparison.comparison.performanceImprovement.toFixed(1)}%`,
        successRate: `${comparison.comparison.successRateImprovement.toFixed(1)}%`,
      },
    });
  }

  /**
   * Export metrics for analysis (e.g., save to file or send to analytics)
   */
  exportMetrics(): {
    timestamp: string;
    totalInteractions: number;
    systems: Record<SystemType, SystemMetrics>;
    comparison: ReturnType<MigrationMonitoringService['getComparison']>['comparison'];
    rawInteractions: {
      legacy: InteractionMetrics[];
      langgraph: InteractionMetrics[];
      crewai: InteractionMetrics[];
    };
  } {
    const comparison = this.getComparison();

    return {
      timestamp: new Date().toISOString(),
      totalInteractions: this.getTotalInteractions(),
      systems: this.getAllMetrics(),
      comparison: comparison.comparison,
      rawInteractions: {
        legacy: this.metrics.get('legacy') || [],
        langgraph: this.metrics.get('langgraph') || [],
        crewai: this.metrics.get('crewai') || [],
      },
    };
  }
}

/**
 * Singleton instance
 */
const migrationMonitoringService = new MigrationMonitoringService();

export default migrationMonitoringService;
export { MigrationMonitoringService };
