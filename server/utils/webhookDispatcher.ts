import crypto from 'crypto';
import { getDb } from '../db.js';

/**
 * Dispatch webhook events to registered endpoints.
 * Fire-and-forget — never breaks the main operation.
 */
export async function dispatchWebhook(
  sheetId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const db = getDb();
    const result = await db.runAndReadAll(
      `SELECT id, url, secret, events FROM __quak_webhooks
       WHERE sheet_id = '${sheetId.replace(/'/g, "''")}'
       AND active = TRUE`
    );
    const webhooks = result.getRowObjectsJson() as Array<Record<string, unknown>>;

    for (const webhook of webhooks) {
      // Check if this webhook subscribes to this event
      const raw = webhook.events;
      const events: string[] = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
      if (!events.includes(event)) continue;

      const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        sheetId,
        data: payload,
      });

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (webhook.secret) {
        const signature = crypto.createHmac('sha256', String(webhook.secret)).update(body).digest('hex');
        headers['X-Quak-Signature'] = signature;
      }

      // Fire-and-forget
      fetch(String(webhook.url), {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      }).catch(() => {});
    }
  } catch {
    // Silently ignore — webhook dispatch must never break main operations
  }
}
