import crypto from 'crypto';
import { getDb } from '../db.js';
import { batchInsert } from '../utils/batchInsert.js';
import { cellTypeToDuckDB, safeTableName, formatValue } from '../utils/sql.js';
import type { ClientAction } from '../../shared/chat.js';

type ToolHandlerResult = unknown | { __clientAction: ClientAction; result: unknown };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolHandlerResult>;

const VIEW_TYPES = ['grid', 'kanban', 'calendar', 'gallery', 'pivot', 'form', 'dashboard'] as const;
const WIDGET_TYPES = ['chart', 'metric', 'table'] as const;
const CHART_TYPES = ['bar', 'line', 'pie'] as const;
const AGGREGATIONS = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'] as const;

async function loadSheetMeta(sheetId: string): Promise<{ name: string; columns: { name: string; cellType: string; id?: string }[] }> {
  const db = getDb();
  const result = await db.runAndReadAll(
    `SELECT name, columns FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`
  );
  const rows = result.getRowObjectsJson();
  if (rows.length === 0) throw new Error(`Sheet not found: ${sheetId}`);
  const meta = rows[0] as Record<string, unknown>;
  const columns = (typeof meta.columns === 'string' ? JSON.parse(meta.columns) : meta.columns) as {
    name: string;
    cellType: string;
    id?: string;
  }[];
  return { name: meta.name as string, columns };
}

function assertColumnsExist(columns: { name: string }[], names: string[], context: string): void {
  const existing = new Set(columns.map((c) => c.name));
  const missing = names.filter((n) => !existing.has(n));
  if (missing.length > 0) {
    const candidates = columns.map((c) => c.name).join(', ');
    throw new Error(
      `${context}: column(s) not found: ${missing.join(', ')}. Available columns: ${candidates}`,
    );
  }
}

