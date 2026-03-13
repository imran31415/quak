import { useState, useEffect } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { api } from '../../api/sheets';
import { CELL_TYPES } from '@shared/constants';
import type { CellType } from '@shared/constants';
import type { ColumnConfig } from '@shared/types';

interface AddColumnPanelProps {
  onClose: () => void;
}

export function AddColumnPanel({ onClose }: AddColumnPanelProps) {
  const [name, setName] = useState('');
  const [cellType, setCellType] = useState<CellType>('text');
  const [options, setOptions] = useState('');
  const [formula, setFormula] = useState('');

  // linked_record state
  const [linkedSheetId, setLinkedSheetId] = useState('');
  const [linkedDisplayColumn, setLinkedDisplayColumn] = useState('');
  const [linkedSheetColumns, setLinkedSheetColumns] = useState<ColumnConfig[]>([]);

  // lookup state
  const [lookupLinkedColumn, setLookupLinkedColumn] = useState('');
  const [lookupReturnColumn, setLookupReturnColumn] = useState('');
  const [lookupSheetColumns, setLookupSheetColumns] = useState<ColumnConfig[]>([]);

  const { addColumn, sheets, activeSheetId, activeSheetMeta } = useSheetStore();

  // Fetch columns of linked sheet when selected (for linked_record)
  useEffect(() => {
    if (cellType === 'linked_record' && linkedSheetId) {
      api.getSheet(linkedSheetId).then((data) => {
        setLinkedSheetColumns((data.columns || []) as ColumnConfig[]);
        setLinkedDisplayColumn('');
      }).catch(() => setLinkedSheetColumns([]));
    } else {
      setLinkedSheetColumns([]);
      setLinkedDisplayColumn('');
    }
  }, [cellType, linkedSheetId]);

  // Fetch columns of the linked sheet when a lookup linked column is selected
  useEffect(() => {
    if (cellType === 'lookup' && lookupLinkedColumn && activeSheetMeta) {
      const lrCol = activeSheetMeta.columns.find((c) => c.id === lookupLinkedColumn);
      if (lrCol?.linkedSheetId) {
        api.getSheet(lrCol.linkedSheetId).then((data) => {
          setLookupSheetColumns((data.columns || []) as ColumnConfig[]);
          setLookupReturnColumn('');
        }).catch(() => setLookupSheetColumns([]));
      }
    } else {
      setLookupSheetColumns([]);
      setLookupReturnColumn('');
    }
  }, [cellType, lookupLinkedColumn, activeSheetMeta]);

  const linkedRecordColumns = activeSheetMeta?.columns.filter((c) => c.cellType === 'linked_record') || [];

  const isAddDisabled = () => {
    if (!name.trim()) return true;
    if (cellType === 'formula' && !formula.trim()) return true;
    if (cellType === 'linked_record' && (!linkedSheetId || !linkedDisplayColumn)) return true;
    if (cellType === 'lookup' && (!lookupLinkedColumn || !lookupReturnColumn)) return true;
    return false;
  };

  const handleAdd = async () => {
    if (isAddDisabled()) return;
    const col: Record<string, unknown> = {
      name: name.trim(),
      cellType,
    };
    if (cellType === 'dropdown' && options.trim()) {
      col.options = options.split(',').map((o) => o.trim()).filter(Boolean);
    }
    if (cellType === 'formula' && formula.trim()) {
      col.formula = formula.trim();
    }
    if (cellType === 'linked_record') {
      col.linkedSheetId = linkedSheetId;
      col.linkedDisplayColumn = linkedDisplayColumn;
    }
    if (cellType === 'lookup') {
      col.lookupLinkedColumn = lookupLinkedColumn;
      col.lookupReturnColumn = lookupReturnColumn;
    }
    await addColumn(col as Parameters<typeof addColumn>[0]);
    onClose();
  };

  const otherSheets = sheets.filter((s) => s.id !== activeSheetId);
  const selectClass = "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";

  return (
    <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-3" data-testid="add-column-panel">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Add Column</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="Column name"
        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        autoFocus
        data-testid="add-col-name"
      />
      <select
        value={cellType}
        onChange={(e) => setCellType(e.target.value as CellType)}
        className={selectClass}
        data-testid="add-col-type"
      >
        {CELL_TYPES.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      {cellType === 'dropdown' && (
        <input
          type="text"
          value={options}
          onChange={(e) => setOptions(e.target.value)}
          placeholder="Options (comma-separated)"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          data-testid="add-col-options"
        />
      )}
      {cellType === 'formula' && (
        <textarea
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="e.g., Price * Quantity"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          rows={2}
          data-testid="add-col-formula"
        />
      )}
      {cellType === 'linked_record' && (
        <>
          <select
            value={linkedSheetId}
            onChange={(e) => setLinkedSheetId(e.target.value)}
            className={selectClass}
            data-testid="add-col-linked-sheet"
          >
            <option value="">Select sheet...</option>
            {otherSheets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {linkedSheetColumns.length > 0 && (
            <select
              value={linkedDisplayColumn}
              onChange={(e) => setLinkedDisplayColumn(e.target.value)}
              className={selectClass}
              data-testid="add-col-display-column"
            >
              <option value="">Display column...</option>
              {linkedSheetColumns.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          )}
        </>
      )}
      {cellType === 'lookup' && (
        <>
          <select
            value={lookupLinkedColumn}
            onChange={(e) => setLookupLinkedColumn(e.target.value)}
            className={selectClass}
            data-testid="add-col-lookup-linked"
          >
            <option value="">Linked column...</option>
            {linkedRecordColumns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {lookupSheetColumns.length > 0 && (
            <select
              value={lookupReturnColumn}
              onChange={(e) => setLookupReturnColumn(e.target.value)}
              className={selectClass}
              data-testid="add-col-lookup-return"
            >
              <option value="">Return column...</option>
              {lookupSheetColumns.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          )}
        </>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={isAddDisabled()}
          className="flex-1 px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          data-testid="add-col-submit"
        >
          Add
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
