import { useSheetStore } from '../../store/sheetStore';

export function GridToolbar() {
  const { activeSheetMeta, addRow } = useSheetStore();

  if (!activeSheetMeta) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200" data-testid="grid-toolbar">
      <span className="text-sm font-medium text-gray-700">{activeSheetMeta.name}</span>
      <div className="ml-auto flex gap-2">
        <button
          onClick={addRow}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          data-testid="add-row-btn"
        >
          + Row
        </button>
      </div>
    </div>
  );
}
