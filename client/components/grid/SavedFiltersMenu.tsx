import { useState, useRef } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import { useUIStore, type SavedFilter } from '../../store/uiStore';
import { useClickOutside } from '../../hooks/useClickOutside';

interface SavedFiltersMenuProps {
  gridRef: React.RefObject<AgGridReact | null>;
  sheetId: string;
}

export function SavedFiltersMenu({ gridRef, sheetId }: SavedFiltersMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => { setMenuOpen(false); setShowSaveInput(false); });

  const viewConfigs = useUIStore((s) => s.viewConfigs);
  const setViewConfig = useUIStore((s) => s.setViewConfig);
  const savedFilters = viewConfigs[sheetId]?.savedFilters || [];

  const handleSave = () => {
    if (!saveName.trim()) return;
    const api = gridRef.current?.api;
    if (!api) return;

    const filterModel = api.getFilterModel();
    const columnState = api.getColumnState?.() || [];
    const sortModel = columnState
      .filter((c: any) => c.sort)
      .map((c: any) => ({ colId: c.colId, sort: c.sort }));

    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      filterModel,
      sortModel,
    };

    setViewConfig(sheetId, {
      savedFilters: [...savedFilters, newFilter],
    });
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleApply = (filter: SavedFilter) => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.setFilterModel(filter.filterModel);
    if (filter.sortModel?.length) {
      api.applyColumnState({ state: filter.sortModel.map((s) => ({ colId: s.colId, sort: s.sort as any })) });
    }
    setMenuOpen(false);
  };

  const handleDelete = (filterId: string) => {
    setViewConfig(sheetId, {
      savedFilters: savedFilters.filter((f) => f.id !== filterId),
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={`p-1 rounded flex items-center gap-1 ${menuOpen ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        title="Saved filters"
        aria-label="Saved filters"
        data-testid="saved-filters-btn"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {savedFilters.length > 0 && (
          <span className="text-xs bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center" data-testid="saved-filters-badge">
            {savedFilters.length}
          </span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20" data-testid="saved-filters-menu">
          {savedFilters.length === 0 && !showSaveInput && (
            <div className="px-3 py-2 text-sm text-gray-400">No saved filters</div>
          )}
          {savedFilters.map((filter) => (
            <div key={filter.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700">
              <button
                onClick={() => handleApply(filter)}
                className="text-sm text-gray-700 dark:text-gray-200 truncate flex-1 text-left"
                data-testid={`apply-filter-${filter.name}`}
              >
                {filter.name}
              </button>
              <button
                onClick={() => handleDelete(filter.id)}
                className="ml-2 text-gray-400 hover:text-red-500 text-xs"
                data-testid={`delete-filter-${filter.name}`}
              >
                &times;
              </button>
            </div>
          ))}
          {showSaveInput ? (
            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-1">
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Filter name..."
                className="flex-1 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                data-testid="save-filter-input"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                data-testid="save-filter-confirm"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="w-full text-left px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
              data-testid="save-current-filter"
            >
              + Save Current Filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
