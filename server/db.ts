import { DuckDBInstance } from '@duckdb/node-api';
import fs from 'fs';
import path from 'path';
import { DB_PATH, IS_PRODUCTION } from './config.js';

type Connection = Awaited<ReturnType<Awaited<ReturnType<typeof DuckDBInstance.create>>['connect']>>;

let connection: Connection | null = null;

export async function initDb(): Promise<void> {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const instance = await DuckDBInstance.create(DB_PATH);
  connection = await instance.connect();

  // Disable arbitrary file/HTTP/S3 access from user SQL (e.g. read_csv('/etc/passwd')).
  // The embedded DB file continues to work — this only blocks SQL-driven external IO.
  if (IS_PRODUCTION || process.env.DUCKDB_LOCK_DOWN === 'true') {
    await connection.run('SET enable_external_access = false');
  }

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

export function getDb(): Connection {
  if (!connection) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return connection;
}

export async function pingDb(): Promise<void> {
  if (!connection) throw new Error('db_not_initialized');
  await connection.run('SELECT 1');
}

export async function closeDb(): Promise<void> {
  const c = connection;
  connection = null;
  if (!c) return;
  const maybeCloseable = c as unknown as { close?: () => unknown; disconnect?: () => unknown };
  if (typeof maybeCloseable.close === 'function') {
    await maybeCloseable.close();
  } else if (typeof maybeCloseable.disconnect === 'function') {
    await maybeCloseable.disconnect();
  }
}
