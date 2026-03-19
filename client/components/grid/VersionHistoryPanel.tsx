import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/sheets';
import { useUIStore } from '../../store/uiStore';
import { useSheetStore } from '../../store/sheetStore';
import { useToastStore } from '../../store/toastStore';

interface Snapshot {
  id: string;
  version: number;
  label: string;
  row_count: number;
  created_at: string;
}

interface VersionHistoryPanelProps {
  sheetId: string;
  onPreview: (snapshotId: string) => void;
}

export function VersionHistoryPanel({ sheetId, onPreview }: VersionHistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const toggleVersionPanel = useUIStore((s) => s.toggleVersionPanel);
  const addToast = useToastStore((s) => s.addToast);
  const loadSheet = useSheetStore((s) => s.loadSheet);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listSnapshots(sheetId);
      setSnapshots(data);
    } catch {
      // Silently fail
    }
    setLoading(false);
  }, [sheetId]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await api.createSnapshot(sheetId, labelInput || undefined);
      addToast(`Snapshot "${result.label}" created`, 'success');
      setLabelInput('');
      setShowLabelInput(false);
      await loadSnapshots();
    } catch (err) {
      addToast(`Failed to create snapshot: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
    setCreating(false);
  };

  const handleRestore = async (snapshotId: string) => {
    try {
      await api.restoreSnapshot(sheetId, snapshotId);
      addToast('Snapshot restored successfully', 'success');
      setConfirmRestoreId(null);
      await loadSheet(sheetId);
      await loadSnapshots();
    } catch (err) {
      addToast(`Failed to restore: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDelete = async (snapshotId: string) => {
    try {
      await api.deleteSnapshot(sheetId, snapshotId);
      addToast('Snapshot deleted', 'success');
      await loadSnapshots();
    } catch (err) {
      addToast(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
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

  return (
    <div
      className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 flex flex-col"
      data-testid="version-history-panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Version History</h3>
        <button
          onClick={toggleVersionPanel}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          data-testid="version-history-close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Create Snapshot */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        {showLabelInput ? (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Snapshot label (optional)"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              data-testid="snapshot-label-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                data-testid="snapshot-confirm-create"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => { setShowLabelInput(false); setLabelInput(''); }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLabelInput(true)}
            className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            data-testid="snapshot-create-btn"
          >
            Create Snapshot
          </button>
        )}
      </div>

      {/* Snapshot List */}
      <div className="flex-1 overflow-y-auto">
        {loading && snapshots.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">Loading...</div>
        ) : snapshots.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center" data-testid="version-history-empty">
            No snapshots yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {snapshots.map((snap) => (
              <div key={snap.id} className="px-4 py-2.5" data-testid="snapshot-entry">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" data-testid="snapshot-version-badge">
                    v{snap.version}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1" data-testid="snapshot-label">
                    {snap.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(snap.created_at)}
                  </span>
                  <span className="text-xs text-gray-400" data-testid="snapshot-row-count">
                    {snap.row_count} row{snap.row_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {confirmRestoreId === snap.id ? (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs" data-testid="restore-confirmation">
                    <p className="text-yellow-700 dark:text-yellow-300 mb-2">
                      Restore to v{snap.version}? Current state will be auto-saved.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestore(snap.id)}
                        className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs"
                        data-testid="restore-confirm-btn"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => setConfirmRestoreId(null)}
                        className="px-2 py-1 text-gray-500 hover:text-gray-700 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => onPreview(snap.id)}
                      className="text-xs text-blue-500 hover:text-blue-700"
                      data-testid="snapshot-preview-btn"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setConfirmRestoreId(snap.id)}
                      className="text-xs text-yellow-600 hover:text-yellow-700"
                      data-testid="snapshot-restore-btn"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(snap.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                      data-testid="snapshot-delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
