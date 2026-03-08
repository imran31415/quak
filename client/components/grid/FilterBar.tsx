interface FilterBarProps {
  activeFilterCount: number;
  onClearAll: () => void;
}

export function FilterBar({ activeFilterCount, onClearAll }: FilterBarProps) {
  if (activeFilterCount === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700 text-sm" data-testid="filter-bar">
      <span className="text-blue-700 dark:text-blue-300">
        {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
      </span>
      <button
        onClick={onClearAll}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline text-xs"
        data-testid="clear-filters-btn"
      >
        Clear All
      </button>
    </div>
  );
}
