import { describe, it, expect } from 'vitest';
import { parseFormula } from '@client/utils/formulaEngine';

describe('parseFormula', () => {
  it('strips leading equals sign', () => {
    const result = parseFormula('=Value * 2');
    expect(result.expression).toBe('Value * 2');
    expect(result.error).toBeUndefined();
  });

  it('handles formula without equals sign', () => {
    const result = parseFormula('Value + Quantity');
    expect(result.expression).toBe('Value + Quantity');
    expect(result.error).toBeUndefined();
  });

  it('returns error for empty formula', () => {
    const result = parseFormula('');
    expect(result.error).toBe('Empty formula');
  });

  it('returns error for equals-only formula', () => {
    const result = parseFormula('=');
    expect(result.error).toBe('Empty formula');
  });

  it('accepts SQL functions', () => {
    const result = parseFormula('=SUM(Value)');
    expect(result.expression).toBe('SUM(Value)');
    expect(result.error).toBeUndefined();
  });

  it('accepts IF expressions', () => {
    const result = parseFormula("=IF(Value > 100, 'High', 'Low')");
    expect(result.expression).toBe("IF(Value > 100, 'High', 'Low')");
    expect(result.error).toBeUndefined();
  });

  it('accepts arithmetic expressions', () => {
    const result = parseFormula('=Value * Quantity + 10');
    expect(result.expression).toBe('Value * Quantity + 10');
    expect(result.error).toBeUndefined();
  });

  it('rejects DROP keyword', () => {
    const result = parseFormula('DROP TABLE foo');
    expect(result.error).toBe('Formula contains forbidden SQL keywords');
  });

  it('rejects DELETE keyword', () => {
    const result = parseFormula('DELETE FROM foo');
    expect(result.error).toBe('Formula contains forbidden SQL keywords');
  });

  it('rejects INSERT keyword', () => {
    const result = parseFormula('INSERT INTO foo VALUES (1)');
    expect(result.error).toBe('Formula contains forbidden SQL keywords');
  });

  it('rejects UPDATE keyword', () => {
    const result = parseFormula('UPDATE foo SET x = 1');
    expect(result.error).toBe('Formula contains forbidden SQL keywords');
  });

  it('rejects ALTER keyword', () => {
    const result = parseFormula('ALTER TABLE foo ADD COLUMN x INT');
    expect(result.error).toBe('Formula contains forbidden SQL keywords');
  });

  it('rejects CREATE keyword', () => {
    const result = parseFormula('CREATE TABLE foo (x INT)');
    expect(result.error).toBe('Formula contains forbidden SQL keywords');
  });

  it('detects unbalanced opening parentheses', () => {
    const result = parseFormula('SUM(Value * (2 + 3)');
    expect(result.error).toBe('Unbalanced parentheses');
  });

  it('detects unbalanced closing parentheses', () => {
    const result = parseFormula('Value * 2)');
    expect(result.error).toBe('Unbalanced parentheses');
  });

  it('accepts balanced nested parentheses', () => {
    const result = parseFormula('(Value + (Quantity * 2))');
    expect(result.expression).toBe('(Value + (Quantity * 2))');
    expect(result.error).toBeUndefined();
  });

  it('accepts UPPER/LOWER functions', () => {
    const result = parseFormula('UPPER(Name)');
    expect(result.expression).toBe('UPPER(Name)');
    expect(result.error).toBeUndefined();
  });

  it('accepts COALESCE expression', () => {
    const result = parseFormula("COALESCE(Name, 'N/A')");
    expect(result.expression).toBe("COALESCE(Name, 'N/A')");
    expect(result.error).toBeUndefined();
  });
});
