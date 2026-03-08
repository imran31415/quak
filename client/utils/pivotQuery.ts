import type { PivotConfig } from '../store/uiStore';
import type { ColumnConfig } from '@shared/types';

export function buildPivotQuery(
  pivotConfig: PivotConfig,
  columns: ColumnConfig[],
  distinctValues: string[]
): string {
  const rowField = columns.find((c) => c.id === pivotConfig.rowFieldIds[0]);
  const valueField = columns.find((c) => c.id === pivotConfig.valueFieldId);

  if (!rowField || !valueField) return '';

  const agg = pivotConfig.aggregation;
  const rowName = `"${rowField.name}"`;
  const valName = `"${valueField.name}"`;

  // Build conditional aggregation columns
  const pivotColumns = distinctValues.map((val) => {
    const safeVal = val.replace(/'/g, "''");
    const alias = `"${val}"`;
    return `${agg}(CASE WHEN ${`"${columns.find((c) => c.id === pivotConfig.columnFieldId)?.name}"`} = '${safeVal}' THEN ${valName} ELSE ${agg === 'COUNT' ? 'NULL' : '0'} END) as ${alias}`;
  });

  // Add total column
  pivotColumns.push(`${agg}(${valName}) as "TOTAL"`);

  return `SELECT ${rowName}, ${pivotColumns.join(', ')} FROM current_sheet GROUP BY ${rowName} ORDER BY ${rowName}`;
}

export function buildDistinctQuery(columnName: string): string {
  return `SELECT DISTINCT "${columnName}" FROM current_sheet WHERE "${columnName}" IS NOT NULL ORDER BY "${columnName}"`;
}

export function buildGrandTotalQuery(
  pivotConfig: PivotConfig,
  columns: ColumnConfig[],
  distinctValues: string[]
): string {
  const valueField = columns.find((c) => c.id === pivotConfig.valueFieldId);
  const colField = columns.find((c) => c.id === pivotConfig.columnFieldId);
  if (!valueField || !colField) return '';

  const agg = pivotConfig.aggregation;
  const valName = `"${valueField.name}"`;
  const colName = `"${colField.name}"`;

  const pivotColumns = distinctValues.map((val) => {
    const safeVal = val.replace(/'/g, "''");
    return `${agg}(CASE WHEN ${colName} = '${safeVal}' THEN ${valName} ELSE ${agg === 'COUNT' ? 'NULL' : '0'} END) as "${val}"`;
  });
  pivotColumns.push(`${agg}(${valName}) as "TOTAL"`);

  return `SELECT ${pivotColumns.join(', ')} FROM current_sheet`;
}
