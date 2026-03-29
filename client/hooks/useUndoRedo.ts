import { useEffect } from 'react';
import { useUndoStore } from '../store/undoStore';
import { useSheetStore } from '../store/sheetStore';
import { useCellFormatStore } from '../store/cellFormatStore';
import { api } from '../api/sheets';

export function useUndoRedo() {
  const { undo, redo } = useUndoStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const action = undo();
        if (action) applyUndo(action);
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        const action = redo();
        if (action) applyRedo(action);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}

function applyUndo(action: ReturnType<typeof useUndoStore.getState>['past'][0]) {
  const store = useSheetStore.getState();
  const p = action.payload;

  switch (action.type) {
    case 'cell_edit':
      store.updateCell(p.rowIndex as number, p.column as string, p.oldValue);
      break;
    case 'cells_paste': {
      const cells = p.cells as Array<{ rowIndex: number; column: string; oldValue: unknown; newValue: unknown }>;
      const restoreUpdates = cells.map((c) => ({ rowIndex: c.rowIndex, column: c.column, value: c.oldValue }));
      store.bulkUpdateCells(restoreUpdates);
      break;
    }
    case 'row_add':
      // Delete the specific row that was added using its rowid
      if (store.activeSheetId && p.rowId !== undefined) {
        api.deleteRows(store.activeSheetId, [p.rowId as number]).then(() => {
          store.loadSheet(store.activeSheetId!);
        });
      }
      break;
    case 'row_delete':
      // Re-add the row with its original data
      if (store.activeSheetId && p.rowData) {
        const rowData = p.rowData as Record<string, unknown>;
        // Filter out internal fields
        const cleanData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rowData)) {
          if (key !== '__idx' && key !== 'rowid' && key !== '__actions') {
            cleanData[key] = value;
          }
        }
        api.addRow(store.activeSheetId, cleanData).then(() => {
          store.loadSheet(store.activeSheetId!);
        });
      }
      break;
    case 'row_reorder':
      if (store.activeSheetId && p.oldOrder) {
        const oldOrder = p.oldOrder as number[];
        api.reorderRows(store.activeSheetId, oldOrder).then(() => {
          store.loadSheet(store.activeSheetId!);
        });
      }
      break;
    case 'find_replace': {
      const cells = p.cells as Array<{ rowIndex: number; column: string; oldValue: unknown; newValue: unknown }>;
      const restoreUpdates = cells.map((c) => ({ rowIndex: c.rowIndex, column: c.column, value: c.oldValue }));
      store.bulkUpdateCells(restoreUpdates);
      break;
    }
    case 'cell_format': {
      const formatStore = useCellFormatStore.getState();
      const cells = p.cells as Array<{ rowId: number; colName: string; oldFormat: Record<string, unknown> | null; newFormat: Record<string, unknown> | null }>;
      if (store.activeSheetId) {
        const toRestore = cells.filter((c) => c.oldFormat);
        const toClear = cells.filter((c) => !c.oldFormat);
        if (toRestore.length > 0) {
          formatStore.bulkUpsertFormats(store.activeSheetId, toRestore.map((c) => ({
            rowId: c.rowId,
            colName: c.colName,
            bold: !!c.oldFormat!.bold,
            italic: !!c.oldFormat!.italic,
            underline: !!c.oldFormat!.underline,
            strikethrough: !!c.oldFormat!.strikethrough,
            textColor: c.oldFormat!.textColor as string | undefined,
            bgColor: c.oldFormat!.bgColor as string | undefined,
          })));
        }
        if (toClear.length > 0) {
          formatStore.clearFormats(store.activeSheetId, toClear.map((c) => ({ rowId: c.rowId, colName: c.colName })));
        }
      }
      break;
    }
    default:
      // For column operations, just reload the sheet
      if (store.activeSheetId) {
        store.loadSheet(store.activeSheetId);
      }
      break;
  }
}

function applyRedo(action: ReturnType<typeof useUndoStore.getState>['past'][0]) {
  const store = useSheetStore.getState();
  const p = action.payload;

  switch (action.type) {
    case 'cell_edit':
      store.updateCell(p.rowIndex as number, p.column as string, p.newValue);
      break;
    case 'cells_paste': {
      const cells = p.cells as Array<{ rowIndex: number; column: string; oldValue: unknown; newValue: unknown }>;
      const redoUpdates = cells.map((c) => ({ rowIndex: c.rowIndex, column: c.column, value: c.newValue }));
      store.bulkUpdateCells(redoUpdates);
      break;
    }
    case 'row_add':
      store.addRow();
      break;
    case 'row_delete':
      if (store.activeSheetId && p.rowData) {
        const rowData = p.rowData as Record<string, unknown>;
        const rowid = rowData.rowid as number | undefined;
        if (rowid !== undefined) {
          api.deleteRows(store.activeSheetId, [rowid]).then(() => {
            store.loadSheet(store.activeSheetId!);
          });
        }
      }
      break;
    case 'row_reorder':
      if (store.activeSheetId && p.newOrder) {
        const newOrder = p.newOrder as number[];
        api.reorderRows(store.activeSheetId, newOrder).then(() => {
          store.loadSheet(store.activeSheetId!);
        });
      }
      break;
    case 'find_replace': {
      const cells = p.cells as Array<{ rowIndex: number; column: string; oldValue: unknown; newValue: unknown }>;
      const redoUpdates = cells.map((c) => ({ rowIndex: c.rowIndex, column: c.column, value: c.newValue }));
      store.bulkUpdateCells(redoUpdates);
      break;
    }
    case 'cell_format': {
      const formatStore = useCellFormatStore.getState();
      const cells = p.cells as Array<{ rowId: number; colName: string; oldFormat: Record<string, unknown> | null; newFormat: Record<string, unknown> | null }>;
      if (store.activeSheetId) {
        const toApply = cells.filter((c) => c.newFormat);
        const toClear = cells.filter((c) => !c.newFormat);
        if (toApply.length > 0) {
          formatStore.bulkUpsertFormats(store.activeSheetId, toApply.map((c) => ({
            rowId: c.rowId,
            colName: c.colName,
            bold: !!c.newFormat!.bold,
            italic: !!c.newFormat!.italic,
            underline: !!c.newFormat!.underline,
            strikethrough: !!c.newFormat!.strikethrough,
            textColor: c.newFormat!.textColor as string | undefined,
            bgColor: c.newFormat!.bgColor as string | undefined,
          })));
        }
        if (toClear.length > 0) {
          formatStore.clearFormats(store.activeSheetId, toClear.map((c) => ({ rowId: c.rowId, colName: c.colName })));
        }
      }
      break;
    }
    default:
      if (store.activeSheetId) {
        store.loadSheet(store.activeSheetId);
      }
      break;
  }
}
