import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../db.js';

/**
 * API key authentication middleware.
 * - If no key provided, passes through (UI access, backwards compatible).
 * - If key provided, validates against __quak_api_keys table.
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const xApiKey = req.headers['x-api-key'] as string | undefined;

  let rawKey: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    rawKey = authHeader.slice(7);
  } else if (xApiKey) {
    rawKey = xApiKey;
  }

  // No key provided — pass through (UI access)
  if (!rawKey) {
    next();
    return;
  }

  try {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const db = getDb();
    const result = await db.runAndReadAll(
      `SELECT id FROM __quak_api_keys WHERE key_hash = '${keyHash.replace(/'/g, "''")}'`
    );
    const rows = result.getRowObjectsJson();

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Update last_used_at (fire-and-forget)
    const keyId = (rows[0] as Record<string, unknown>).id;
    db.run(
      `UPDATE __quak_api_keys SET last_used_at = current_timestamp WHERE id = '${String(keyId).replace(/'/g, "''")}'`
    ).catch(() => {});

    next();
  } catch {
    res.status(500).json({ error: 'Auth check failed' });
  }
}
