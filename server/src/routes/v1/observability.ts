import { Router } from 'express';

function observabilityRouter() {
  const r = Router();

  /**
   * POST /v1/observability/error
   *
   * BUSINESS PURPOSE:
   * - Allows the frontend application to send client-side errors to the server for logging.
   * - This provides visibility into issues that users are experiencing in their browsers.
   *
   * REQUEST:
   * - Method: POST
   * - Body: {
   *     "message": "Error message",
   *     "stack": "Stack trace...",
   *     "extra": { "component": "CharacterSheet" }
   *   }
   *
   * RESPONSE SUCCESS (204 No Content):
   * - An empty response, indicating the error was received and logged.
   */
  r.post('/error', (req, res) => {
    const rid = res.locals.requestId || (req as any).requestId;
    const { message, stack, extra } = req.body || {};
    const payload = {
      level: 'error',
      msg: 'frontend.error',
      requestId: rid,
      error: { message, stack },
      extra,
    };
    console.error(JSON.stringify(payload));
    res.status(204).end();
  });

  /**
   * POST /v1/observability/metric
   *
   * BUSINESS PURPOSE:
   * - Allows the frontend application to send custom metrics to the server for logging and analysis.
   * - Can be used to track performance, feature usage, or other important events.
   *
   * REQUEST:
   * - Method: POST
   * - Body: {
   *     "name": "character.creation.time",
   *     "value": 12345, // in milliseconds
   *     "tags": { "race": "elf", "class": "wizard" }
   *   }
   *
   * RESPONSE SUCCESS (204 No Content):
   * - An empty response, indicating the metric was received.
   */
  r.post('/metric', (req, res) => {
    const rid = res.locals.requestId || (req as any).requestId;
    const { name, value, tags } = req.body || {};
    const payload = {
      level: 'info',
      msg: 'frontend.metric',
      requestId: rid,
      metric: { name, value, tags },
    };
    console.log(JSON.stringify(payload));
    res.status(204).end();
  });

  return r;
}

export default observabilityRouter;
