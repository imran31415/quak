function formatValue(val: unknown, cellType: string): string {
  if (val === null || val === undefined || val === '') return 'NULL';
  if (cellType === 'number' || cellType === 'linked_record') return String(Number(val));
  if (cellType === 'checkbox') return (val === 'true' || val === true) ? 'TRUE' : 'FALSE';
  return `'${String(val).replace(/'/g, "''")}'`;
}

export async function batchInsert(
  db: { run: (sql: string) => Promise<unknown> },
  tableName: string,
  columns: { name: string; cellType: string }[],
  rows: Record<string, unknown>[],
  batchSize = 1000
): Promise<void> {
  if (rows.length === 0) return;

  const colNames = columns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(', ');

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuesClauses = batch.map((row) => {
      const values = columns
        .map((col) => formatValue(row[col.name], col.cellType))
        .join(', ');
      return `(${values})`;
    }).join(', ');

    await db.run(`INSERT INTO "${tableName}" (${colNames}) VALUES ${valuesClauses}`);
  }
}
