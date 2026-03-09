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
    request<{ success: boolean; rowid: number }>(`/sheets/${sheetId}/rows`, {
      method: 'POST',
      body: JSON.stringify(row),
    }),

  replaceRows: (sheetId: string, rows: Record<string, unknown>[]) =>
    request(`/sheets/${sheetId}/rows`, {
      method: 'PUT',
      body: JSON.stringify({ rows }),
    }),

  deleteRows: (sheetId: string, rowIds: number[]) =>
    request(`/sheets/${sheetId}/rows`, {
      method: 'DELETE',
      body: JSON.stringify({ rowIds }),
    }),

  addColumn: (sheetId: string, column: { name: string; cellType: string; width?: number; options?: string[] }) =>
    request(`/sheets/${sheetId}/columns`, {
      method: 'POST',
      body: JSON.stringify(column),
    }),

  deleteColumn: (sheetId: string, columnId: string) =>
    request(`/sheets/${sheetId}/columns/${columnId}`, { method: 'DELETE' }),

  updateColumn: (sheetId: string, columnId: string, data: Record<string, unknown>) =>
    request(`/sheets/${sheetId}/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  bulkUpdateCells: (sheetId: string, cells: Array<{ rowId: number; column: string; value: unknown }>) =>
    request(`/sheets/${sheetId}/cells/bulk`, {
      method: 'PUT',
      body: JSON.stringify({ cells }),
    }),

  importFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  exportSheet: (sheetId: string, format: 'csv' | 'json') =>
    `${BASE}/sheets/${sheetId}/export?format=${format}`,

  runQuery: (sql: string) =>
    request<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ sql }),
    }),
};