function assertNumericColumn(columns: { name: string; cellType: string }[], colName: string): void {
  const col = columns.find((c) => c.name === colName);
  if (!col) throw new Error(`Column not found: ${colName}`);
  if (col.cellType !== 'number') {
    throw new Error(`Column "${colName}" has cellType "${col.cellType}"; expected number for chart/metric values.`);
  }
}

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
    const columns = args.columns as Array<{
      name: string;
      cellType: string;
      options?: string[];
    }>;
    const db = getDb();

    const id = crypto.randomUUID();
    const tableName = safeTableName(id);

    // Skip virtual columns (formula/lookup) when building the physical table.
    const physicalColumns = columns.filter(
      (col) => col.cellType !== 'formula' && col.cellType !== 'lookup',
    );
    const colDefs = physicalColumns
      .map((col) => `"${col.name.replace(/"/g, '""')}" ${cellTypeToDuckDB(col.cellType)}`)
      .join(', ');

    // __order matches the user-facing POST /api/sheets route — required for the
    // GET-sheet route's `ORDER BY t.__order ASC` to succeed.
    await db.run(`CREATE TABLE "${tableName}" (__order INTEGER${colDefs ? ', ' + colDefs : ''})`);

    const fullColumns = columns.map((col) => {
      const base: Record<string, unknown> = {
        id: col.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        name: col.name,
        cellType: col.cellType,
        width: 150,
      };
      if (col.cellType === 'dropdown' && Array.isArray(col.options)) {
        base.options = col.options;
      }
      return base;
    });

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
    // Skip virtual columns when inserting (they're computed at read time).
    const physicalCols = sheetColumns.filter((c) => c.cellType !== 'formula' && c.cellType !== 'lookup');
    await batchInsert(db, tableName, physicalCols, rows);
    // Backfill __order so the GET route's ORDER BY __order preserves insert order.
    await db.run(`UPDATE "${tableName}" SET __order = rowid WHERE __order IS NULL`);

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

  summarize_data: async (args) => {
    const sheetId = args.sheetId as string;
    const db = getDb();
    const tableName = safeTableName(sheetId);

    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) throw new Error(`Sheet not found: ${sheetId}`);

    const columns = getSheetColumns((metaRows[0] as Record<string, unknown>).columns);

    // Get row count
    const countResult = await db.runAndReadAll(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
    const rowCount = (countResult.getRowObjectsJson()[0] as Record<string, unknown>).cnt;

    const summary: Record<string, unknown> = { rowCount };
    const columnStats: Record<string, unknown>[] = [];

    for (const col of columns) {
      const safeName = `"${col.name.replace(/"/g, '""')}"`;
      const stat: Record<string, unknown> = { name: col.name, cellType: col.cellType };

      // Null count for all types
      const nullResult = await db.runAndReadAll(
        `SELECT COUNT(*) as cnt FROM "${tableName}" WHERE ${safeName} IS NULL`
      );
      stat.nullCount = (nullResult.getRowObjectsJson()[0] as Record<string, unknown>).cnt;

      if (col.cellType === 'number') {
        const aggResult = await db.runAndReadAll(
          `SELECT MIN(${safeName}) as min_val, MAX(${safeName}) as max_val, AVG(${safeName}) as avg_val, SUM(${safeName}) as sum_val FROM "${tableName}"`
        );
        const aggRow = aggResult.getRowObjectsJson()[0] as Record<string, unknown>;
        stat.min = aggRow.min_val;
        stat.max = aggRow.max_val;
        stat.avg = aggRow.avg_val;
        stat.sum = aggRow.sum_val;
      } else if (col.cellType === 'text' || col.cellType === 'dropdown') {
        const distinctResult = await db.runAndReadAll(
          `SELECT ${safeName} as val, COUNT(*) as cnt FROM "${tableName}" WHERE ${safeName} IS NOT NULL GROUP BY ${safeName} ORDER BY cnt DESC LIMIT 10`
        );
        stat.valueCounts = distinctResult.getRowObjectsJson();
        const distCountResult = await db.runAndReadAll(
          `SELECT COUNT(DISTINCT ${safeName}) as cnt FROM "${tableName}"`
        );
        stat.distinctCount = (distCountResult.getRowObjectsJson()[0] as Record<string, unknown>).cnt;
      }

      columnStats.push(stat);
    }

    summary.columns = columnStats;
    return summary;
  },

  sort_sheet: async (args) => {
    const sheetId = args.sheetId as string;
    const column = args.column as string;
    const direction = (args.direction as string) || 'asc';
    const db = getDb();
    const tableName = safeTableName(sheetId);

    const safeCol = `"${column.replace(/"/g, '""')}"`;
    const dir = direction.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Use CREATE-DROP-RENAME pattern
    const tempName = `${tableName}__sorted`;
    await db.run(`CREATE TABLE "${tempName}" AS SELECT * FROM "${tableName}" ORDER BY ${safeCol} ${dir}`);
    await db.run(`DROP TABLE "${tableName}"`);
    await db.run(`ALTER TABLE "${tempName}" RENAME TO "${tableName}"`);
    // Re-assign __order to reflect the new physical order. Otherwise GET-sheet
    // re-sorts by the old __order values and the sort isn't visible.
    await db.run(`UPDATE "${tableName}" SET __order = rowid`);

    return { sorted: column, direction: dir };
  },

  filter_sheet: async (args) => {
    const sheetId = args.sheetId as string;
    const column = args.column as string;
    const operator = args.operator as string;
    const value = args.value as string;
    const db = getDb();
    const tableName = safeTableName(sheetId);

    const safeCol = `"${column.replace(/"/g, '""')}"`;
    const safeVal = value.replace(/'/g, "''");

    let whereClause: string;
    switch (operator) {
      case 'equals':
        whereClause = `${safeCol} = '${safeVal}'`;
        break;
      case 'not_equals':
        whereClause = `${safeCol} != '${safeVal}'`;
        break;
      case 'greater_than':
        whereClause = `${safeCol} > ${Number(value)}`;
        break;
      case 'less_than':
        whereClause = `${safeCol} < ${Number(value)}`;
        break;
      case 'contains':
        whereClause = `${safeCol} LIKE '%${safeVal}%'`;
        break;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }

    const result = await db.runAndReadAll(`SELECT rowid, * FROM "${tableName}" WHERE ${whereClause}`);
    const rows = result.getRowObjectsJson();
    return { rows, rowCount: rows.length, filter: { column, operator, value } };
  },

  set_conditional_format: async (args) => {
    const sheetId = args.sheetId as string;
    const columnId = args.columnId as string;
    const rules = args.rules as { operator: string; value?: string; bgColor: string; textColor: string }[];
    const db = getDb();

    const metaResult = await db.runAndReadAll(
      `SELECT columns FROM __quak_sheets WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) throw new Error(`Sheet not found: ${sheetId}`);

    const columns = getSheetColumns((metaRows[0] as Record<string, unknown>).columns) as Record<string, unknown>[];
    const col = columns.find((c) => c.id === columnId);
    if (!col) throw new Error(`Column not found: ${columnId}`);

    // Add IDs to rules
    const rulesWithIds = rules.map((r, i) => ({
      id: `rule_${Date.now()}_${i}`,
      operator: r.operator,
      value: r.value,
      bgColor: r.bgColor,
      textColor: r.textColor,
    }));

    col.conditionalFormats = rulesWithIds;

    const columnsJson = JSON.stringify(columns);
    await db.run(
      `UPDATE __quak_sheets SET columns = '${columnsJson.replace(/'/g, "''")}', updated_at = current_timestamp WHERE id = '${sheetId.replace(/'/g, "''")}'`
    );

    return { applied: rulesWithIds.length, columnId };
  },

  // ---- Client-action tools ----
  // These mutate client-side zustand state (view configs, dashboard widgets).
  // The server validates inputs against the sheet's metadata, then returns
  // a __clientAction payload that the chat route emits over SSE.

  set_view: async (args) => {
    const sheetId = args.sheetId as string;
    const viewType = args.viewType as string;
    if (!VIEW_TYPES.includes(viewType as typeof VIEW_TYPES[number])) {
      throw new Error(`Invalid viewType "${viewType}". Must be one of: ${VIEW_TYPES.join(', ')}`);
    }
    await loadSheetMeta(sheetId);
    return {
      __clientAction: { kind: 'set_view', sheetId, viewType: viewType as typeof VIEW_TYPES[number] },
      result: { ok: true, viewType },
    };
  },

  add_dashboard_widget: async (args) => {
    const sheetId = args.sheetId as string;
    const type = args.type as string;
    const title = args.title as string;

    if (!WIDGET_TYPES.includes(type as typeof WIDGET_TYPES[number])) {
      throw new Error(`Invalid widget type "${type}". Must be one of: ${WIDGET_TYPES.join(', ')}`);
    }
    if (!title || typeof title !== 'string') {
      throw new Error('title is required');
    }
    const { columns } = await loadSheetMeta(sheetId);
    const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (type === 'chart') {
      const chartType = (args.chartType as string) ?? 'bar';
      const xColumn = args.xColumn as string;
      const yColumns = args.yColumns as string[];
      if (!CHART_TYPES.includes(chartType as typeof CHART_TYPES[number])) {
        throw new Error(`Invalid chartType "${chartType}". Must be one of: ${CHART_TYPES.join(', ')}`);
      }
      if (!xColumn || !Array.isArray(yColumns) || yColumns.length === 0) {
        throw new Error('chart widget requires xColumn and at least one yColumns entry');
      }
      assertColumnsExist(columns, [xColumn, ...yColumns], 'chart widget');
      for (const y of yColumns) assertNumericColumn(columns, y);
      const widget = {
        id, type: 'chart' as const, title,
        chartConfig: { chartType: chartType as typeof CHART_TYPES[number], xColumn, yColumns },
      };
      return {
        __clientAction: { kind: 'add_dashboard_widget', sheetId, widget },
        result: { ok: true, widgetId: id, type, title },
      };
    }

    if (type === 'metric') {
      const column = args.column as string;
      const aggregation = (args.aggregation as string) ?? 'COUNT';
      if (!AGGREGATIONS.includes(aggregation as typeof AGGREGATIONS[number])) {
        throw new Error(`Invalid aggregation "${aggregation}". Must be one of: ${AGGREGATIONS.join(', ')}`);
      }
      if (!column) throw new Error('metric widget requires column');
      assertColumnsExist(columns, [column], 'metric widget');
      if (aggregation !== 'COUNT') assertNumericColumn(columns, column);
      const widget = {
        id, type: 'metric' as const, title,
        metricConfig: { column, aggregation: aggregation as typeof AGGREGATIONS[number] },
      };
      return {
        __clientAction: { kind: 'add_dashboard_widget', sheetId, widget },
        result: { ok: true, widgetId: id, type, title },
      };
    }

    // table
    const tableColumns = args.tableColumns as string[];
    const tableLimit = Number(args.tableLimit ?? 10);
    if (!Array.isArray(tableColumns) || tableColumns.length === 0) {
      throw new Error('table widget requires tableColumns');
    }
    assertColumnsExist(columns, tableColumns, 'table widget');
    const widget = {
      id, type: 'table' as const, title,
      tableConfig: { columns: tableColumns, limit: tableLimit },
    };
    return {
      __clientAction: { kind: 'add_dashboard_widget', sheetId, widget },
      result: { ok: true, widgetId: id, type, title },
    };
  },

  clear_dashboard: async (args) => {
    const sheetId = args.sheetId as string;
    await loadSheetMeta(sheetId);
    return {
      __clientAction: { kind: 'clear_dashboard', sheetId },
      result: { ok: true },
    };
  },
};

export function isClientActionResult(
  data: unknown,
): data is { __clientAction: ClientAction; result: unknown } {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__clientAction' in data &&
    'result' in data
  );
}

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
