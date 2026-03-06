import type { QueryResult } from '@shared/types';

export function QueryResults({ result }: { result: QueryResult }) {
  return (
    <div className="flex-1 overflow-auto px-4 pb-4" data-testid="query-results">
      <div className="text-xs text-gray-500 mb-2">
        {result.rowCount} rows · {result.time}ms
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {result.columns.map((col) => (
                <th key={col} className="px-3 py-1.5 text-left font-medium text-gray-600 border-b border-gray-200">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                {result.columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-gray-700">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
