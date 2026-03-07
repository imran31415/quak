import { describe, it, expect } from 'vitest';
import { validateValue } from '@client/utils/validation';

describe('validateValue', () => {
  it('allows null/undefined/empty for all types', () => {
    expect(validateValue(null, 'number').valid).toBe(true);
    expect(validateValue(undefined, 'date').valid).toBe(true);
    expect(validateValue('', 'checkbox').valid).toBe(true);
  });

  describe('number', () => {
    it('accepts valid numbers', () => {
      expect(validateValue(42, 'number').valid).toBe(true);
      expect(validateValue('3.14', 'number').valid).toBe(true);
      expect(validateValue(0, 'number').valid).toBe(true);
    });

    it('rejects non-numbers', () => {
      const result = validateValue('abc', 'number');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Must be a number');
    });
  });

  describe('date', () => {
    it('accepts valid dates', () => {
      expect(validateValue('2025-01-15', 'date').valid).toBe(true);
      expect(validateValue('2025-01-15T10:00:00', 'date').valid).toBe(true);
    });

    it('rejects invalid dates', () => {
      const result = validateValue('not-a-date', 'date');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid date format');
    });
  });

  describe('checkbox', () => {
    it('accepts boolean values', () => {
      expect(validateValue(true, 'checkbox').valid).toBe(true);
      expect(validateValue(false, 'checkbox').valid).toBe(true);
      expect(validateValue('true', 'checkbox').valid).toBe(true);
    });

    it('rejects non-boolean values', () => {
      const result = validateValue('maybe', 'checkbox');
      expect(result.valid).toBe(false);
    });
  });

  describe('dropdown', () => {
    it('accepts values in options', () => {
      expect(validateValue('Done', 'dropdown', ['Todo', 'Done']).valid).toBe(true);
    });

    it('rejects values not in options', () => {
      const result = validateValue('Invalid', 'dropdown', ['Todo', 'Done']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Must be one of');
    });

    it('allows any value when no options provided', () => {
      expect(validateValue('anything', 'dropdown').valid).toBe(true);
    });
  });

  describe('text/markdown', () => {
    it('accepts any string', () => {
      expect(validateValue('hello', 'text').valid).toBe(true);
      expect(validateValue('**bold**', 'markdown').valid).toBe(true);
    });
  });
});
