import { useState, useEffect } from 'react';
import { api } from '../../api/sheets';
import { useSheetStore } from '../../store/sheetStore';
import { useToastStore } from '../../store/toastStore';

interface SnapshotPreviewModalProps {
  sheetId: string;
  snapshotId: string;
  onClose: () => void;
}

interface SnapshotData {
  id: string;
  version: number;
  label: string;
  row_count: number;
  created_at: string;
  columns: Array<{ name: string; cellType: string }>;
  rows: Record<string, unknown>[];
}

export function SnapshotPreviewModal({ sheetId, snapshotId, onClose }: SnapshotPreviewModalProps) {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);
  const loadSheet = useSheetStore((s) => s.loadSheet);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getSnapshot(sheetId, snapshotId) as unknown as SnapshotData;
        setSnapshot(data);
      } catch (err) {
        addToast(`Failed to load snapshot: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      }
      setLoading(false);
    };
    load();
  }, [sheetId, snapshotId, addToast]);

  const handleRestore = async () => {
    try {
      await api.restoreSnapshot(sheetId, snapshotId);
      addToast('Snapshot restored successfully', 'success');
      await loadSheet(sheetId);
      onClose();
    } catch (err) {
      addToast(`Failed to restore: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayRows = snapshot ? snapshot.rows.slice(0, 100) : [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      data-testid="snapshot-preview-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Snapshot Preview
            </h3>
            {snapshot && (
              <p className="text-xs text-gray-400 mt-0.5" data-testid="snapshot-preview-meta">
                v{snapshot.version}: {snapshot.label} &middot; {formatTimestamp(snapshot.created_at)} &middot; {snapshot.row_count} row{snapshot.row_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            data-testid="snapshot-preview-close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-sm text-gray-400 text-center py-8">Loading snapshot data...</div>
          ) : !snapshot ? (
            <div className="text-sm text-gray-400 text-center py-8">Failed to load snapshot</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" data-testid="snapshot-preview-table">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      {snapshot.columns.map((col) => (
                        <th
                          key={col.name}
                          className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                        >
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {snapshot.columns.map((col) => (
                          <td
                            key={col.name}
                            className="px-3 py-1.5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 truncate max-w-[200px]"
                          >
                            {row[col.name] === null || row[col.name] === undefined
                              ? ''
                              : String(row[col.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {snapshot.rows.length > 100 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Showing first 100 of {snapshot.rows.length} rows
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleRestore}
            disabled={!snapshot}
            className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            data-testid="snapshot-preview-restore"
          >
            Restore this version
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
