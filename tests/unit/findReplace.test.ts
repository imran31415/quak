import { describe, it, expect } from 'vitest';
import { findMatches, replaceInCell } from '../../client/components/grid/FindReplaceBar';
import type { ColumnConfig } from '../../shared/types';

function makeCol(name: string, cellType: string): ColumnConfig {
  return { id: name.toLowerCase(), name, cellType, width: 150 } as ColumnConfig;
}

describe('findMatches', () => {
  const columns = [
    makeCol('Name', 'text'),
    makeCol('Value', 'number'),
    makeCol('Done', 'checkbox'),
  ];

  it('finds matches in text columns', () => {
    const rows = [
      { Name: 'Alice', Value: 10, Done: false },
      { Name: 'Bob', Value: 20, Done: true },
      { Name: 'Alice Jr', Value: 30, Done: false },
    ];
    const matches = findMatches(rows, columns, 'Alice', false);
    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({ rowIndex: 0, colName: 'Name' });
    expect(matches[1]).toEqual({ rowIndex: 2, colName: 'Name' });
  });

  it('is case-insensitive by default', () => {
    const rows = [{ Name: 'ALICE', Value: 10, Done: false }];
    const matches = findMatches(rows, columns, 'alice', false);
    expect(matches).toHaveLength(1);
  });

  it('respects case-sensitive flag', () => {
    const rows = [{ Name: 'ALICE', Value: 10, Done: false }];
    const matches = findMatches(rows, columns, 'alice', true);
    expect(matches).toHaveLength(0);
  });

  it('skips checkbox columns', () => {
    const rows = [{ Name: 'test', Value: 10, Done: true }];
    const matches = findMatches(rows, columns, 'true', false);
    // Should not match the Done checkbox column
    expect(matches).toHaveLength(0);
  });

  it('finds matches in number columns', () => {
    const rows = [{ Name: 'test', Value: 123, Done: false }];
    const matches = findMatches(rows, columns, '12', false);
    expect(matches).toHaveLength(1);
    expect(matches[0].colName).toBe('Value');
  });

  it('returns empty for empty search', () => {
    const rows = [{ Name: 'test', Value: 10, Done: false }];
    const matches = findMatches(rows, columns, '', false);
    expect(matches).toHaveLength(0);
  });

  it('skips group headers and subtotal rows', () => {
    const rows = [
      { Name: 'data', Value: 10, Done: false },
      { Name: 'data', Value: 20, Done: false, __isGroupHeader: true },
      { Name: 'data', Value: 30, Done: false, __isSubtotalRow: true },
    ];
    const matches = findMatches(rows, columns, 'data', false);
    expect(matches).toHaveLength(1);
    expect(matches[0].rowIndex).toBe(0);
  });
});

describe('replaceInCell', () => {
  it('replaces text case-insensitively', () => {
    expect(replaceInCell('Hello World', 'hello', 'Hi', false)).toBe('Hi World');
  });

  it('replaces text case-sensitively', () => {
    expect(replaceInCell('Hello hello', 'hello', 'Hi', true)).toBe('Hello Hi');
  });

  it('replaces all occurrences', () => {
    expect(replaceInCell('foo bar foo', 'foo', 'baz', false)).toBe('baz bar baz');
  });

  it('handles special regex characters in search', () => {
    expect(replaceInCell('price: $10.00', '$10.00', '$20.00', false)).toBe('price: $20.00');
  });

  it('handles null/undefined values', () => {
    expect(replaceInCell(null, 'test', 'new', false)).toBe('');
    expect(replaceInCell(undefined, 'test', 'new', false)).toBe('');
  });
});
