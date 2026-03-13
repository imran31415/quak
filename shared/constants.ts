export const CELL_TYPES = ['text', 'number', 'checkbox', 'dropdown', 'date', 'formula', 'markdown', 'linked_record', 'lookup'] as const;

export type CellType = (typeof CELL_TYPES)[number];

export const DEFAULT_CELL_TYPE: CellType = 'text';

export const DEFAULT_COLUMN_WIDTH = 150;

export const DEFAULT_ROW_HEIGHT = 32;

export const MARKDOWN_ROW_HEIGHT = 120;

export const API_BASE = '/api';

export const DEBOUNCE_MS = 500;

export const FORMAT_COLORS = [
  { name: 'Red', bg: '#fecaca', text: '#991b1b', darkBg: '#7f1d1d', darkText: '#fca5a5' },
  { name: 'Green', bg: '#bbf7d0', text: '#166534', darkBg: '#14532d', darkText: '#86efac' },
  { name: 'Blue', bg: '#bfdbfe', text: '#1e40af', darkBg: '#1e3a5f', darkText: '#93c5fd' },
  { name: 'Yellow', bg: '#fef08a', text: '#854d0e', darkBg: '#713f12', darkText: '#fde047' },
  { name: 'Purple', bg: '#e9d5ff', text: '#6b21a8', darkBg: '#581c87', darkText: '#d8b4fe' },
  { name: 'Orange', bg: '#fed7aa', text: '#9a3412', darkBg: '#7c2d12', darkText: '#fdba74' },
  { name: 'Pink', bg: '#fbcfe8', text: '#9d174d', darkBg: '#831843', darkText: '#f9a8d4' },
  { name: 'Gray', bg: '#e5e7eb', text: '#374151', darkBg: '#374151', darkText: '#d1d5db' },
] as const;
