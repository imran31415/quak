import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import type { ViewType } from '../../store/uiStore';
import type { ColumnConfig } from '@shared/types';

interface ViewConfigPopoverProps {
  sheetId: string;
  viewType: ViewType;
}

export function ViewConfigPopover({ sheetId, viewType }: ViewConfigPopoverProps) {
  const { activeSheetMeta } = useSheetStore();
  const { viewConfigs, setViewConfig, setViewConfigPopoverOpen } = useUIStore();
  const config = viewConfigs[sheetId] || {};

  if (!activeSheetMeta) return null;

  const dropdownColumns = activeSheetMeta.columns.filter((c) => c.cellType === 'dropdown');
  const dateColumns = activeSheetMeta.columns.filter((c) => c.cellType === 'date');
  const allColumns = activeSheetMeta.columns;

  const handleSelect = (key: string, value: string) => {
    setViewConfig(sheetId, { [key]: value || undefined });
  };

  return (
    <div
      className="absolute top-10 right-2 z-40 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64"
      data-testid="view-config-popover"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">View Settings</span>
        <button
          onClick={() => setViewConfigPopoverOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {viewType === 'kanban' && (
        <ConfigSelect
          label="Group by column"
          columns={dropdownColumns}
          value={config.kanbanColumnId || ''}
          onChange={(v) => handleSelect('kanbanColumnId', v)}
          placeholder="Select a dropdown column"
          testId="kanban-column-select"
        />
      )}

      {viewType === 'calendar' && (
        <ConfigSelect
          label="Date column"
          columns={dateColumns}
          value={config.calendarColumnId || ''}
          onChange={(v) => handleSelect('calendarColumnId', v)}
          placeholder="Select a date column"
          testId="calendar-column-select"
        />
      )}

      {viewType === 'gallery' && (
        <ConfigSelect
          label="Title column"
          columns={allColumns}
          value={config.galleryTitleColumnId || ''}
          onChange={(v) => handleSelect('galleryTitleColumnId', v)}
          placeholder="Auto (first text column)"
          testId="gallery-column-select"
        />
      )}
    </div>
  );
}

function ConfigSelect({
  label,
  columns,
  value,
  onChange,
  placeholder,
  testId,
}: {
  label: string;
  columns: ColumnConfig[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        data-testid={testId}
      >
        <option value="">{placeholder}</option>
        {columns.map((col) => (
          <option key={col.id} value={col.id}>
            {col.name}
          </option>
        ))}
      </select>
      {columns.length === 0 && (
        <p className="text-xs text-amber-600 mt-1">
          No compatible columns found. Add one in Grid view.
        </p>
      )}
    </div>
  );
}
