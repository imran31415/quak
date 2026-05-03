import { runQuery } from './duckdb';
import type { ColumnConfig } from '@shared/types';

function cellTypeToSQL(cellType: string): string {
  switch (cellType) {
    case 'number': return 'DOUBLE';
    case 'checkbox': return 'BOOLEAN';
    default: return 'VARCHAR';
  }
}

// Serializes sync calls so concurrent CREATE OR REPLACE + INSERT batches
// from different views don't interleave and produce duplicated rows.
let chain: Promise<unknown> = Promise.resolve();

export async function syncSheetToWasm(
  tableName: string,
  meta: { columns: ColumnConfig[] },
  rows: Record<string, unknown>[],
): Promise<void> {
  const next = chain.then(async () => {
    const filteredCols = meta.columns.filter((c) => c.cellType !== 'formula');
    const colsDDL = filteredCols
      .map((c) => `"${c.name}" ${cellTypeToSQL(c.cellType)}`)
      .join(', ');

    await runQuery(`CREATE OR REPLACE TABLE "${tableName}" (${colsDDL})`);

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
  });
  // Keep the chain alive even if this call rejects, so the next one runs.
  chain = next.catch(() => undefined);
  return next;
}
