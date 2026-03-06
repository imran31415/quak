import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useQuery } from '../../hooks/useQuery';
import { QueryResults } from './QueryResults';

export function QueryPanel() {
  const { queryPanelOpen, isMobile } = useUIStore();
  const [sql, setSql] = useState('SELECT * FROM current_sheet LIMIT 100');
  const { result, error, loading, execute } = useQuery();

  if (!queryPanelOpen) return null;

  const handleRun = () => {
    if (sql.trim()) execute(sql.trim());
  };

  return (
    <div
      className={`${
        isMobile
          ? 'fixed inset-x-0 bottom-14 top-1/2 z-40'
          : 'border-t border-gray-200'
      } bg-white flex flex-col`}
      data-testid="query-panel"
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">SQL Query</span>
        <button
          onClick={handleRun}
          disabled={loading || !sql.trim()}
          className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          data-testid="run-query-btn"
        >
          {loading ? 'Running...' : 'Run'}
        </button>
      </div>
      <div className="px-4 py-2">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleRun();
            }
          }}
          className="w-full h-20 px-3 py-2 text-sm font-mono border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter SQL query..."
          data-testid="query-input"
        />
      </div>
      {error && (
        <div className="px-4 py-2 text-sm text-red-600" data-testid="query-error">
          {error}
        </div>
      )}
      {result && <QueryResults result={result} />}
    </div>
  );
}
