import { create } from 'zustand';
import { api } from '../api/sheets';
import { useToastStore } from './toastStore';

export interface CellComment {
  id: string;
  sheetId: string;
  rowId: number;
  columnId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentState {
  comments: Map<string, CellComment>;
  loading: boolean;

  fetchComments: (sheetId: string) => Promise<void>;
  addComment: (sheetId: string, rowId: number, columnId: string, text: string) => Promise<void>;
  updateComment: (sheetId: string, commentId: string, text: string) => Promise<void>;
  deleteComment: (sheetId: string, commentId: string) => Promise<void>;
  getComment: (rowId: number, columnId: string) => CellComment | undefined;
  hasComment: (rowId: number, columnId: string) => boolean;
}

function commentKey(rowId: number, columnId: string): string {
  return `${rowId}_${columnId}`;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: new Map(),
  loading: false,

  fetchComments: async (sheetId: string) => {
    try {
      set({ loading: true });
      const data = await api.getComments(sheetId);
      const map = new Map<string, CellComment>();
      for (const row of data) {
        const comment: CellComment = {
          id: row.id,
          sheetId: row.sheet_id,
          rowId: row.row_id,
          columnId: row.column_id,
          text: row.text,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
        map.set(commentKey(comment.rowId, comment.columnId), comment);
      }
      set({ comments: map, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addComment: async (sheetId: string, rowId: number, columnId: string, text: string) => {
    try {
      const result = await api.addComment(sheetId, rowId, columnId, text);
      const comment: CellComment = {
        id: result.id,
        sheetId,
        rowId,
        columnId,
        text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const map = new Map(get().comments);
      map.set(commentKey(rowId, columnId), comment);
      set({ comments: map });
    } catch (err) {
      useToastStore.getState().addToast(`Failed to add comment: ${(err as Error).message}`, 'error');
    }
  },

  updateComment: async (sheetId: string, commentId: string, text: string) => {
    try {
      await api.updateComment(sheetId, commentId, text);
      const map = new Map(get().comments);
      for (const [key, comment] of map) {
        if (comment.id === commentId) {
          map.set(key, { ...comment, text, updatedAt: new Date().toISOString() });
          break;
        }
      }
      set({ comments: map });
    } catch (err) {
      useToastStore.getState().addToast(`Failed to update comment: ${(err as Error).message}`, 'error');
    }
  },

  deleteComment: async (sheetId: string, commentId: string) => {
    try {
      await api.deleteComment(sheetId, commentId);
      const map = new Map(get().comments);
      for (const [key, comment] of map) {
        if (comment.id === commentId) {
          map.delete(key);
          break;
        }
      }
      set({ comments: map });
    } catch (err) {
      useToastStore.getState().addToast(`Failed to delete comment: ${(err as Error).message}`, 'error');
    }
  },

  getComment: (rowId: number, columnId: string) => {
    return get().comments.get(commentKey(rowId, columnId));
  },

  hasComment: (rowId: number, columnId: string) => {
    return get().comments.has(commentKey(rowId, columnId));
  },
}));
