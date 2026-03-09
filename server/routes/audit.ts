import { Router, type Request, type Response } from 'express';
import { getDb } from '../db.js';

const router = Router();

// GET /api/sheets/:id/audit — paginated audit log
router.get('/api/sheets/:id/audit', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const db = getDb();
    const result = await db.runAndReadAll(
      `SELECT * FROM __quak_audit_log WHERE sheet_id = '${sheetId.replace(/'/g, "''")}'
       ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    );
    const rows = result.getRowObjectsJson();

    // Parse JSON details
    const entries = rows.map((row: Record<string, unknown>) => {
      if (typeof row.details === 'string') {
        try {
          row.details = JSON.parse(row.details);
        } catch {
          // Leave as string
        }
      }
      return row;
    });

    res.json(entries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
