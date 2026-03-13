import type { ICellRendererParams } from 'ag-grid-community';

export function FormulaCell(props: ICellRendererParams) {
  const value = props.value;
  const displayValue = value !== null && value !== undefined ? String(value) : '';
  const isError = displayValue.startsWith('#ERROR');

  return (
    <div className="relative group" data-testid="formula-cell">
      <span className={isError ? 'text-red-600 dark:text-red-400' : ''}>{displayValue}</span>
      <span className="absolute top-0 right-0 hidden group-hover:inline-block text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1 rounded-bl">
        fx
      </span>
    </div>
  );
}
