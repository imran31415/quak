import type { SheetMeta, SheetData, QueryResult } from '@shared/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  listSheets: () => request<SheetMeta[]>('/sheets'),

  getSheet: (id: string) => request<SheetData & SheetMeta>(`/sheets/${id}`),

  createSheet: (name: string, columns: { name: string; cellType: string; width?: number; options?: string[] }[]) =>
    request<{ id: string }>('/sheets', {
      method: 'POST',
      body: JSON.stringify({ name, columns }),
    }),

  updateSheet: (id: string, data: Partial<{ name: string; columns: unknown[] }>) =>
    request(`/sheets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSheet: (id: string) =>
    request(`/sheets/${id}`, { method: 'DELETE' }),

  updateCell: (sheetId: string, rowIndex: number, column: string, value: unknown) =>
    request(`/sheets/${sheetId}/cells`, {
      method: 'PUT',
      body: JSON.stringify({ rowIndex, column, value }),
    }),

  addRow: (sheetId: string, row: Record<string, unknown>) =>
    request(`/sheets/${sheetId}/rows`, {
      method: 'POST',
      body: JSON.stringify(row),
    }),

  replaceRows: (sheetId: string, rows: Record<string, unknown>[]) =>
    request(`/sheets/${sheetId}/rows`, {
      method: 'PUT',
      body: JSON.stringify({ rows }),
    }),

  runQuery: (sql: string) =>
    request<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ sql }),
    }),
};
