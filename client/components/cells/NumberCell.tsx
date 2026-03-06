import type { ICellRendererParams } from 'ag-grid-community';

export function NumberCell(props: ICellRendererParams) {
  const val = props.value;
  const display = val !== null && val !== undefined ? String(val) : '';
  return <span className="tabular-nums">{display}</span>;
}
