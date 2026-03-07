import { useState, useCallback } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useQuery } from '../../hooks/useQuery';
import { useQueryStore } from '../../store/queryStore';
import { QueryResults } from './QueryResults';
import { QueryHistory } from './QueryHistory';
import { QueryTemplates } from './QueryTemplates';
import { TableList } from './TableList';
import { SQLHighlighter } from './SQLHighlighter';

export function QueryPanel() {
  const { queryPanelOpen, isMobile } = useUIStore();
  const [sql, setSql] = useState('SELECT * FROM current_sheet LIMIT 100');
  const { result, error, loading, execute } = useQuery();
  const addToHistory = useQueryStore((s) => s.addToHistory);

  const handleInsertSQL = useCallback((newSql: string) => {
    setSql(newSql);
  }, []);

  const handleInsertTableName = useCallback((tableName: string) => {
    setSql((prev) => prev + ' ' + tableName);
  }, []);

  if (!queryPanelOpen) return null;

  const handleRun = async () => {
    if (!sql.trim()) return;
    try {
      const qr = await execute(sql.trim());
      if (qr) {
        addToHistory(sql.trim(), { rowCount: qr.rowCount, time: qr.time });
      }
    } catch {
      addToHistory(sql.trim());
    }
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
        <QueryTemplates onInsert={handleInsertSQL} />
        <button
          onClick={handleRun}
          disabled={loading || !sql.trim()}
          className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          data-testid="run-query-btn"
        >
          {loading ? 'Running...' : 'Run'}
        </button>
      </div>
      <div className="px-4 py-2 flex gap-3">
        <div className="flex-1">
          <SQLHighlighter
            value={sql}
            onChange={setSql}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleRun();
              }
            }}
          />
        </div>
        <div className="w-40 shrink-0 overflow-y-auto">
          <TableList onInsert={handleInsertTableName} />
        </div>
      </div>
      {error && (
        <div className="px-4 py-2 text-sm text-red-600" data-testid="query-error">
          {error}
        </div>
      )}
      {result && <QueryResults result={result} />}
      <QueryHistory onSelect={handleInsertSQL} />
    </div>
  );
}
