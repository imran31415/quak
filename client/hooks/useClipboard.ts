import { useEffect, useCallback, useRef, useState } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import type { CellClickedEvent } from 'ag-grid-community';
import type { SheetMeta } from '@shared/types';
import type { CellType } from '@shared/constants';
import {
  type CellCoord,
  type CellRange,
  computeRange,
  formatTSV,
  parseTSV,
  coerceValue,
} from '../utils/clipboard';
import { validateValue } from '../utils/validation';
import { useSheetStore } from '../store/sheetStore';
import { useUndoStore } from '../store/undoStore';
import { useToastStore } from '../store/toastStore';

interface UseClipboardOptions {
  gridRef: React.RefObject<AgGridReact | null>;
  meta: SheetMeta | null;
  rows: Record<string, unknown>[];
}

export function useClipboard({ gridRef, meta, rows }: UseClipboardOptions) {
  const anchorRef = useRef<CellCoord | null>(null);
  const focusRef = useRef<CellCoord | null>(null);
  const rangeRef = useRef<CellRange | null>(null);
  const [selectionInfo, setSelectionInfo] = useState<{ rows: number; cols: number } | null>(null);

  const toast = useToastStore((s) => s.addToast);
  const undoPush = useUndoStore((s) => s.push);
  const activeSheetId = useSheetStore((s) => s.activeSheetId);
  const bulkUpdateCells = useSheetStore((s) => s.bulkUpdateCells);

  const columns = meta?.columns ?? [];

  const updateRange = useCallback(() => {
    const anchor = anchorRef.current;
    const focus = focusRef.current;
    if (anchor && focus && columns.length > 0) {
      rangeRef.current = computeRange(anchor, focus, columns);
      const r = rangeRef.current;
      setSelectionInfo({
        rows: r.endRow - r.startRow + 1,
        cols: r.endColIndex - r.startColIndex + 1,
      });
    } else {
      rangeRef.current = null;
      setSelectionInfo(null);
    }
  }, [columns]);

  const refreshCells = useCallback(() => {
    gridRef.current?.api?.refreshCells({ force: true });
  }, [gridRef]);

  const clearSelection = useCallback(() => {
    anchorRef.current = null;
    focusRef.current = null;
    rangeRef.current = null;
    setSelectionInfo(null);
    refreshCells();
  }, [refreshCells]);

  const onCellClicked = useCallback(
    (event: CellClickedEvent) => {
      const field = event.colDef.field;
      if (!field || field === '__actions' || field === '__add_column') return;
      if (event.data?.__isGroupHeader || event.data?.__isSubtotalRow) return;

      const coord: CellCoord = { rowIndex: event.rowIndex!, colId: field };

      if (event.event && (event.event as MouseEvent).shiftKey && anchorRef.current) {
        focusRef.current = coord;
      } else {
        anchorRef.current = coord;
        focusRef.current = coord;
      }
      updateRange();
      refreshCells();
    },
    [updateRange, refreshCells]
  );

  const isInSelection = useCallback(
    (rowIndex: number, colName: string): boolean => {
      const range = rangeRef.current;
      if (!range) return false;
      if (rowIndex < range.startRow || rowIndex > range.endRow) return false;
      const colIdx = columns.findIndex((c) => c.name === colName);
      return colIdx >= range.startColIndex && colIdx <= range.endColIndex;
    },
    [columns]
  );

  const handleCopy = useCallback(() => {
    const range = rangeRef.current;
    if (!range || columns.length === 0) return;

    const data: unknown[][] = [];
    for (let r = range.startRow; r <= range.endRow; r++) {
      const row: unknown[] = [];
      for (let c = range.startColIndex; c <= range.endColIndex; c++) {
        const col = columns[c];
        const value = rows[r]?.[col.name];
        row.push(value ?? '');
      }
      data.push(row);
    }

    const tsv = formatTSV(data);
    navigator.clipboard.writeText(tsv).then(() => {
      const cellCount = (range.endRow - range.startRow + 1) * (range.endColIndex - range.startColIndex + 1);
      toast(`Copied ${cellCount} cell${cellCount > 1 ? 's' : ''}`, 'info');
    }).catch(() => {
      toast('Failed to copy to clipboard', 'error');
    });
  }, [columns, rows, toast]);

  const handlePaste = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || !activeSheetId || columns.length === 0) return;

    navigator.clipboard.readText().then((text) => {
      if (!text.trim()) return;

      const parsed = parseTSV(text);
      if (parsed.length === 0) return;

      const startRow = anchor.rowIndex;
      const startColIdx = columns.findIndex((c) => c.name === anchor.colId);
      if (startColIdx === -1) return;

      const cellUpdates: Array<{ rowIndex: number; column: string; value: unknown }> = [];
      const undoCells: Array<{ rowIndex: number; column: string; oldValue: unknown; newValue: unknown }> = [];
      let skippedCount = 0;

      for (let r = 0; r < parsed.length; r++) {
        const targetRow = startRow + r;
        if (targetRow >= rows.length) break;

        for (let c = 0; c < parsed[r].length; c++) {
          const targetColIdx = startColIdx + c;
          if (targetColIdx >= columns.length) break;

          const col = columns[targetColIdx];
          const rawValue = parsed[r][c];
          const coerced = coerceValue(rawValue, col.cellType as CellType);
          const validation = validateValue(coerced, col.cellType as CellType, col.options, col.validationRules);

          if (!validation.valid) {
            skippedCount++;
            continue;
          }

          const oldValue = rows[targetRow]?.[col.name];
          cellUpdates.push({ rowIndex: targetRow, column: col.name, value: coerced });
          undoCells.push({ rowIndex: targetRow, column: col.name, oldValue, newValue: coerced });
        }
      }

      if (cellUpdates.length === 0) {
        if (skippedCount > 0) {
          toast(`Paste failed: ${skippedCount} cell${skippedCount > 1 ? 's' : ''} had invalid values`, 'error');
        }
        return;
      }

      bulkUpdateCells(cellUpdates);

      undoPush({
        type: 'cells_paste',
        sheetId: activeSheetId,
        payload: { cells: undoCells },
      });

      const msg = skippedCount > 0
        ? `Pasted ${cellUpdates.length} cell${cellUpdates.length > 1 ? 's' : ''}, ${skippedCount} skipped`
        : `Pasted ${cellUpdates.length} cell${cellUpdates.length > 1 ? 's' : ''}`;
      toast(msg, 'success');

      refreshCells();
    }).catch(() => {
      toast('Failed to read clipboard', 'error');
    });
  }, [columns, rows, activeSheetId, bulkUpdateCells, undoPush, toast, refreshCells]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
        return;
      }

      if (e.key === 'Escape') {
        if (anchorRef.current) {
          clearSelection();
        }
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta && e.key === 'c') {
        if (anchorRef.current) {
          e.preventDefault();
          handleCopy();
        }
        return;
      }

      if (isCtrlOrMeta && e.key === 'v') {
        if (anchorRef.current) {
          e.preventDefault();
          handlePaste();
        }
        return;
      }

      if (e.shiftKey && !isCtrlOrMeta && anchorRef.current && focusRef.current) {
        const focus = focusRef.current;
        const colIdx = columns.findIndex((c) => c.name === focus.colId);

        switch (e.key) {
          case 'ArrowUp':
            if (focus.rowIndex > 0) {
              e.preventDefault();
              focusRef.current = { rowIndex: focus.rowIndex - 1, colId: focus.colId };
              updateRange();
              refreshCells();
            }
            break;
          case 'ArrowDown':
            if (focus.rowIndex < rows.length - 1) {
              e.preventDefault();
              focusRef.current = { rowIndex: focus.rowIndex + 1, colId: focus.colId };
              updateRange();
              refreshCells();
            }
            break;
          case 'ArrowLeft':
            if (colIdx > 0) {
              e.preventDefault();
              focusRef.current = { rowIndex: focus.rowIndex, colId: columns[colIdx - 1].name };
              updateRange();
              refreshCells();
            }
            break;
          case 'ArrowRight':
            if (colIdx < columns.length - 1) {
              e.preventDefault();
              focusRef.current = { rowIndex: focus.rowIndex, colId: columns[colIdx + 1].name };
              updateRange();
              refreshCells();
            }
            break;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [columns, rows, clearSelection, handleCopy, handlePaste, updateRange, refreshCells]);

  return {
    onCellClicked,
    isInSelection,
    selectionInfo,
    clearSelection,
  };
}
