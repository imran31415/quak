import { useState, useCallback } from 'react';
import { runQuery } from '../db/duckdb';
import { useSheetStore } from '../store/sheetStore';
import { api } from '../api/sheets';
import type { QueryResult } from '@shared/types';
import type { ColumnConfig } from '@shared/types';

function cellTypeToSQL(cellType: string): string {
  switch (cellType) {
    case 'number': return 'DOUBLE';
    case 'checkbox': return 'BOOLEAN';
    default: return 'VARCHAR';
  }
}

function sanitizeTableName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

async function syncSheetToWasm(
  tableName: string,
  meta: { columns: ColumnConfig[] },
  rows: Record<string, unknown>[]
) {
  const cols = meta.columns
    .filter((c) => c.cellType !== 'formula')
    .map((c) => `"${c.name}" ${cellTypeToSQL(c.cellType)}`)
    .join(', ');

  await runQuery(`DROP TABLE IF EXISTS "${tableName}"`);
  await runQuery(`CREATE TABLE "${tableName}" (${cols})`);

  const filteredCols = meta.columns.filter((c) => c.cellType !== 'formula');
  const batchSize = 1000;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuesClauses = batch.map((row) => {
      const values = filteredCols.map((col) => {
        const val = row[col.name];
        if (val === null || val === undefined || val === '') return 'NULL';
        if (col.cellType === 'number') return Number(val);
        if (col.cellType === 'checkbox') return val ? 'TRUE' : 'FALSE';
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');
      return `(${values})`;
    }).join(', ');
    await runQuery(`INSERT INTO "${tableName}" VALUES ${valuesClauses}`);
  }
}

async function syncAllSheetsToWasm() {
  const { sheets, activeSheetId, activeSheetMeta, rows } = useSheetStore.getState();

  // Sync active sheet as both current_sheet and its table name
  if (activeSheetMeta) {
    await syncSheetToWasm('current_sheet', activeSheetMeta, rows);
    const activeName = sanitizeTableName(activeSheetMeta.name);
    if (activeName !== 'current_sheet') {
      await runQuery(`DROP VIEW IF EXISTS "${activeName}"`);
      await runQuery(`CREATE VIEW "${activeName}" AS SELECT * FROM current_sheet`);
    }
  }

  // Sync other sheets
  for (const sheet of sheets) {
    if (sheet.id === activeSheetId) continue;
    try {
      const data = await api.getSheet(sheet.id);
      const meta = { columns: data.columns as ColumnConfig[] };
      const sheetRows = data.rows || [];
      const tableName = sanitizeTableName(sheet.name);
      await syncSheetToWasm(tableName, meta, sheetRows);
    } catch (err) {
      console.error(`Failed to sync sheet "${sheet.name}":`, err);
    }
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
      // Sync all sheets to WASM before querying
      await syncAllSheetsToWasm();

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
