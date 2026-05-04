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
  const { queryPanelOpen, toggleQueryPanel, isMobile } = useUIStore();
  const [sql, setSql] = useState('SELECT * FROM current_sheet LIMIT 100');
  const [fullscreen, setFullscreen] = useState(false);
  const [showResults, setShowResults] = useState(true);
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

  const isWide = fullscreen || isMobile;

  return (
    <div
      className={`${
        isWide
          ? 'fixed inset-x-0 top-0 z-50 h-[100dvh]'
          : 'border-t border-gray-200 dark:border-gray-700 relative z-10'
      } bg-white dark:bg-gray-800 flex flex-col`}
      data-testid="query-panel"
      data-fullscreen={fullscreen ? 'true' : 'false'}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">SQL Query</span>
        <QueryTemplates onInsert={handleInsertSQL} />
        <button
          onClick={handleRun}
          disabled={loading || !sql.trim()}
          className="ml-auto px-3 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          data-testid="run-query-btn"
        >
          {loading ? 'Running...' : 'Run'}
        </button>
        {result && (
          <button
            onClick={() => setShowResults((v) => !v)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-1"
            data-testid="toggle-results"
          >
            {showResults ? 'Hide results' : 'Show results'}
          </button>
        )}
        {!isMobile && (
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            data-testid="toggle-query-fullscreen"
          >
            {fullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V5H5M15 9V5h4M9 15v4H5M15 15v4h4" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M16 4h4v4M4 16v4h4M16 20h4v-4" />
              </svg>
            )}
          </button>
        )}
        {isWide && (
          <button
            onClick={() => { setFullscreen(false); toggleQueryPanel(); }}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
            aria-label="Close SQL panel"
            data-testid="close-query"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className={`px-4 py-2 flex gap-3 ${isWide ? 'flex-1 min-h-0' : ''} ${isWide ? 'mx-auto w-full max-w-5xl' : ''}`}>
        <div className={`flex-1 ${isWide ? 'min-h-0 flex flex-col' : ''}`}>
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
        <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 shrink-0" data-testid="query-error">
          {error}
        </div>
      )}
      {result && showResults && (
        <div className={isWide ? 'flex-1 min-h-0 overflow-auto' : ''}>
          <QueryResults result={result} />
        </div>
      )}
      {!isWide && <QueryHistory onSelect={handleInsertSQL} />}
    </div>
  );
}
