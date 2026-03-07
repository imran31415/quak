import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewType = 'grid' | 'kanban' | 'calendar' | 'gallery';

export interface ViewConfig {
  viewType?: ViewType;
  kanbanColumnId?: string;
  calendarColumnId?: string;
  galleryTitleColumnId?: string;
}

interface UIState {
  sidebarOpen: boolean;
  queryPanelOpen: boolean;
  isMobile: boolean;
  searchOpen: boolean;
  importDialogOpen: boolean;
  viewConfigs: Record<string, ViewConfig>;
  viewConfigPopoverOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleQueryPanel: () => void;
  setIsMobile: (mobile: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setImportDialogOpen: (open: boolean) => void;
  setViewType: (sheetId: string, viewType: ViewType) => void;
  setViewConfig: (sheetId: string, config: Partial<ViewConfig>) => void;
  getViewConfig: (sheetId: string) => ViewConfig;
  setViewConfigPopoverOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      queryPanelOpen: false,
      isMobile: false,
      searchOpen: false,
      importDialogOpen: false,
      viewConfigs: {},
      viewConfigPopoverOpen: false,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleQueryPanel: () => set((s) => ({ queryPanelOpen: !s.queryPanelOpen })),
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
    }),
    {
      name: 'quak-ui-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        queryPanelOpen: state.queryPanelOpen,
        viewConfigs: state.viewConfigs,
      }),
    }
  )
);
