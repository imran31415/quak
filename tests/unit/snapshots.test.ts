import { describe, it, expect, beforeAll } from 'vitest';
import { DuckDBInstance } from '@duckdb/node-api';

describe('Snapshots DB', () => {
  let db: Awaited<ReturnType<Awaited<ReturnType<typeof DuckDBInstance.create>>['connect']>>;

  beforeAll(async () => {
    const instance = await DuckDBInstance.create(':memory:');
    db = await instance.connect();

    await db.run(`
      CREATE TABLE IF NOT EXISTS __quak_snapshots (
        id VARCHAR PRIMARY KEY,
        sheet_id VARCHAR NOT NULL,
        version INTEGER NOT NULL,
        label VARCHAR,
        columns_json JSON NOT NULL,
        rows_json JSON NOT NULL,
        row_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT current_timestamp
      )
    `);
  });

  it('version auto-increments per sheet', async () => {
    const sheetId = 'sheet-auto-inc';
    const columnsJson = JSON.stringify([{ name: 'Name', cellType: 'text' }]);
    const rowsJson = JSON.stringify([{ Name: 'Alice' }]);

    await db.run(
      `INSERT INTO __quak_snapshots (id, sheet_id, version, label, columns_json, rows_json, row_count)
       VALUES ('snap-1', '${sheetId}', 1, 'Version 1', '${columnsJson}', '${rowsJson}', 1)`
    );
    await db.run(
      `INSERT INTO __quak_snapshots (id, sheet_id, version, label, columns_json, rows_json, row_count)
       VALUES ('snap-2', '${sheetId}', 2, 'Version 2', '${columnsJson}', '${rowsJson}', 1)`
    );

    const result = await db.runAndReadAll(
      `SELECT COALESCE(MAX(version), 0) as max_version FROM __quak_snapshots WHERE sheet_id = '${sheetId}'`
    );
    const rows = result.getRowObjectsJson();
    expect((rows[0] as Record<string, unknown>).max_version).toBe(2);
  });

  it('JSON round-trip for columns and rows', async () => {
    const columns = [{ name: 'Age', cellType: 'number' }, { name: 'Active', cellType: 'checkbox' }];
    const rowData = [{ Age: 25, Active: true }, { Age: 30, Active: false }];
    const columnsJson = JSON.stringify(columns).replace(/'/g, "''");
    const rowsJson = JSON.stringify(rowData).replace(/'/g, "''");

    await db.run(
      `INSERT INTO __quak_snapshots (id, sheet_id, version, label, columns_json, rows_json, row_count)
       VALUES ('snap-json', 'sheet-json', 1, 'JSON Test', '${columnsJson}', '${rowsJson}', 2)`
    );

    const result = await db.runAndReadAll(
      `SELECT columns_json, rows_json FROM __quak_snapshots WHERE id = 'snap-json'`
    );
    const rows = result.getRowObjectsJson();
    const row = rows[0] as Record<string, unknown>;

    const parsedCols = typeof row.columns_json === 'string' ? JSON.parse(row.columns_json) : row.columns_json;
    const parsedRows = typeof row.rows_json === 'string' ? JSON.parse(row.rows_json) : row.rows_json;

    expect(parsedCols).toEqual(columns);
    expect(parsedRows).toEqual(rowData);
  });

  it('cross-sheet isolation', async () => {
    const columnsJson = JSON.stringify([{ name: 'X', cellType: 'text' }]);
    const rowsJson = JSON.stringify([]);

    await db.run(
      `INSERT INTO __quak_snapshots (id, sheet_id, version, label, columns_json, rows_json, row_count)
       VALUES ('snap-a1', 'sheet-a', 1, 'A v1', '${columnsJson}', '${rowsJson}', 0)`
    );
    await db.run(
      `INSERT INTO __quak_snapshots (id, sheet_id, version, label, columns_json, rows_json, row_count)
       VALUES ('snap-b1', 'sheet-b', 1, 'B v1', '${columnsJson}', '${rowsJson}', 0)`
    );

    const resultA = await db.runAndReadAll(
      `SELECT * FROM __quak_snapshots WHERE sheet_id = 'sheet-a'`
    );
    const resultB = await db.runAndReadAll(
      `SELECT * FROM __quak_snapshots WHERE sheet_id = 'sheet-b'`
    );

    expect(resultA.getRowObjectsJson().length).toBe(1);
    expect(resultB.getRowObjectsJson().length).toBe(1);

    // Versions are independent
    const vA = await db.runAndReadAll(
      `SELECT MAX(version) as mv FROM __quak_snapshots WHERE sheet_id = 'sheet-a'`
    );
    const vB = await db.runAndReadAll(
      `SELECT MAX(version) as mv FROM __quak_snapshots WHERE sheet_id = 'sheet-b'`
    );
    expect((vA.getRowObjectsJson()[0] as Record<string, unknown>).mv).toBe(1);
    expect((vB.getRowObjectsJson()[0] as Record<string, unknown>).mv).toBe(1);
  });
});
