import { Router } from 'express';
import { recordEncounterOutcome, getDifficultyAdjustment } from '../../lib/encounter-telemetry.js';

export default function encountersRouter() {
  const router = Router();

  /**
   * POST /v1/encounters/telemetry
   *
   * BUSINESS PURPOSE:
   * - Records telemetry data about the outcome of an encounter.
   * - This data is used to dynamically adjust the difficulty of future encounters to create a better player experience.
   *
   * REQUEST:
   * - Method: POST
   * - Body: {
   *     "sessionId": "session_123",
   *     "difficulty": "medium",
   *     "resourcesUsedEst": 0.75 // A float from 0 to 1 indicating the proportion of resources used
   *   }
   *
   * RESPONSE SUCCESS (200 OK):
   * { "ok": true }
   *
   * RESPONSE ERRORS:
   * - 400 Bad Request: Missing required fields.
   */
  router.post('/telemetry', (req, res) => {
    const { sessionId, difficulty, resourcesUsedEst } = req.body || {};
    if (!sessionId || !difficulty || typeof resourcesUsedEst !== 'number') {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    recordEncounterOutcome(sessionId, difficulty, resourcesUsedEst);
    return res.json({ ok: true });
  });

  /**
   * GET /v1/encounters/adjustment
   *
   * BUSINESS PURPOSE:
   * - Retrieves a difficulty adjustment factor for a given session and difficulty level.
   * - This allows the encounter generation system to scale encounters up or down based on past performance.
   *
   * REQUEST:
   * - Method: GET
   * - Query Params: ?sessionId=session_123&difficulty=hard
   *
   * RESPONSE SUCCESS (200 OK):
   * {
   *   "ok": true,
   *   "factor": 1.1 // A float indicating the adjustment (e.g., 1.1 means 10% harder)
   * }
   *
   * RESPONSE ERRORS:
   * - 400 Bad Request: Missing required query parameters.
   */
  router.get('/adjustment', (req, res) => {
    const sessionId = req.query.sessionId as string;
    const difficulty = req.query.difficulty as string;
    if (!sessionId || !difficulty) return res.status(400).json({ ok: false, error: 'Missing query params' });
    const factor = getDifficultyAdjustment(sessionId, difficulty);
    return res.json({ ok: true, factor });
  });

  return router;
}
