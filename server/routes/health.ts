import { Router, type Request, type Response } from 'express';
import { pingDb } from '../db.js';

const router = Router();

router.get('/api/livez', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await pingDb();
    res.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    res.status(503).json({ status: 'error', error: message });
  }
});

export default router;
