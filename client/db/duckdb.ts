import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm_mvp from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_worker_mvp from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import duckdb_worker_eh from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

// Ship both MVP and EH bundles; selectBundle() picks the right one for the
// browser at runtime. Using only MVP causes "_setThrew is not defined" errors
// on browsers whose feature detection expects the exception-handling bundle.
const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: duckdb_wasm_mvp, mainWorker: duckdb_worker_mvp },
  eh: { mainModule: duckdb_wasm_eh, mainWorker: duckdb_worker_eh },
};

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;
let initPromise: Promise<duckdb.AsyncDuckDB> | null = null;

async function doInit(): Promise<duckdb.AsyncDuckDB> {
  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  if (!bundle.mainWorker) {
    throw new Error('DuckDB-WASM: no compatible bundle found for this browser');
  }
  const worker = new Worker(bundle.mainWorker, { type: 'module' });
  const logger = new duckdb.ConsoleLogger();
  const instance = new duckdb.AsyncDuckDB(logger, worker);
  await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);
  conn = await instance.connect();
  db = instance;
  return instance;
}

export async function initDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;
  if (!initPromise) {
    initPromise = doInit().catch((err) => {
      // Reset so a retry can re-attempt initialization
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
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
