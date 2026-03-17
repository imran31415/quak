import type { CellType } from './constants.js';

export interface ColumnConfig {
  id: string;
  name: string;
  cellType: CellType;
  width: number;
  options?: string[];        // for dropdown
  format?: string;           // for number/date formatting
  formula?: string;          // for formula columns
  linkedSheetId?: string;    // for linked_record: which sheet to link to
  linkedDisplayColumn?: string; // for linked_record: which column to display
  lookupLinkedColumn?: string;  // for lookup: which linked_record column to follow
  lookupReturnColumn?: string;  // for lookup: which field to return
  pinned?: 'left' | null;
  conditionalFormats?: ConditionalFormatRule[];
  validationRules?: ValidationRule[];
  dependentOn?: DependentDropdownConfig;
}

export interface DependentDropdownConfig {
  columnId: string;                   // parent dropdown column's ID
  mapping: Record<string, string[]>;  // parentValue → childOptions
}

export type ConditionalOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty';

export interface ConditionalFormatRule {
  id: string;
  operator: ConditionalOperator;
  value?: string;
  bgColor: string;
  textColor: string;
}

export type ValidationRuleType = 'required' | 'min_value' | 'max_value' | 'min_length' | 'max_length' | 'regex' | 'custom_list';

export interface ValidationRule {
  type: ValidationRuleType;
  value?: string | number;
  message?: string;
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

export interface FileMetadata {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
