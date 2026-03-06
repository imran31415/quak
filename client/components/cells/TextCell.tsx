import type { ICellRendererParams } from 'ag-grid-community';

export function TextCell(props: ICellRendererParams) {
  return <span className="truncate">{props.value ?? ''}</span>;
}
