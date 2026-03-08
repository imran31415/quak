import { useState } from 'react';
import { useQueryStore } from '../../store/queryStore';

interface QueryHistoryProps {
  onSelect: (sql: string) => void;
}

export function QueryHistory({ onSelect }: QueryHistoryProps) {
  const { history, saved, saveQuery, deleteQuery, clearHistory } = useQueryStore();
  const [tab, setTab] = useState<'history' | 'saved'>('history');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');

  const handleSave = (id: string) => {
    if (!saveName.trim()) return;
    saveQuery(id, saveName.trim());
    setSavingId(null);
    setSaveName('');
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 mt-2" data-testid="query-history">
      <div className="flex gap-2 px-4 pt-2">
        <button
          onClick={() => setTab('history')}
          className={`text-xs px-2 py-1 rounded ${tab === 'history' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          History ({history.length})
        </button>
        <button
          onClick={() => setTab('saved')}
          className={`text-xs px-2 py-1 rounded ${tab === 'saved' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          Saved ({saved.length})
        </button>
        {tab === 'history' && history.length > 0 && (
          <button
            onClick={clearHistory}
            className="ml-auto text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
          >
            Clear
          </button>
        )}
      </div>

      <div className="max-h-32 overflow-y-auto px-4 py-1">
        {tab === 'history' ? (
          history.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No queries yet</p>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 py-1 group text-xs border-b border-gray-50 dark:border-gray-700"
              >
                <button
                  onClick={() => onSelect(entry.sql)}
                  className="flex-1 text-left font-mono text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                  title={entry.sql}
                >
                  {entry.sql}
                </button>
                {entry.rowCount !== undefined && (
                  <span className="text-gray-400 dark:text-gray-500 shrink-0">{entry.rowCount}r · {entry.time}ms</span>
                )}
                {savingId === entry.id ? (
                  <div className="flex gap-1">
                    <input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(entry.id)}
                      className="w-20 px-1 border rounded text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                      placeholder="Name..."
                      autoFocus
                    />
                    <button onClick={() => handleSave(entry.id)} className="text-blue-600 dark:text-blue-400">OK</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSavingId(entry.id)}
                    className="hidden group-hover:inline text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Save query"
                  >
                    Pin
                  </button>
                )}
              </div>
            ))
          )
        ) : (
          saved.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No saved queries</p>
          ) : (
            saved.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 py-1 group text-xs border-b border-gray-50 dark:border-gray-700">
                <button
                  onClick={() => onSelect(entry.sql)}
                  className="flex-1 text-left hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-200">{entry.name}</span>
                  <span className="ml-2 font-mono text-gray-400 dark:text-gray-500 truncate">{entry.sql}</span>
                </button>
                <button
                  onClick={() => deleteQuery(entry.id)}
                  className="hidden group-hover:inline text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                >
                  &times;
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
