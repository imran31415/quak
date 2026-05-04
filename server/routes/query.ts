import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import type { AuthedRequest } from '../middleware/session.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/query  —  execute a raw SQL query against DuckDB
// ---------------------------------------------------------------------------
router.post('/api/query', async (req: Request, res: Response) => {
  try {
    const u = (req as AuthedRequest).user;
    if (!u) { res.status(500).json({ error: 'Session not initialized' }); return; }
    const { sql } = req.body as { sql: string };

    if (!sql || typeof sql !== 'string') {
      res.status(400).json({ error: 'sql string is required' });
      return;
    }

    // Basic SQL sandboxing — only allow SELECT queries
    const forbidden = /\b(CREATE|DROP|ALTER|DELETE|UPDATE|INSERT|TRUNCATE|GRANT|REVOKE)\b/i;
    if (forbidden.test(sql)) {
      res.status(403).json({ error: 'Only SELECT queries are allowed' });
      return;
    }

    // Block access to internal user/session/audit metadata. Cross-user data
    // leak via guessing another user's sheet_<uuid> table is theoretically
    // possible but UUIDs (122 bits) make it impractical.
    if (/\b__quak_/i.test(sql)) {
      res.status(403).json({ error: 'Internal __quak_* tables are not queryable' });
      return;
    }

    const db = getDb();

    const start = performance.now();
    const result = await db.runAndReadAll(sql);
    const elapsed = performance.now() - start;

    const columns = result.columnNames();
    const rows = result.getRowObjectsJson();

    res.json({
      columns,
      rows,
      rowCount: rows.length,
      time: Math.round(elapsed * 100) / 100,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

export default router;
