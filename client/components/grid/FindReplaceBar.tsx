import { useState, useCallback, useEffect, useRef } from 'react';
import type { ColumnConfig } from '@shared/types';

export interface FindMatch {
  rowIndex: number;
  colName: string;
}

export function findMatches(
  rows: Record<string, unknown>[],
  columns: ColumnConfig[],
  searchText: string,
  matchCase: boolean
): FindMatch[] {
  if (!searchText) return [];

  const matches: FindMatch[] = [];
  const searchable = columns.filter(
    (c) => c.cellType !== 'checkbox' && c.cellType !== 'formula'
  );
  const search = matchCase ? searchText : searchText.toLowerCase();

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.__isGroupHeader || row.__isSubtotalRow || row.__isSummaryRow) continue;

    for (const col of searchable) {
      const val = row[col.name];
      if (val === null || val === undefined) continue;
      const str = matchCase ? String(val) : String(val).toLowerCase();
      if (str.includes(search)) {
        matches.push({ rowIndex: r, colName: col.name });
      }
    }
  }

  return matches;
}

export function replaceInCell(
  value: unknown,
  find: string,
  replace: string,
  matchCase: boolean
): string {
  const str = String(value ?? '');
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags = matchCase ? 'g' : 'gi';
  return str.replace(new RegExp(escaped, flags), replace);
}

interface FindReplaceBarProps {
  rows: Record<string, unknown>[];
  columns: ColumnConfig[];
  onReplace: (
    cells: Array<{ rowIndex: number; column: string; value: unknown }>,
    undoCells: Array<{ rowIndex: number; column: string; oldValue: unknown; newValue: unknown }>
  ) => void;
  onHighlightChange: (matches: FindMatch[]) => void;
  onClose: () => void;
  gridRef: React.RefObject<any>;
}

export function FindReplaceBar({
  rows,
  columns,
  onReplace,
  onHighlightChange,
  onClose,
  gridRef,
}: FindReplaceBarProps) {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matches, setMatches] = useState<FindMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  const doSearch = useCallback(
    (text: string, caseSensitive: boolean) => {
      const found = findMatches(rows, columns, text, caseSensitive);
      setMatches(found);
      setCurrentMatchIndex(found.length > 0 ? 0 : -1);
      onHighlightChange(found);
      if (found.length > 0) {
        navigateToMatch(found[0]);
      }
    },
    [rows, columns, onHighlightChange]
  );

  const navigateToMatch = (match: FindMatch) => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.ensureIndexVisible(match.rowIndex);
    api.ensureColumnVisible(match.colName);
  };

  const handleFindChange = (text: string) => {
    setFindText(text);
    doSearch(text, matchCase);
  };

  const handleMatchCaseToggle = () => {
    const newCase = !matchCase;
    setMatchCase(newCase);
    doSearch(findText, newCase);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const next = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(next);
    navigateToMatch(matches[next]);
  };

  const handleNext = () => {
    if (matches.length === 0) return;
    const next = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(next);
    navigateToMatch(matches[next]);
  };

  const handleReplace = () => {
    if (matches.length === 0 || currentMatchIndex < 0) return;
    const match = matches[currentMatchIndex];
    const oldValue = rows[match.rowIndex]?.[match.colName];
    const newValue = replaceInCell(oldValue, findText, replaceText, matchCase);

    onReplace(
      [{ rowIndex: match.rowIndex, column: match.colName, value: newValue }],
      [{ rowIndex: match.rowIndex, column: match.colName, oldValue, newValue }]
    );

    // Re-search after replace
    setTimeout(() => doSearch(findText, matchCase), 100);
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;

    const cells: Array<{ rowIndex: number; column: string; value: unknown }> = [];
    const undoCells: Array<{ rowIndex: number; column: string; oldValue: unknown; newValue: unknown }> = [];

    for (const match of matches) {
      const oldValue = rows[match.rowIndex]?.[match.colName];
      const newValue = replaceInCell(oldValue, findText, replaceText, matchCase);
      cells.push({ rowIndex: match.rowIndex, column: match.colName, value: newValue });
      undoCells.push({ rowIndex: match.rowIndex, column: match.colName, oldValue, newValue });
    }

    onReplace(cells, undoCells);

    // Clear matches after replace all
    setTimeout(() => {
      setMatches([]);
      setCurrentMatchIndex(-1);
      onHighlightChange([]);
    }, 100);
  };

  const handleClose = () => {
    onHighlightChange([]);
    onClose();
  };

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      data-testid="find-replace-bar"
    >
      <div className="flex items-center gap-1">
        <input
          ref={findInputRef}
          type="text"
          value={findText}
          onChange={(e) => handleFindChange(e.target.value)}
          placeholder="Find..."
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 w-40"
          data-testid="find-input"
        />
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          placeholder="Replace..."
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 w-40"
          data-testid="replace-input"
        />
      </div>

      <button
        onClick={handleMatchCaseToggle}
        className={`px-2 py-1 text-xs rounded border ${matchCase ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}
        title="Match case"
        data-testid="match-case-toggle"
      >
        Aa
      </button>

      <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[60px]" data-testid="match-count">
        {matches.length > 0
          ? `${currentMatchIndex + 1} of ${matches.length}`
          : findText
            ? 'No matches'
            : ''}
      </span>

      <button
        onClick={handlePrev}
        disabled={matches.length === 0}
        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:text-gray-300 dark:disabled:text-gray-600"
        title="Previous match"
        data-testid="find-prev"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        onClick={handleNext}
        disabled={matches.length === 0}
        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:text-gray-300 dark:disabled:text-gray-600"
        title="Next match"
        data-testid="find-next"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

      <button
        onClick={handleReplace}
        disabled={matches.length === 0}
        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600"
        data-testid="replace-btn"
      >
        Replace
      </button>
      <button
        onClick={handleReplaceAll}
        disabled={matches.length === 0}
        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600"
        data-testid="replace-all-btn"
      >
        Replace All
      </button>

      <button
        onClick={handleClose}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-auto"
        title="Close (Escape)"
        data-testid="find-replace-close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
