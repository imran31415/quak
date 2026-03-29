import { useSheetStore } from '../../store/sheetStore';
import { useUndoStore } from '../../store/undoStore';
import { useUIStore } from '../../store/uiStore';
import { toCSV, toJSON, downloadFile } from '../../utils/exportUtils';
import { useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { AgGridReact } from 'ag-grid-react';
import { SavedFiltersMenu } from './SavedFiltersMenu';
import { FormatToolbar } from './FormatToolbar';
import type { CellFormat } from '@shared/types';

interface GridToolbarProps {
  onSearchToggle: () => void;
  searchOpen: boolean;
  gridRef: React.RefObject<AgGridReact | null>;
  selectedCells?: Array<{ rowId: number; colName: string }>;
  anchorCellFormat?: CellFormat;
  onFormatApplied?: () => void;
}

export function GridToolbar({ onSearchToggle, searchOpen, gridRef, selectedCells, anchorCellFormat, onFormatApplied }: GridToolbarProps) {
  const { activeSheetMeta, rows, addRow, selectedRowIds, deleteRows, clearSelection } = useSheetStore();
  const { past, future } = useUndoStore();
  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);
  const undoPush = useUndoStore((s) => s.push);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useClickOutside(exportRef, () => setExportOpen(false));

  const viewConfigs = useUIStore((s) => s.viewConfigs);
  const setViewConfig = useUIStore((s) => s.setViewConfig);
  const toggleAuditPanel = useUIStore((s) => s.toggleAuditPanel);
  const auditPanelOpen = useUIStore((s) => s.auditPanelOpen);
  const toggleVersionPanel = useUIStore((s) => s.toggleVersionPanel);
  const versionPanelOpen = useUIStore((s) => s.versionPanelOpen);

  if (!activeSheetMeta) return null;

  const selectedCount = selectedRowIds.size;
  const groupByColumnId = viewConfigs[activeSheetMeta.id]?.groupByColumnId;
  const groupByColumn = groupByColumnId ? activeSheetMeta.columns.find((c) => c.id === groupByColumnId) : undefined;
  const showTotals = viewConfigs[activeSheetMeta.id]?.showTotals || false;

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

  const handleExportXLSX = async () => {
    const { exportToXLSX } = await import('../../utils/xlsxExport');
    exportToXLSX(activeSheetMeta.name, activeSheetMeta.columns, rows);
    setExportOpen(false);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" data-testid="grid-toolbar">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{activeSheetMeta.name}</span>
      {groupByColumn && (
        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full" data-testid="grouping-indicator">
          Grouped by: {groupByColumn.name}
          <button
            onClick={() => setViewConfig(activeSheetMeta.id, { groupByColumnId: undefined })}
            className="ml-0.5 text-blue-500 hover:text-blue-700"
            data-testid="remove-grouping-btn"
          >
            &times;
          </button>
        </span>
      )}
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

        {/* Format Toolbar */}
        {selectedCells && selectedCells.length > 0 && activeSheetMeta && onFormatApplied && (
          <>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
            <FormatToolbar
              sheetId={activeSheetMeta.id}
              selectedCells={selectedCells}
              anchorCellFormat={anchorCellFormat}
              onFormatApplied={onFormatApplied}
            />
          </>
        )}

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

        {/* Totals toggle */}
        <button
          onClick={() => setViewConfig(activeSheetMeta.id, { showTotals: !showTotals })}
          className={`p-1 rounded ${showTotals ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          title="Toggle totals row"
          aria-label="Toggle totals"
          data-testid="totals-toggle"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.745 3A23.933 23.933 0 003 12c0 3.183.62 6.22 1.745 9M19.5 3c.967 2.78 1.5 5.817 1.5 9s-.533 6.22-1.5 9M8.25 8.885l1.444-.89a.75.75 0 011.105.402l2.402 7.206a.75.75 0 001.105.401l1.444-.889" />
          </svg>
        </button>

        {/* Saved Filters */}
        <SavedFiltersMenu gridRef={gridRef} sheetId={activeSheetMeta.id} />

        {/* Audit Log */}
        <button
          onClick={toggleAuditPanel}
          className={`p-1 rounded ${auditPanelOpen ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          title="Audit log"
          aria-label="Toggle audit log"
          data-testid="audit-log-toggle"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Version History */}
        <button
          onClick={toggleVersionPanel}
          className={`p-1 rounded ${versionPanelOpen ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          title="Version history"
          aria-label="Toggle version history"
          data-testid="version-history-toggle"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
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
              <button onClick={handleExportXLSX} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" role="menuitem" data-testid="export-xlsx">XLSX</button>
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
