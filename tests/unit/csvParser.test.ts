import { describe, it, expect } from 'vitest';
import { parseCSV } from '@client/utils/csvParser';

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const result = parseCSV('Name,Value\nAlice,100\nBob,200');
    expect(result.headers).toEqual(['Name', 'Value']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['Alice', '100']);
    expect(result.rows[1]).toEqual(['Bob', '200']);
  });

  it('handles quoted fields', () => {
    const result = parseCSV('Name,Status\nAlice,"In Progress"\nBob,"Done, Complete"');
    expect(result.rows[0]).toEqual(['Alice', 'In Progress']);
    expect(result.rows[1]).toEqual(['Bob', 'Done, Complete']);
  });

  it('handles escaped quotes', () => {
    const result = parseCSV('Name,Quote\nAlice,"He said ""hello"""');
    expect(result.rows[0][1]).toBe('He said "hello"');
  });

  it('auto-detects tab delimiter', () => {
    const result = parseCSV('Name\tValue\nAlice\t100');
    expect(result.headers).toEqual(['Name', 'Value']);
    expect(result.rows[0]).toEqual(['Alice', '100']);
  });

  it('handles empty fields', () => {
    const result = parseCSV('A,B,C\n1,,3\n,,');
    expect(result.rows[0]).toEqual(['1', '', '3']);
    expect(result.rows[1]).toEqual(['', '', '']);
  });

  it('returns empty for empty input', () => {
    const result = parseCSV('');
    expect(result.headers).toEqual(['']);
    expect(result.rows).toHaveLength(0);
  });

  it('skips empty lines', () => {
    const result = parseCSV('Name\nAlice\n\nBob\n');
    expect(result.rows).toHaveLength(2);
  });
});
