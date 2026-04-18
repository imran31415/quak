import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/webhooks  —  list all webhooks
// ---------------------------------------------------------------------------
router.get('/api/webhooks', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.runAndReadAll(
      'SELECT id, name, url, sheet_id, events, active, secret, created_at FROM __quak_webhooks ORDER BY created_at DESC'
    );
    const rows = result.getRowObjectsJson().map((row: Record<string, unknown>) => {
      if (typeof row.events === 'string') {
        row.events = JSON.parse(row.events);
      }
      // Mask secret
      if (row.secret) {
        row.secret = '••••••••';
      }
      return row;
    });
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/webhooks  —  create a webhook
// ---------------------------------------------------------------------------
router.post('/api/webhooks', async (req: Request, res: Response) => {
  try {
    const { name, url, sheetId, events, secret } = req.body as {
      name: string;
      url: string;
      sheetId: string;
      events: string[];
      secret?: string;
    };

    if (!name || !url || !sheetId || !events?.length) {
      res.status(400).json({ error: 'name, url, sheetId, and events are required' });
      return;
    }

    const id = crypto.randomUUID();
    const eventsJson = JSON.stringify(events);

    const db = getDb();
    await db.run(
      `INSERT INTO __quak_webhooks (id, name, url, sheet_id, events, active, secret, created_at)
       VALUES ('${id}', '${name.replace(/'/g, "''")}', '${url.replace(/'/g, "''")}', '${sheetId.replace(/'/g, "''")}', '${eventsJson.replace(/'/g, "''")}', TRUE, ${secret ? `'${secret.replace(/'/g, "''")}'` : 'NULL'}, current_timestamp)`
    );

    res.status(201).json({ id, name, url, sheetId, events, active: true, createdAt: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/webhooks/:id  —  update a webhook
// ---------------------------------------------------------------------------
router.put('/api/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, url, sheetId, events, active, secret } = req.body as {
      name?: string;
      url?: string;
      sheetId?: string;
      events?: string[];
      active?: boolean;
      secret?: string | null;
    };

    const db = getDb();
    const updates: string[] = [];
    if (name !== undefined) updates.push(`name = '${name.replace(/'/g, "''")}'`);
    if (url !== undefined) updates.push(`url = '${url.replace(/'/g, "''")}'`);
    if (sheetId !== undefined) updates.push(`sheet_id = '${sheetId.replace(/'/g, "''")}'`);
    if (events !== undefined) updates.push(`events = '${JSON.stringify(events).replace(/'/g, "''")}'`);
    if (active !== undefined) updates.push(`active = ${active}`);
    if (secret !== undefined) updates.push(secret === null ? `secret = NULL` : `secret = '${secret.replace(/'/g, "''")}'`);

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    await db.run(
      `UPDATE __quak_webhooks SET ${updates.join(', ')} WHERE id = '${id.replace(/'/g, "''")}'`
    );

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/webhooks/:id  —  delete a webhook
// ---------------------------------------------------------------------------
router.delete('/api/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getDb();
    await db.run(`DELETE FROM __quak_webhooks WHERE id = '${id.replace(/'/g, "''")}'`);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/webhooks/:id/test  —  send a test payload
// ---------------------------------------------------------------------------
router.post('/api/webhooks/:id/test', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getDb();
    const result = await db.runAndReadAll(
      `SELECT url, secret FROM __quak_webhooks WHERE id = '${id.replace(/'/g, "''")}'`
    );
    const rows = result.getRowObjectsJson();

    if (rows.length === 0) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    const webhook = rows[0] as Record<string, unknown>;
    const payload = JSON.stringify({
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook from Quak' },
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (webhook.secret) {
      const signature = crypto.createHmac('sha256', String(webhook.secret)).update(payload).digest('hex');
      headers['X-Quak-Signature'] = signature;
    }

    const response = await fetch(String(webhook.url), {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10000),
    });

    res.json({ success: true, status: response.status, statusText: response.statusText });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: `Webhook test failed: ${message}` });
  }
});

export default router;
