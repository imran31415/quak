import { useState, useCallback } from 'react';
import { ColorPickerPopover } from './ColorPickerPopover';
import { useCellFormatStore } from '../../store/cellFormatStore';
import { useUndoStore } from '../../store/undoStore';
import type { CellFormat } from '@shared/types';

interface FormatToolbarProps {
  sheetId: string;
  selectedCells: Array<{ rowId: number; colName: string }>;
  anchorCellFormat: CellFormat | undefined;
  onFormatApplied: () => void;
}

export function FormatToolbar({ sheetId, selectedCells, anchorCellFormat, onFormatApplied }: FormatToolbarProps) {
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [bgColorOpen, setBgColorOpen] = useState(false);
  const bulkUpsertFormats = useCellFormatStore((s) => s.bulkUpsertFormats);
  const clearFormats = useCellFormatStore((s) => s.clearFormats);
  const getFormat = useCellFormatStore((s) => s.getFormat);
  const undoPush = useUndoStore((s) => s.push);

  const snapshotFormats = useCallback(() => {
    return selectedCells.map((cell) => ({
      rowId: cell.rowId,
      colName: cell.colName,
      oldFormat: getFormat(cell.rowId, cell.colName) || null,
    }));
  }, [selectedCells, getFormat]);

  const toggleProperty = useCallback((prop: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    if (selectedCells.length === 0) return;

    const snapshot = snapshotFormats();
    const isActive = anchorCellFormat?.[prop];
    const formats = selectedCells.map((cell) => {
      const existing = getFormat(cell.rowId, cell.colName);
      return {
        rowId: cell.rowId,
        colName: cell.colName,
        bold: existing?.bold || false,
        italic: existing?.italic || false,
        underline: existing?.underline || false,
        strikethrough: existing?.strikethrough || false,
        textColor: existing?.textColor,
        bgColor: existing?.bgColor,
        [prop]: !isActive,
      };
    });

    undoPush({
      type: 'cell_format',
      sheetId,
      payload: {
        cells: snapshot.map((s, i) => ({
          ...s,
          newFormat: formats[i],
        })),
      },
    });

    bulkUpsertFormats(sheetId, formats);
    onFormatApplied();
  }, [selectedCells, anchorCellFormat, sheetId, getFormat, bulkUpsertFormats, undoPush, snapshotFormats, onFormatApplied]);

  const applyColor = useCallback((prop: 'textColor' | 'bgColor', color: string | undefined) => {
    if (selectedCells.length === 0) return;

    const snapshot = snapshotFormats();
    const formats = selectedCells.map((cell) => {
      const existing = getFormat(cell.rowId, cell.colName);
      return {
        rowId: cell.rowId,
        colName: cell.colName,
        bold: existing?.bold || false,
        italic: existing?.italic || false,
        underline: existing?.underline || false,
        strikethrough: existing?.strikethrough || false,
        textColor: existing?.textColor,
        bgColor: existing?.bgColor,
        [prop]: color,
      };
    });

    undoPush({
      type: 'cell_format',
      sheetId,
      payload: {
        cells: snapshot.map((s, i) => ({
          ...s,
          newFormat: formats[i],
        })),
      },
    });

    bulkUpsertFormats(sheetId, formats);
    onFormatApplied();
  }, [selectedCells, sheetId, getFormat, bulkUpsertFormats, undoPush, snapshotFormats, onFormatApplied]);

  const handleClearFormatting = useCallback(() => {
    if (selectedCells.length === 0) return;

    const snapshot = snapshotFormats();
    undoPush({
      type: 'cell_format',
      sheetId,
      payload: {
        cells: snapshot.map((s) => ({
          ...s,
          newFormat: null,
        })),
      },
    });

    clearFormats(sheetId, selectedCells);
    onFormatApplied();
  }, [selectedCells, sheetId, clearFormats, undoPush, snapshotFormats, onFormatApplied]);

  const btnClass = (active: boolean) =>
    `px-1.5 py-0.5 text-xs font-semibold rounded border ${active ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`;

  return (
    <div className="flex items-center gap-1" data-testid="format-toolbar">
      <button
        onClick={() => toggleProperty('bold')}
        className={btnClass(!!anchorCellFormat?.bold)}
        title="Bold (Ctrl+B)"
        data-testid="format-bold"
      >
        B
      </button>
      <button
        onClick={() => toggleProperty('italic')}
        className={btnClass(!!anchorCellFormat?.italic)}
        title="Italic (Ctrl+I)"
        data-testid="format-italic"
      >
        <em>I</em>
      </button>
      <button
        onClick={() => toggleProperty('underline')}
        className={btnClass(!!anchorCellFormat?.underline)}
        title="Underline (Ctrl+U)"
        data-testid="format-underline"
      >
        <span className="underline">U</span>
      </button>
      <button
        onClick={() => toggleProperty('strikethrough')}
        className={btnClass(!!anchorCellFormat?.strikethrough)}
        title="Strikethrough"
        data-testid="format-strikethrough"
      >
        <span className="line-through">S</span>
      </button>

      {/* Text Color */}
      <div className="relative">
        <button
          onClick={() => { setTextColorOpen(!textColorOpen); setBgColorOpen(false); }}
          className={btnClass(!!anchorCellFormat?.textColor)}
          title="Text color"
          data-testid="format-text-color"
        >
          <span style={{ color: anchorCellFormat?.textColor || undefined }}>A</span>
          <span className="block h-0.5 w-full rounded" style={{ backgroundColor: anchorCellFormat?.textColor || '#374151' }} />
        </button>
        {textColorOpen && (
          <ColorPickerPopover
            onSelect={(color) => applyColor('textColor', color)}
            onClose={() => setTextColorOpen(false)}
            currentColor={anchorCellFormat?.textColor}
          />
        )}
      </div>

      {/* Background Color */}
      <div className="relative">
        <button
          onClick={() => { setBgColorOpen(!bgColorOpen); setTextColorOpen(false); }}
          className={btnClass(!!anchorCellFormat?.bgColor)}
          title="Background color"
          data-testid="format-bg-color"
        >
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: anchorCellFormat?.bgColor || '#e5e7eb' }} />
        </button>
        {bgColorOpen && (
          <ColorPickerPopover
            onSelect={(color) => applyColor('bgColor', color)}
            onClose={() => setBgColorOpen(false)}
            currentColor={anchorCellFormat?.bgColor}
          />
        )}
      </div>

      {/* Clear Formatting */}
      <button
        onClick={handleClearFormatting}
        className="px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Clear formatting"
        data-testid="format-clear"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
