import { useSheetStore } from '../../store/sheetStore';

interface StatusBarProps {
  filteredCount?: number | null;
  selectionInfo?: { rows: number; cols: number } | null;
}

export function StatusBar({ filteredCount, selectionInfo }: StatusBarProps) {
  const { rows, activeSheetMeta } = useSheetStore();

  if (!activeSheetMeta) return null;

  const totalRows = rows.length;
  const showFiltered = filteredCount !== null && filteredCount !== undefined && filteredCount !== totalRows;

  return (
    <div className="flex items-center px-4 py-1 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400" data-testid="status-bar">
      <span>
        {showFiltered ? `${filteredCount} of ${totalRows} rows` : `${totalRows} rows`}
      </span>
      <span className="mx-2">|</span>
      <span>{activeSheetMeta.columns.length} columns</span>
      {selectionInfo && (selectionInfo.rows > 1 || selectionInfo.cols > 1) && (
        <>
          <span className="mx-2">|</span>
          <span data-testid="selection-info">{selectionInfo.rows} x {selectionInfo.cols} selected</span>
        </>
      )}
    </div>
  );
}
