import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewType = 'grid' | 'kanban' | 'calendar' | 'gallery' | 'pivot' | 'form' | 'dashboard';

export type AggregationType = 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';

export type DashboardWidgetType = 'chart' | 'metric' | 'table';

export interface DashboardChartConfig {
  chartType: 'bar' | 'line' | 'pie';
  xColumn: string;
  yColumns: string[];
}

export interface DashboardMetricConfig {
  column: string;
  aggregation: AggregationType;
}

export interface DashboardTableConfig {
  columns: string[];
  limit: number;
}

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  title: string;
  chartConfig?: DashboardChartConfig;
  metricConfig?: DashboardMetricConfig;
  tableConfig?: DashboardTableConfig;
}

export interface DashboardConfig {
  widgets: DashboardWidget[];
  columnCount: 1 | 2 | 3;
}

export interface PivotConfig {
  rowFieldIds: string[];
  columnFieldId: string;
  valueFieldId: string;
  aggregation: AggregationType;
}

export interface SavedFilter {
  id: string;
  name: string;
  filterModel: Record<string, unknown>;
  sortModel?: Array<{ colId: string; sort: string }>;
}

export interface ViewConfig {
  viewType?: ViewType;
  kanbanColumnId?: string;
  calendarColumnId?: string;
  galleryTitleColumnId?: string;
  groupByColumnId?: string;
  pivotConfig?: PivotConfig;
  showTotals?: boolean;
  frozenRowIds?: number[];
  savedFilters?: SavedFilter[];
  dashboardConfig?: DashboardConfig;
}

interface UIState {
  sidebarOpen: boolean;
  queryPanelOpen: boolean;
  chatPanelOpen: boolean;
  isMobile: boolean;
  searchOpen: boolean;
  importDialogOpen: boolean;
  viewConfigs: Record<string, ViewConfig>;
  viewConfigPopoverOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  auditPanelOpen: boolean;
  versionPanelOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleQueryPanel: () => void;
  toggleChatPanel: () => void;
  setChatPanelOpen: (open: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setImportDialogOpen: (open: boolean) => void;
  setViewType: (sheetId: string, viewType: ViewType) => void;
  setViewConfig: (sheetId: string, config: Partial<ViewConfig>) => void;
  getViewConfig: (sheetId: string) => ViewConfig;
  setViewConfigPopoverOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleAuditPanel: () => void;
  toggleVersionPanel: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      queryPanelOpen: false,
      chatPanelOpen: false,
      isMobile: false,
      searchOpen: false,
      importDialogOpen: false,
      viewConfigs: {},
      viewConfigPopoverOpen: false,
      theme: 'system',
      auditPanelOpen: false,
      versionPanelOpen: false,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleQueryPanel: () => set((s) => ({ queryPanelOpen: !s.queryPanelOpen })),
      toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
      setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
      setIsMobile: (mobile) => set({ isMobile: mobile, sidebarOpen: !mobile }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setImportDialogOpen: (open) => set({ importDialogOpen: open }),
      setViewType: (sheetId, viewType) =>
        set((s) => ({
          viewConfigs: {
            ...s.viewConfigs,
            [sheetId]: { ...s.viewConfigs[sheetId], viewType },
          },
        })),
      setViewConfig: (sheetId, config) =>
        set((s) => ({
          viewConfigs: {
            ...s.viewConfigs,
            [sheetId]: { ...s.viewConfigs[sheetId], ...config },
          },
        })),
      getViewConfig: (sheetId) => get().viewConfigs[sheetId] || {},
      setViewConfigPopoverOpen: (open) => set({ viewConfigPopoverOpen: open }),
      setTheme: (theme) => set({ theme }),
      toggleAuditPanel: () => set((s) => ({
        auditPanelOpen: !s.auditPanelOpen,
        versionPanelOpen: !s.auditPanelOpen ? false : s.versionPanelOpen,
      })),
      toggleVersionPanel: () => set((s) => ({
        versionPanelOpen: !s.versionPanelOpen,
        auditPanelOpen: !s.versionPanelOpen ? false : s.auditPanelOpen,
      })),
    }),
    {
      name: 'quak-ui-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        queryPanelOpen: state.queryPanelOpen,
        viewConfigs: state.viewConfigs,
        theme: state.theme,
      }),
    }
  )
);
