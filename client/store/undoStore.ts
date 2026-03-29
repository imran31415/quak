import { create } from 'zustand';

export type UndoActionType = 'cell_edit' | 'cells_paste' | 'row_add' | 'row_delete' | 'rows_delete' | 'column_add' | 'column_delete' | 'column_rename' | 'row_reorder' | 'find_replace' | 'cell_format';

export interface UndoAction {
  type: UndoActionType;
  sheetId: string;
  payload: Record<string, unknown>;
}

interface UndoState {
  past: UndoAction[];
  future: UndoAction[];
  push(action: UndoAction): void;
  undo(): UndoAction | null;
  redo(): UndoAction | null;
  clear(): void;
}

const MAX_STACK = 50;

export const useUndoStore = create<UndoState>((set, get) => ({
  past: [],
  future: [],

  push: (action: UndoAction) => {
    set((state) => ({
      past: [...state.past.slice(-MAX_STACK + 1), action],
      future: [],
    }));
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return null;
    const action = past[past.length - 1];
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [action, ...state.future],
    }));
    return action;
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return null;
    const action = future[0];
    set((state) => ({
      past: [...state.past, action],
      future: state.future.slice(1),
    }));
    return action;
  },

  clear: () => {
    set({ past: [], future: [] });
  },
}));
