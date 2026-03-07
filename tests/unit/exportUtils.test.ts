import { describe, it, expect } from 'vitest';
import { toCSV, toJSON } from '@client/utils/exportUtils';
import type { ColumnConfig } from '@shared/types';

const columns: ColumnConfig[] = [
  { id: 'name', name: 'Name', cellType: 'text', width: 150 },
  { id: 'value', name: 'Value', cellType: 'number', width: 120 },
];

const rows = [
  { Name: 'Alice', Value: 100, __idx: 0, rowid: 1 },
  { Name: 'Bob', Value: 200, __idx: 1, rowid: 2 },
];

describe('toCSV', () => {
  it('generates proper CSV output', () => {
    const csv = toCSV(columns, rows);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Name,Value');
    expect(lines[1]).toBe('Alice,100');
    expect(lines[2]).toBe('Bob,200');
  });

  it('escapes commas in values', () => {
    const rowsWithComma = [{ Name: 'Smith, John', Value: 100, __idx: 0, rowid: 1 }];
    const csv = toCSV(columns, rowsWithComma);
    expect(csv).toContain('"Smith, John"');
  });

  it('escapes quotes in values', () => {
    const rowsWithQuote = [{ Name: 'He said "hi"', Value: 100, __idx: 0, rowid: 1 }];
    const csv = toCSV(columns, rowsWithQuote);
    expect(csv).toContain('"He said ""hi"""');
  });
});

describe('toJSON', () => {
  it('generates proper JSON output', () => {
    const json = toJSON(rows);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].Name).toBe('Alice');
    expect(parsed[0].Value).toBe(100);
  });

  it('strips internal fields', () => {
    const json = toJSON(rows);
    const parsed = JSON.parse(json);
    expect(parsed[0].__idx).toBeUndefined();
    expect(parsed[0].rowid).toBeUndefined();
  });
});
