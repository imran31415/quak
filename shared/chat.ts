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
  /**
   * Tools that mutate client-only state (zustand UI store) emit a
   * client_action SSE event in addition to a regular tool_result.
   */
  clientAction?: boolean;
}

// --- Client-side actions ---
// When a tool needs to mutate client-only state (view configs, dashboard
// widgets, etc.), the server validates inputs and emits one of these for
// the client chat panel to dispatch.
export type ClientAction =
  | { kind: 'set_view'; sheetId: string; viewType: 'grid' | 'kanban' | 'calendar' | 'gallery' | 'pivot' | 'form' | 'dashboard' }
  | {
      kind: 'add_dashboard_widget';
      sheetId: string;
      widget: {
        id: string;
        type: 'chart' | 'metric' | 'table';
        title: string;
        chartConfig?: { chartType: 'bar' | 'line' | 'pie'; xColumn: string; yColumns: string[] };
        metricConfig?: { column: string; aggregation: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' };
        tableConfig?: { columns: string[]; limit: number };
      };
    }
  | { kind: 'clear_dashboard'; sheetId: string };

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
  | { type: 'tool_call_args'; data: { id: string; arguments: Record<string, unknown> } }
  | { type: 'tool_result'; data: ToolResult }
  | { type: 'refresh'; data: Record<string, never> }
  | { type: 'client_action'; data: ClientAction }
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
  {
    name: 'summarize_data',
    description: 'Get statistical summary of a sheet: min/max/avg for numbers, value counts for text/dropdown, null counts per column',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
    },
    mutates: false,
  },
  {
    name: 'sort_sheet',
    description: 'Sort all rows in a sheet by a column in ascending or descending order',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      column: { type: 'string', description: 'Column name to sort by', required: true },
      direction: { type: 'string', description: 'Sort direction: asc or desc (default asc)' },
    },
    mutates: true,
  },
  {
    name: 'filter_sheet',
    description: 'Return rows matching a filter condition (read-only, does not modify data)',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      column: { type: 'string', description: 'Column name to filter on', required: true },
      operator: { type: 'string', description: 'Filter operator: equals, not_equals, greater_than, less_than, contains', required: true },
      value: { type: 'string', description: 'Value to compare against', required: true },
    },
    mutates: false,
  },
  {
    name: 'set_conditional_format',
    description: 'Apply conditional formatting rules to a column (e.g., highlight cells matching a condition)',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      columnId: { type: 'string', description: 'The column ID to format', required: true },
      rules: { type: 'array', description: 'Array of {operator, value, bgColor, textColor} rule objects', required: true },
    },
    mutates: true,
  },
  {
    name: 'set_view',
    description: 'Switch the active view of a sheet. Use this to navigate the user to grid/kanban/calendar/gallery/pivot/form/dashboard. Call this *after* mutating dashboard widgets so the user sees the result.',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      viewType: { type: 'string', description: 'One of: grid, kanban, calendar, gallery, pivot, form, dashboard', required: true },
    },
    mutates: true,
    clientAction: true,
  },
  {
    name: 'add_dashboard_widget',
    description: 'Add a chart, metric, or table widget to a sheet\'s Dashboard view. After adding, call set_view with viewType=dashboard so the user sees it. Validates that referenced columns exist on the sheet.',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
      type: { type: 'string', description: 'Widget type: chart, metric, or table', required: true },
      title: { type: 'string', description: 'Widget title shown in the dashboard', required: true },
      chartType: { type: 'string', description: '(chart only) bar, line, or pie' },
      xColumn: { type: 'string', description: '(chart only) Column name for the x-axis / categories' },
      yColumns: { type: 'array', description: '(chart only) One or more numeric column names for series' },
      column: { type: 'string', description: '(metric only) Numeric column name to aggregate' },
      aggregation: { type: 'string', description: '(metric only) SUM, COUNT, AVG, MIN, or MAX' },
      tableColumns: { type: 'array', description: '(table only) Column names to display' },
      tableLimit: { type: 'number', description: '(table only) Max rows to show (default 10)' },
    },
    mutates: true,
    clientAction: true,
  },
  {
    name: 'clear_dashboard',
    description: 'Remove all widgets from a sheet\'s Dashboard view',
    parameters: {
      sheetId: { type: 'string', description: 'The sheet ID', required: true },
    },
    mutates: true,
    clientAction: true,
  },
];
