import { create } from 'zustand';
import type { SheetMeta, ColumnConfig } from '@shared/types';
import { api } from '../api/sheets';
import { useToastStore } from './toastStore';

function toast(message: string, type: 'error' | 'success' | 'info' = 'error') {
  useToastStore.getState().addToast(message, type);
}

interface SheetState {
  sheets: SheetMeta[];
  activeSheetId: string | null;
  activeSheetMeta: SheetMeta | null;
  rows: Record<string, unknown>[];
  selectedRowIds: Set<number>;
  loading: boolean;
  error: string | null;

  fetchSheets: () => Promise<void>;
  loadSheet: (id: string) => Promise<void>;
  createSheet: (name: string, columns: ColumnConfig[]) => Promise<string>;
  deleteSheet: (id: string) => Promise<void>;
  updateCell: (rowIndex: number, column: string, value: unknown) => void;
  addRow: () => Promise<number | undefined>;
  deleteRow: (rowIndex: number) => void;
  deleteRows: (rowIndices: number[]) => void;
  addColumn: (column: { name: string; cellType: string; width?: number; options?: string[] }) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  renameColumn: (columnId: string, newName: string) => Promise<void>;
  updateColumnWidth: (columnId: string, width: number) => void;
  toggleRowSelection: (rowId: number) => void;
  selectAllRows: () => void;
  clearSelection: () => void;
}

export const useSheetStore = create<SheetState>((set, get) => ({
  sheets: [],
  activeSheetId: null,
  activeSheetMeta: null,
  rows: [],
  selectedRowIds: new Set(),
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
      set({ loading: true, error: null, selectedRowIds: new Set() });
      const data = await api.getSheet(id);
      const meta: SheetMeta = {
        id: data.id,
        name: data.name,
        columns: data.columns as ColumnConfig[],
        createdAt: data.createdAt ?? (data as unknown as Record<string, unknown>).created_at as string,
        updatedAt: data.updatedAt ?? (data as unknown as Record<string, unknown>).updated_at as string,
      };
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
      localStorage.setItem('quak-active-sheet', id);
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
        api.updateCell(activeSheetId, rowId, column, value).catch((err) => {
          toast(`Failed to save cell: ${(err as Error).message}`);
        });
      }
    }
  },

  addRow: async () => {
    const { rows, activeSheetMeta, activeSheetId } = get();
    if (!activeSheetMeta) return undefined;

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
    newRow.__idx = `new_${Date.now()}`;

    set({ rows: [...rows, newRow] });

    if (activeSheetId) {
      try {
        const result = await api.addRow(activeSheetId, newRow);
        const rowid = (result as { success: boolean; rowid?: number }).rowid;
        await get().loadSheet(activeSheetId);
        return rowid;
      } catch (err) {
        toast(`Failed to add row: ${(err as Error).message}`);
        get().loadSheet(activeSheetId);
        return undefined;
      }
    }
    return undefined;
  },

  deleteRow: (rowIndex: number) => {
    const { rows, activeSheetId } = get();
    const row = rows[rowIndex];
    if (!row) return;

    const newRows = rows.filter((_, i) => i !== rowIndex);
    set({ rows: newRows });

    if (activeSheetId && row.rowid !== undefined) {
      api.deleteRows(activeSheetId, [row.rowid as number]).catch((err) => {
        toast(`Failed to delete row: ${(err as Error).message}`);
        get().loadSheet(activeSheetId);
      });
    }
  },

  deleteRows: (rowIndices: number[]) => {
    const { rows, activeSheetId } = get();
    const rowIds = rowIndices
      .map((i) => rows[i]?.rowid as number | undefined)
      .filter((id): id is number => id !== undefined);

    const indexSet = new Set(rowIndices);
    const newRows = rows.filter((_, i) => !indexSet.has(i));
    set({ rows: newRows, selectedRowIds: new Set() });

    if (activeSheetId && rowIds.length > 0) {
      api.deleteRows(activeSheetId, rowIds).catch((err) => {
        toast(`Failed to delete rows: ${(err as Error).message}`);
        get().loadSheet(activeSheetId);
      });
    }
  },

  addColumn: async (column) => {
    const { activeSheetId } = get();
    if (!activeSheetId) return;

    try {
      await api.addColumn(activeSheetId, column);
      await get().loadSheet(activeSheetId);
    } catch (err) {
      toast(`Failed to add column: ${(err as Error).message}`);
    }
  },

  deleteColumn: async (columnId: string) => {
    const { activeSheetId } = get();
    if (!activeSheetId) return;

    try {
      await api.deleteColumn(activeSheetId, columnId);
      await get().loadSheet(activeSheetId);
    } catch (err) {
      toast(`Failed to delete column: ${(err as Error).message}`);
    }
  },

  renameColumn: async (columnId: string, newName: string) => {
    const { activeSheetId } = get();
    if (!activeSheetId) return;

    try {
      await api.updateColumn(activeSheetId, columnId, { name: newName });
      await get().loadSheet(activeSheetId);
    } catch (err) {
      toast(`Failed to rename column: ${(err as Error).message}`);
    }
  },

  updateColumnWidth: (columnId: string, width: number) => {
    const { activeSheetMeta, activeSheetId } = get();
    if (!activeSheetMeta || !activeSheetId) return;

    const columns = activeSheetMeta.columns.map((c) =>
      c.id === columnId ? { ...c, width } : c
    );
    set({ activeSheetMeta: { ...activeSheetMeta, columns } });

    // Debounced persist is handled by caller
    api.updateSheet(activeSheetId, { columns }).catch((err) => {
      toast(`Failed to save column width: ${(err as Error).message}`);
    });
  },

  toggleRowSelection: (rowId: number) => {
    const { selectedRowIds } = get();
    const next = new Set(selectedRowIds);
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    set({ selectedRowIds: next });
  },

  selectAllRows: () => {
    const { rows } = get();
    const all = new Set(rows.map((r) => r.rowid as number).filter((id) => id !== undefined));
    set({ selectedRowIds: all });
  },

  clearSelection: () => {
    set({ selectedRowIds: new Set() });
  },
}));
