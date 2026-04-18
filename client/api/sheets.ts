import type { SheetMeta, SheetData, QueryResult, FileMetadata, CellFormat, ApiKey, Webhook } from '@shared/types';

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

  getSchema: (id: string) => request<SheetMeta & { linkedRecordOptions?: Record<string, Array<{ rowid: number; displayValue: string }>> }>(`/sheets/${id}/schema`),

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

  addColumn: (sheetId: string, column: { name: string; cellType: string; width?: number; options?: string[]; formula?: string; linkedSheetId?: string; linkedDisplayColumn?: string; lookupLinkedColumn?: string; lookupReturnColumn?: string }) =>
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

  reorderRows: (sheetId: string, rowIds: number[]) =>
    request(`/sheets/${sheetId}/rows/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ rowIds }),
    }),

  // Comments
  getComments: (sheetId: string) =>
    request<Array<{ id: string; sheet_id: string; row_id: number; column_id: string; text: string; created_at: string; updated_at: string }>>(`/sheets/${sheetId}/comments`),

  addComment: (sheetId: string, rowId: number, columnId: string, text: string) =>
    request<{ id: string }>(`/sheets/${sheetId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ rowId, columnId, text }),
    }),

  updateComment: (sheetId: string, commentId: string, text: string) =>
    request(`/sheets/${sheetId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    }),

  deleteComment: (sheetId: string, commentId: string) =>
    request(`/sheets/${sheetId}/comments/${commentId}`, { method: 'DELETE' }),

  // Cell Formats
  getCellFormats: (sheetId: string) =>
    request<Array<{ id: string; sheet_id: string; row_id: number; col_name: string; bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean; text_color: string | null; bg_color: string | null }>>(`/sheets/${sheetId}/cell-formats`),

  upsertCellFormat: (sheetId: string, rowId: number, colName: string, format: Partial<CellFormat>) =>
    request<{ id: string }>(`/sheets/${sheetId}/cell-formats`, {
      method: 'PUT',
      body: JSON.stringify({ rowId, colName, ...format }),
    }),

  bulkUpsertCellFormats: (sheetId: string, formats: Array<{ rowId: number; colName: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; textColor?: string; bgColor?: string }>) =>
    request<{ success: boolean; upserted: number }>(`/sheets/${sheetId}/cell-formats/bulk`, {
      method: 'PUT',
      body: JSON.stringify({ formats }),
    }),

  clearCellFormats: (sheetId: string, cells: Array<{ rowId: number; colName: string }>) =>
    request<{ success: boolean }>(`/sheets/${sheetId}/cell-formats`, {
      method: 'DELETE',
      body: JSON.stringify({ cells }),
    }),

  // Audit log
  getAuditLog: (sheetId: string, limit = 50, offset = 0) =>
    request<Array<{ id: string; sheet_id: string; action: string; details: Record<string, unknown>; created_at: string }>>(`/sheets/${sheetId}/audit?limit=${limit}&offset=${offset}`),

  // Snapshots
  listSnapshots: (sheetId: string) =>
    request<Array<{ id: string; version: number; label: string; row_count: number; created_at: string }>>(`/sheets/${sheetId}/snapshots`),

  createSnapshot: (sheetId: string, label?: string) =>
    request<{ id: string; version: number; label: string; row_count: number }>(`/sheets/${sheetId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    }),

  getSnapshot: (sheetId: string, snapshotId: string) =>
    request<{ id: string; version: number; label: string; row_count: number; created_at: string; columns: unknown[]; rows: Record<string, unknown>[] }>(`/sheets/${sheetId}/snapshots/${snapshotId}`),

  restoreSnapshot: (sheetId: string, snapshotId: string) =>
    request<{ success: boolean; autoSaveVersion: number }>(`/sheets/${sheetId}/snapshots/${snapshotId}/restore`, {
      method: 'POST',
    }),

  deleteSnapshot: (sheetId: string, snapshotId: string) =>
    request<{ success: boolean }>(`/sheets/${sheetId}/snapshots/${snapshotId}`, {
      method: 'DELETE',
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

  uploadFile: async (file: File): Promise<FileMetadata> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/uploads`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  deleteFile: async (filename: string): Promise<void> => {
    const res = await fetch(`${BASE}/uploads/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
  },

  // API Keys
  listApiKeys: () =>
    request<ApiKey[]>('/api-keys'),

  createApiKey: (name: string) =>
    request<ApiKey & { key: string }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  deleteApiKey: (id: string) =>
    request<{ success: boolean }>(`/api-keys/${id}`, { method: 'DELETE' }),

  // Webhooks
  listWebhooks: () =>
    request<Webhook[]>('/webhooks'),

  createWebhook: (data: { name: string; url: string; sheetId: string; events: string[]; secret?: string }) =>
    request<Webhook>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateWebhook: (id: string, data: Partial<Webhook>) =>
    request<{ success: boolean }>(`/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteWebhook: (id: string) =>
    request<{ success: boolean }>(`/webhooks/${id}`, { method: 'DELETE' }),

  testWebhook: (id: string) =>
    request<{ success: boolean; status: number; statusText: string }>(`/webhooks/${id}/test`, {
      method: 'POST',
    }),
};
