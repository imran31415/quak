import { useSheetStore } from '../../store/sheetStore';

interface StatusBarProps {
  filteredCount?: number | null;
}

export function StatusBar({ filteredCount }: StatusBarProps) {
  const { rows, activeSheetMeta } = useSheetStore();

  if (!activeSheetMeta) return null;

  const totalRows = rows.length;
  const showFiltered = filteredCount !== null && filteredCount !== undefined && filteredCount !== totalRows;

  return (
    <div className="flex items-center px-4 py-1 bg-gray-50 border-t border-gray-200 text-xs text-gray-500" data-testid="status-bar">
      <span>
        {showFiltered ? `${filteredCount} of ${totalRows} rows` : `${totalRows} rows`}
      </span>
      <span className="mx-2">|</span>
      <span>{activeSheetMeta.columns.length} columns</span>
    </div>
  );
}
