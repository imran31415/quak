import { describe, it, expect } from 'vitest';
import { evaluateRules } from '@client/utils/conditionalFormat';
import type { ConditionalFormatRule } from '@shared/types';

const makeRule = (operator: ConditionalFormatRule['operator'], value?: string): ConditionalFormatRule => ({
  id: 'test',
  operator,
  value,
  bgColor: '#fecaca',
  textColor: '#991b1b',
});

describe('evaluateRules', () => {
  it('returns null when no rules match', () => {
    const rules = [makeRule('equals', 'Hello')];
    expect(evaluateRules('World', rules, 'light')).toBeNull();
  });

  it('matches equals operator', () => {
    const rules = [makeRule('equals', 'Done')];
    const result = evaluateRules('Done', rules, 'light');
    expect(result).not.toBeNull();
    expect(result!.backgroundColor).toBe('#fecaca');
    expect(result!.color).toBe('#991b1b');
  });

  it('matches not_equals operator', () => {
    const rules = [makeRule('not_equals', 'Done')];
    expect(evaluateRules('Pending', rules, 'light')).not.toBeNull();
    expect(evaluateRules('Done', rules, 'light')).toBeNull();
  });

  it('matches greater_than operator', () => {
    const rules = [makeRule('greater_than', '50')];
    expect(evaluateRules(100, rules, 'light')).not.toBeNull();
    expect(evaluateRules(30, rules, 'light')).toBeNull();
    expect(evaluateRules(50, rules, 'light')).toBeNull();
  });

  it('matches less_than operator', () => {
    const rules = [makeRule('less_than', '50')];
    expect(evaluateRules(30, rules, 'light')).not.toBeNull();
    expect(evaluateRules(100, rules, 'light')).toBeNull();
  });

  it('matches contains operator', () => {
    const rules = [makeRule('contains', 'world')];
    expect(evaluateRules('Hello World', rules, 'light')).not.toBeNull();
    expect(evaluateRules('Goodbye', rules, 'light')).toBeNull();
  });

  it('matches is_empty operator', () => {
    const rules = [makeRule('is_empty')];
    expect(evaluateRules('', rules, 'light')).not.toBeNull();
    expect(evaluateRules(null, rules, 'light')).not.toBeNull();
    expect(evaluateRules(undefined, rules, 'light')).not.toBeNull();
    expect(evaluateRules('hello', rules, 'light')).toBeNull();
  });

  it('matches is_not_empty operator', () => {
    const rules = [makeRule('is_not_empty')];
    expect(evaluateRules('hello', rules, 'light')).not.toBeNull();
    expect(evaluateRules('', rules, 'light')).toBeNull();
  });

  it('returns first matching rule when multiple exist', () => {
    const rules = [
      { ...makeRule('equals', 'High'), bgColor: '#fecaca', textColor: '#991b1b' },
      { ...makeRule('equals', 'Low'), bgColor: '#bbf7d0', textColor: '#166534' },
    ];
    const result = evaluateRules('Low', rules, 'light');
    expect(result!.backgroundColor).toBe('#bbf7d0');
  });

  it('returns null for empty rules array', () => {
    expect(evaluateRules('anything', [], 'light')).toBeNull();
  });
});
