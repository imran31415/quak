import type { ICellRendererParams } from 'ag-grid-community';
import { useSheetStore } from '../../store/sheetStore';
import { useUndoStore } from '../../store/undoStore';

export function RowActions(props: ICellRendererParams) {
  const { selectedRowIds, toggleRowSelection, deleteRow, activeSheetId } = useSheetStore();
  const undoPush = useUndoStore((s) => s.push);
  const rowId = props.data?.rowid as number | undefined;
  const rowIndex = props.node?.rowIndex ?? 0;
  const isSelected = rowId !== undefined && selectedRowIds.has(rowId);

  const handleDelete = () => {
    // Capture row data before deletion for undo
    if (activeSheetId && props.data) {
      const rowData = { ...props.data };
      undoPush({
        type: 'row_delete',
        sheetId: activeSheetId,
        payload: { rowIndex, rowData },
      });
    }
    deleteRow(rowIndex);
  };

  return (
    <div className="flex items-center gap-1 h-full">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => rowId !== undefined && toggleRowSelection(rowId)}
        className="w-3.5 h-3.5 cursor-pointer"
        aria-label={`Select row ${rowIndex + 1}`}
        data-testid={`row-select-${rowIndex}`}
      />
      <button
        onClick={handleDelete}
        className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400"
        title="Delete row"
        aria-label={`Delete row ${rowIndex + 1}`}
        data-testid={`row-delete-${rowIndex}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
