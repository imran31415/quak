import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { DuckDBInstance } from '@duckdb/node-api';

describe('Column Management', () => {
  let db: Awaited<ReturnType<Awaited<ReturnType<typeof DuckDBInstance.create>>['connect']>>;

  beforeAll(async () => {
    const instance = await DuckDBInstance.create(':memory:');
    db = await instance.connect();

    await db.run(`
      CREATE TABLE IF NOT EXISTS __quak_sheets (
        id VARCHAR PRIMARY KEY,
        name VARCHAR,
        columns JSON,
        created_at TIMESTAMP DEFAULT current_timestamp,
        updated_at TIMESTAMP DEFAULT current_timestamp
      )
    `);
  });

  beforeEach(async () => {
    // Clean up
    await db.run('DELETE FROM __quak_sheets');
    await db.run('DROP TABLE IF EXISTS sheet_test1');
  });

  it('adds a column to an existing table', async () => {
    // Create initial table
    await db.run('CREATE TABLE sheet_test1 ("Name" VARCHAR)');
    await db.run(`INSERT INTO __quak_sheets VALUES ('test1', 'Test', '[{"id":"name","name":"Name","cellType":"text"}]', current_timestamp, current_timestamp)`);

    // Add column
    await db.run('ALTER TABLE sheet_test1 ADD COLUMN "Value" DOUBLE');

    // Verify column exists
    await db.run('INSERT INTO sheet_test1 ("Name", "Value") VALUES (\'Alice\', 42)');
    const result = await db.runAndReadAll('SELECT * FROM sheet_test1');
    const rows = result.getRowObjectsJson();
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).Value).toBe(42);
  });

  it('drops a column from a table', async () => {
    await db.run('CREATE TABLE sheet_test1 ("Name" VARCHAR, "Value" DOUBLE)');
    await db.run('INSERT INTO sheet_test1 VALUES (\'Alice\', 42)');

    await db.run('ALTER TABLE sheet_test1 DROP COLUMN "Value"');

    const result = await db.runAndReadAll('SELECT * FROM sheet_test1');
    const cols = result.columnNames();
    expect(cols).toEqual(['Name']);
  });

  it('renames a column', async () => {
    await db.run('CREATE TABLE sheet_test1 ("Name" VARCHAR)');
    await db.run('INSERT INTO sheet_test1 VALUES (\'Alice\')');

    await db.run('ALTER TABLE sheet_test1 RENAME COLUMN "Name" TO "FullName"');

    const result = await db.runAndReadAll('SELECT * FROM sheet_test1');
    const cols = result.columnNames();
    expect(cols).toEqual(['FullName']);
    const rows = result.getRowObjectsJson();
    expect((rows[0] as Record<string, unknown>).FullName).toBe('Alice');
  });

  it('deletes rows by rowid', async () => {
    await db.run('CREATE TABLE sheet_test1 ("Name" VARCHAR, "Value" DOUBLE)');
    await db.run(`INSERT INTO sheet_test1 VALUES ('Alice', 100)`);
    await db.run(`INSERT INTO sheet_test1 VALUES ('Bob', 200)`);
    await db.run(`INSERT INTO sheet_test1 VALUES ('Charlie', 300)`);

    // Get rowids
    const result = await db.runAndReadAll('SELECT rowid, * FROM sheet_test1');
    const rows = result.getRowObjectsJson() as Record<string, unknown>[];
    const rowIdToDelete = rows[1].rowid as number;

    await db.run(`DELETE FROM sheet_test1 WHERE rowid IN (${rowIdToDelete})`);

    const remaining = await db.runAndReadAll('SELECT * FROM sheet_test1');
    const remainingRows = remaining.getRowObjectsJson() as Record<string, unknown>[];
    expect(remainingRows).toHaveLength(2);
    expect(remainingRows.map((r) => r.Name)).toEqual(['Alice', 'Charlie']);
  });
});
