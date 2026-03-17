import { describe, it, expect } from 'vitest';
import { validateValue, type DependentContext } from '@client/utils/validation';
import type { DependentDropdownConfig } from '@shared/types';

const depConfig: DependentDropdownConfig = {
  columnId: 'country',
  mapping: {
    USA: ['NYC', 'LA', 'Chicago'],
    France: ['Paris', 'Lyon'],
  },
};

function makeCtx(parentValue: unknown): DependentContext {
  return {
    dependentOn: depConfig,
    parentColumnName: 'Country',
    rowData: { Country: parentValue },
  };
}

describe('Dependent dropdown validation', () => {
  it('validates against mapped options when parent has a mapped value', () => {
    const ctx = makeCtx('USA');
    expect(validateValue('NYC', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon'], undefined, ctx).valid).toBe(true);
    expect(validateValue('Paris', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon'], undefined, ctx).valid).toBe(false);
  });

  it('falls back to all static options when parent is empty', () => {
    const ctx = makeCtx('');
    expect(validateValue('Paris', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon'], undefined, ctx).valid).toBe(true);
  });

  it('falls back to all static options when parent is null', () => {
    const ctx = makeCtx(null);
    expect(validateValue('Paris', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon'], undefined, ctx).valid).toBe(true);
  });

  it('falls back to all static options when parent value is unmapped', () => {
    const ctx = makeCtx('Germany');
    expect(validateValue('NYC', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon'], undefined, ctx).valid).toBe(true);
    expect(validateValue('Berlin', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon'], undefined, ctx).valid).toBe(false);
  });

  it('is backward compatible: no context uses original behavior', () => {
    expect(validateValue('NYC', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon']).valid).toBe(true);
    expect(validateValue('Berlin', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon']).valid).toBe(false);
  });

  it('allows empty/null values regardless of dependent context', () => {
    const ctx = makeCtx('USA');
    expect(validateValue('', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon'], undefined, ctx).valid).toBe(true);
    expect(validateValue(null, 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon'], undefined, ctx).valid).toBe(true);
  });

  it('includes error message listing mapped options', () => {
    const ctx = makeCtx('France');
    const result = validateValue('NYC', 'dropdown', ['NYC', 'LA', 'Paris', 'Lyon'], undefined, ctx);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Paris');
    expect(result.error).toContain('Lyon');
  });
});
