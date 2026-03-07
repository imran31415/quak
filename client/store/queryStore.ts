import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QueryHistoryEntry {
  id: string;
  sql: string;
  timestamp: number;
  rowCount?: number;
  time?: number;
}

interface SavedQuery {
  id: string;
  name: string;
  sql: string;
}

interface QueryState {
  history: QueryHistoryEntry[];
  saved: SavedQuery[];
  addToHistory: (sql: string, result?: { rowCount: number; time: number }) => void;
  saveQuery: (id: string, name: string) => void;
  deleteQuery: (id: string) => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 20;

export const useQueryStore = create<QueryState>()(
  persist(
    (set, get) => ({
      history: [],
      saved: [],

      addToHistory: (sql: string, result?) => {
        const entry: QueryHistoryEntry = {
          id: `q_${Date.now()}`,
          sql,
          timestamp: Date.now(),
          rowCount: result?.rowCount,
          time: result?.time,
        };
        set((state) => ({
          history: [entry, ...state.history.slice(0, MAX_HISTORY - 1)],
        }));
      },

      saveQuery: (id: string, name: string) => {
        const { history, saved } = get();
        const entry = history.find((h) => h.id === id);
        if (!entry) return;

        // Don't duplicate
        if (saved.some((s) => s.sql === entry.sql)) return;

        set({
          saved: [...saved, { id: `saved_${Date.now()}`, name, sql: entry.sql }],
        });
      },

      deleteQuery: (id: string) => {
        set((state) => ({
          saved: state.saved.filter((s) => s.id !== id),
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: 'quak-query-store',
    }
  )
);
