import { useState, useEffect } from 'react';
import { api } from '../../api/sheets';
import { useUIStore } from '../../store/uiStore';

interface AuditEntry {
  id: string;
  sheet_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  cell_update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  bulk_cell_update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  row_add: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  row_delete: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  column_add: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  column_delete: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  column_rename: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  row_reorder: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  snapshot_create: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  snapshot_restore: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

const ACTION_LABELS: Record<string, string> = {
  cell_update: 'Cell edited',
  bulk_cell_update: 'Cells edited',
  row_add: 'Row added',
  row_delete: 'Row deleted',
  rows_delete: 'Rows deleted',
  column_add: 'Column added',
  column_delete: 'Column deleted',
  column_rename: 'Column renamed',
  row_reorder: 'Rows reordered',
  snapshot_create: 'Snapshot created',
  snapshot_restore: 'Snapshot restored',
};

interface AuditLogPanelProps {
  sheetId: string;
}

export function AuditLogPanel({ sheetId }: AuditLogPanelProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const toggleAuditPanel = useUIStore((s) => s.toggleAuditPanel);

  const LIMIT = 50;

  useEffect(() => {
    loadEntries(0);
  }, [sheetId]);

  const loadEntries = async (newOffset: number) => {
    setLoading(true);
    try {
      const data = await api.getAuditLog(sheetId, LIMIT, newOffset);
      if (newOffset === 0) {
        setEntries(data);
      } else {
        setEntries((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === LIMIT);
      setOffset(newOffset);
    } catch {
      // Silently fail
    }
    setLoading(false);
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDetails = (action: string, details: Record<string, unknown>) => {
    if (action === 'cell_update') {
      return `${details.column}: "${details.oldValue}" → "${details.newValue}"`;
    }
    if (action === 'row_add') {
      return `Row #${details.rowId ?? ''}`;
    }
    if (action === 'row_delete' || action === 'rows_delete') {
      const ids = details.rowIds as number[] | undefined;
      return ids ? `${ids.length} row(s)` : '';
    }
    if (action === 'column_add' || action === 'column_delete') {
      return `${details.columnName ?? details.column ?? ''}`;
    }
    if (action === 'column_rename') {
      return `"${details.oldName}" → "${details.newName}"`;
    }
    if (action === 'bulk_cell_update') {
      const count = (details.count as number) || 0;
      return `${count} cell(s)`;
    }
    if (action === 'snapshot_create') {
      return `v${details.version}: ${details.label || ''}`;
    }
    if (action === 'snapshot_restore') {
      return `Restored to v${details.version}: ${details.label || ''}`;
    }
    return JSON.stringify(details).slice(0, 80);
  };

  return (
    <div
      className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 flex flex-col"
      data-testid="audit-log-panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Change History</h3>
        <button
          onClick={toggleAuditPanel}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          data-testid="audit-log-close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && entries.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center" data-testid="audit-log-empty">
            No changes recorded yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-2.5" data-testid="audit-log-entry">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                  >
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatTimestamp(entry.created_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {formatDetails(entry.action, entry.details || {})}
                </p>
              </div>
            ))}
          </div>
        )}

        {hasMore && entries.length > 0 && (
          <div className="p-3 text-center">
            <button
              onClick={() => loadEntries(offset + LIMIT)}
              className="text-xs text-blue-500 hover:text-blue-700"
              data-testid="audit-log-load-more"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
