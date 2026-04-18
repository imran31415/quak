import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/api-keys  —  list all API keys (never returns full key)
// ---------------------------------------------------------------------------
router.get('/api/api-keys', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.runAndReadAll(
      'SELECT id, name, key_prefix, created_at, last_used_at FROM __quak_api_keys ORDER BY created_at DESC'
    );
    const rows = result.getRowObjectsJson();
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/api-keys  —  create a new API key (returns full key ONCE)
// ---------------------------------------------------------------------------
router.post('/api/api-keys', async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name: string };

    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const id = crypto.randomUUID();
    const rawKey = `qk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 11); // "qk_" + first 8 hex chars

    const db = getDb();
    await db.run(
      `INSERT INTO __quak_api_keys (id, name, key_hash, key_prefix, created_at)
       VALUES ('${id}', '${name.replace(/'/g, "''")}', '${keyHash}', '${keyPrefix}', current_timestamp)`
    );

    res.status(201).json({ id, name, key: rawKey, keyPrefix, createdAt: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/api-keys/:id  —  revoke an API key
// ---------------------------------------------------------------------------
router.delete('/api/api-keys/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getDb();
    await db.run(`DELETE FROM __quak_api_keys WHERE id = '${id.replace(/'/g, "''")}'`);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
