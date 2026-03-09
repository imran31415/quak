import type { ICellRendererParams } from 'ag-grid-community';
import { useSheetStore } from '../../store/sheetStore';
import { useUndoStore } from '../../store/undoStore';
import { useUIStore } from '../../store/uiStore';

export function RowActions(props: ICellRendererParams) {
  const { selectedRowIds, toggleRowSelection, deleteRow, activeSheetId } = useSheetStore();
  const undoPush = useUndoStore((s) => s.push);
  const viewConfigs = useUIStore((s) => s.viewConfigs);
  const setViewConfig = useUIStore((s) => s.setViewConfig);

  const rowId = props.data?.rowid as number | undefined;
  const rowIndex = props.node?.rowIndex ?? 0;
  const isSelected = rowId !== undefined && selectedRowIds.has(rowId);

  const frozenRowIds = activeSheetId ? viewConfigs[activeSheetId]?.frozenRowIds || [] : [];
  const isFrozen = rowId !== undefined && frozenRowIds.includes(rowId);

  const handleDelete = () => {
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

  const handleToggleFreeze = () => {
    if (rowId === undefined || !activeSheetId) return;
    if (isFrozen) {
      setViewConfig(activeSheetId, {
        frozenRowIds: frozenRowIds.filter((id) => id !== rowId),
      });
    } else {
      setViewConfig(activeSheetId, {
        frozenRowIds: [...frozenRowIds, rowId],
      });
    }
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
        onClick={handleToggleFreeze}
        className={`p-0.5 ${isFrozen ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-400'}`}
        title={isFrozen ? 'Unpin row' : 'Pin row to top'}
        aria-label={isFrozen ? `Unpin row ${rowIndex + 1}` : `Pin row ${rowIndex + 1}`}
        data-testid={`row-pin-${rowIndex}`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.828.722a.5.5 0 01.354.146l4.95 4.95a.5.5 0 01-.707.707l-.71-.71L11 8.528V12.5a.5.5 0 01-.854.354L7.5 10.207l-3.646 3.647a.5.5 0 01-.708-.708L6.793 9.5 4.146 6.854A.5.5 0 014.5 6h3.972l2.713-2.714-.71-.71a.5.5 0 01.354-.854z" />
        </svg>
      </button>
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
