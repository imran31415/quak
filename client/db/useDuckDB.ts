import { useContext } from 'react';
import { DuckDBContext } from './DuckDBProvider';

export function useDuckDB() {
  const db = useContext(DuckDBContext);
  if (!db) throw new Error('useDuckDB must be used within DuckDBProvider');
  return db;
}
