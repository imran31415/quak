import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { batchInsert } from '../utils/batchInsert.js';
import { cellTypeToDuckDB, safeTableName, formatValue } from '../utils/sql.js';
import { logAudit } from '../utils/auditLog.js';

const router = Router();

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

    // Build column definitions for the data table (skip virtual columns)
    const physicalColumns = columns.filter((col) => col.cellType !== 'formula' && col.cellType !== 'lookup');
    const colDefs = physicalColumns
      .map((col) => `"${col.name.replace(/"/g, '""')}" ${cellTypeToDuckDB(col.cellType)}`)
      .join(', ');

    const db = getDb();

    // Create the data table with __order column for row ordering
    await db.run(`CREATE TABLE "${tableName}" (__order INTEGER, ${colDefs})`);

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

    // Fetch all rows from the data table, ordered by __order
    const tableName = safeTableName(id);
    const columns = meta.columns as Array<{
      id: string; name: string; cellType: string; formula?: string;
      linkedSheetId?: string; linkedDisplayColumn?: string;
      lookupLinkedColumn?: string; lookupReturnColumn?: string;
    }>;

    // Build computed expressions for formula columns
    const formulaCols = columns.filter((c) => c.cellType === 'formula' && c.formula);

    // Identify linked_record columns
    const linkedRecordCols = columns.filter(
      (c) => c.cellType === 'linked_record' && c.linkedSheetId && c.linkedDisplayColumn
    );

    // Identify lookup columns
    const lookupCols = columns.filter(
      (c) => c.cellType === 'lookup' && c.lookupLinkedColumn && c.lookupReturnColumn
    );

    // Verify linked tables exist and build join info
    interface JoinInfo {
      alias: string;
      linkedTableName: string;
      joinColumn: string; // column name in current table
    }
    const joinMap = new Map<string, JoinInfo>(); // keyed by linkedSheetId
    let aliasCounter = 0;

    for (const lrCol of linkedRecordCols) {
      if (!joinMap.has(lrCol.linkedSheetId!)) {
        const linkedTable = safeTableName(lrCol.linkedSheetId!);
        try {
          await db.runAndReadAll(`SELECT 1 FROM "${linkedTable}" LIMIT 0`);
          const alias = `lr${aliasCounter++}`;
          joinMap.set(lrCol.linkedSheetId!, { alias, linkedTableName: linkedTable, joinColumn: lrCol.name });
        } catch {
          // Linked table doesn't exist — skip this join
        }
      }
    }

    // Build LEFT JOIN clauses
    const joinClauses: string[] = [];
    for (const [, info] of joinMap) {
      const safeJoinCol = info.joinColumn.replace(/"/g, '""');
      joinClauses.push(
        `LEFT JOIN "${info.linkedTableName}" ${info.alias} ON ${info.alias}.rowid = t."${safeJoinCol}"`
      );
    }

    // Build extra SELECT expressions
    const extraSelects: string[] = [];

    // linked_record display values
    for (const lrCol of linkedRecordCols) {
      const info = joinMap.get(lrCol.linkedSheetId!);
      if (!info) continue;
      const safeDisplayCol = lrCol.linkedDisplayColumn!.replace(/"/g, '""');
      const safeColId = lrCol.id.replace(/"/g, '""');
      extraSelects.push(
        `TRY_CAST(${info.alias}."${safeDisplayCol}" AS VARCHAR) AS "__lr_display_${safeColId}"`
      );
    }

    // lookup values
    for (const luCol of lookupCols) {
      // Find the linked_record column this lookup follows
      const lrCol = columns.find((c) => c.id === luCol.lookupLinkedColumn);
      if (!lrCol || !lrCol.linkedSheetId) continue;
      const info = joinMap.get(lrCol.linkedSheetId);
      if (!info) continue;
      const safeReturnCol = luCol.lookupReturnColumn!.replace(/"/g, '""');
      const safeLuName = luCol.name.replace(/"/g, '""');
      extraSelects.push(
        `TRY_CAST(${info.alias}."${safeReturnCol}" AS VARCHAR) AS "${safeLuName}"`
      );
    }

    // formula values
    if (formulaCols.length > 0) {
      for (const fc of formulaCols) {
        extraSelects.push(
          `TRY_CAST(TRY(${fc.formula}) AS VARCHAR) AS "${fc.name.replace(/"/g, '""')}"`
        );
      }
    }

    let rows: Record<string, unknown>[];
    const extraSelectStr = extraSelects.length > 0 ? ', ' + extraSelects.join(', ') : '';
    const joinStr = joinClauses.length > 0 ? ' ' + joinClauses.join(' ') : '';

    try {
      const dataResult = await db.runAndReadAll(
        `SELECT t.rowid, t.*${extraSelectStr} FROM "${tableName}" t${joinStr} ORDER BY t.__order ASC`
      );
      rows = dataResult.getRowObjectsJson();
    } catch {
      // Fall back to base query
      const dataResult = await db.runAndReadAll(`SELECT rowid, * FROM "${tableName}" ORDER BY __order ASC`);
      rows = dataResult.getRowObjectsJson();
      for (const row of rows) {
        for (const fc of formulaCols) {
          row[fc.name] = '#ERROR';
        }
      }
    }

    // Fetch linked record options for dropdowns
    const linkedRecordOptions: Record<string, Array<{ rowid: number; displayValue: string }>> = {};
    for (const lrCol of linkedRecordCols) {
      const info = joinMap.get(lrCol.linkedSheetId!);
      if (!info) continue;
      try {
        const safeDisplayCol = lrCol.linkedDisplayColumn!.replace(/"/g, '""');
        const optResult = await db.runAndReadAll(
          `SELECT rowid, "${safeDisplayCol}" AS display_value FROM "${info.linkedTableName}" ORDER BY rowid ASC`
        );
        const optRows = optResult.getRowObjectsJson() as Array<Record<string, unknown>>;
        linkedRecordOptions[lrCol.id] = optRows.map((r) => ({
          rowid: Number(r.rowid),
          displayValue: r.display_value != null ? String(r.display_value) : '',
        }));
      } catch {
        // Skip if query fails
      }
    }

    const response: Record<string, unknown> = { ...meta, rows };
    if (Object.keys(linkedRecordOptions).length > 0) {
      response.linkedRecordOptions = linkedRecordOptions;
    }

    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/sheets/:id/schema  —  get sheet schema (metadata + linkedRecordOptions, no rows)
// ---------------------------------------------------------------------------
router.get('/api/sheets/:id/schema', async (req: Request, res: Response) => {
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

    const columns = meta.columns as Array<{
      id: string; name: string; cellType: string;
      linkedSheetId?: string; linkedDisplayColumn?: string;
    }>;

    // Fetch linked record options for dropdowns
    const linkedRecordCols = columns.filter(
      (c) => c.cellType === 'linked_record' && c.linkedSheetId && c.linkedDisplayColumn
    );

    const linkedRecordOptions: Record<string, Array<{ rowid: number; displayValue: string }>> = {};
    for (const lrCol of linkedRecordCols) {
      const linkedTable = safeTableName(lrCol.linkedSheetId!);
      try {
        const safeDisplayCol = lrCol.linkedDisplayColumn!.replace(/"/g, '""');
        const optResult = await db.runAndReadAll(
          `SELECT rowid, "${safeDisplayCol}" AS display_value FROM "${linkedTable}" ORDER BY rowid ASC`
        );
        const optRows = optResult.getRowObjectsJson() as Array<Record<string, unknown>>;
        linkedRecordOptions[lrCol.id] = optRows.map((r) => ({
          rowid: Number(r.rowid),
          displayValue: r.display_value != null ? String(r.display_value) : '',
        }));
      } catch {
        // Skip if linked table doesn't exist
      }
    }

    const response: Record<string, unknown> = { ...meta };
    if (Object.keys(linkedRecordOptions).length > 0) {
      response.linkedRecordOptions = linkedRecordOptions;
    }

    res.json(response);
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

    // Insert new rows in batches (skip virtual columns)
    const physicalCols = sheetColumns.filter((c) => c.cellType !== 'formula' && c.cellType !== 'lookup');
    await batchInsert(db, tableName, physicalCols, rows);

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

    // Get next __order value
    const orderResult = await db.runAndReadAll(`SELECT COALESCE(MAX(__order), 0) + 1 as next_order FROM "${tableName}"`);
    const nextOrder = (orderResult.getRowObjectsJson()[0] as Record<string, unknown>)?.next_order ?? 1;

    // Skip virtual columns — they have no physical column
    const physicalColumns = sheetColumns.filter((c) => c.cellType !== 'formula' && c.cellType !== 'lookup');
    const colNames = `__order, ` + physicalColumns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(', ');
    const values = `${nextOrder}, ` + physicalColumns
      .map((col) => {
        const val = row[col.name];
        if (val === null || val === undefined) return 'NULL';
        if (col.cellType === 'number') return Number(val);
        if (col.cellType === 'checkbox') return val ? 'TRUE' : 'FALSE';
        return `'${String(val).replace(/'/g, "''")}'`;
      })
      .join(', ');

    await db.run(`INSERT INTO "${tableName}" (${colNames}) VALUES (${values})`);

    // Return the rowid of the newly inserted row
    const lastRowResult = await db.runAndReadAll(`SELECT max(rowid) as last_rowid FROM "${tableName}"`);
    const lastRowRows = lastRowResult.getRowObjectsJson();
    const lastRowid = (lastRowRows[0] as Record<string, unknown>)?.last_rowid;

    logAudit(id, 'row_add', { rowId: lastRowid });
    res.status(201).json({ success: true, rowid: lastRowid });
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

    // Reject writes to virtual columns — they are computed
    if (colDef?.cellType === 'formula' || colDef?.cellType === 'lookup') {
      res.status(400).json({ error: `Cannot edit ${colDef.cellType} column cells` });
      return;
    }

    const formattedValue = formatValue(value, colDef?.cellType || 'text');

    const safeColumn = `"${column.replace(/"/g, '""')}"`;
    await db.run(
      `UPDATE "${tableName}" SET ${safeColumn} = ${formattedValue} WHERE rowid = ${Number(rowIndex)}`
    );

    logAudit(id, 'cell_update', { rowId: rowIndex, column, value });

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/sheets/:id/cells/bulk  —  update multiple cells at once
// ---------------------------------------------------------------------------
router.put('/api/sheets/:id/cells/bulk', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { cells } = req.body as {
      cells: Array<{ rowId: number; column: string; value: unknown }>;
    };

    if (!cells || !Array.isArray(cells) || cells.length === 0) {
      res.status(400).json({ error: 'cells array is required' });
      return;
    }

    const db = getDb();
    const tableName = safeTableName(id);

    // Fetch column metadata once
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

    // Build a map for quick column type lookup
    const colTypeMap = new Map(sheetColumns.map((c) => [c.name, c.cellType]));

    let updated = 0;
    for (const cell of cells) {
      const cellType = colTypeMap.get(cell.column) || 'text';
      const formattedValue = formatValue(cell.value, cellType);
      const safeColumn = `"${cell.column.replace(/"/g, '""')}"`;
      await db.run(
        `UPDATE "${tableName}" SET ${safeColumn} = ${formattedValue} WHERE rowid = ${Number(cell.rowId)}`
      );
      updated++;
    }

    logAudit(id, 'bulk_cell_update', { count: updated });

    res.json({ success: true, updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/sheets/:id/rows  —  delete specific rows by rowid
// ---------------------------------------------------------------------------
router.delete('/api/sheets/:id/rows', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { rowIds } = req.body as { rowIds: number[] };

    if (!rowIds || !Array.isArray(rowIds) || rowIds.length === 0) {
      res.status(400).json({ error: 'rowIds array is required' });
      return;
    }

    const db = getDb();
    const tableName = safeTableName(id);

    const idList = rowIds.map(Number).join(', ');
    await db.run(`DELETE FROM "${tableName}" WHERE rowid IN (${idList})`);

    logAudit(id, 'rows_delete', { rowIds });

    res.json({ success: true, deleted: rowIds.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/sheets/:id/columns  —  add a column
// ---------------------------------------------------------------------------
router.post('/api/sheets/:id/columns', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, cellType, width, options, formula, linkedSheetId, linkedDisplayColumn, lookupLinkedColumn, lookupReturnColumn } = req.body as {
      name: string;
      cellType: string;
      width?: number;
      options?: string[];
      formula?: string;
      linkedSheetId?: string;
      linkedDisplayColumn?: string;
      lookupLinkedColumn?: string;
      lookupReturnColumn?: string;
    };

    if (!name || !cellType) {
      res.status(400).json({ error: 'name and cellType are required' });
      return;
    }

    const db = getDb();
    const tableName = safeTableName(id);

    // Virtual columns (formula, lookup) — skip physical column creation
    if (cellType !== 'formula' && cellType !== 'lookup') {
      const safeName = name.replace(/"/g, '""');
      await db.run(`ALTER TABLE "${tableName}" ADD COLUMN "${safeName}" ${cellTypeToDuckDB(cellType)}`);
    }

    // Update columns metadata
    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${id.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    const columnsRaw = (metaRows[0] as Record<string, unknown>).columns;
    const columns = (typeof columnsRaw === 'string' ? JSON.parse(columnsRaw) : columnsRaw) as Record<string, unknown>[];

    const colId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const newCol: Record<string, unknown> = { id: colId, name, cellType, width: width || 150 };
    if (options) newCol.options = options;
    if (formula) newCol.formula = formula;
    if (linkedSheetId) newCol.linkedSheetId = linkedSheetId;
    if (linkedDisplayColumn) newCol.linkedDisplayColumn = linkedDisplayColumn;
    if (lookupLinkedColumn) newCol.lookupLinkedColumn = lookupLinkedColumn;
    if (lookupReturnColumn) newCol.lookupReturnColumn = lookupReturnColumn;
    columns.push(newCol);

    const columnsJson = JSON.stringify(columns);
    await db.run(
      `UPDATE __quak_sheets SET columns = '${columnsJson.replace(/'/g, "''")}', updated_at = current_timestamp WHERE id = '${id.replace(/'/g, "''")}'`
    );

    logAudit(id, 'column_add', { columnName: name, cellType });
    res.status(201).json(newCol);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/sheets/:id/columns/:columnId  —  delete a column
// ---------------------------------------------------------------------------
router.delete('/api/sheets/:id/columns/:columnId', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const columnId = req.params.columnId as string;

    const db = getDb();
    const tableName = safeTableName(id);

    // Get columns metadata
    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${id.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    const columnsRaw = (metaRows[0] as Record<string, unknown>).columns;
    const columns = (typeof columnsRaw === 'string' ? JSON.parse(columnsRaw) : columnsRaw) as Record<string, unknown>[];

    const col = columns.find((c) => c.id === columnId);
    if (!col) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    // Virtual columns (formula, lookup) — skip physical column drop
    if (col.cellType !== 'formula' && col.cellType !== 'lookup') {
      const colName = (col.name as string).replace(/"/g, '""');
      await db.run(`ALTER TABLE "${tableName}" DROP COLUMN "${colName}"`);
    }

    const updatedColumns = columns.filter((c) => c.id !== columnId);
    const columnsJson = JSON.stringify(updatedColumns);
    await db.run(
      `UPDATE __quak_sheets SET columns = '${columnsJson.replace(/'/g, "''")}', updated_at = current_timestamp WHERE id = '${id.replace(/'/g, "''")}'`
    );

    logAudit(id, 'column_delete', { columnId, columnName: col.name as string });

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/sheets/:id/columns/:columnId  —  rename or change column type
// ---------------------------------------------------------------------------
router.put('/api/sheets/:id/columns/:columnId', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const columnId = req.params.columnId as string;
    const { name: newName, cellType: newCellType, width: newWidth, options: newOptions, pinned: newPinned, conditionalFormats: newConditionalFormats, validationRules: newValidationRules, formula: newFormula, linkedSheetId: newLinkedSheetId, linkedDisplayColumn: newLinkedDisplayColumn, lookupLinkedColumn: newLookupLinkedColumn, lookupReturnColumn: newLookupReturnColumn, dependentOn: newDependentOn } = req.body as {
      name?: string;
      cellType?: string;
      width?: number;
      options?: string[];
      pinned?: 'left' | null;
      conditionalFormats?: unknown[];
      validationRules?: unknown[];
      formula?: string;
      linkedSheetId?: string;
      linkedDisplayColumn?: string;
      lookupLinkedColumn?: string;
      lookupReturnColumn?: string;
      dependentOn?: { columnId: string; mapping: Record<string, string[]> } | null;
    };

    const db = getDb();
    const tableName = safeTableName(id);

    // Get columns metadata
    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${id.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    const columnsRaw = (metaRows[0] as Record<string, unknown>).columns;
    const columns = (typeof columnsRaw === 'string' ? JSON.parse(columnsRaw) : columnsRaw) as Record<string, unknown>[];

    const colIndex = columns.findIndex((c) => c.id === columnId);
    if (colIndex === -1) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    const col = columns[colIndex];
    const oldName = col.name as string;

    // Rename in DuckDB if name changed (skip for virtual columns)
    if (newName && newName !== oldName) {
      if (col.cellType !== 'formula' && col.cellType !== 'lookup') {
        const safeOld = oldName.replace(/"/g, '""');
        const safeNew = newName.replace(/"/g, '""');
        await db.run(`ALTER TABLE "${tableName}" RENAME COLUMN "${safeOld}" TO "${safeNew}"`);
      }
      col.name = newName;
    }

    if (newCellType) col.cellType = newCellType;
    if (newWidth !== undefined) col.width = newWidth;
    if (newOptions !== undefined) col.options = newOptions;
    if (newPinned !== undefined) col.pinned = newPinned;
    if (newConditionalFormats !== undefined) col.conditionalFormats = newConditionalFormats;
    if (newValidationRules !== undefined) col.validationRules = newValidationRules;
    if (newFormula !== undefined) col.formula = newFormula;
    if (newLinkedSheetId !== undefined) col.linkedSheetId = newLinkedSheetId;
    if (newLinkedDisplayColumn !== undefined) col.linkedDisplayColumn = newLinkedDisplayColumn;
    if (newLookupLinkedColumn !== undefined) col.lookupLinkedColumn = newLookupLinkedColumn;
    if (newLookupReturnColumn !== undefined) col.lookupReturnColumn = newLookupReturnColumn;
    if (newDependentOn !== undefined) {
      if (newDependentOn === null) {
        delete col.dependentOn;
      } else {
        col.dependentOn = newDependentOn;
      }
    }

    columns[colIndex] = col;
    const columnsJson = JSON.stringify(columns);
    await db.run(
      `UPDATE __quak_sheets SET columns = '${columnsJson.replace(/'/g, "''")}', updated_at = current_timestamp WHERE id = '${id.replace(/'/g, "''")}'`
    );

    if (newName && newName !== oldName) {
      logAudit(id, 'column_rename', { columnId, oldName, newName });
    }

    res.json(col);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/sheets/:id/rows/reorder  —  reorder rows by setting __order
// ---------------------------------------------------------------------------
router.put('/api/sheets/:id/rows/reorder', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { rowIds } = req.body as { rowIds: number[] };

    if (!rowIds || !Array.isArray(rowIds) || rowIds.length === 0) {
      res.status(400).json({ error: 'rowIds array is required' });
      return;
    }

    const db = getDb();
    const tableName = safeTableName(id);

    // Ensure __order column exists (for tables created before this feature)
    try {
      await db.run(`ALTER TABLE "${tableName}" ADD COLUMN __order INTEGER`);
    } catch {
      // Column already exists
    }

    for (let i = 0; i < rowIds.length; i++) {
      await db.run(`UPDATE "${tableName}" SET __order = ${i} WHERE rowid = ${Number(rowIds[i])}`);
    }

    logAudit(id, 'row_reorder', { rowCount: rowIds.length });

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
