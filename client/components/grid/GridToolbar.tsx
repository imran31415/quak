import { useSheetStore } from '../../store/sheetStore';
import { useUndoStore } from '../../store/undoStore';
import { toCSV, toJSON, downloadFile } from '../../utils/exportUtils';
import { useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface GridToolbarProps {
  onSearchToggle: () => void;
  searchOpen: boolean;
}

export function GridToolbar({ onSearchToggle, searchOpen }: GridToolbarProps) {
  const { activeSheetMeta, rows, addRow, selectedRowIds, deleteRows, clearSelection } = useSheetStore();
  const { past, future } = useUndoStore();
  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);
  const undoPush = useUndoStore((s) => s.push);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useClickOutside(exportRef, () => setExportOpen(false));

  if (!activeSheetMeta) return null;

  const selectedCount = selectedRowIds.size;

  const handleBulkDelete = () => {
    if (selectedCount === 0) return;
    const indices = rows
      .map((r, i) => (selectedRowIds.has(r.rowid as number) ? i : -1))
      .filter((i) => i >= 0);
    deleteRows(indices);
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      const content = toCSV(activeSheetMeta.columns, rows);
      downloadFile(content, `${activeSheetMeta.name}.csv`, 'text/csv');
    } else {
      const content = toJSON(rows);
      downloadFile(content, `${activeSheetMeta.name}.json`, 'application/json');
    }
    setExportOpen(false);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" data-testid="grid-toolbar">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{activeSheetMeta.name}</span>
      <div className="ml-auto flex gap-2 items-center">
        {/* Undo/Redo */}
        <button
          onClick={() => undo()}
          disabled={past.length === 0}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:text-gray-300 dark:disabled:text-gray-600"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          data-testid="undo-btn"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a4 4 0 014 4v0a4 4 0 01-4 4H3m0-8l4-4m-4 4l4 4" />
          </svg>
        </button>
        <button
          onClick={() => redo()}
          disabled={future.length === 0}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:text-gray-300 dark:disabled:text-gray-600"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          data-testid="redo-btn"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a4 4 0 00-4 4v0a4 4 0 004 4h10m0-8l-4-4m4 4l-4 4" />
          </svg>
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Search */}
        <button
          onClick={onSearchToggle}
          className={`p-1 rounded ${searchOpen ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          title="Search (Ctrl+F)"
          aria-label="Toggle search"
          data-testid="search-toggle"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Bulk delete */}
        {selectedCount > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            data-testid="delete-selected-btn"
          >
            Delete {selectedCount} row{selectedCount !== 1 ? 's' : ''}
          </button>
        )}

        {/* Export */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            aria-label="Export"
            data-testid="export-btn"
          >
            Export
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20" role="menu">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" role="menuitem" data-testid="export-csv">CSV</button>
              <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" role="menuitem" data-testid="export-json">JSON</button>
            </div>
          )}
        </div>

        <button
          onClick={async () => {
            const rowId = await addRow();
            if (rowId !== undefined && activeSheetMeta) {
              undoPush({
                type: 'row_add',
                sheetId: activeSheetMeta.id,
                payload: { rowId },
              });
            }
          }}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          data-testid="add-row-btn"
        >
          + Row
        </button>
      </div>
    </div>
  );
}
