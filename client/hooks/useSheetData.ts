import { useCallback } from 'react';
import { useSheetStore } from '../store/sheetStore';

export function useSheetData() {
  const { activeSheetId, activeSheetMeta, rows, loadSheet, updateCell, addRow } = useSheetStore();

  const handleCellEdit = useCallback((rowIndex: number, column: string, value: unknown) => {
    updateCell(rowIndex, column, value);
  }, [updateCell]);

  return {
    sheetId: activeSheetId,
    meta: activeSheetMeta,
    rows,
    loadSheet,
    updateCell: handleCellEdit,
    addRow,
  };
}
