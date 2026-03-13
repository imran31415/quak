import type { ICellRendererParams } from 'ag-grid-community';

export function LinkedRecordCell(props: ICellRendererParams) {
  const colDef = props.colDef;
  const colId = (colDef as any)?._colId;
  const displayKey = `__lr_display_${colId}`;
  const displayValue = props.data?.[displayKey];
  const hasValue = displayValue !== null && displayValue !== undefined && displayValue !== '';

  return (
    <div className="flex items-center gap-1" data-testid="linked-record-cell">
      <svg className="w-3 h-3 flex-shrink-0 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.354 5.5H4a3 3 0 000 6h3a3 3 0 002.83-4H9.4a2 2 0 01-1.4.58H5a2 2 0 110-4h1.354zM9.646 10.5H12a3 3 0 000-6H9a3 3 0 00-2.83 4h.43A2 2 0 018 5.42h2a2 2 0 110 4h-1.354z" />
      </svg>
      {hasValue ? (
        <span className="truncate">{String(displayValue)}</span>
      ) : (
        <span className="text-gray-400 dark:text-gray-500 italic text-sm">Select record...</span>
      )}
    </div>
  );
}
