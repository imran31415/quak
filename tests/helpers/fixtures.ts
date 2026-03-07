import type { CellType } from '../../shared/constants';

export const SAMPLE_COLUMNS = {
  text: { name: 'Name', cellType: 'text' as CellType, width: 200 },
  number: { name: 'Value', cellType: 'number' as CellType, width: 120 },
  checkbox: { name: 'Done', cellType: 'checkbox' as CellType, width: 80 },
  dropdown: { name: 'Status', cellType: 'dropdown' as CellType, width: 120, options: ['Todo', 'In Progress', 'Done'] },
  date: { name: 'Due Date', cellType: 'date' as CellType, width: 130 },
  markdown: { name: 'Notes', cellType: 'markdown' as CellType, width: 250 },
  formula: { name: 'Computed', cellType: 'formula' as CellType, width: 150, formula: '=Value * 2' },
};

export const DEFAULT_COLUMN_SET = [
  SAMPLE_COLUMNS.text,
  SAMPLE_COLUMNS.number,
  SAMPLE_COLUMNS.checkbox,
  SAMPLE_COLUMNS.dropdown,
  SAMPLE_COLUMNS.date,
  SAMPLE_COLUMNS.markdown,
];

export const SAMPLE_ROW = {
  Name: 'Test Item',
  Value: 42,
  Done: true,
  Status: 'In Progress',
  'Due Date': '2025-12-31',
  Notes: '**Bold** notes',
};

export const SAMPLE_CSV = `Name,Value,Done,Status
Alice,100,true,Done
Bob,200,false,Todo
Charlie,300,true,"In Progress"`;

export const SAMPLE_CSV_TABS = `Name\tValue\tDone
Alice\t100\ttrue
Bob\t200\tfalse`;

export const SAMPLE_JSON_DATA = [
  { Name: 'Alice', Value: 100, Done: true, Status: 'Done' },
  { Name: 'Bob', Value: 200, Done: false, Status: 'Todo' },
];
