import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

export async function initDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;

  const worker = new Worker(duckdb_worker, { type: 'module' });
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(duckdb_wasm);

  conn = await db.connect();
  return db;
}

export async function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (!conn) {
    const database = await initDuckDB();
    conn = await database.connect();
  }
  return conn;
}

export async function runQuery(sql: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const connection = await getConnection();
  const result = await connection.query(sql);
  const columns = result.schema.fields.map((f) => f.name);
  const rows: Record<string, unknown>[] = result.toArray().map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col] = row[col];
    }
    return obj;
  });
  return { columns, rows };
}
