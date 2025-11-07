import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/admin.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { supabaseService } from '../../lib/supabase.js';

/**
 * Admin routes for system maintenance and operations
 * These routes require authentication and should be restricted to admin users
 */
export default function adminRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(requireAdmin);
  router.use(planRateLimit('default'));

  /**
   * POST /v1/admin/archive-sessions
   * Archive old game sessions to prevent database bloat
   *
   * Body:
   * - retentionDays: number (default: 90) - Sessions older than this will be archived
   * - dryRun: boolean (default: false) - If true, only returns what would be archived
   *
   * Returns:
   * - success: boolean
   * - dry_run: boolean
   * - sessions_archived/sessions_to_archive: number
   * - dialogue_archived/dialogue_to_archive: number
   * - memories_archived/memories_to_archive: number
   * - message: string
   */
  router.post('/archive-sessions', async (req: Request, res: Response) => {
    try {
      const { retentionDays = 90, dryRun = false } = req.body;

      // Validate retention days
      if (typeof retentionDays !== 'number' || retentionDays < 30) {
        return res.status(400).json({
          error: 'Invalid retention period',
          message: 'Retention period must be a number and at least 30 days for safety',
        });
      }

      console.log('Archive request:', {
        retentionDays,
        dryRun,
        userId: req.user!.userId,
      });

      // Call the database function to archive sessions
      const { data, error } = await supabaseService.rpc('archive_old_sessions', {
        retention_days: retentionDays,
        dry_run: dryRun,
      });

      if (error) {
        console.error('Archive function error:', error);
        throw error;
      }

      console.log('Archive result:', data);

      return res.json(data);
    } catch (error) {
      console.error('Archive error:', error);
      // SECURITY: Don't leak error details to client
      return res.status(500).json({
        error: 'Failed to archive sessions',
        message: 'An internal error occurred. Please check server logs.',
      });
    }
  });

  /**
   * POST /v1/admin/restore-session/:sessionId
   * Restore an archived session back to the main tables
   *
   * Params:
   * - sessionId: UUID of the session to restore
   *
   * Returns:
   * - success: boolean
   * - session_id: string
   * - message: string
   */
  router.post('/restore-session/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          error: 'Missing session ID',
          message: 'Session ID is required',
        });
      }

      console.log('Restore request:', {
        sessionId,
        userId: req.user!.userId,
      });

      // Call the database function to restore session
      const { data, error } = await supabaseService.rpc('restore_archived_session', {
        session_id_to_restore: sessionId,
      });

      if (error) {
        console.error('Restore function error:', error);
        throw error;
      }

      console.log('Restore result:', data);

      if (!data.success) {
        return res.status(404).json(data);
      }

      return res.json(data);
    } catch (error) {
      console.error('Restore error:', error);
      // SECURITY: Don't leak error details to client
      return res.status(500).json({
        error: 'Failed to restore session',
        message: 'An internal error occurred. Please check server logs.',
      });
    }
  });

  /**
   * GET /v1/admin/archive-statistics
   * Get statistics about archived vs active data
   *
   * Returns array of statistics for each table:
   * - table_name: string
   * - active_count: number
   * - archived_count: number
   * - active_size: string
   * - archived_size: string
   */
  router.get('/archive-statistics', async (req: Request, res: Response) => {
    try {
      console.log('Statistics request:', {
        userId: req.user!.userId,
      });

      const { data, error } = await supabaseService
        .from('archive_statistics')
        .select('*');

      if (error) {
        console.error('Statistics query error:', error);
        throw error;
      }

      return res.json({
        success: true,
        statistics: data,
      });
    } catch (error) {
      console.error('Statistics error:', error);
      // SECURITY: Don't leak error details to client
      return res.status(500).json({
        error: 'Failed to fetch statistics',
        message: 'An internal error occurred. Please check server logs.',
      });
    }
  });

  /**
   * GET /v1/admin/archivable-sessions
   * Get list of sessions eligible for archival
   *
   * Query params:
   * - retentionDays: number (default: 90)
   * - limit: number (default: 100)
   *
   * Returns:
   * - sessions: array of session objects
   * - count: number
   */
  router.get('/archivable-sessions', async (req: Request, res: Response) => {
    try {
      // SECURITY: Validate and bound input parameters
      const retentionDays = Math.max(30, Math.min(parseInt(req.query.retentionDays as string) || 90, 3650)); // 30 days to 10 years
      const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 100, 1000)); // Max 1000 results

      console.log('Archivable sessions request:', {
        retentionDays,
        limit,
        userId: req.user!.userId,
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data, error, count } = await supabaseService
        .from('game_sessions')
        .select('id, campaign_id, character_id, start_time, end_time, status, session_number', { count: 'exact' })
        .eq('status', 'completed')
        .not('end_time', 'is', null)
        .lt('end_time', cutoffDate.toISOString())
        .order('end_time', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Archivable sessions query error:', error);
        throw error;
      }

      return res.json({
        success: true,
        sessions: data,
        count,
        cutoff_date: cutoffDate.toISOString(),
        retention_days: retentionDays,
      });
    } catch (error) {
      console.error('Archivable sessions error:', error);
      // SECURITY: Don't leak error details to client
      return res.status(500).json({
        error: 'Failed to fetch archivable sessions',
        message: 'An internal error occurred. Please check server logs.',
      });
    }
  });

  return router;
}
