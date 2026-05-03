import path from 'path';

const PROJECT_ROOT = process.cwd();

export const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(PROJECT_ROOT, 'server', 'storage');

export const DB_PATH = process.env.DUCKDB_PATH
  ? path.resolve(process.env.DUCKDB_PATH)
  : path.join(STORAGE_DIR, 'data', 'quak.duckdb');

export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(STORAGE_DIR, 'uploads');

export const PORT = Number(process.env.PORT ?? 3001);

export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

export const CLIENT_DIST_DIR = process.env.CLIENT_DIST_DIR
  ? path.resolve(process.env.CLIENT_DIST_DIR)
  : path.join(PROJECT_ROOT, 'dist');
