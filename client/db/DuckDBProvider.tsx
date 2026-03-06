import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';
import { initDuckDB } from './duckdb';

export const DuckDBContext = createContext<AsyncDuckDB | null>(null);

export function DuckDBProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<AsyncDuckDB | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDuckDB()
      .then(setDb)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className="p-4 text-red-600">DuckDB init failed: {error}</div>;
  }

  if (!db) {
    return <div className="p-4 text-gray-500">Loading DuckDB...</div>;
  }

  return <DuckDBContext.Provider value={db}>{children}</DuckDBContext.Provider>;
}
