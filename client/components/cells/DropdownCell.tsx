import type { ICellRendererParams } from 'ag-grid-community';

export function DropdownCell(props: ICellRendererParams) {
  return (
    <div className="flex items-center justify-between w-full h-full" data-testid="dropdown-cell">
      <span className="truncate">{props.value ?? ''}</span>
      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
