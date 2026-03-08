import { useState, useEffect, useCallback } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import type { AggregationType, PivotConfig } from '../../store/uiStore';
import { runQuery } from '../../db/duckdb';
import { api } from '../../api/sheets';
import type { ColumnConfig } from '@shared/types';

function cellTypeToSQL(cellType: string): string {
  switch (cellType) {
    case 'number': return 'DOUBLE';
    case 'checkbox': return 'BOOLEAN';
    default: return 'VARCHAR';
  }
}

async function syncToWasm(meta: { columns: ColumnConfig[] }, rows: Record<string, unknown>[]) {
  const cols = meta.columns
    .filter((c) => c.cellType !== 'formula')
    .map((c) => `"${c.name}" ${cellTypeToSQL(c.cellType)}`)
    .join(', ');
  await runQuery('DROP TABLE IF EXISTS current_sheet');
  await runQuery(`CREATE TABLE current_sheet (${cols})`);
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
    await runQuery(`INSERT INTO current_sheet VALUES ${valuesClauses}`);
  }
}

const AGGREGATIONS: AggregationType[] = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];

export function PivotView() {
  const { activeSheetMeta: meta, rows, activeSheetId } = useSheetStore();
  const { viewConfigs, setViewConfig } = useUIStore();
  const config = activeSheetId ? viewConfigs[activeSheetId] : undefined;
  const pivotConfig = config?.pivotConfig;

  const [pivotData, setPivotData] = useState<Record<string, unknown>[]>([]);
  const [pivotColumns, setPivotColumns] = useState<string[]>([]);
  const [grandTotal, setGrandTotal] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const numberCols = meta?.columns.filter((c) => c.cellType === 'number') || [];
  const textCols = meta?.columns.filter((c) => c.cellType === 'text' || c.cellType === 'dropdown') || [];

  const updatePivotConfig = useCallback((updates: Partial<PivotConfig>) => {
    if (!activeSheetId) return;
    const current = viewConfigs[activeSheetId]?.pivotConfig || {
      rowFieldIds: [],
      columnFieldId: '',
      valueFieldId: '',
      aggregation: 'SUM' as AggregationType,
    };
    setViewConfig(activeSheetId, { pivotConfig: { ...current, ...updates } });
  }, [activeSheetId, viewConfigs, setViewConfig]);

  useEffect(() => {
    if (!meta || !pivotConfig || !pivotConfig.rowFieldIds.length || !pivotConfig.columnFieldId || !pivotConfig.valueFieldId) {
      setPivotData([]);
      setPivotColumns([]);
      setGrandTotal(null);
      return;
    }

    const compute = async () => {
      try {
        setError(null);
        await syncToWasm(meta, rows);

        const colField = meta.columns.find((c) => c.id === pivotConfig.columnFieldId);
        if (!colField) return;

        // Get distinct values
        const distinctResult = await runQuery(`SELECT DISTINCT "${colField.name}" FROM current_sheet WHERE "${colField.name}" IS NOT NULL ORDER BY "${colField.name}"`);
        const distinctValues = distinctResult.rows.map((r) => String(Object.values(r)[0]));
        setPivotColumns(distinctValues);

        // Build and execute pivot query
        const rowField = meta.columns.find((c) => c.id === pivotConfig.rowFieldIds[0]);
        const valueField = meta.columns.find((c) => c.id === pivotConfig.valueFieldId);
        if (!rowField || !valueField) return;

        const agg = pivotConfig.aggregation;
        const pivotCols = distinctValues.map((val) => {
          const safeVal = val.replace(/'/g, "''");
          return `${agg}(CASE WHEN "${colField.name}" = '${safeVal}' THEN "${valueField.name}" ELSE ${agg === 'COUNT' ? 'NULL' : '0'} END) as "${val}"`;
        });
        pivotCols.push(`${agg}("${valueField.name}") as "TOTAL"`);

        const sql = `SELECT "${rowField.name}", ${pivotCols.join(', ')} FROM current_sheet GROUP BY "${rowField.name}" ORDER BY "${rowField.name}"`;
        const result = await runQuery(sql);
        setPivotData(result.rows);

        // Grand total row
        const grandCols = distinctValues.map((val) => {
          const safeVal = val.replace(/'/g, "''");
          return `${agg}(CASE WHEN "${colField.name}" = '${safeVal}' THEN "${valueField.name}" ELSE ${agg === 'COUNT' ? 'NULL' : '0'} END) as "${val}"`;
        });
        grandCols.push(`${agg}("${valueField.name}") as "TOTAL"`);
        const grandSql = `SELECT ${grandCols.join(', ')} FROM current_sheet`;
        const grandResult = await runQuery(grandSql);
        setGrandTotal(grandResult.rows[0] || null);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    compute();
  }, [meta, rows, pivotConfig]);

  if (!meta) return null;

  const isConfigured = pivotConfig && pivotConfig.rowFieldIds.length > 0 && pivotConfig.columnFieldId && pivotConfig.valueFieldId;
  const rowField = pivotConfig?.rowFieldIds[0] ? meta.columns.find((c) => c.id === pivotConfig.rowFieldIds[0]) : null;

  return (
    <div className="flex flex-col h-full p-4 overflow-auto bg-white dark:bg-gray-900" data-testid="pivot-view">
      {/* Configuration */}
      <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700" data-testid="pivot-config">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Row Field</label>
          <select
            value={pivotConfig?.rowFieldIds[0] || ''}
            onChange={(e) => updatePivotConfig({ rowFieldIds: e.target.value ? [e.target.value] : [] })}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            data-testid="pivot-row-select"
          >
            <option value="">Select...</option>
            {textCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Column Field</label>
          <select
            value={pivotConfig?.columnFieldId || ''}
            onChange={(e) => updatePivotConfig({ columnFieldId: e.target.value })}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            data-testid="pivot-col-select"
          >
            <option value="">Select...</option>
            {textCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Value Field</label>
          <select
            value={pivotConfig?.valueFieldId || ''}
            onChange={(e) => updatePivotConfig({ valueFieldId: e.target.value })}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            data-testid="pivot-value-select"
          >
            <option value="">Select...</option>
            {numberCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Aggregation</label>
          <select
            value={pivotConfig?.aggregation || 'SUM'}
            onChange={(e) => updatePivotConfig({ aggregation: e.target.value as AggregationType })}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            data-testid="pivot-agg-select"
          >
            {AGGREGATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded">
          {error}
        </div>
      )}

      {!isConfigured ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500" data-testid="pivot-empty">
          <p>Configure the pivot table above to see results</p>
        </div>
      ) : pivotData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <p>No data to display</p>
        </div>
      ) : (
        <div className="overflow-auto" data-testid="pivot-table-container">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" data-testid="pivot-table">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  {rowField?.name || ''}
                </th>
                {pivotColumns.map((col) => (
                  <th key={col} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-200">
                    {col}
                  </th>
                ))}
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {pivotData.map((row, i) => {
                const firstVal = Object.values(row)[0];
                return (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                      {firstVal !== null && firstVal !== undefined ? String(firstVal) : ''}
                    </td>
                    {pivotColumns.map((col) => (
                      <td key={col} className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-right text-gray-700 dark:text-gray-300">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '0'}
                      </td>
                    ))}
                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                      {row['TOTAL'] !== null && row['TOTAL'] !== undefined ? String(row['TOTAL']) : '0'}
                    </td>
                  </tr>
                );
              })}
              {grandTotal && (
                <tr className="bg-gray-100 dark:bg-gray-700 font-semibold" data-testid="pivot-grand-total">
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                    GRAND TOTAL
                  </td>
                  {pivotColumns.map((col) => (
                    <td key={col} className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-right text-gray-700 dark:text-gray-300">
                      {grandTotal[col] !== null && grandTotal[col] !== undefined ? String(grandTotal[col]) : '0'}
                    </td>
                  ))}
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-right text-gray-900 dark:text-gray-100">
                    {grandTotal['TOTAL'] !== null && grandTotal['TOTAL'] !== undefined ? String(grandTotal['TOTAL']) : '0'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
