/**
 * Map a cellType string to a DuckDB column type.
 */
export function cellTypeToDuckDB(cellType: string): string {
  switch (cellType) {
    case 'number':
      return 'DOUBLE';
    case 'checkbox':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'linked_record':
      return 'INTEGER';
    case 'file':
    case 'text':
    case 'dropdown':
    case 'formula':
    case 'markdown':
    default:
      return 'VARCHAR';
  }
}

/**
 * Sanitize a sheet id to produce a safe table name.
 * Only allows alphanumeric characters and underscores.
 */
export function safeTableName(id: string): string {
  return 'sheet_' + id.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function formatValue(val: unknown, cellType: string): string {
  if (val === null || val === undefined || val === '') return 'NULL';
  if (cellType === 'number' || cellType === 'linked_record') return String(Number(val));
  if (cellType === 'checkbox') return val ? 'TRUE' : 'FALSE';
  return `'${String(val).replace(/'/g, "''")}'`;
}
