import { describe, it, expect } from 'vitest';
import { validateValue } from '@client/utils/validation';
import type { ValidationRule } from '@shared/types';

describe('validateValue with ValidationRules', () => {
  it('required rule rejects empty values', () => {
    const rules: ValidationRule[] = [{ type: 'required' }];
    expect(validateValue('', 'text', undefined, rules).valid).toBe(false);
    expect(validateValue(null, 'text', undefined, rules).valid).toBe(false);
    expect(validateValue(undefined, 'text', undefined, rules).valid).toBe(false);
  });

  it('required rule allows non-empty values', () => {
    const rules: ValidationRule[] = [{ type: 'required' }];
    expect(validateValue('hello', 'text', undefined, rules).valid).toBe(true);
  });

  it('required rule uses custom message', () => {
    const rules: ValidationRule[] = [{ type: 'required', message: 'Name is required' }];
    const result = validateValue('', 'text', undefined, rules);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Name is required');
  });

  it('min_value rejects values below minimum', () => {
    const rules: ValidationRule[] = [{ type: 'min_value', value: 10 }];
    expect(validateValue(5, 'number', undefined, rules).valid).toBe(false);
    expect(validateValue(10, 'number', undefined, rules).valid).toBe(true);
    expect(validateValue(15, 'number', undefined, rules).valid).toBe(true);
  });

  it('max_value rejects values above maximum', () => {
    const rules: ValidationRule[] = [{ type: 'max_value', value: 100 }];
    expect(validateValue(150, 'number', undefined, rules).valid).toBe(false);
    expect(validateValue(100, 'number', undefined, rules).valid).toBe(true);
    expect(validateValue(50, 'number', undefined, rules).valid).toBe(true);
  });

  it('min_length rejects short strings', () => {
    const rules: ValidationRule[] = [{ type: 'min_length', value: 3 }];
    expect(validateValue('ab', 'text', undefined, rules).valid).toBe(false);
    expect(validateValue('abc', 'text', undefined, rules).valid).toBe(true);
  });

  it('max_length rejects long strings', () => {
    const rules: ValidationRule[] = [{ type: 'max_length', value: 5 }];
    expect(validateValue('toolong', 'text', undefined, rules).valid).toBe(false);
    expect(validateValue('short', 'text', undefined, rules).valid).toBe(true);
  });

  it('regex validates pattern', () => {
    const rules: ValidationRule[] = [{ type: 'regex', value: '^[A-Z]' }];
    expect(validateValue('Hello', 'text', undefined, rules).valid).toBe(true);
    expect(validateValue('hello', 'text', undefined, rules).valid).toBe(false);
  });

  it('custom_list validates against comma-separated values', () => {
    const rules: ValidationRule[] = [{ type: 'custom_list', value: 'red,green,blue' }];
    expect(validateValue('red', 'text', undefined, rules).valid).toBe(true);
    expect(validateValue('yellow', 'text', undefined, rules).valid).toBe(false);
  });

  it('multiple rules are all checked', () => {
    const rules: ValidationRule[] = [
      { type: 'min_value', value: 0 },
      { type: 'max_value', value: 100 },
    ];
    expect(validateValue(50, 'number', undefined, rules).valid).toBe(true);
    expect(validateValue(-1, 'number', undefined, rules).valid).toBe(false);
    expect(validateValue(101, 'number', undefined, rules).valid).toBe(false);
  });

  it('still performs basic type validation', () => {
    // Non-numeric for number type should still fail
    expect(validateValue('abc', 'number', undefined, []).valid).toBe(false);
  });

  it('empty values pass without required rule', () => {
    const rules: ValidationRule[] = [{ type: 'min_value', value: 10 }];
    expect(validateValue('', 'number', undefined, rules).valid).toBe(true);
    expect(validateValue(null, 'number', undefined, rules).valid).toBe(true);
  });
});
