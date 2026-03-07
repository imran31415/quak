// --- Tool System ---
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array';
    description: string;
    required?: boolean;
  }>;
  mutates: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
}

// --- Messages ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: number;
}

// --- SSE Events (server -> client) ---
export type SSEEvent =
  | { type: 'text_delta'; data: { content: string } }
  | { type: 'tool_call_start'; data: { id: string; name: string } }
  | { type: 'tool_result'; data: ToolResult }
  | { type: 'refresh'; data: Record<string, never> }
  | { type: 'error'; data: { message: string } }
  | { type: 'done'; data: Record<string, never> };

// --- Request ---
export interface ChatRequest {
  messages: { role: string; content: string }[];
  model: string;
  context?: {
    activeSheetId: string | null;
    activeSheetMeta: {
      id: string;
      name: string;
      columns: { id: string; name: string; cellType: string }[];
    } | null;
    sheetNames: { id: string; name: string }[];
  };
}

// --- Tool Definitions ---
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'list_sheets',
    description: 'List all sheets with their IDs, names, and column info',
    parameters: {},
    mutates: false,
  },
  {
    name: 'get_sheet',
    description: 'Get sheet metadata and data rows (with optional limit)',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      limit: { type: 'number', description: 'Max rows to return (default 50)' },
    },
    mutates: false,
  },
  {
    name: 'create_sheet',
    description: 'Create a new sheet with specified columns',
    parameters: {
      name: { type: 'string', description: 'Sheet name', required: true },
      columns: {
        type: 'array',
        description: 'Array of {name, cellType} objects. cellType: text, number, checkbox, dropdown, date, formula, markdown',
        required: true,
      },
    },
    mutates: true,
  },
  {
    name: 'add_rows',
    description: 'Add one or more rows to a sheet',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      rows: { type: 'array', description: 'Array of row objects with column name keys', required: true },
    },
    mutates: true,
  },
  {
    name: 'update_cells',
    description: 'Update specific cells in a sheet',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      updates: {
        type: 'array',
        description: 'Array of {rowId, column, value} objects',
        required: true,
      },
    },
    mutates: true,
  },
  {
    name: 'delete_rows',
    description: 'Delete specific rows from a sheet by row ID',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      rowIds: { type: 'array', description: 'Array of row IDs (rowid values) to delete', required: true },
    },
    mutates: true,
  },
  {
    name: 'add_column',
    description: 'Add a new column to a sheet',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      name: { type: 'string', description: 'Column name', required: true },
      cellType: { type: 'string', description: 'Column type: text, number, checkbox, dropdown, date, formula, markdown', required: true },
      options: { type: 'array', description: 'Dropdown options (only for dropdown type)' },
    },
    mutates: true,
  },
  {
    name: 'delete_column',
    description: 'Delete a column from a sheet',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      columnId: { type: 'string', description: 'The column ID to delete', required: true },
    },
    mutates: true,
  },
  {
    name: 'rename_column',
    description: 'Rename a column in a sheet',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      columnId: { type: 'string', description: 'The column ID to rename', required: true },
      newName: { type: 'string', description: 'New column name', required: true },
    },
    mutates: true,
  },
  {
    name: 'delete_sheet',
    description: 'Delete a sheet and all its data',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID to delete', required: true },
    },
    mutates: true,
  },
  {
    name: 'run_sql',
    description: 'Execute a read-only SELECT query against the database',
    parameters: {
      sql: { type: 'string', description: 'SQL SELECT query to execute', required: true },
    },
    mutates: false,
  },
];
