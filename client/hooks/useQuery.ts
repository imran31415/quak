import { useState, useCallback } from 'react';
import { runQuery } from '../db/duckdb';
import { useSheetStore } from '../store/sheetStore';
import type { QueryResult } from '@shared/types';
import type { ColumnConfig } from '@shared/types';

function cellTypeToSQL(cellType: string): string {
  switch (cellType) {
    case 'number': return 'DOUBLE';
    case 'checkbox': return 'BOOLEAN';
    default: return 'VARCHAR';
  }
}

async function syncSheetToWasm(meta: { columns: ColumnConfig[] }, rows: Record<string, unknown>[]) {
  const cols = meta.columns
    .map((c) => `"${c.name}" ${cellTypeToSQL(c.cellType)}`)
    .join(', ');

  await runQuery(`DROP TABLE IF EXISTS current_sheet`);
  await runQuery(`CREATE TABLE current_sheet (${cols})`);

  for (const row of rows) {
    const values = meta.columns.map((col) => {
      const val = row[col.name];
      if (val === null || val === undefined || val === '') return 'NULL';
      if (col.cellType === 'number') return Number(val);
      if (col.cellType === 'checkbox') return val ? 'TRUE' : 'FALSE';
      return `'${String(val).replace(/'/g, "''")}'`;
    }).join(', ');
    await runQuery(`INSERT INTO current_sheet VALUES (${values})`);
  }
}

export function useQuery() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (sql: string) => {
    setLoading(true);
    setError(null);
    try {
      // Sync current sheet data to WASM before querying
      const { activeSheetMeta, rows } = useSheetStore.getState();
      if (activeSheetMeta) {
        await syncSheetToWasm(activeSheetMeta, rows);
      }

      const start = performance.now();
      const { columns, rows: resultRows } = await runQuery(sql);
      const time = Math.round((performance.now() - start) * 100) / 100;
      const qr: QueryResult = { columns, rows: resultRows, rowCount: resultRows.length, time };
      setResult(qr);
      return qr;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      setResult(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, error, loading, execute };
}
