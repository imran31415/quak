import type { ICellRendererParams } from 'ag-grid-community';

export function DateCell(props: ICellRendererParams) {
  const val = props.value;
  let display = '';
  if (val) {
    try {
      display = new Date(val as string).toLocaleDateString();
    } catch {
      display = String(val);
    }
  }
  return <span>{display}</span>;
}
