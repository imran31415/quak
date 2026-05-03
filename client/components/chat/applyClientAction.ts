import type { ClientAction } from '@shared/chat';
import { useUIStore, type DashboardConfig, type DashboardWidget } from '../../store/uiStore';

export function applyClientAction(action: ClientAction): void {
  const { setViewType, setViewConfig, getViewConfig } = useUIStore.getState();

  switch (action.kind) {
    case 'set_view': {
      setViewType(action.sheetId, action.viewType);
      return;
    }
    case 'add_dashboard_widget': {
      const existing = getViewConfig(action.sheetId).dashboardConfig;
      const next: DashboardConfig = {
        widgets: [...(existing?.widgets ?? []), action.widget as DashboardWidget],
        columnCount: existing?.columnCount ?? 2,
      };
      setViewConfig(action.sheetId, { dashboardConfig: next });
      return;
    }
    case 'clear_dashboard': {
      const existing = getViewConfig(action.sheetId).dashboardConfig;
      const next: DashboardConfig = {
        widgets: [],
        columnCount: existing?.columnCount ?? 2,
      };
      setViewConfig(action.sheetId, { dashboardConfig: next });
      return;
    }
  }
}
