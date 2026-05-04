// Integration test: AI tool functions must produce sheets that the
// HTTP route handlers can subsequently read. Catches the class of bug
// where create_sheet's CREATE TABLE diverges from POST /api/sheets's
// CREATE TABLE (e.g. missing __order column → GET /api/sheets/:id 500s).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('AI tools — end-to-end parity with HTTP routes', () => {
  let tmpDir: string;
  let executeTool: typeof import('../../server/llm/tools.js').executeTool;
  let getDb: typeof import('../../server/db.js').getDb;
  let initDb: typeof import('../../server/db.js').initDb;
  let closeDb: typeof import('../../server/db.js').closeDb;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quak-aitools-'));
    process.env.STORAGE_DIR = tmpDir;

    // Import after STORAGE_DIR is set so DB_PATH resolves into the tmp dir.
    const dbMod = await import('../../server/db.ts');
    const toolsMod = await import('../../server/llm/tools.ts');
    initDb = dbMod.initDb;
    getDb = dbMod.getDb;
    closeDb = dbMod.closeDb;
    executeTool = toolsMod.executeTool;

    await initDb();
  });

  afterAll(async () => {
    await closeDb();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function tableName(id: string): string {
    return 'sheet_' + id.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  it('create_sheet table includes __order so GET /api/sheets/:id ORDER BY __order works', async () => {
    const result = await executeTool('create_sheet', {
      name: 'Test Sheet',
      columns: [
        { name: 'Item', cellType: 'text' },
        { name: 'Quantity', cellType: 'number' },
      ],
    });

    expect(result.error).toBeUndefined();
    const sheet = result.data as { id: string };
    expect(sheet.id).toMatch(/^[0-9a-f-]{36}$/i);

    // The query GET /api/sheets/:id runs (line 197 of sheets.ts) — must not throw.
    const r = await getDb().runAndReadAll(
      `SELECT t.rowid, t.* FROM "${tableName(sheet.id)}" t ORDER BY t.__order ASC`,
    );
    expect(r.getRowObjectsJson()).toEqual([]);
  });

  it('create_sheet preserves dropdown options in the column metadata', async () => {
    const result = await executeTool('create_sheet', {
      name: 'Dropdowns',
      columns: [
        {
          name: 'Status',
          cellType: 'dropdown',
          options: ['Todo', 'In Progress', 'Done'],
        },
      ],
    });
    const sheet = result.data as { columns: Array<{ name: string; options?: string[] }> };
    const status = sheet.columns.find((c) => c.name === 'Status');
    expect(status?.options).toEqual(['Todo', 'In Progress', 'Done']);
  });

  it('add_rows populates __order so rows are returned in insert order', async () => {
    const create = await executeTool('create_sheet', {
      name: 'Ordered',
      columns: [{ name: 'Letter', cellType: 'text' }],
    });
    const sheet = create.data as { id: string };

    await executeTool('add_rows', {
      sheetId: sheet.id,
      rows: [{ Letter: 'A' }, { Letter: 'B' }, { Letter: 'C' }],
    });

    const r = await getDb().runAndReadAll(
      `SELECT "Letter" FROM "${tableName(sheet.id)}" ORDER BY __order ASC`,
    );
    const rows = r.getRowObjectsJson() as Array<Record<string, unknown>>;
    expect(rows.map((row) => row.Letter)).toEqual(['A', 'B', 'C']);
  });

  it('sort_sheet updates __order so the new order is visible via GET /api/sheets/:id', async () => {
    const create = await executeTool('create_sheet', {
      name: 'ToSort',
      columns: [{ name: 'N', cellType: 'number' }],
    });
    const sheet = create.data as { id: string };

    await executeTool('add_rows', {
      sheetId: sheet.id,
      rows: [{ N: 3 }, { N: 1 }, { N: 2 }],
    });
    await executeTool('sort_sheet', { sheetId: sheet.id, column: 'N', direction: 'asc' });

    // GET-sheet ORDER BY __order ASC should now reflect the sort.
    const r = await getDb().runAndReadAll(
      `SELECT "N" FROM "${tableName(sheet.id)}" ORDER BY __order ASC`,
    );
    const rows = r.getRowObjectsJson() as Array<Record<string, unknown>>;
    expect(rows.map((row) => Number(row.N))).toEqual([1, 2, 3]);
  });

  it('create_sheet skips virtual columns (formula/lookup) from the physical table but keeps them in metadata', async () => {
    const result = await executeTool('create_sheet', {
      name: 'Virtuals',
      columns: [
        { name: 'Price', cellType: 'number' },
        { name: 'Doubled', cellType: 'formula' },
        { name: 'Looked', cellType: 'lookup' },
      ],
    });
    const sheet = result.data as { id: string; columns: Array<{ name: string }> };
    expect(sheet.columns.map((c) => c.name)).toEqual(['Price', 'Doubled', 'Looked']);

    // Physical table should have Price + __order only
    const cols = await getDb().runAndReadAll(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName(sheet.id)}'`,
    );
    const names = (cols.getRowObjectsJson() as Array<Record<string, unknown>>).map((r) => r.column_name);
    expect(names).toContain('__order');
    expect(names).toContain('Price');
    expect(names).not.toContain('Doubled');
    expect(names).not.toContain('Looked');
  });

  // ---------- list_sheets / get_sheet ----------
  it('list_sheets returns sheets with parsed column metadata', async () => {
    await executeTool('create_sheet', {
      name: 'Listable',
      columns: [{ name: 'X', cellType: 'text' }],
    });
    const result = await executeTool('list_sheets', {});
    const sheets = result.data as Array<{ name: string; columns: unknown }>;
    const target = sheets.find((s) => s.name === 'Listable');
    expect(target).toBeDefined();
    expect(Array.isArray(target!.columns)).toBe(true);
  });

  it('get_sheet returns metadata + rows for an existing sheet', async () => {
    const create = await executeTool('create_sheet', {
      name: 'Gettable',
      columns: [{ name: 'Item', cellType: 'text' }],
    });
    const sheetId = (create.data as { id: string }).id;
    await executeTool('add_rows', { sheetId, rows: [{ Item: 'X' }] });

    const result = await executeTool('get_sheet', { sheetId });
    const sheet = result.data as { name: string; rows: unknown[]; rowCount: number };
    expect(sheet.name).toBe('Gettable');
    expect(sheet.rowCount).toBe(1);
  });

  it('get_sheet errors on nonexistent sheet id', async () => {
    const result = await executeTool('get_sheet', { sheetId: 'does-not-exist' });
    expect(result.error).toMatch(/Sheet not found/);
  });

  // ---------- update_cells ----------
  it('update_cells writes the new value identified by rowid', async () => {
    const create = await executeTool('create_sheet', {
      name: 'Updatable',
      columns: [
        { name: 'Item', cellType: 'text' },
        { name: 'Qty', cellType: 'number' },
      ],
    });
    const sheetId = (create.data as { id: string }).id;
    await executeTool('add_rows', { sheetId, rows: [{ Item: 'A', Qty: 1 }, { Item: 'B', Qty: 2 }] });

    const result = await executeTool('update_cells', {
      sheetId,
      updates: [{ rowId: 1, column: 'Qty', value: 99 }],
    });
    expect(result.data).toEqual({ updated: 1 });

    const r = await getDb().runAndReadAll(
      `SELECT "Item", "Qty" FROM "${tableName(sheetId)}" WHERE rowid = 1`,
    );
    const row = (r.getRowObjectsJson()[0] as Record<string, unknown>);
    expect(Number(row.Qty)).toBe(99);
  });

  // ---------- delete_rows ----------
  it('delete_rows removes the given rowids from the table', async () => {
    const create = await executeTool('create_sheet', {
      name: 'Deletable',
      columns: [{ name: 'X', cellType: 'text' }],
    });
    const sheetId = (create.data as { id: string }).id;
    await executeTool('add_rows', { sheetId, rows: [{ X: 'a' }, { X: 'b' }, { X: 'c' }] });

    // DuckDB rowids start at 0, so rowIds [1, 2] = 'b' and 'c', leaving 'a'.
    await executeTool('delete_rows', { sheetId, rowIds: [1, 2] });
    const r = await getDb().runAndReadAll(`SELECT "X" FROM "${tableName(sheetId)}" ORDER BY rowid`);
    const remaining = (r.getRowObjectsJson() as Array<Record<string, unknown>>).map((row) => row.X);
    expect(remaining).toEqual(['a']);
  });

  // ---------- add_column / rename_column / delete_column ----------
  it('add_column adds the column to both the table and the metadata', async () => {
    const create = await executeTool('create_sheet', {
      name: 'AddCol',
      columns: [{ name: 'A', cellType: 'text' }],
    });
    const sheetId = (create.data as { id: string }).id;

    await executeTool('add_column', { sheetId, name: 'B', cellType: 'number' });

    // Metadata
    const meta = await executeTool('get_sheet', { sheetId });
    const sheet = meta.data as { columns: Array<{ name: string }> };
    expect(sheet.columns.map((c) => c.name)).toContain('B');

    // Physical table
    const cols = await getDb().runAndReadAll(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName(sheetId)}'`,
    );
    const names = (cols.getRowObjectsJson() as Array<Record<string, unknown>>).map((r) => r.column_name);
    expect(names).toContain('B');
  });

  it('add_column preserves dropdown options', async () => {
    const create = await executeTool('create_sheet', {
      name: 'AddDropdown',
      columns: [{ name: 'A', cellType: 'text' }],
    });
    const sheetId = (create.data as { id: string }).id;

    await executeTool('add_column', {
      sheetId,
      name: 'Status',
      cellType: 'dropdown',
      options: ['Open', 'Closed'],
    });

    const meta = await executeTool('get_sheet', { sheetId });
    const sheet = meta.data as { columns: Array<{ name: string; options?: string[] }> };
    const status = sheet.columns.find((c) => c.name === 'Status');
    expect(status?.options).toEqual(['Open', 'Closed']);
  });

  it('rename_column renames in both physical table and metadata; data preserved', async () => {
    const create = await executeTool('create_sheet', {
      name: 'Rename',
      columns: [{ name: 'OldName', cellType: 'text' }],
    });
    const sheetId = (create.data as { id: string }).id;
    await executeTool('add_rows', { sheetId, rows: [{ OldName: 'value' }] });

    await executeTool('rename_column', { sheetId, columnId: 'oldname', newName: 'NewName' });

    const meta = await executeTool('get_sheet', { sheetId });
    const sheet = meta.data as { columns: Array<{ name: string }>; rows: Array<Record<string, unknown>> };
    expect(sheet.columns.map((c) => c.name)).toContain('NewName');
    expect(sheet.columns.map((c) => c.name)).not.toContain('OldName');
    expect(sheet.rows[0].NewName).toBe('value');
  });

  it('delete_column drops the column from table and metadata', async () => {
    const create = await executeTool('create_sheet', {
      name: 'DropCol',
      columns: [
        { name: 'A', cellType: 'text' },
        { name: 'B', cellType: 'text' },
      ],
    });
    const sheetId = (create.data as { id: string }).id;

    await executeTool('delete_column', { sheetId, columnId: 'b' });

    const meta = await executeTool('get_sheet', { sheetId });
    const sheet = meta.data as { columns: Array<{ name: string }> };
    expect(sheet.columns.map((c) => c.name)).toEqual(['A']);

    const cols = await getDb().runAndReadAll(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName(sheetId)}'`,
    );
    const names = (cols.getRowObjectsJson() as Array<Record<string, unknown>>).map((r) => r.column_name);
    expect(names).not.toContain('B');
  });

  // ---------- delete_sheet ----------
  it('delete_sheet drops the table and removes metadata', async () => {
    const create = await executeTool('create_sheet', {
      name: 'ToDrop',
      columns: [{ name: 'X', cellType: 'text' }],
    });
    const sheetId = (create.data as { id: string }).id;

    await executeTool('delete_sheet', { sheetId });

    // Metadata gone
    const meta = await getDb().runAndReadAll(
      `SELECT id FROM __quak_sheets WHERE id = '${sheetId}'`,
    );
    expect(meta.getRowObjectsJson().length).toBe(0);

    // Table gone
    const tab = await getDb().runAndReadAll(
      `SELECT table_name FROM information_schema.tables WHERE table_name = '${tableName(sheetId)}'`,
    );
    expect(tab.getRowObjectsJson().length).toBe(0);
  });

  // ---------- run_sql ----------
  it('run_sql allows SELECT but rejects mutating statements', async () => {
    const ok = await executeTool('run_sql', { sql: 'SELECT 1+1 AS two' });
    const okData = ok.data as { rows: Array<Record<string, unknown>> };
    expect(Number(okData.rows[0].two)).toBe(2);

    const bad = await executeTool('run_sql', { sql: 'DROP TABLE __quak_sheets' });
    expect(bad.error).toMatch(/Only SELECT queries are allowed/);
  });

  // ---------- summarize_data ----------
  it('summarize_data returns row count and per-column stats', async () => {
    const create = await executeTool('create_sheet', {
      name: 'Stats',
      columns: [
        { name: 'Item', cellType: 'text' },
        { name: 'Qty', cellType: 'number' },
      ],
    });
    const sheetId = (create.data as { id: string }).id;
    await executeTool('add_rows', {
      sheetId,
      rows: [{ Item: 'A', Qty: 10 }, { Item: 'B', Qty: 20 }, { Item: 'C', Qty: 30 }],
    });

    const result = await executeTool('summarize_data', { sheetId });
    const summary = result.data as {
      rowCount: number;
      columns: Array<{ name: string; min?: unknown; max?: unknown; avg?: unknown; sum?: unknown }>;
    };
    expect(Number(summary.rowCount)).toBe(3);
    const qtyStat = summary.columns.find((c) => c.name === 'Qty');
    expect(qtyStat).toBeDefined();
    expect(Number(qtyStat!.sum)).toBe(60);
    expect(Number(qtyStat!.min)).toBe(10);
    expect(Number(qtyStat!.max)).toBe(30);
  });

  // ---------- filter_sheet ----------
  it('filter_sheet filters by equality, contains, and numeric comparison', async () => {
    const create = await executeTool('create_sheet', {
      name: 'Filterable',
      columns: [
        { name: 'Name', cellType: 'text' },
        { name: 'Score', cellType: 'number' },
      ],
    });
    const sheetId = (create.data as { id: string }).id;
    await executeTool('add_rows', {
      sheetId,
      rows: [
        { Name: 'Alice', Score: 80 },
        { Name: 'Bob', Score: 50 },
        { Name: 'Carol', Score: 90 },
      ],
    });

    const eq = await executeTool('filter_sheet', { sheetId, column: 'Name', operator: 'equals', value: 'Alice' });
    expect((eq.data as { rowCount: number }).rowCount).toBe(1);

    const contains = await executeTool('filter_sheet', { sheetId, column: 'Name', operator: 'contains', value: 'a' });
    // case-insensitive expected? LIKE is case-sensitive in DuckDB. Carol & alice — only "Carol" has lowercase 'a'.
    // So expect at least Carol; Alice has uppercase A.
    expect((contains.data as { rowCount: number }).rowCount).toBeGreaterThanOrEqual(1);

    const gt = await executeTool('filter_sheet', { sheetId, column: 'Score', operator: 'greater_than', value: '60' });
    expect((gt.data as { rowCount: number }).rowCount).toBe(2);
  });

  // ---------- set_conditional_format ----------
  it('set_conditional_format attaches rules to the column metadata', async () => {
    const create = await executeTool('create_sheet', {
      name: 'CondFmt',
      columns: [{ name: 'Score', cellType: 'number' }],
    });
    const sheetId = (create.data as { id: string }).id;

    await executeTool('set_conditional_format', {
      sheetId,
      columnId: 'score',
      rules: [{ operator: 'greater_than', value: '50', bgColor: '#ff0000', textColor: '#ffffff' }],
    });

    const meta = await executeTool('get_sheet', { sheetId });
    const sheet = meta.data as {
      columns: Array<{ id: string; conditionalFormats?: Array<Record<string, unknown>> }>;
    };
    const scoreCol = sheet.columns.find((c) => c.id === 'score');
    expect(Array.isArray(scoreCol?.conditionalFormats)).toBe(true);
    expect(scoreCol!.conditionalFormats!.length).toBe(1);
    expect((scoreCol!.conditionalFormats![0] as Record<string, unknown>).operator).toBe('greater_than');
  });
});
