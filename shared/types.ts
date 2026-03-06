import type { CellType } from './constants.js';

export interface ColumnConfig {
  id: string;
  name: string;
  cellType: CellType;
  width: number;
  options?: string[];        // for dropdown
  format?: string;           // for number/date formatting
  formula?: string;          // for formula columns
}

export interface SheetMeta {
  id: string;
  name: string;
  columns: ColumnConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface SheetData {
  meta: SheetMeta;
  rows: Record<string, unknown>[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  time: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
