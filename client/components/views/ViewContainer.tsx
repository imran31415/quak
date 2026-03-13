import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import { SpreadsheetGrid } from '../grid/SpreadsheetGrid';
import { ViewSwitcher } from './ViewSwitcher';
import { ViewConfigPopover } from './ViewConfigPopover';
import { KanbanView } from './KanbanView';
import { CalendarView } from './CalendarView';
import { GalleryView } from './GalleryView';
import { PivotView } from './PivotView';
import { FormView } from './FormView';

export function ViewContainer() {
  const activeSheetId = useSheetStore((s) => s.activeSheetId);
  const viewConfigs = useUIStore((s) => s.viewConfigs);
  const viewConfigPopoverOpen = useUIStore((s) => s.viewConfigPopoverOpen);

  if (!activeSheetId) {
    return <SpreadsheetGrid />;
  }

  const currentView = viewConfigs[activeSheetId]?.viewType || 'grid';

  return (
    <div className="flex flex-col h-full" data-testid="view-container">
      <div className="flex items-center px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <ViewSwitcher sheetId={activeSheetId} />
        {viewConfigPopoverOpen && currentView !== 'grid' && (
          <ViewConfigPopover sheetId={activeSheetId} viewType={currentView} />
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {currentView === 'grid' && <SpreadsheetGrid />}
        {currentView === 'kanban' && <KanbanView />}
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'gallery' && <GalleryView />}
        {currentView === 'pivot' && <PivotView />}
        {currentView === 'form' && <FormView />}
      </div>
    </div>
  );
}
