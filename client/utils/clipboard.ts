import type { ColumnConfig } from '@shared/types';
import type { CellType } from '@shared/constants';

export interface CellCoord {
  rowIndex: number;
  colId: string;
}

export interface CellRange {
  startRow: number;
  endRow: number;
  startColIndex: number;
  endColIndex: number;
}

/**
 * Compute a rectangular CellRange from an anchor and focus cell.
 * Columns are ordered by their position in the columns array.
 */
export function computeRange(
  anchor: CellCoord,
  focus: CellCoord,
  columns: ColumnConfig[]
): CellRange {
  const anchorColIdx = columns.findIndex((c) => c.name === anchor.colId);
  const focusColIdx = columns.findIndex((c) => c.name === focus.colId);

  return {
    startRow: Math.min(anchor.rowIndex, focus.rowIndex),
    endRow: Math.max(anchor.rowIndex, focus.rowIndex),
    startColIndex: Math.min(anchorColIdx, focusColIdx),
    endColIndex: Math.max(anchorColIdx, focusColIdx),
  };
}

/**
 * Format a 2D array of cell values as a TSV string for the clipboard.
 */
export function formatTSV(data: unknown[][]): string {
  return data
    .map((row) =>
      row
        .map((cell) => {
          const str = cell === null || cell === undefined ? '' : String(cell);
          // Quote if contains tab, newline, or double-quote
          if (str.includes('\t') || str.includes('\n') || str.includes('"')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        })
        .join('\t')
    )
    .join('\n');
}

/**
 * Parse a TSV string from the clipboard into a 2D string array.
 */
export function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else {
      if (ch === '"' && currentField === '') {
        inQuotes = true;
        i++;
      } else if (ch === '\t') {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (ch === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        // Handle \r\n
        if (i + 1 < text.length && text[i + 1] === '\r') {
          i++;
        }
        i++;
      } else if (ch === '\r') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        // Handle \r\n
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        i++;
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  // Push the last field and row
  currentRow.push(currentField);
  if (currentRow.length > 1 || currentRow[0] !== '') {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Coerce a clipboard string value to the appropriate type for the target cell.
 */
export function coerceValue(value: string, cellType: CellType): unknown {
  if (value === '') return cellType === 'number' ? 0 : '';

  switch (cellType) {
    case 'checkbox':
      return value.toLowerCase() === 'true' || value === '1';
    case 'number': {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    case 'date':
    case 'text':
    case 'dropdown':
    case 'markdown':
    case 'formula':
    default:
      return value;
  }
}
