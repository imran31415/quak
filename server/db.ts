import { DuckDBInstance } from '@duckdb/node-api';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'storage', 'data', 'quak.duckdb');

let connection: Awaited<ReturnType<Awaited<ReturnType<typeof DuckDBInstance.create>>['connect']>> | null = null;

export async function initDb(): Promise<void> {
  const instance = await DuckDBInstance.create(DB_PATH);
  connection = await instance.connect();

  await connection.run(`
    CREATE TABLE IF NOT EXISTS __quak_sheets (
      id VARCHAR PRIMARY KEY,
      name VARCHAR,
      columns JSON,
      created_at TIMESTAMP DEFAULT current_timestamp,
      updated_at TIMESTAMP DEFAULT current_timestamp
    )
  `);

  await connection.run(`
    CREATE TABLE IF NOT EXISTS __quak_comments (
      id VARCHAR PRIMARY KEY,
      sheet_id VARCHAR,
      row_id INTEGER,
      column_id VARCHAR,
      text VARCHAR,
      created_at TIMESTAMP DEFAULT current_timestamp,
      updated_at TIMESTAMP DEFAULT current_timestamp
    )
  `);

  await connection.run(`
    CREATE TABLE IF NOT EXISTS __quak_audit_log (
      id VARCHAR PRIMARY KEY,
      sheet_id VARCHAR,
      action VARCHAR,
      details JSON,
      created_at TIMESTAMP DEFAULT current_timestamp
    )
  `);

  await connection.run(`
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

  await connection.run(`
    CREATE TABLE IF NOT EXISTS __quak_api_keys (
      id VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      key_hash VARCHAR NOT NULL,
      key_prefix VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT current_timestamp,
      last_used_at TIMESTAMP
    )
  `);

  await connection.run(`
    CREATE TABLE IF NOT EXISTS __quak_webhooks (
      id VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      url VARCHAR NOT NULL,
      sheet_id VARCHAR NOT NULL,
      events JSON NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      secret VARCHAR,
      created_at TIMESTAMP DEFAULT current_timestamp
    )
  `);

  await connection.run(`
    CREATE TABLE IF NOT EXISTS __quak_cell_formats (
      id VARCHAR PRIMARY KEY,
      sheet_id VARCHAR NOT NULL,
      row_id INTEGER NOT NULL,
      col_name VARCHAR NOT NULL,
      bold BOOLEAN DEFAULT FALSE,
      italic BOOLEAN DEFAULT FALSE,
      underline BOOLEAN DEFAULT FALSE,
      strikethrough BOOLEAN DEFAULT FALSE,
      text_color VARCHAR,
      bg_color VARCHAR
    )
  `);
}

export function getDb() {
  if (!connection) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return connection;
}
