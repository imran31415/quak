import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';

const router = Router();

// GET /api/sheets/:id/comments — list all comments for a sheet
router.get('/api/sheets/:id/comments', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const db = getDb();
    const result = await db.runAndReadAll(
      `SELECT * FROM __quak_comments WHERE sheet_id = '${sheetId.replace(/'/g, "''")}' ORDER BY created_at DESC`
    );
    const rows = result.getRowObjectsJson();
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/sheets/:id/comments — create a comment
router.post('/api/sheets/:id/comments', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const { rowId, columnId, text } = req.body as {
      rowId: number;
      columnId: string;
      text: string;
    };

    if (rowId === undefined || !columnId || !text) {
      res.status(400).json({ error: 'rowId, columnId, and text are required' });
      return;
    }

    const id = crypto.randomUUID();
    const db = getDb();

    await db.run(
      `INSERT INTO __quak_comments (id, sheet_id, row_id, column_id, text, created_at, updated_at)
       VALUES ('${id}', '${sheetId.replace(/'/g, "''")}', ${Number(rowId)}, '${columnId.replace(/'/g, "''")}', '${text.replace(/'/g, "''")}', current_timestamp, current_timestamp)`
    );

    res.status(201).json({ id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// PUT /api/sheets/:id/comments/:commentId — update a comment
router.put('/api/sheets/:id/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const commentId = req.params.commentId as string;
    const { text } = req.body as { text: string };

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const db = getDb();
    await db.run(
      `UPDATE __quak_comments SET text = '${text.replace(/'/g, "''")}', updated_at = current_timestamp WHERE id = '${commentId.replace(/'/g, "''")}'`
    );

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/sheets/:id/comments/:commentId — delete a comment
router.delete('/api/sheets/:id/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const commentId = req.params.commentId as string;
    const db = getDb();
    await db.run(
      `DELETE FROM __quak_comments WHERE id = '${commentId.replace(/'/g, "''")}'`
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
