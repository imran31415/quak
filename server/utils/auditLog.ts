import crypto from 'crypto';
import { getDb } from '../db.js';

/**
 * Log an audit event. Fire-and-forget — never breaks the main operation.
 */
export async function logAudit(
  sheetId: string,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const db = getDb();
    const id = crypto.randomUUID();
    const detailsJson = JSON.stringify(details).replace(/'/g, "''");
    await db.run(
      `INSERT INTO __quak_audit_log (id, sheet_id, action, details, created_at)
       VALUES ('${id}', '${sheetId.replace(/'/g, "''")}', '${action.replace(/'/g, "''")}', '${detailsJson}', current_timestamp)`
    );
  } catch {
    // Silently ignore — audit logging must never break main operations
  }
}
