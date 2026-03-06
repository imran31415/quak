export const CELL_TYPES = ['text', 'number', 'checkbox', 'dropdown', 'date', 'formula', 'markdown'] as const;

export type CellType = (typeof CELL_TYPES)[number];

export const DEFAULT_CELL_TYPE: CellType = 'text';

export const DEFAULT_COLUMN_WIDTH = 150;

export const DEFAULT_ROW_HEIGHT = 32;

export const MARKDOWN_ROW_HEIGHT = 120;

export const API_BASE = '/api';

export const DEBOUNCE_MS = 500;
