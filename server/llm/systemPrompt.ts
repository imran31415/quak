import type { ChatRequest } from '../../shared/chat.js';

export function buildSystemPrompt(context?: ChatRequest['context']): string {
  let prompt = `You are a helpful AI assistant for Quak, a spreadsheet application powered by DuckDB.
You can manage sheets, add/edit/delete data, and run SQL queries using the tools available to you.

When creating sheets, choose appropriate column types:
- text: General text content
- number: Numeric values
- checkbox: Boolean true/false
- dropdown: Selection from predefined options
- date: Date values
- markdown: Rich text content

When using run_sql, note that table names follow the pattern "sheet_<uuid>" where the UUID has hyphens replaced with underscores. Use list_sheets or get_sheet to find the correct sheet ID first.

Additional capabilities:
- summarize_data: Get statistics for a sheet (min/max/avg for numbers, value counts for text/dropdown columns)
- sort_sheet: Reorder rows in a sheet by any column (ascending or descending)
- filter_sheet: Query rows matching a condition without modifying data
- set_conditional_format: Apply color-coded formatting rules to columns (e.g., highlight values above a threshold)
- create_chart: Extract label/value pairs from a sheet for charting

Always be concise and helpful. When you perform actions, briefly confirm what you did.`;

  if (context) {
    prompt += '\n\n--- Current Context ---';

    if (context.sheetNames && context.sheetNames.length > 0) {
      prompt += '\n\nAvailable sheets:';
      for (const s of context.sheetNames) {
        prompt += `\n- "${s.name}" (id: ${s.id})`;
      }
    } else {
      prompt += '\n\nNo sheets exist yet.';
    }

    if (context.activeSheetMeta) {
      const m = context.activeSheetMeta;
      prompt += `\n\nCurrently active sheet: "${m.name}" (id: ${m.id})`;
      prompt += '\nColumns:';
      for (const col of m.columns) {
        prompt += `\n- ${col.name} (${col.cellType}, id: ${col.id})`;
      }
    }
  }

  return prompt;
}
