import type { ColumnConfig } from '@shared/types';

export function toCSV(columns: ColumnConfig[], rows: Record<string, unknown>[]): string {
  const headers = columns.map((c) => escapeCSV(c.name)).join(',');
  const dataRows = rows.map((row) =>
    columns.map((c) => escapeCSV(String(row[c.name] ?? ''))).join(',')
  );
  return [headers, ...dataRows].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toJSON(rows: Record<string, unknown>[]): string {
  // Strip internal fields
  const clean = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k !== '__idx' && k !== 'rowid') {
        obj[k] = v;
      }
    }
    return obj;
  });
  return JSON.stringify(clean, null, 2);
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
