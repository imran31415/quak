import { describe, it, expect } from 'vitest';
import { buildSummaryRow } from '../../client/utils/summaryRow';
import type { ColumnConfig } from '../../shared/types';

function makeCol(name: string, cellType: string): ColumnConfig {
  return { id: name.toLowerCase(), name, cellType, width: 150 } as ColumnConfig;
}

describe('buildSummaryRow', () => {
  it('computes sum for number columns', () => {
    const cols = [makeCol('Amount', 'number')];
    const rows = [{ Amount: 10 }, { Amount: 20 }, { Amount: 30 }];
    const result = buildSummaryRow(rows, cols);
    expect(result.Amount).toBe('Sum: 60');
  });

  it('handles empty number columns', () => {
    const cols = [makeCol('Amount', 'number')];
    const rows = [{ Amount: null }, { Amount: '' }];
    const result = buildSummaryRow(rows, cols);
    expect(result.Amount).toBe('');
  });

  it('computes checkbox counts', () => {
    const cols = [makeCol('Done', 'checkbox')];
    const rows = [{ Done: true }, { Done: false }, { Done: true }];
    const result = buildSummaryRow(rows, cols);
    expect(result.Done).toBe('2/3');
  });

  it('computes date range', () => {
    const cols = [makeCol('Date', 'date')];
    const rows = [
      { Date: '2024-01-01' },
      { Date: '2024-06-15' },
      { Date: '2024-12-31' },
    ];
    const result = buildSummaryRow(rows, cols);
    expect(result.Date).toBe('2024-01-01 – 2024-12-31');
  });

  it('shows single date when all dates are the same', () => {
    const cols = [makeCol('Date', 'date')];
    const rows = [{ Date: '2024-01-01' }, { Date: '2024-01-01' }];
    const result = buildSummaryRow(rows, cols);
    expect(result.Date).toBe('2024-01-01');
  });

  it('computes most common dropdown value', () => {
    const cols = [makeCol('Status', 'dropdown')];
    const rows = [
      { Status: 'Active' },
      { Status: 'Active' },
      { Status: 'Inactive' },
    ];
    const result = buildSummaryRow(rows, cols);
    expect(result.Status).toBe('Active (2)');
  });

  it('counts filled text cells', () => {
    const cols = [makeCol('Name', 'text')];
    const rows = [{ Name: 'Alice' }, { Name: '' }, { Name: 'Bob' }];
    const result = buildSummaryRow(rows, cols);
    expect(result.Name).toBe('2 filled');
  });

  it('counts filled markdown cells', () => {
    const cols = [makeCol('Notes', 'markdown')];
    const rows = [{ Notes: '# Hello' }, { Notes: null }, { Notes: '' }];
    const result = buildSummaryRow(rows, cols);
    expect(result.Notes).toBe('1 filled');
  });

  it('filters out group header and subtotal rows', () => {
    const cols = [makeCol('Amount', 'number')];
    const rows = [
      { Amount: 10 },
      { Amount: 20, __isGroupHeader: true },
      { Amount: 30, __isSubtotalRow: true },
      { Amount: 40 },
    ];
    const result = buildSummaryRow(rows, cols);
    expect(result.Amount).toBe('Sum: 50');
  });

  it('marks the row as summary', () => {
    const result = buildSummaryRow([], []);
    expect(result.__isSummaryRow).toBe(true);
    expect(result.__idx).toBe('__summary');
  });
});
