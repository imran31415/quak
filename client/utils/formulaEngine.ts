/**
 * Client-side formula validation utility.
 * Actual evaluation happens server-side via DuckDB SQL.
 */

const DANGEROUS_KEYWORDS = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b/i;

export function parseFormula(
  formula: string
): { expression: string; error?: string } {
  let expr = formula.startsWith('=') ? formula.slice(1).trim() : formula.trim();

  if (!expr) {
    return { expression: '', error: 'Empty formula' };
  }

  // Check for dangerous SQL keywords
  if (DANGEROUS_KEYWORDS.test(expr)) {
    return { expression: expr, error: 'Formula contains forbidden SQL keywords' };
  }

  // Check balanced parentheses
  let depth = 0;
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) {
      return { expression: expr, error: 'Unbalanced parentheses' };
    }
  }
  if (depth !== 0) {
    return { expression: expr, error: 'Unbalanced parentheses' };
  }

  return { expression: expr };
}
