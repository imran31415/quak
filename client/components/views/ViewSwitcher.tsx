import { useUIStore } from '../../store/uiStore';
import type { ViewType } from '../../store/uiStore';

const VIEW_OPTIONS: { type: ViewType; label: string; icon: React.ReactNode }[] = [
  {
    type: 'grid',
    label: 'Grid',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="14" height="14" rx="1" />
        <line x1="1" y1="5.5" x2="15" y2="5.5" />
        <line x1="1" y1="10" x2="15" y2="10" />
        <line x1="6" y1="1" x2="6" y2="15" />
        <line x1="11" y1="1" x2="11" y2="15" />
      </svg>
    ),
  },
  {
    type: 'kanban',
    label: 'Kanban',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="4" height="10" rx="1" />
        <rect x="6" y="1" width="4" height="14" rx="1" />
        <rect x="11" y="1" width="4" height="7" rx="1" />
      </svg>
    ),
  },
  {
    type: 'calendar',
    label: 'Calendar',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="2" width="14" height="13" rx="1" />
        <line x1="1" y1="6" x2="15" y2="6" />
        <line x1="4" y1="1" x2="4" y2="3" />
        <line x1="12" y1="1" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    type: 'gallery',
    label: 'Gallery',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    type: 'pivot',
    label: 'Pivot',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="14" height="14" rx="1" />
        <line x1="1" y1="5.5" x2="15" y2="5.5" />
        <line x1="5.5" y1="1" x2="5.5" y2="15" />
        <path d="M8 8l3 3M8 8l3-3" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface ViewSwitcherProps {
  sheetId: string;
}

export function ViewSwitcher({ sheetId }: ViewSwitcherProps) {
  const { viewConfigs, setViewType, setViewConfigPopoverOpen, viewConfigPopoverOpen } = useUIStore();
  const isMobile = useUIStore((s) => s.isMobile);
  const currentView = viewConfigs[sheetId]?.viewType || 'grid';

  return (
    <div className="flex items-center gap-1" data-testid="view-switcher">
      {VIEW_OPTIONS.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => setViewType(sheetId, type)}
          className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded-md transition-colors ${
            currentView === type
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          data-testid={`view-btn-${type}`}
          title={label}
        >
          {icon}
          {!isMobile && <span>{label}</span>}
        </button>
      ))}
      {currentView !== 'grid' && (
        <button
          onClick={() => setViewConfigPopoverOpen(!viewConfigPopoverOpen)}
          className="ml-1 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          data-testid="view-config-btn"
          title="Configure view"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
          </svg>
        </button>
      )}
    </div>
  );
}
