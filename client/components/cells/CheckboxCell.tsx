import type { ICellRendererParams } from 'ag-grid-community';

export function CheckboxCell(props: ICellRendererParams) {
  const checked = Boolean(props.value);

  const toggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVal = !checked;
    // Defer the update to break out of AG Grid's current render cycle
    setTimeout(() => {
      if (props.node && props.colDef?.field) {
        props.node.setDataValue(props.colDef.field, newVal);
      }
    }, 0);
  };

  return (
    <div className="flex items-center justify-center h-full">
      <input
        type="checkbox"
        checked={checked}
        onChange={toggle}
        className="w-4 h-4 cursor-pointer accent-blue-600"
        data-testid="checkbox-cell"
      />
    </div>
  );
}
