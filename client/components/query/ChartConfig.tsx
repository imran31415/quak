import type { QueryResult } from '@shared/types';
import type { ChartType } from './ChartView';

interface ChartConfigProps {
  result: QueryResult;
  chartType: ChartType;
  xColumn: string;
  yColumns: string[];
  onChartTypeChange: (type: ChartType) => void;
  onXColumnChange: (col: string) => void;
  onYColumnsChange: (cols: string[]) => void;
}

export function ChartConfig({
  result,
  chartType,
  xColumn,
  yColumns,
  onChartTypeChange,
  onXColumnChange,
  onYColumnsChange,
}: ChartConfigProps) {
  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'bar', label: 'Bar' },
    { value: 'line', label: 'Line' },
    { value: 'pie', label: 'Pie' },
  ];

  const toggleYColumn = (col: string) => {
    if (yColumns.includes(col)) {
      onYColumnsChange(yColumns.filter((c) => c !== col));
    } else {
      onYColumnsChange([...yColumns, col]);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm" data-testid="chart-config">
      <div className="flex items-center gap-1">
        <span className="text-gray-500 text-xs">Type:</span>
        {chartTypes.map((t) => (
          <button
            key={t.value}
            onClick={() => onChartTypeChange(t.value)}
            className={`px-2 py-0.5 text-xs rounded ${
              chartType === t.value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
            data-testid={`chart-type-${t.value}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-gray-500 text-xs">X:</span>
        <select
          value={xColumn}
          onChange={(e) => onXColumnChange(e.target.value)}
          className="px-1 py-0.5 text-xs border rounded"
          data-testid="chart-x-select"
        >
          {result.columns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-gray-500 text-xs">Y:</span>
        {result.columns.filter((c) => c !== xColumn).map((col) => (
          <button
            key={col}
            onClick={() => toggleYColumn(col)}
            className={`px-1.5 py-0.5 text-xs rounded ${
              yColumns.includes(col) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {col}
          </button>
        ))}
      </div>
    </div>
  );
}
