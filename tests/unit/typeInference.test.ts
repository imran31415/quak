import { describe, it, expect } from 'vitest';
import { inferCellType, inferColumnsFromData } from '@shared/typeInference';

describe('inferCellType', () => {
  it('returns text for empty values', () => {
    expect(inferCellType([])).toBe('text');
    expect(inferCellType([null, undefined, ''])).toBe('text');
  });

  it('detects booleans', () => {
    expect(inferCellType([true, false, true])).toBe('checkbox');
    expect(inferCellType(['true', 'false'])).toBe('checkbox');
  });

  it('detects numbers', () => {
    expect(inferCellType([1, 2, 3])).toBe('number');
    expect(inferCellType(['42', '3.14', '0'])).toBe('number');
    expect(inferCellType([100, 200, 300])).toBe('number');
  });

  it('detects dates', () => {
    expect(inferCellType(['2025-01-15', '2025-02-20'])).toBe('date');
    expect(inferCellType(['2025-01-15T10:00:00'])).toBe('date');
  });

  it('returns text for mixed types', () => {
    expect(inferCellType(['hello', 42, true])).toBe('text');
    expect(inferCellType(['not-a-date', '2025-01-15'])).toBe('text');
  });

  it('returns text for strings', () => {
    expect(inferCellType(['hello', 'world'])).toBe('text');
  });
});

describe('inferColumnsFromData', () => {
  it('returns empty for no rows', () => {
    expect(inferColumnsFromData([])).toEqual([]);
  });

  it('infers columns from data', () => {
    const rows = [
      { Name: 'Alice', Age: 30, Active: true, JoinDate: '2025-01-15' },
      { Name: 'Bob', Age: 25, Active: false, JoinDate: '2025-02-20' },
    ];
    const columns = inferColumnsFromData(rows);
    expect(columns).toHaveLength(4);
    expect(columns.find((c) => c.name === 'Name')?.cellType).toBe('text');
    expect(columns.find((c) => c.name === 'Age')?.cellType).toBe('number');
    expect(columns.find((c) => c.name === 'Active')?.cellType).toBe('checkbox');
    expect(columns.find((c) => c.name === 'JoinDate')?.cellType).toBe('date');
  });

  it('generates valid column ids', () => {
    const rows = [{ 'Full Name': 'Alice', 'Date of Birth': '1990-01-01' }];
    const columns = inferColumnsFromData(rows);
    expect(columns[0].id).toBe('full_name');
    expect(columns[1].id).toBe('date_of_birth');
  });
});
