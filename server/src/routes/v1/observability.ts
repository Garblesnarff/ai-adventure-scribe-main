import { Router } from 'express';

function observabilityRouter() {
  const r = Router();

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
