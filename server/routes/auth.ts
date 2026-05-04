import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db.js';
import { clearSessionCookie, type AuthedRequest } from '../middleware/session.js';

const router = Router();

const PAIR_CODE_TTL_SECONDS = 5 * 60;

function requireUser(req: AuthedRequest, res: Response): string | null {
  if (!req.user) {
    res.status(500).json({ error: 'Session not initialized' });
    return null;
  }
  return req.user.id;
}

function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

// GET /api/me — current user metadata
router.get('/api/me', async (req: Request, res: Response) => {
  const userId = requireUser(req as AuthedRequest, res);
  if (!userId) return;
  try {
    const db = getDb();
    const userRow = (
      await db.runAndReadAll(
        `SELECT id, display_name FROM __quak_users WHERE id = '${escSql(userId)}'`,
      )
    ).getRowObjectsJson() as Array<Record<string, unknown>>;
    const settings = (
      await db.runAndReadAll(
        `SELECT openrouter_api_key, default_model FROM __quak_user_settings WHERE user_id = '${escSql(userId)}'`,
      )
    ).getRowObjectsJson() as Array<Record<string, unknown>>;
    const devices = (
      await db.runAndReadAll(
        `SELECT COUNT(*) AS cnt FROM __quak_sessions WHERE user_id = '${escSql(userId)}'`,
      )
    ).getRowObjectsJson() as Array<Record<string, unknown>>;
    const apiKey = settings[0]?.openrouter_api_key;
    res.json({
      id: userId,
      displayName: userRow[0]?.display_name ?? null,
      defaultModel: settings[0]?.default_model ?? null,
      hasApiKey: typeof apiKey === 'string' && apiKey.length > 0,
      deviceCount: Number(devices[0]?.cnt ?? 0),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/me/settings — update display_name / openrouter_api_key / default_model
router.put('/api/me/settings', async (req: Request, res: Response) => {
  const userId = requireUser(req as AuthedRequest, res);
  if (!userId) return;
  try {
    const body = req.body as {
      displayName?: string | null;
      openrouterApiKey?: string | null;
      defaultModel?: string | null;
    };
    const db = getDb();

    if (typeof body.displayName !== 'undefined') {
      const v = body.displayName === null ? null : String(body.displayName).slice(0, 80);
      const sql = v === null
        ? `UPDATE __quak_users SET display_name = NULL WHERE id = '${escSql(userId)}'`
        : `UPDATE __quak_users SET display_name = '${escSql(v)}' WHERE id = '${escSql(userId)}'`;
      await db.run(sql);
    }

    const wantsKey = typeof body.openrouterApiKey !== 'undefined';
    const wantsModel = typeof body.defaultModel !== 'undefined';
    if (wantsKey || wantsModel) {
      // Upsert into __quak_user_settings.
      const exists = (
        await db.runAndReadAll(
          `SELECT 1 FROM __quak_user_settings WHERE user_id = '${escSql(userId)}'`,
        )
      ).getRowObjectsJson();
      if (exists.length === 0) {
        await db.run(
          `INSERT INTO __quak_user_settings (user_id, openrouter_api_key, default_model) VALUES ('${escSql(userId)}', NULL, NULL)`,
        );
      }
      if (wantsKey) {
        const v = body.openrouterApiKey;
        const sql = v
          ? `UPDATE __quak_user_settings SET openrouter_api_key = '${escSql(String(v))}', updated_at = current_timestamp WHERE user_id = '${escSql(userId)}'`
          : `UPDATE __quak_user_settings SET openrouter_api_key = NULL, updated_at = current_timestamp WHERE user_id = '${escSql(userId)}'`;
        await db.run(sql);
      }
      if (wantsModel) {
        const v = body.defaultModel;
        const sql = v
          ? `UPDATE __quak_user_settings SET default_model = '${escSql(String(v))}', updated_at = current_timestamp WHERE user_id = '${escSql(userId)}'`
          : `UPDATE __quak_user_settings SET default_model = NULL, updated_at = current_timestamp WHERE user_id = '${escSql(userId)}'`;
        await db.run(sql);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/auth/pair-code — generate a 6-digit pairing code
router.post('/api/auth/pair-code', async (req: Request, res: Response) => {
  const userId = requireUser(req as AuthedRequest, res);
  if (!userId) return;
  try {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const db = getDb();
    await db.run(
      `INSERT INTO __quak_pair_codes (code, user_id, expires_at) VALUES ('${code}', '${escSql(userId)}', current_timestamp + INTERVAL '${PAIR_CODE_TTL_SECONDS} seconds')`,
    );
    res.json({ code, expiresInSeconds: PAIR_CODE_TTL_SECONDS });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/auth/pair — redeem a code, merging current session into the inviter's user
router.post('/api/auth/pair', async (req: Request, res: Response) => {
  const authReq = req as AuthedRequest;
  const userId = requireUser(authReq, res);
  if (!userId) return;
  try {
    const code = String((req.body as { code?: unknown }).code ?? '').trim();
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ error: 'Invalid code format' });
      return;
    }
    const db = getDb();
    const rows = (
      await db.runAndReadAll(
        `SELECT user_id, expires_at, used_at FROM __quak_pair_codes WHERE code = '${code}'`,
      )
    ).getRowObjectsJson() as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Code not found' });
      return;
    }
    const row = rows[0];
    if (row.used_at) {
      res.status(409).json({ error: 'Code already used' });
      return;
    }
    const expired = (
      await db.runAndReadAll(
        `SELECT (expires_at < current_timestamp) AS expired FROM __quak_pair_codes WHERE code = '${code}'`,
      )
    ).getRowObjectsJson() as Array<Record<string, unknown>>;
    if (expired[0]?.expired) {
      res.status(410).json({ error: 'Code expired' });
      return;
    }
    const inviterId = String(row.user_id);
    if (inviterId === userId) {
      res.status(400).json({ error: 'You generated this code; redeem it on the other device' });
      return;
    }

    // Atomic-ish merge: re-point this session to the inviter, transfer all
    // owner_id-keyed data from the donor user to the inviter, then drop the
    // donor's user_id-keyed rows and the donor user itself.
    const sessionToken = authReq.user!.sessionToken;
    await db.run(
      `UPDATE __quak_sessions SET user_id = '${escSql(inviterId)}' WHERE token = '${escSql(sessionToken)}'`,
    );
    // Tables keyed by owner_id — transfer ownership.
    for (const t of ['__quak_sheets', '__quak_uploads']) {
      await db.run(`UPDATE ${t} SET owner_id = '${escSql(inviterId)}' WHERE owner_id = '${escSql(userId)}'`);
    }
    // user_settings has user_id as PK. Drop donor's row (inviter keeps theirs).
    await db.run(`DELETE FROM __quak_user_settings WHERE user_id = '${escSql(userId)}'`);
    // Any other sessions the donor still had become orphans (the redeeming
    // session was already re-pointed above so it survives this DELETE).
    await db.run(`DELETE FROM __quak_sessions WHERE user_id = '${escSql(userId)}'`);
    await db.run(`DELETE FROM __quak_users WHERE id = '${escSql(userId)}'`);
    await db.run(`UPDATE __quak_pair_codes SET used_at = current_timestamp WHERE code = '${code}'`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/auth/logout — invalidate current session cookie
router.post('/api/auth/logout', async (req: Request, res: Response) => {
  const authReq = req as AuthedRequest;
  const userId = requireUser(authReq, res);
  if (!userId) return;
  try {
    const db = getDb();
    await db.run(
      `DELETE FROM __quak_sessions WHERE token = '${escSql(authReq.user!.sessionToken)}'`,
    );
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/me/devices — list active sessions for the current user
router.get('/api/me/devices', async (req: Request, res: Response) => {
  const authReq = req as AuthedRequest;
  const userId = requireUser(authReq, res);
  if (!userId) return;
  try {
    const db = getDb();
    const rows = (
      await db.runAndReadAll(
        `SELECT token, user_agent, created_at, last_seen_at FROM __quak_sessions WHERE user_id = '${escSql(userId)}' ORDER BY last_seen_at DESC`,
      )
    ).getRowObjectsJson();
    const current = authReq.user!.sessionToken;
    res.json({
      devices: rows.map((r) => {
        const obj = r as Record<string, unknown>;
        return {
          token: obj.token,
          userAgent: obj.user_agent,
          createdAt: obj.created_at,
          lastSeenAt: obj.last_seen_at,
          isCurrent: obj.token === current,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/me/devices/:token — revoke a session
router.delete('/api/me/devices/:token', async (req: Request, res: Response) => {
  const userId = requireUser(req as AuthedRequest, res);
  if (!userId) return;
  try {
    const token = String(req.params.token);
    const db = getDb();
    await db.run(
      `DELETE FROM __quak_sessions WHERE token = '${escSql(token)}' AND user_id = '${escSql(userId)}'`,
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
