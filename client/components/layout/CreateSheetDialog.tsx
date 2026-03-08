import { useState } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import { CELL_TYPES } from '@shared/constants';
import type { CellType } from '@shared/constants';
import type { ColumnConfig } from '@shared/types';

const TEMPLATES: Record<string, { label: string; columns: Omit<ColumnConfig, 'id'>[] }> = {
  blank: {
    label: 'Blank',
    columns: [{ name: 'Column 1', cellType: 'text', width: 200 }],
  },
  tasks: {
    label: 'Task Tracker',
    columns: [
      { name: 'Name', cellType: 'text', width: 200 },
      { name: 'Value', cellType: 'number', width: 120 },
      { name: 'Done', cellType: 'checkbox', width: 80 },
      { name: 'Status', cellType: 'dropdown', width: 120, options: ['Todo', 'In Progress', 'Done'] },
      { name: 'Due Date', cellType: 'date', width: 130 },
      { name: 'Notes', cellType: 'markdown', width: 250 },
    ],
  },
  budget: {
    label: 'Budget',
    columns: [
      { name: 'Item', cellType: 'text', width: 200 },
      { name: 'Amount', cellType: 'number', width: 120 },
      { name: 'Category', cellType: 'dropdown', width: 150, options: ['Income', 'Housing', 'Food', 'Transport', 'Other'] },
      { name: 'Date', cellType: 'date', width: 130 },
    ],
  },
};

interface CreateSheetDialogProps {
  onClose: () => void;
  initialName: string;
}

export function CreateSheetDialog({ onClose, initialName }: CreateSheetDialogProps) {
  const [name, setName] = useState(initialName);
  const [template, setTemplate] = useState('tasks');
  const [customColumns, setCustomColumns] = useState<{ name: string; cellType: CellType }[]>([
    { name: 'Column 1', cellType: 'text' },
  ]);
  const [creating, setCreating] = useState(false);
  const { createSheet, loadSheet } = useSheetStore();
  const { isMobile, setSidebarOpen } = useUIStore();

  const addCustomColumn = () => {
    setCustomColumns([...customColumns, { name: `Column ${customColumns.length + 1}`, cellType: 'text' }]);
  };

  const removeCustomColumn = (index: number) => {
    if (customColumns.length <= 1) return;
    setCustomColumns(customColumns.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const cols = template === 'custom'
        ? customColumns.map((c) => ({
            id: c.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            ...c,
            width: 150,
          }))
        : TEMPLATES[template].columns.map((c) => ({
            id: c.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            ...c,
          }));

      const id = await createSheet(name.trim(), cols as ColumnConfig[]);
      await loadSheet(id);
      if (isMobile) setSidebarOpen(false);
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="create-sheet-dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Create New Sheet</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Sheet Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              autoFocus
              data-testid="dialog-sheet-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Template</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                <button
                  key={key}
                  onClick={() => setTemplate(key)}
                  className={`px-3 py-2 text-sm rounded-md border ${
                    template === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                  data-testid={`template-${key}`}
                >
                  {tmpl.label}
                  <span className="block text-xs text-gray-400 dark:text-gray-500">{tmpl.columns.length} columns</span>
                </button>
              ))}
              <button
                onClick={() => setTemplate('custom')}
                className={`px-3 py-2 text-sm rounded-md border ${
                  template === 'custom' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
                data-testid="template-custom"
              >
                Custom
                <span className="block text-xs text-gray-400 dark:text-gray-500">Define columns</span>
              </button>
            </div>
          </div>

          {template === 'custom' && (
            <div className="space-y-2">
              {customColumns.map((col, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => {
                      const updated = [...customColumns];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setCustomColumns(updated);
                    }}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Column name"
                  />
                  <select
                    value={col.cellType}
                    onChange={(e) => {
                      const updated = [...customColumns];
                      updated[i] = { ...updated[i], cellType: e.target.value as CellType };
                      setCustomColumns(updated);
                    }}
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {CELL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {customColumns.length > 1 && (
                    <button onClick={() => removeCustomColumn(i)} className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 text-lg">&times;</button>
                  )}
                </div>
              ))}
              <button onClick={addCustomColumn} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">+ Add Column</button>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
            data-testid="dialog-create-btn"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
