import { useState, useMemo } from 'react';
import type { QueryResult } from '@shared/types';
import { ChartView, type ChartType } from './ChartView';
import { ChartConfig } from './ChartConfig';
import { toCSV, toJSON, downloadFile } from '../../utils/exportUtils';

export function QueryResults({ result }: { result: QueryResult }) {
  const [view, setView] = useState<'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<ChartType>('bar');

  // Auto-detect good defaults for chart
  const defaultX = result.columns[0] || '';
  const defaultY = useMemo(() => {
    // Find first numeric column (heuristic: check first row)
    if (result.rows.length === 0) return [];
    const firstRow = result.rows[0];
    const numCols = result.columns.filter((col) => typeof firstRow[col] === 'number');
    return numCols.length > 0 ? [numCols[0]] : result.columns.length > 1 ? [result.columns[1]] : [];
  }, [result]);

  const [xColumn, setXColumn] = useState(defaultX);
  const [yColumns, setYColumns] = useState(defaultY);

  const handleExportResults = (format: 'csv' | 'json') => {
    const cols = result.columns.map((c) => ({ id: c, name: c, cellType: 'text' as const, width: 150 }));
    if (format === 'csv') {
      downloadFile(toCSV(cols, result.rows), 'query-results.csv', 'text/csv');
    } else {
      downloadFile(toJSON(result.rows), 'query-results.json', 'application/json');
    }
  };

  return (
    <div className="flex-1 overflow-auto px-4 pb-4" data-testid="query-results">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {result.rowCount} rows · {result.time}ms
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView('table')}
            className={`px-2 py-0.5 text-xs rounded ${view === 'table' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            data-testid="view-table"
          >
            Table
          </button>
          <button
            onClick={() => setView('chart')}
            className={`px-2 py-0.5 text-xs rounded ${view === 'chart' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            data-testid="view-chart"
          >
            Chart
          </button>
        </div>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => handleExportResults('csv')}
            className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded"
            data-testid="export-results-csv"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExportResults('json')}
            className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded"
            data-testid="export-results-json"
          >
            Export JSON
          </button>
        </div>
      </div>

      {view === 'chart' ? (
        <>
          <ChartConfig
            result={result}
            chartType={chartType}
            xColumn={xColumn}
            yColumns={yColumns}
            onChartTypeChange={setChartType}
            onXColumnChange={setXColumn}
            onYColumnsChange={setYColumns}
          />
          <ChartView
            result={result}
            chartType={chartType}
            xColumn={xColumn}
            yColumns={yColumns}
          />
        </>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {result.columns.map((col) => (
                  <th key={col} className="px-3 py-1.5 text-left font-medium text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  {result.columns.map((col) => (
                    <td key={col} className="px-3 py-1.5 text-gray-700 dark:text-gray-200">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
