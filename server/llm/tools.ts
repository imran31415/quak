import crypto from 'crypto';
import { getDb } from '../db.js';
import { batchInsert } from '../utils/batchInsert.js';
import { cellTypeToDuckDB, safeTableName, formatValue } from '../utils/sql.js';

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

function getSheetColumns(columnsRaw: unknown): { name: string; cellType: string; id?: string }[] {
  return (typeof columnsRaw === 'string' ? JSON.parse(columnsRaw) : columnsRaw) as {
    name: string;
    cellType: string;
    id?: string;
  }[];
}

const handlers: Record<string, ToolHandler> = {
  list_sheets: async () => {
    const db = getDb();
    const result = await db.runAndReadAll(
      'SELECT id, name, columns, created_at, updated_at FROM __quak_sheets ORDER BY created_at DESC'
    );
    const rows = result.getRowObjectsJson();
    return rows.map((row: Record<string, unknown>) => {
      if (typeof row.columns === 'string') {
        row.columns = JSON.parse(row.columns);
      }
      return { id: row.id, name: row.name, columns: row.columns };
    });
  },

  get_sheet: async (args) => {
    const sheetId = args.sheetId as string;
    const limit = (args.limit as number) || 50;
    const db = getDb();

    const metaResult = await db.runAndReadAll(
      `SELECT id, name, columns FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) throw new Error(`Sheet not found: ${sheetId}`);

    const meta = metaRows[0] as Record<string, unknown>;
    if (typeof meta.columns === 'string') meta.columns = JSON.parse(meta.columns);

    const tableName = safeTableName(sheetId);
    const dataResult = await db.runAndReadAll(`SELECT rowid, * FROM "${tableName}" LIMIT ${Number(limit)}`);
    const rows = dataResult.getRowObjectsJson();

    return { id: meta.id, name: meta.name, columns: meta.columns, rows, rowCount: rows.length };
  },

  create_sheet: async (args) => {
    const name = args.name as string;
    const columns = args.columns as { name: string; cellType: string }[];
    const db = getDb();

    const id = crypto.randomUUID();
    const tableName = safeTableName(id);

    const colDefs = columns
      .map((col) => `"${col.name.replace(/"/g, '""')}" ${cellTypeToDuckDB(col.cellType)}`)
      .join(', ');

    await db.run(`CREATE TABLE "${tableName}" (${colDefs})`);

    const fullColumns = columns.map((col) => ({
      id: col.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      name: col.name,
      cellType: col.cellType,
      width: 150,
    }));

    const columnsJson = JSON.stringify(fullColumns);
    await db.run(
      `INSERT INTO __quak_sheets (id, name, columns, created_at, updated_at)
       VALUES ('${id}', '${name.replace(/'/g, "''")}', '${columnsJson.replace(/'/g, "''")}', current_timestamp, current_timestamp)`
    );

    return { id, name, columns: fullColumns };
  },

  add_rows: async (args) => {
    const sheetId = args.sheetId as string;
    const rows = args.rows as Record<string, unknown>[];
    const db = getDb();
    const tableName = safeTableName(sheetId);

    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) throw new Error(`Sheet not found: ${sheetId}`);

    const sheetColumns = getSheetColumns((metaRows[0] as Record<string, unknown>).columns);
    await batchInsert(db, tableName, sheetColumns, rows);

    return { added: rows.length };
  },

  update_cells: async (args) => {
    const sheetId = args.sheetId as string;
    const updates = args.updates as { rowId: number; column: string; value: unknown }[];
    const db = getDb();
    const tableName = safeTableName(sheetId);

    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) throw new Error(`Sheet not found: ${sheetId}`);

    const sheetColumns = getSheetColumns((metaRows[0] as Record<string, unknown>).columns);

    let updated = 0;
    for (const u of updates) {
      const colDef = sheetColumns.find((c) => c.name === u.column);
      const formattedValue = formatValue(u.value, colDef?.cellType || 'text');
      const safeColumn = `"${u.column.replace(/"/g, '""')}"`;
      await db.run(
        `UPDATE "${tableName}" SET ${safeColumn} = ${formattedValue} WHERE rowid = ${Number(u.rowId)}`
      );
      updated++;
    }

    return { updated };
  },

  delete_rows: async (args) => {
    const sheetId = args.sheetId as string;
    const rowIds = args.rowIds as number[];
    const db = getDb();
    const tableName = safeTableName(sheetId);

    const idList = rowIds.map(Number).join(', ');
    await db.run(`DELETE FROM "${tableName}" WHERE rowid IN (${idList})`);

    return { deleted: rowIds.length };
  },

  add_column: async (args) => {
    const sheetId = args.sheetId as string;
    const name = args.name as string;
    const cellType = args.cellType as string;
    const options = args.options as string[] | undefined;
    const db = getDb();
    const tableName = safeTableName(sheetId);

    const safeName = name.replace(/"/g, '""');
    await db.run(`ALTER TABLE "${tableName}" ADD COLUMN "${safeName}" ${cellTypeToDuckDB(cellType)}`);

    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) throw new Error(`Sheet not found: ${sheetId}`);

    const columns = getSheetColumns((metaRows[0] as Record<string, unknown>).columns);
    const colId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const newCol: Record<string, unknown> = { id: colId, name, cellType, width: 150 };
    if (options) newCol.options = options;
    columns.push(newCol as { name: string; cellType: string; id?: string });

    const columnsJson = JSON.stringify(columns);
    await db.run(
      `UPDATE __quak_sheets SET columns = '${columnsJson.replace(/'/g, "''")}', updated_at = current_timestamp WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );

    return { added: name };
  },

  delete_column: async (args) => {
    const sheetId = args.sheetId as string;
    const columnId = args.columnId as string;
    const db = getDb();
    const tableName = safeTableName(sheetId);

    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) throw new Error(`Sheet not found: ${sheetId}`);

    const columns = getSheetColumns((metaRows[0] as Record<string, unknown>).columns);
    const col = columns.find((c) => c.id === columnId);
    if (!col) throw new Error(`Column not found: ${columnId}`);

    const colName = col.name.replace(/"/g, '""');
    await db.run(`ALTER TABLE "${tableName}" DROP COLUMN "${colName}"`);

    const updatedColumns = columns.filter((c) => c.id !== columnId);
    const columnsJson = JSON.stringify(updatedColumns);
    await db.run(
      `UPDATE __quak_sheets SET columns = '${columnsJson.replace(/'/g, "''")}', updated_at = current_timestamp WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );

    return { deleted: columnId };
  },

  rename_column: async (args) => {
    const sheetId = args.sheetId as string;
    const columnId = args.columnId as string;
    const newName = args.newName as string;
    const db = getDb();
    const tableName = safeTableName(sheetId);

    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) throw new Error(`Sheet not found: ${sheetId}`);

    const columns = getSheetColumns((metaRows[0] as Record<string, unknown>).columns);
    const col = columns.find((c) => c.id === columnId);
    if (!col) throw new Error(`Column not found: ${columnId}`);

    const safeOld = col.name.replace(/"/g, '""');
    const safeNew = newName.replace(/"/g, '""');
    await db.run(`ALTER TABLE "${tableName}" RENAME COLUMN "${safeOld}" TO "${safeNew}"`);

    col.name = newName;
    const columnsJson = JSON.stringify(columns);
    await db.run(
      `UPDATE __quak_sheets SET columns = '${columnsJson.replace(/'/g, "''")}', updated_at = current_timestamp WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );

    return { renamed: { from: safeOld, to: newName } };
  },

  delete_sheet: async (args) => {
    const sheetId = args.sheetId as string;
    const db = getDb();
    const tableName = safeTableName(sheetId);

    await db.run(`DROP TABLE IF EXISTS "${tableName}"`);
    await db.run(`DELETE FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`);

    return { deleted: sheetId };
  },

  run_sql: async (args) => {
    const sql = args.sql as string;
    const forbidden = /\b(CREATE|DROP|ALTER|DELETE|UPDATE|INSERT|TRUNCATE|GRANT|REVOKE)\b/i;
    if (forbidden.test(sql)) {
      throw new Error('Only SELECT queries are allowed');
    }

    const db = getDb();
    const result = await db.runAndReadAll(sql);
    const columns = result.columnNames();
    const rows = result.getRowObjectsJson();

    return { columns, rows, rowCount: rows.length };
  },
};

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ data?: unknown; error?: string }> {
  const handler = handlers[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }

  try {
    const data = await handler(args);
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
