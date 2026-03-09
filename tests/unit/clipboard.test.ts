import { describe, it, expect } from 'vitest';
import { parseTSV, formatTSV, coerceValue, computeRange } from '@client/utils/clipboard';
import type { ColumnConfig } from '@shared/types';

describe('parseTSV', () => {
  it('parses basic TSV', () => {
    expect(parseTSV('a\tb\tc\n1\t2\t3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields', () => {
    expect(parseTSV('"hello\tworld"\tbar')).toEqual([
      ['hello\tworld', 'bar'],
    ]);
  });

  it('handles embedded newlines in quotes', () => {
    expect(parseTSV('"line1\nline2"\tbar')).toEqual([
      ['line1\nline2', 'bar'],
    ]);
  });

  it('handles escaped double-quotes', () => {
    expect(parseTSV('"say ""hello"""\tbar')).toEqual([
      ['say "hello"', 'bar'],
    ]);
  });

  it('handles empty cells', () => {
    expect(parseTSV('a\t\tc')).toEqual([
      ['a', '', 'c'],
    ]);
  });

  it('handles single cell', () => {
    expect(parseTSV('hello')).toEqual([['hello']]);
  });

  it('handles trailing newline', () => {
    expect(parseTSV('a\tb\n')).toEqual([['a', 'b']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseTSV('a\tb\r\nc\td')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('formatTSV', () => {
  it('formats basic 2D array', () => {
    expect(formatTSV([['a', 'b'], ['1', '2']])).toBe('a\tb\n1\t2');
  });

  it('quotes values containing tabs', () => {
    expect(formatTSV([['hello\tworld']])).toBe('"hello\tworld"');
  });

  it('quotes values containing newlines', () => {
    expect(formatTSV([['line1\nline2']])).toBe('"line1\nline2"');
  });

  it('escapes double-quotes in values', () => {
    expect(formatTSV([['say "hello"']])).toBe('"say ""hello"""');
  });

  it('handles null/undefined', () => {
    expect(formatTSV([[null, undefined, 'ok']])).toBe('\t\tok');
  });

  it('formats booleans', () => {
    expect(formatTSV([[true, false]])).toBe('true\tfalse');
  });
});

describe('coerceValue', () => {
  it('converts string to number', () => {
    expect(coerceValue('42', 'number')).toBe(42);
    expect(coerceValue('3.14', 'number')).toBe(3.14);
  });

  it('returns NaN-producing string as-is for number type', () => {
    expect(coerceValue('abc', 'number')).toBe('abc');
  });

  it('converts string to boolean for checkbox', () => {
    expect(coerceValue('true', 'checkbox')).toBe(true);
    expect(coerceValue('false', 'checkbox')).toBe(false);
    expect(coerceValue('TRUE', 'checkbox')).toBe(true);
    expect(coerceValue('1', 'checkbox')).toBe(true);
    expect(coerceValue('0', 'checkbox')).toBe(false);
  });

  it('passes through text', () => {
    expect(coerceValue('hello', 'text')).toBe('hello');
  });

  it('passes through date strings', () => {
    expect(coerceValue('2025-01-15', 'date')).toBe('2025-01-15');
  });

  it('passes through dropdown values', () => {
    expect(coerceValue('Option A', 'dropdown')).toBe('Option A');
  });

  it('handles empty string for number', () => {
    expect(coerceValue('', 'number')).toBe(0);
  });

  it('handles empty string for text', () => {
    expect(coerceValue('', 'text')).toBe('');
  });
});

describe('computeRange', () => {
  const columns: ColumnConfig[] = [
    { id: 'a', name: 'A', cellType: 'text', width: 150 },
    { id: 'b', name: 'B', cellType: 'number', width: 150 },
    { id: 'c', name: 'C', cellType: 'text', width: 150 },
    { id: 'd', name: 'D', cellType: 'text', width: 150 },
  ];

  it('computes range with anchor before focus', () => {
    const range = computeRange(
      { rowIndex: 1, colId: 'A' },
      { rowIndex: 3, colId: 'C' },
      columns
    );
    expect(range).toEqual({ startRow: 1, endRow: 3, startColIndex: 0, endColIndex: 2 });
  });

  it('computes range with focus before anchor', () => {
    const range = computeRange(
      { rowIndex: 3, colId: 'C' },
      { rowIndex: 1, colId: 'A' },
      columns
    );
    expect(range).toEqual({ startRow: 1, endRow: 3, startColIndex: 0, endColIndex: 2 });
  });

  it('computes single cell range', () => {
    const range = computeRange(
      { rowIndex: 2, colId: 'B' },
      { rowIndex: 2, colId: 'B' },
      columns
    );
    expect(range).toEqual({ startRow: 2, endRow: 2, startColIndex: 1, endColIndex: 1 });
  });

  it('computes same-row range', () => {
    const range = computeRange(
      { rowIndex: 0, colId: 'A' },
      { rowIndex: 0, colId: 'D' },
      columns
    );
    expect(range).toEqual({ startRow: 0, endRow: 0, startColIndex: 0, endColIndex: 3 });
  });

  it('computes same-column range', () => {
    const range = computeRange(
      { rowIndex: 0, colId: 'B' },
      { rowIndex: 4, colId: 'B' },
      columns
    );
    expect(range).toEqual({ startRow: 0, endRow: 4, startColIndex: 1, endColIndex: 1 });
  });
});
