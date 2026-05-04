import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { IS_PRODUCTION } from '../config.js';

export interface AuthedRequest extends Request {
  user?: { id: string; sessionToken: string };
}

const COOKIE_NAME = 'quak_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year (in seconds)
// Endpoints that must work without a session (probes, hot-reload assets).
const SKIP_PATHS = new Set(['/api/health', '/api/livez']);

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function setSessionCookie(res: Response, token: string): void {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE}`,
  ];
  if (IS_PRODUCTION) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res: Response): void {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (IS_PRODUCTION) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

async function createAnonymousUser(userAgent: string): Promise<{ userId: string; token: string }> {
  const userId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('base64url');
  const db = getDb();
  await db.run(`INSERT INTO __quak_users (id) VALUES ('${userId}')`);
  const safeUa = userAgent.replace(/'/g, "''").slice(0, 255);
  await db.run(
    `INSERT INTO __quak_sessions (token, user_id, user_agent) VALUES ('${token}', '${userId}', '${safeUa}')`,
  );
  return { userId, token };
}

export function attachSession(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  void (async () => {
    try {
      const db = getDb();
      const cookies = parseCookies(req.headers.cookie);
      const incomingToken = cookies[COOKIE_NAME];
      const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 255);

      if (incomingToken) {
        const safeToken = incomingToken.replace(/'/g, "''");
        const r = await db.runAndReadAll(
          `SELECT user_id FROM __quak_sessions WHERE token = '${safeToken}'`,
        );
        const rows = r.getRowObjectsJson() as Array<Record<string, unknown>>;
        if (rows.length > 0) {
          const userId = String(rows[0].user_id);
          // Touch last_seen_at (best-effort).
          await db.run(
            `UPDATE __quak_sessions SET last_seen_at = current_timestamp WHERE token = '${safeToken}'`,
          );
          req.user = { id: userId, sessionToken: incomingToken };
          next();
          return;
        }
      }

      // No cookie or invalid token → mint a fresh anonymous user + session.
      const { userId, token } = await createAnonymousUser(userAgent);
      setSessionCookie(res, token);
      req.user = { id: userId, sessionToken: token };
      next();
    } catch (err) {
      next(err);
    }
  })();
}
