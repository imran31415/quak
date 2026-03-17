import { useState } from 'react';
import type { ColumnConfig, DependentDropdownConfig } from '@shared/types';

interface DependentDropdownPanelProps {
  columns: ColumnConfig[];
  currentColumnId: string;
  dependentOn?: DependentDropdownConfig;
  options?: string[];
  onSave: (config: DependentDropdownConfig | undefined) => void;
  onClose: () => void;
}

export function DependentDropdownPanel({
  columns,
  currentColumnId,
  dependentOn,
  options,
  onSave,
  onClose,
}: DependentDropdownPanelProps) {
  const [enabled, setEnabled] = useState(!!dependentOn);
  const [parentColumnId, setParentColumnId] = useState(dependentOn?.columnId || '');
  const [mapping, setMapping] = useState<Record<string, string[]>>(dependentOn?.mapping || {});

  // Only show other dropdown columns as potential parents (excluding self to prevent circular deps)
  const parentCandidates = columns.filter(
    (c) => c.cellType === 'dropdown' && c.id !== currentColumnId && c.options?.length
  );

  const parentColumn = parentCandidates.find((c) => c.id === parentColumnId);
  const parentOptions = parentColumn?.options || [];

  const handleParentChange = (newParentId: string) => {
    setParentColumnId(newParentId);
    // Reset mapping when parent changes
    setMapping({});
  };

  const handleMappingChange = (parentValue: string, childOptionsStr: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      const values = childOptionsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (values.length > 0) {
        next[parentValue] = values;
      } else {
        delete next[parentValue];
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!enabled || !parentColumnId) {
      onSave(undefined);
    } else {
      onSave({ columnId: parentColumnId, mapping });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="dependent-dropdown-overlay"
    >
      <div
        className="w-96 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-3"
        data-testid="dependent-dropdown-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Dependent Dropdown</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
            &times;
          </button>
        </div>

        <label className="flex items-center gap-2 mb-3 cursor-pointer" data-testid="dependent-enable-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">Enable dependent dropdown</span>
        </label>

        {enabled && (
          <>
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Parent Column</label>
              <select
                value={parentColumnId}
                onChange={(e) => handleParentChange(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                data-testid="dependent-parent-select"
              >
                <option value="">Select parent column...</option>
                {parentCandidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {parentColumnId && parentOptions.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400">
                  Map parent values to child options (comma-separated)
                </label>
                {parentOptions.map((parentVal) => (
                  <div key={parentVal} className="flex gap-2 items-start">
                    <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[80px] pt-1 font-medium truncate" title={parentVal}>
                      {parentVal}
                    </span>
                    <input
                      type="text"
                      value={(mapping[parentVal] || []).join(', ')}
                      onChange={(e) => handleMappingChange(parentVal, e.target.value)}
                      placeholder={options?.join(', ') || 'Enter options...'}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      data-testid={`dependent-mapping-${parentVal}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {parentColumnId && parentOptions.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Selected parent column has no options configured.
              </p>
            )}
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            data-testid="save-dependent-dropdown"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-200"
            data-testid="cancel-dependent-dropdown"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
