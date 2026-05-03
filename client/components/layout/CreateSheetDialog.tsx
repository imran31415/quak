import { useState } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import { CELL_TYPES } from '@shared/constants';
import type { CellType } from '@shared/constants';
import type { ColumnConfig } from '@shared/types';
import { api } from '../../api/sheets';
import { SHEET_TEMPLATES, getTemplate, templateToColumns } from './sheetTemplates';

interface CreateSheetDialogProps {
  onClose: () => void;
  initialName: string;
}

export function CreateSheetDialog({ onClose, initialName }: CreateSheetDialogProps) {
  const [name, setName] = useState(initialName);
  const [templateKey, setTemplateKey] = useState('tasks');
  const [includeSampleData, setIncludeSampleData] = useState(true);
  const [customColumns, setCustomColumns] = useState<{ name: string; cellType: CellType }[]>([
    { name: 'Column 1', cellType: 'text' },
  ]);
  const [creating, setCreating] = useState(false);
  const [creatingMessage, setCreatingMessage] = useState('');
  const { createSheet, loadSheet } = useSheetStore();
  const { isMobile, setSidebarOpen } = useUIStore();

  const isCustom = templateKey === 'custom';
  const selectedTemplate = isCustom ? null : getTemplate(templateKey);
  const hasSampleData = !!selectedTemplate?.sampleRows?.length;
  const sampleRowCount = selectedTemplate?.sampleRows?.length ?? 0;

  const starterTemplates = SHEET_TEMPLATES.filter((t) => t.group === 'starter');
  const exampleTemplates = SHEET_TEMPLATES.filter((t) => t.group === 'example');

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
    setCreatingMessage('Creating sheet…');
    try {
      const cols: ColumnConfig[] = isCustom
        ? customColumns.map((c) => ({
            id: c.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            ...c,
            width: 150,
          }))
        : templateToColumns(selectedTemplate!);

      const id = await createSheet(name.trim(), cols);

      if (selectedTemplate?.sampleRows?.length && includeSampleData) {
        setCreatingMessage(`Adding ${selectedTemplate.sampleRows.length} sample rows…`);
        await api.replaceRows(id, selectedTemplate.sampleRows);
      }

      await loadSheet(id);
      if (isMobile) setSidebarOpen(false);
      onClose();
    } finally {
      setCreating(false);
      setCreatingMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="create-sheet-dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
              onKeyDown={(e) => e.key === 'Enter' && !creating && handleCreate()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              autoFocus
              data-testid="dialog-sheet-name"
            />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide font-medium text-gray-400 dark:text-gray-500 mb-2">Starter</div>
            <div className="grid grid-cols-2 gap-2">
              {starterTemplates.map((tmpl) => (
                <button
                  key={tmpl.key}
                  onClick={() => setTemplateKey(tmpl.key)}
                  className={`px-3 py-2 text-sm rounded-md border text-left ${
                    templateKey === tmpl.key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                  data-testid={`template-${tmpl.key}`}
                >
                  <div className="font-medium">{tmpl.label}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{tmpl.columns.length} columns</div>
                </button>
              ))}
              <button
                onClick={() => setTemplateKey('custom')}
                className={`px-3 py-2 text-sm rounded-md border text-left ${
                  isCustom
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
                data-testid="template-custom"
              >
                <div className="font-medium">Custom</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Define columns</div>
              </button>
            </div>
          </div>

          {exampleTemplates.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide font-medium text-gray-400 dark:text-gray-500 mb-2">
                Examples — pre-filled with realistic sample data
              </div>
              <div className="grid grid-cols-1 gap-2">
                {exampleTemplates.map((tmpl) => (
                  <button
                    key={tmpl.key}
                    onClick={() => setTemplateKey(tmpl.key)}
                    className={`px-3 py-2 text-sm rounded-md border text-left ${
                      templateKey === tmpl.key
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                    data-testid={`template-${tmpl.key}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{tmpl.label}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {tmpl.columns.length} cols · {tmpl.sampleRows?.length ?? 0} rows
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tmpl.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasSampleData && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={includeSampleData}
                onChange={(e) => setIncludeSampleData(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                data-testid="dialog-include-sample"
              />
              <span>
                Include sample data
                <span className="text-gray-400 dark:text-gray-500"> ({sampleRowCount} rows)</span>
              </span>
            </label>
          )}

          {isCustom && (
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end items-center">
          {creating && creatingMessage && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-auto">{creatingMessage}</span>
          )}
          <button onClick={onClose} disabled={creating} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50">Cancel</button>
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
