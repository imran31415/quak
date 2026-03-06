import { useSheetStore } from '../../store/sheetStore';

export function StatusBar() {
  const { rows, activeSheetMeta } = useSheetStore();

  if (!activeSheetMeta) return null;

  return (
    <div className="flex items-center px-4 py-1 bg-gray-50 border-t border-gray-200 text-xs text-gray-500" data-testid="status-bar">
      <span>{rows.length} rows</span>
      <span className="mx-2">|</span>
      <span>{activeSheetMeta.columns.length} columns</span>
    </div>
  );
}
