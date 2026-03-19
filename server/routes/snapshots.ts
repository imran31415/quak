import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { logAudit } from '../utils/auditLog.js';
import { batchInsert } from '../utils/batchInsert.js';
import { cellTypeToDuckDB, safeTableName } from '../utils/sql.js';

const router = Router();

function escapeSQL(val: string): string {
  return val.replace(/'/g, "''");
}

// POST /api/sheets/:id/snapshots — Create snapshot
router.post('/api/sheets/:id/snapshots', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const label = req.body.label as string | undefined;
    const db = getDb();

    // Get current sheet metadata
    const metaResult = await db.runAndReadAll(
      `SELECT * FROM __quak_sheets WHERE id = '${escapeSQL(sheetId)}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    const sheet = metaRows[0] as Record<string, unknown>;
    const columnsJson = sheet.columns as string;

    // Get current rows
    const tableName = safeTableName(sheetId);
    const rowsResult = await db.runAndReadAll(`SELECT * FROM "${tableName}"`);
    const rows = rowsResult.getRowObjectsJson();
    const rowsJson = JSON.stringify(rows);

    // Compute next version
    const versionResult = await db.runAndReadAll(
      `SELECT COALESCE(MAX(version), 0) as max_version FROM __quak_snapshots WHERE sheet_id = '${escapeSQL(sheetId)}'`
    );
    const versionRows = versionResult.getRowObjectsJson();
    const nextVersion = ((versionRows[0] as Record<string, unknown>).max_version as number) + 1;

    const snapshotId = crypto.randomUUID();
    const snapshotLabel = label || `Version ${nextVersion}`;

    await db.run(
      `INSERT INTO __quak_snapshots (id, sheet_id, version, label, columns_json, rows_json, row_count, created_at)
       VALUES ('${snapshotId}', '${escapeSQL(sheetId)}', ${nextVersion}, '${escapeSQL(snapshotLabel)}', '${escapeSQL(typeof columnsJson === 'string' ? columnsJson : JSON.stringify(columnsJson))}', '${escapeSQL(rowsJson)}', ${rows.length}, current_timestamp)`
    );

    await logAudit(sheetId, 'snapshot_create', { version: nextVersion, label: snapshotLabel });

    res.json({ id: snapshotId, version: nextVersion, label: snapshotLabel, row_count: rows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/sheets/:id/snapshots — List snapshots (lightweight)
router.get('/api/sheets/:id/snapshots', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const db = getDb();

    const result = await db.runAndReadAll(
      `SELECT id, version, label, row_count, created_at FROM __quak_snapshots
       WHERE sheet_id = '${escapeSQL(sheetId)}'
       ORDER BY version DESC`
    );
    const rows = result.getRowObjectsJson();
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/sheets/:id/snapshots/:snapshotId — Get full snapshot for preview
router.get('/api/sheets/:id/snapshots/:snapshotId', async (req: Request, res: Response) => {
  try {
    const snapshotId = req.params.snapshotId as string;
    const db = getDb();

    const result = await db.runAndReadAll(
      `SELECT * FROM __quak_snapshots WHERE id = '${escapeSQL(snapshotId)}'`
    );
    const rows = result.getRowObjectsJson();
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    const snapshot = rows[0] as Record<string, unknown>;

    // Parse JSON fields
    let columns = snapshot.columns_json;
    if (typeof columns === 'string') {
      try { columns = JSON.parse(columns); } catch { /* leave as-is */ }
    }
    let snapshotRows = snapshot.rows_json;
    if (typeof snapshotRows === 'string') {
      try { snapshotRows = JSON.parse(snapshotRows); } catch { /* leave as-is */ }
    }

    res.json({
      id: snapshot.id,
      version: snapshot.version,
      label: snapshot.label,
      row_count: snapshot.row_count,
      created_at: snapshot.created_at,
      columns,
      rows: snapshotRows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/sheets/:id/snapshots/:snapshotId/restore — Restore snapshot
router.post('/api/sheets/:id/snapshots/:snapshotId/restore', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const snapshotId = req.params.snapshotId as string;
    const db = getDb();

    // Load the target snapshot
    const snapResult = await db.runAndReadAll(
      `SELECT * FROM __quak_snapshots WHERE id = '${escapeSQL(snapshotId)}'`
    );
    const snapRows = snapResult.getRowObjectsJson();
    if (snapRows.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    const snapshot = snapRows[0] as Record<string, unknown>;

    // Auto-create pre-restore snapshot
    const metaResult = await db.runAndReadAll(
      `SELECT * FROM __quak_sheets WHERE id = '${escapeSQL(sheetId)}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    const currentSheet = metaRows[0] as Record<string, unknown>;
    const currentColumnsJson = currentSheet.columns as string;

    const tableName = safeTableName(sheetId);
    const currentRowsResult = await db.runAndReadAll(`SELECT * FROM "${tableName}"`);
    const currentRows = currentRowsResult.getRowObjectsJson();

    const versionResult = await db.runAndReadAll(
      `SELECT COALESCE(MAX(version), 0) as max_version FROM __quak_snapshots WHERE sheet_id = '${escapeSQL(sheetId)}'`
    );
    const versionRows = versionResult.getRowObjectsJson();
    const autoVersion = ((versionRows[0] as Record<string, unknown>).max_version as number) + 1;
    const autoId = crypto.randomUUID();
    const autoLabel = `Auto-save before restore to v${snapshot.version}`;

    await db.run(
      `INSERT INTO __quak_snapshots (id, sheet_id, version, label, columns_json, rows_json, row_count, created_at)
       VALUES ('${autoId}', '${escapeSQL(sheetId)}', ${autoVersion}, '${escapeSQL(autoLabel)}', '${escapeSQL(typeof currentColumnsJson === 'string' ? currentColumnsJson : JSON.stringify(currentColumnsJson))}', '${escapeSQL(JSON.stringify(currentRows))}', ${currentRows.length}, current_timestamp)`
    );

    // Parse snapshot columns
    let snapshotColumns = snapshot.columns_json;
    if (typeof snapshotColumns === 'string') {
      try { snapshotColumns = JSON.parse(snapshotColumns); } catch { /* leave as-is */ }
    }
    const columns = snapshotColumns as Array<{ name: string; cellType: string; id: string; width?: number; options?: string[] }>;

    // Parse snapshot rows
    let snapshotRows = snapshot.rows_json;
    if (typeof snapshotRows === 'string') {
      try { snapshotRows = JSON.parse(snapshotRows); } catch { /* leave as-is */ }
    }
    const rowData = snapshotRows as Record<string, unknown>[];

    // Update sheet columns metadata
    const columnsForMeta = JSON.stringify(columns).replace(/'/g, "''");
    await db.run(
      `UPDATE __quak_sheets SET columns = '${columnsForMeta}', updated_at = current_timestamp WHERE id = '${escapeSQL(sheetId)}'`
    );

    // Drop and recreate data table
    await db.run(`DROP TABLE IF EXISTS "${tableName}"`);
    const colDefs = columns
      .map((c) => `"${c.name.replace(/"/g, '""')}" ${cellTypeToDuckDB(c.cellType)}`)
      .join(', ');
    await db.run(`CREATE TABLE "${tableName}" (rowid INTEGER, ${colDefs})`);

    // Insert snapshot rows
    if (rowData.length > 0) {
      // Include rowid in the batch insert
      const allCols = [{ name: 'rowid', cellType: 'number' }, ...columns.map((c) => ({ name: c.name, cellType: c.cellType }))];
      await batchInsert(db, tableName, allCols, rowData);
    }

    await logAudit(sheetId, 'snapshot_restore', { version: snapshot.version, label: snapshot.label });

    res.json({ success: true, autoSaveVersion: autoVersion });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/sheets/:id/snapshots/:snapshotId — Delete snapshot
router.delete('/api/sheets/:id/snapshots/:snapshotId', async (req: Request, res: Response) => {
  try {
    const snapshotId = req.params.snapshotId as string;
    const db = getDb();

    await db.run(`DELETE FROM __quak_snapshots WHERE id = '${escapeSQL(snapshotId)}'`);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
