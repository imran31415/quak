import { useState } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { CELL_TYPES } from '@shared/constants';
import type { CellType } from '@shared/constants';

interface AddColumnPanelProps {
  onClose: () => void;
}

export function AddColumnPanel({ onClose }: AddColumnPanelProps) {
  const [name, setName] = useState('');
  const [cellType, setCellType] = useState<CellType>('text');
  const [options, setOptions] = useState('');
  const { addColumn } = useSheetStore();

  const handleAdd = async () => {
    if (!name.trim()) return;
    const col: { name: string; cellType: string; options?: string[] } = {
      name: name.trim(),
      cellType,
    };
    if (cellType === 'dropdown' && options.trim()) {
      col.options = options.split(',').map((o) => o.trim()).filter(Boolean);
    }
    await addColumn(col);
    onClose();
  };

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
        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
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
