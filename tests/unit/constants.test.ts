import { describe, it, expect } from 'vitest';
import { CELL_TYPES, DEFAULT_CELL_TYPE, DEFAULT_COLUMN_WIDTH, DEBOUNCE_MS } from '@shared/constants';

describe('Constants', () => {
  it('has all expected cell types', () => {
    expect(CELL_TYPES).toContain('text');
    expect(CELL_TYPES).toContain('number');
    expect(CELL_TYPES).toContain('checkbox');
    expect(CELL_TYPES).toContain('dropdown');
    expect(CELL_TYPES).toContain('date');
    expect(CELL_TYPES).toContain('formula');
    expect(CELL_TYPES).toContain('markdown');
    expect(CELL_TYPES).toContain('linked_record');
    expect(CELL_TYPES).toContain('lookup');
    expect(CELL_TYPES).toHaveLength(9);
  });

  it('has text as default cell type', () => {
    expect(DEFAULT_CELL_TYPE).toBe('text');
  });

  it('has reasonable default column width', () => {
    expect(DEFAULT_COLUMN_WIDTH).toBeGreaterThan(0);
    expect(DEFAULT_COLUMN_WIDTH).toBe(150);
  });

  it('has reasonable debounce time', () => {
    expect(DEBOUNCE_MS).toBeGreaterThan(0);
    expect(DEBOUNCE_MS).toBe(500);
  });
});
