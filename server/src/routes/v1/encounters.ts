import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { recordEncounterOutcome, getDifficultyAdjustment } from '../../lib/encounter-telemetry.js';

export default function encountersRouter() {
  const router = Router();

  // SECURITY: Require authentication for all encounter endpoints
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  router.post('/telemetry', (req, res) => {
    const { sessionId, difficulty, resourcesUsedEst } = req.body || {};
    if (!sessionId || !difficulty || typeof resourcesUsedEst !== 'number') {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    recordEncounterOutcome(sessionId, difficulty, resourcesUsedEst);
    return res.json({ ok: true });
  });

  router.get('/adjustment', (req, res) => {
    const sessionId = req.query.sessionId as string;
    const difficulty = req.query.difficulty as string;
    if (!sessionId || !difficulty) return res.status(400).json({ ok: false, error: 'Missing query params' });
    const factor = getDifficultyAdjustment(sessionId, difficulty);
    return res.json({ ok: true, factor });
  });

  return router;
}
