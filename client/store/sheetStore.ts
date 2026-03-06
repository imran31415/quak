import { create } from 'zustand';
import type { SheetMeta, ColumnConfig } from '@shared/types';
import { api } from '../api/sheets';

interface SheetState {
  sheets: SheetMeta[];
  activeSheetId: string | null;
  activeSheetMeta: SheetMeta | null;
  rows: Record<string, unknown>[];
  loading: boolean;
  error: string | null;

  fetchSheets: () => Promise<void>;
  loadSheet: (id: string) => Promise<void>;
  createSheet: (name: string, columns: ColumnConfig[]) => Promise<string>;
  deleteSheet: (id: string) => Promise<void>;
  updateCell: (rowIndex: number, column: string, value: unknown) => void;
  addRow: () => void;
}

export const useSheetStore = create<SheetState>((set, get) => ({
  sheets: [],
  activeSheetId: null,
  activeSheetMeta: null,
  rows: [],
  loading: false,
  error: null,

  fetchSheets: async () => {
    try {
      set({ loading: true, error: null });
      const sheets = await api.listSheets();
      set({ sheets, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  loadSheet: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const data = await api.getSheet(id);
      const meta: SheetMeta = {
        id: data.id,
        name: data.name,
        columns: data.columns as ColumnConfig[],
        createdAt: data.createdAt ?? (data as unknown as Record<string, unknown>).created_at as string,
        updatedAt: data.updatedAt ?? (data as unknown as Record<string, unknown>).updated_at as string,
      };
      // Ensure each row has a stable __idx for AG Grid row IDs
      const rows = (data.rows || []).map((r: Record<string, unknown>, i: number) => ({
        ...r,
        __idx: r.rowid ?? i,
      }));
      set({
        activeSheetId: id,
        activeSheetMeta: meta,
        rows,
        loading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createSheet: async (name: string, columns: ColumnConfig[]) => {
    try {
      set({ loading: true, error: null });
      const result = await api.createSheet(name, columns);
      await get().fetchSheets();
      set({ loading: false });
      return result.id;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  deleteSheet: async (id: string) => {
    try {
      await api.deleteSheet(id);
      const state = get();
      set({
        sheets: state.sheets.filter((s) => s.id !== id),
        ...(state.activeSheetId === id ? { activeSheetId: null, activeSheetMeta: null, rows: [] } : {}),
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  updateCell: (rowIndex: number, column: string, value: unknown) => {
    const { rows, activeSheetId } = get();
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [column]: value };
    set({ rows: newRows });

    if (activeSheetId) {
      const rowId = rows[rowIndex].rowid as number | undefined;
      if (rowId !== undefined) {
        api.updateCell(activeSheetId, rowId, column, value).catch(console.error);
      }
    }
  },

  addRow: () => {
    const { rows, activeSheetMeta, activeSheetId } = get();
    if (!activeSheetMeta) return;

    const newRow: Record<string, unknown> = {};
    for (const col of activeSheetMeta.columns) {
      switch (col.cellType) {
        case 'checkbox':
          newRow[col.name] = false;
          break;
        case 'number':
          newRow[col.name] = 0;
          break;
        case 'date':
          newRow[col.name] = null;
          break;
        default:
          newRow[col.name] = '';
      }
    }
    // Assign a temporary stable index
    newRow.__idx = `new_${Date.now()}`;

    set({ rows: [...rows, newRow] });

    if (activeSheetId) {
      // Add row to server, then reload to get proper rowid
      api.addRow(activeSheetId, newRow).then(() => {
        get().loadSheet(activeSheetId);
      }).catch(console.error);
    }
  },
}));
