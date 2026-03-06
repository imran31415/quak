import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';

const router = Router();

/**
 * Map a cellType string to a DuckDB column type.
 */
function cellTypeToDuckDB(cellType: string): string {
  switch (cellType) {
    case 'number':
      return 'DOUBLE';
    case 'checkbox':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'text':
    case 'dropdown':
    case 'formula':
    case 'markdown':
    default:
      return 'VARCHAR';
  }
}

/**
 * Sanitize a sheet id to produce a safe table name.
 * Only allows alphanumeric characters and underscores.
 */
function safeTableName(id: string): string {
  return 'sheet_' + id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function formatValue(val: unknown, cellType: string): string {
  if (val === null || val === undefined || val === '') return 'NULL';
  if (cellType === 'number') return String(Number(val));
  if (cellType === 'checkbox') return val ? 'TRUE' : 'FALSE';
  return `'${String(val).replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// GET /api/sheets  —  list all sheets (metadata only)
// ---------------------------------------------------------------------------
router.get('/api/sheets', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.runAndReadAll(
      'SELECT id, name, columns, created_at, updated_at FROM __quak_sheets ORDER BY created_at DESC'
    );
    const rows = result.getRowObjectsJson();

    const sheets = rows.map((row: Record<string, unknown>) => {
      if (typeof row.columns === 'string') {
        row.columns = JSON.parse(row.columns);
      }
      return row;
    });

    res.json(sheets);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/sheets  —  create a new sheet
// ---------------------------------------------------------------------------
router.post('/api/sheets', async (req: Request, res: Response) => {
  try {
    const { name, columns } = req.body as {
      name: string;
      columns: { name: string; cellType: string }[];
    };

    if (!name || !columns || !Array.isArray(columns)) {
      res.status(400).json({ error: 'name and columns are required' });
      return;
    }

    const id = crypto.randomUUID();
    const tableName = safeTableName(id);

    // Build column definitions for the data table
    const colDefs = columns
      .map((col) => `"${col.name.replace(/"/g, '""')}" ${cellTypeToDuckDB(col.cellType)}`)
      .join(', ');

    const db = getDb();

    // Create the data table
    await db.run(`CREATE TABLE "${tableName}" (${colDefs})`);

    // Insert metadata into __quak_sheets
    const columnsJson = JSON.stringify(columns);
    await db.run(
      `INSERT INTO __quak_sheets (id, name, columns, created_at, updated_at)
       VALUES ('${id}', '${name.replace(/'/g, "''")}', '${columnsJson.replace(/'/g, "''")}', current_timestamp, current_timestamp)`
    );

    res.status(201).json({ id, name, columns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/sheets/:id  —  get sheet data (metadata + all rows)
// ---------------------------------------------------------------------------
router.get('/api/sheets/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getDb();

    // Fetch metadata
    const metaResult = await db.runAndReadAll(
      `SELECT id, name, columns, created_at, updated_at FROM __quak_sheets WHERE id = '${id.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();

    if (metaRows.length === 0) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    const meta = metaRows[0] as Record<string, unknown>;
    if (typeof meta.columns === 'string') {
      meta.columns = JSON.parse(meta.columns);
    }

    // Fetch all rows from the data table
    const tableName = safeTableName(id);
    const dataResult = await db.runAndReadAll(`SELECT rowid, * FROM "${tableName}"`);
    const rows = dataResult.getRowObjectsJson();

    res.json({ ...meta, rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/sheets/:id  —  update sheet metadata (name, columns)
// ---------------------------------------------------------------------------
router.put('/api/sheets/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, columns } = req.body as {
      name?: string;
      columns?: { name: string; cellType: string }[];
    };

    const db = getDb();

    const updates: string[] = [];
    if (name !== undefined) {
      updates.push(`name = '${name.replace(/'/g, "''")}'`);
    }
    if (columns !== undefined) {
      const columnsJson = JSON.stringify(columns);
      updates.push(`columns = '${columnsJson.replace(/'/g, "''")}'`);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push('updated_at = current_timestamp');

    await db.run(
      `UPDATE __quak_sheets SET ${updates.join(', ')} WHERE id = '${id.replace(/'/g, "''")}'`
    );

    res.json({ id, name, columns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/sheets/:id  —  drop table + remove from __quak_sheets
// ---------------------------------------------------------------------------
router.delete('/api/sheets/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getDb();
    const tableName = safeTableName(id);

    // Drop the data table
    await db.run(`DROP TABLE IF EXISTS "${tableName}"`);

    // Remove metadata
    await db.run(`DELETE FROM __quak_sheets WHERE id = '${id.replace(/'/g, "''")}'`);

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/sheets/:id/rows  —  replace all rows
// ---------------------------------------------------------------------------
router.put('/api/sheets/:id/rows', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { rows } = req.body as { rows: Record<string, unknown>[] };

    if (!rows || !Array.isArray(rows)) {
      res.status(400).json({ error: 'rows array is required' });
      return;
    }

    const db = getDb();
    const tableName = safeTableName(id);

    // Fetch column info from metadata
    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${id.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();

    if (metaRows.length === 0) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    const columnsRaw = (metaRows[0] as Record<string, unknown>).columns;
    const sheetColumns = (typeof columnsRaw === 'string' ? JSON.parse(columnsRaw) : columnsRaw) as {
      name: string;
      cellType: string;
    }[];

    // Delete all existing rows
    await db.run(`DELETE FROM "${tableName}"`);

    // Insert new rows
    for (const row of rows) {
      const colNames = sheetColumns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(', ');
      const values = sheetColumns
        .map((col) => formatValue(row[col.name], col.cellType))
        .join(', ');
      await db.run(`INSERT INTO "${tableName}" (${colNames}) VALUES (${values})`);
    }

    res.json({ success: true, rowCount: rows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/sheets/:id/rows  —  add a single new row
// ---------------------------------------------------------------------------
router.post('/api/sheets/:id/rows', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const row = req.body as Record<string, unknown>;

    const db = getDb();
    const tableName = safeTableName(id);

    // Fetch column info from metadata
    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${id.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();

    if (metaRows.length === 0) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    const columnsRaw = (metaRows[0] as Record<string, unknown>).columns;
    const sheetColumns = (typeof columnsRaw === 'string' ? JSON.parse(columnsRaw) : columnsRaw) as {
      name: string;
      cellType: string;
    }[];

    const colNames = sheetColumns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(', ');
    const values = sheetColumns
      .map((col) => {
        const val = row[col.name];
        if (val === null || val === undefined) return 'NULL';
        if (col.cellType === 'number') return Number(val);
        if (col.cellType === 'checkbox') return val ? 'TRUE' : 'FALSE';
        return `'${String(val).replace(/'/g, "''")}'`;
      })
      .join(', ');

    await db.run(`INSERT INTO "${tableName}" (${colNames}) VALUES (${values})`);

    res.status(201).json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/sheets/:id/cells  —  update a single cell
// ---------------------------------------------------------------------------
router.put('/api/sheets/:id/cells', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { rowIndex, column, value } = req.body as {
      rowIndex: number;
      column: string;
      value: unknown;
    };

    if (rowIndex === undefined || !column) {
      res.status(400).json({ error: 'rowIndex and column are required' });
      return;
    }

    const db = getDb();
    const tableName = safeTableName(id);

    // Fetch column info to determine type
    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${id.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();

    if (metaRows.length === 0) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    const columnsRaw = (metaRows[0] as Record<string, unknown>).columns;
    const sheetColumns = (typeof columnsRaw === 'string' ? JSON.parse(columnsRaw) : columnsRaw) as {
      name: string;
      cellType: string;
    }[];
    const colDef = sheetColumns.find((c) => c.name === column);

    const formattedValue = formatValue(value, colDef?.cellType || 'text');

    const safeColumn = `"${column.replace(/"/g, '""')}"`;
    await db.run(
      `UPDATE "${tableName}" SET ${safeColumn} = ${formattedValue} WHERE rowid = ${Number(rowIndex)}`
    );

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
