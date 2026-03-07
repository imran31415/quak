import type { CellType } from './constants.js';
import type { ColumnConfig } from './types.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;

export function inferCellType(values: unknown[]): CellType {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'text';

  // Sample up to 50 values
  const sample = nonEmpty.slice(0, 50);

  // Check booleans
  const allBool = sample.every(
    (v) => typeof v === 'boolean' || v === 'true' || v === 'false' || v === 0 || v === 1
  );
  if (allBool) return 'checkbox';

  // Check numbers
  const allNum = sample.every((v) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))));
  if (allNum) return 'number';

  // Check dates
  const allDate = sample.every((v) => {
    if (v instanceof Date) return true;
    if (typeof v === 'string' && ISO_DATE_RE.test(v) && !isNaN(Date.parse(v))) return true;
    return false;
  });
  if (allDate) return 'date';

  return 'text';
}

export function inferColumnsFromData(rows: Record<string, unknown>[]): ColumnConfig[] {
  if (rows.length === 0) return [];

  // Collect all keys from all rows
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(key);
    }
  }

  return Array.from(keys).map((key) => {
    const values = rows.map((r) => r[key]);
    const cellType = inferCellType(values);
    return {
      id: key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      name: key,
      cellType,
      width: cellType === 'checkbox' ? 80 : cellType === 'number' ? 120 : 150,
    };
  });
}
