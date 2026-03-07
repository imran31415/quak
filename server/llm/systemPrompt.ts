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
