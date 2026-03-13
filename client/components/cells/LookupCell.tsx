import type { ICellRendererParams } from 'ag-grid-community';

export function LookupCell(props: ICellRendererParams) {
  const value = props.value;
  const displayValue = value !== null && value !== undefined ? String(value) : '';

  return (
    <div className="relative group" data-testid="lookup-cell">
      <span>{displayValue}</span>
      <span className="absolute top-0 right-0 hidden group-hover:inline-block text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1 rounded-bl">
        lookup
      </span>
    </div>
  );
}
