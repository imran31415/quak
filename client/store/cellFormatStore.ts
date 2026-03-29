import { create } from 'zustand';
import { api } from '../api/sheets';
import { useToastStore } from './toastStore';
import type { CellFormat } from '@shared/types';

interface CellFormatState {
  formats: Map<string, CellFormat>;
  loading: boolean;

  fetchFormats: (sheetId: string) => Promise<void>;
  upsertFormat: (sheetId: string, rowId: number, colName: string, format: Partial<CellFormat>) => Promise<void>;
  bulkUpsertFormats: (sheetId: string, formats: Array<{ rowId: number; colName: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; textColor?: string; bgColor?: string }>) => Promise<void>;
  clearFormats: (sheetId: string, cells: Array<{ rowId: number; colName: string }>) => Promise<void>;
  getFormat: (rowId: number, colName: string) => CellFormat | undefined;
  hasFormat: (rowId: number, colName: string) => boolean;
}

function formatKey(rowId: number, colName: string): string {
  return `${rowId}_${colName}`;
}

export const useCellFormatStore = create<CellFormatState>((set, get) => ({
  formats: new Map(),
  loading: false,

  fetchFormats: async (sheetId: string) => {
    try {
      set({ loading: true });
      const data = await api.getCellFormats(sheetId);
      const map = new Map<string, CellFormat>();
      for (const row of data) {
        const fmt: CellFormat = {
          id: row.id,
          bold: !!row.bold,
          italic: !!row.italic,
          underline: !!row.underline,
          strikethrough: !!row.strikethrough,
          textColor: row.text_color || undefined,
          bgColor: row.bg_color || undefined,
        };
        map.set(formatKey(row.row_id, row.col_name), fmt);
      }
      set({ formats: map, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  upsertFormat: async (sheetId: string, rowId: number, colName: string, format: Partial<CellFormat>) => {
    try {
      const result = await api.upsertCellFormat(sheetId, rowId, colName, format);
      const map = new Map(get().formats);
      const existing = map.get(formatKey(rowId, colName));
      map.set(formatKey(rowId, colName), {
        id: result.id,
        ...existing,
        ...format,
      });
      set({ formats: map });
    } catch (err) {
      useToastStore.getState().addToast(`Failed to update format: ${(err as Error).message}`, 'error');
    }
  },

  bulkUpsertFormats: async (sheetId: string, formats: Array<{ rowId: number; colName: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; textColor?: string; bgColor?: string }>) => {
    try {
      // Optimistic update
      const map = new Map(get().formats);
      for (const fmt of formats) {
        const key = formatKey(fmt.rowId, fmt.colName);
        const existing = map.get(key);
        map.set(key, {
          id: existing?.id || '',
          bold: fmt.bold,
          italic: fmt.italic,
          underline: fmt.underline,
          strikethrough: fmt.strikethrough,
          textColor: fmt.textColor,
          bgColor: fmt.bgColor,
        });
      }
      set({ formats: map });

      await api.bulkUpsertCellFormats(sheetId, formats);
    } catch (err) {
      useToastStore.getState().addToast(`Failed to update formats: ${(err as Error).message}`, 'error');
    }
  },

  clearFormats: async (sheetId: string, cells: Array<{ rowId: number; colName: string }>) => {
    try {
      // Optimistic update
      const map = new Map(get().formats);
      for (const cell of cells) {
        map.delete(formatKey(cell.rowId, cell.colName));
      }
      set({ formats: map });

      await api.clearCellFormats(sheetId, cells);
    } catch (err) {
      useToastStore.getState().addToast(`Failed to clear formats: ${(err as Error).message}`, 'error');
    }
  },

  getFormat: (rowId: number, colName: string) => {
    return get().formats.get(formatKey(rowId, colName));
  },

  hasFormat: (rowId: number, colName: string) => {
    return get().formats.has(formatKey(rowId, colName));
  },
}));
