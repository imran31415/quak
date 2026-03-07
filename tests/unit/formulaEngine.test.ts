import { describe, it, expect } from 'vitest';
import { parseFormula } from '@client/utils/formulaEngine';
import type { ColumnConfig } from '@shared/types';

const columns: ColumnConfig[] = [
  { id: 'name', name: 'Name', cellType: 'text', width: 150 },
  { id: 'value', name: 'Value', cellType: 'number', width: 120 },
  { id: 'quantity', name: 'Quantity', cellType: 'number', width: 120 },
];

describe('parseFormula', () => {
  it('strips leading equals sign', () => {
    const result = parseFormula('=Value * 2', columns);
    expect(result.expression).toBe('Value * 2');
  });

  it('handles formula without equals sign', () => {
    const result = parseFormula('Value + Quantity', columns);
    expect(result.expression).toBe('Value + Quantity');
  });

  it('returns error for empty formula', () => {
    const result = parseFormula('', columns);
    expect(result.error).toBe('Empty formula');
  });

  it('returns error for equals-only formula', () => {
    const result = parseFormula('=', columns);
    expect(result.error).toBe('Empty formula');
  });

  it('accepts SQL functions', () => {
    const result = parseFormula('=SUM(Value)', columns);
    expect(result.expression).toBe('SUM(Value)');
    expect(result.error).toBeUndefined();
  });

  it('accepts IF expressions', () => {
    const result = parseFormula("=IF(Value > 100, 'High', 'Low')", columns);
    expect(result.expression).toBe("IF(Value > 100, 'High', 'Low')");
  });

  it('accepts arithmetic expressions', () => {
    const result = parseFormula('=Value * Quantity + 10', columns);
    expect(result.expression).toBe('Value * Quantity + 10');
  });
});
