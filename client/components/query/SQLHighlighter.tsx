import { useRef, useCallback, type KeyboardEvent } from 'react';

interface SQLHighlighterProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE',
  'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'AS', 'ON', 'JOIN',
  'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'NATURAL',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION',
  'ALL', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF',
  'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE', 'TRUE', 'FALSE', 'ASC', 'DESC',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CAST', 'COALESCE',
  'WITH', 'RECURSIVE', 'OVER', 'PARTITION', 'WINDOW', 'ROWS', 'RANGE',
]);

function highlightSQL(sql: string): string {
  const tokens: string[] = [];
  let i = 0;

  while (i < sql.length) {
    // String literal
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length && (sql[j] !== "'" || (j + 1 < sql.length && sql[j + 1] === "'"))) {
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else j++;
      }
      if (j < sql.length) j++; // closing quote
      tokens.push(`<span class="text-green-600 dark:text-green-400">${escapeHtml(sql.slice(i, j))}</span>`);
      i = j;
      continue;
    }

    // Number
    if (/\d/.test(sql[i]) && (i === 0 || /[\s,()=<>!+\-*/]/.test(sql[i - 1]))) {
      let j = i;
      while (j < sql.length && /[\d.]/.test(sql[j])) j++;
      tokens.push(`<span class="text-orange-500 dark:text-orange-400">${escapeHtml(sql.slice(i, j))}</span>`);
      i = j;
      continue;
    }

    // Word (keyword or identifier)
    if (/[a-zA-Z_]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) j++;
      const word = sql.slice(i, j);
      if (SQL_KEYWORDS.has(word.toUpperCase())) {
        tokens.push(`<span class="text-blue-600 dark:text-blue-400 font-bold">${escapeHtml(word)}</span>`);
      } else {
        tokens.push(escapeHtml(word));
      }
      i = j;
      continue;
    }

    // Anything else (whitespace, operators, etc.)
    tokens.push(escapeHtml(sql[i]));
    i++;
  }

  return tokens.join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function SQLHighlighter({ value, onChange, onKeyDown }: SQLHighlighterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  return (
    <div className="relative w-full h-20">
      <pre
        ref={preRef}
        className="absolute inset-0 px-3 py-2 text-sm font-mono overflow-auto whitespace-pre-wrap break-words pointer-events-none border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlightSQL(value) + '\n' }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        className="absolute inset-0 w-full h-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent text-transparent caret-black dark:caret-white"
        placeholder="Enter SQL query..."
        spellCheck={false}
        data-testid="query-input"
      />
    </div>
  );
}
