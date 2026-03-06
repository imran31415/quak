import { describe, it, expect, beforeAll } from 'vitest';
import { DuckDBInstance } from '@duckdb/node-api';

describe('Server DB', () => {
  let db: Awaited<ReturnType<Awaited<ReturnType<typeof DuckDBInstance.create>>['connect']>>;

  beforeAll(async () => {
    // Use in-memory DB for tests (no file path)
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

  it('initializes the database and creates metadata table', async () => {
    const result = await db.runAndReadAll(
      "SELECT table_name FROM information_schema.tables WHERE table_name = '__quak_sheets'"
    );
    const rows = result.getRowObjectsJson();
    expect(rows.length).toBe(1);
  });

  it('can insert and retrieve sheet metadata', async () => {
    const id = 'test-unit-' + Date.now();
    const columns = JSON.stringify([{ name: 'col1', cellType: 'text' }]);

    await db.run(
      `INSERT INTO __quak_sheets (id, name, columns) VALUES ('${id}', 'Unit Test Sheet', '${columns}')`
    );

    const result = await db.runAndReadAll(
      `SELECT * FROM __quak_sheets WHERE id = '${id}'`
    );
    const rows = result.getRowObjectsJson();
    expect(rows.length).toBe(1);
    expect((rows[0] as Record<string, unknown>).name).toBe('Unit Test Sheet');
  });

  it('maps cell types to correct DuckDB column types', async () => {
    await db.run(`
      CREATE TABLE test_types (
        text_col VARCHAR,
        num_col DOUBLE,
        bool_col BOOLEAN,
        date_col DATE
      )
    `);

    await db.run(`
      INSERT INTO test_types VALUES ('hello', 42.5, TRUE, '2025-01-15')
    `);

    const result = await db.runAndReadAll('SELECT * FROM test_types');
    const rows = result.getRowObjectsJson();
    expect(rows.length).toBe(1);

    const row = rows[0] as Record<string, unknown>;
    expect(row.text_col).toBe('hello');
    expect(row.num_col).toBe(42.5);
    expect(row.bool_col).toBe(true);
  });

  it('handles NULL values correctly', async () => {
    await db.run(`
      CREATE TABLE test_nulls (
        name VARCHAR,
        value DOUBLE,
        done BOOLEAN,
        due_date DATE
      )
    `);

    await db.run(`INSERT INTO test_nulls VALUES (NULL, NULL, NULL, NULL)`);

    const result = await db.runAndReadAll('SELECT * FROM test_nulls');
    const rows = result.getRowObjectsJson();
    expect(rows.length).toBe(1);

    const row = rows[0] as Record<string, unknown>;
    expect(row.name).toBeNull();
    expect(row.value).toBeNull();
    expect(row.done).toBeNull();
  });
});
