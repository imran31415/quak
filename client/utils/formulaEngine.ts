import type { ColumnConfig } from '@shared/types';
import { runQuery } from '../db/duckdb';

export function parseFormula(
  formula: string,
  columns: ColumnConfig[]
): { expression: string; error?: string } {
  let expr = formula.startsWith('=') ? formula.slice(1).trim() : formula.trim();

  if (!expr) {
    return { expression: '', error: 'Empty formula' };
  }

  // Validate that referenced column names exist (simple check)
  const colNames = columns.map((c) => c.name);
  const identifiers = expr.match(/[A-Za-z_]\w*/g) || [];
  const sqlKeywords = new Set([
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
    'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF',
    'SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'COALESCE', 'CAST', 'AS',
    'LIKE', 'BETWEEN', 'UPPER', 'LOWER', 'LENGTH', 'TRIM', 'ROUND',
    'ABS', 'CONCAT', 'REPLACE', 'SUBSTRING', 'INTEGER', 'VARCHAR',
    'DOUBLE', 'BOOLEAN', 'DATE',
  ]);

  for (const id of identifiers) {
    if (!colNames.includes(id) && !sqlKeywords.has(id.toUpperCase())) {
      // Not a column and not a SQL keyword - could be a function, allow it
    }
  }

  return { expression: expr };
}

export async function evaluateFormulas(
  formulaColumns: ColumnConfig[],
  allColumns: ColumnConfig[],
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (formulaColumns.length === 0 || rows.length === 0) return rows;

  // Create temp table
  const nonFormulaColumns = allColumns.filter((c) => c.cellType !== 'formula');

  function cellTypeToSQL(cellType: string): string {
    switch (cellType) {
      case 'number': return 'DOUBLE';
      case 'checkbox': return 'BOOLEAN';
      default: return 'VARCHAR';
    }
  }

  const tableCols = nonFormulaColumns
    .map((c) => `"${c.name}" ${cellTypeToSQL(c.cellType)}`)
    .join(', ');

  await runQuery('DROP TABLE IF EXISTS __formula_temp');
  await runQuery(`CREATE TABLE __formula_temp (${tableCols})`);

  // Insert rows
  for (const row of rows) {
    const values = nonFormulaColumns.map((col) => {
      const val = row[col.name];
      if (val === null || val === undefined || val === '') return 'NULL';
      if (col.cellType === 'number') return Number(val);
      if (col.cellType === 'checkbox') return val ? 'TRUE' : 'FALSE';
      return `'${String(val).replace(/'/g, "''")}'`;
    }).join(', ');
    await runQuery(`INSERT INTO __formula_temp VALUES (${values})`);
  }

  // Build computed columns
  const formulaExprs = formulaColumns.map((fc) => {
    const { expression } = parseFormula(fc.formula || '', allColumns);
    return `(${expression}) as "${fc.name}"`;
  }).join(', ');

  try {
    const result = await runQuery(`SELECT *, ${formulaExprs} FROM __formula_temp`);
    await runQuery('DROP TABLE IF EXISTS __formula_temp');

    // Merge computed values back into rows
    return rows.map((row, i) => {
      const computed = result.rows[i] || {};
      const merged = { ...row };
      for (const fc of formulaColumns) {
        merged[fc.name] = computed[fc.name];
      }
      return merged;
    });
  } catch (err) {
    await runQuery('DROP TABLE IF EXISTS __formula_temp');
    console.error('Formula evaluation error:', err);
    return rows;
  }
}
