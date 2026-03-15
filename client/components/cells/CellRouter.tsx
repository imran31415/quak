import type { ICellRendererParams } from 'ag-grid-community';
import { TextCell } from './TextCell';
import { NumberCell } from './NumberCell';
import { CheckboxCell } from './CheckboxCell';
import { DropdownCell } from './DropdownCell';
import { DateCell } from './DateCell';
import { MarkdownCell } from './MarkdownCell';
import { FormulaCell } from './FormulaCell';
import { LinkedRecordCell } from './LinkedRecordCell';
import { LookupCell } from './LookupCell';
import { FileCell } from './FileCell';
import type { CellType } from '@shared/constants';

const renderers: Record<CellType, React.ComponentType<ICellRendererParams>> = {
  text: TextCell,
  number: NumberCell,
  checkbox: CheckboxCell,
  dropdown: DropdownCell,
  date: DateCell,
  formula: FormulaCell,
  markdown: MarkdownCell,
  linked_record: LinkedRecordCell,
  lookup: LookupCell,
  file: FileCell,
};

export function CellRouter(props: ICellRendererParams & { cellType?: CellType }) {
  const cellType = props.cellType || 'text';
  const Renderer = renderers[cellType] || TextCell;
  return <Renderer {...props} />;
}

export { renderers };
