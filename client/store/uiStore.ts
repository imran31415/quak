import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  queryPanelOpen: boolean;
  isMobile: boolean;
  searchOpen: boolean;
  importDialogOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleQueryPanel: () => void;
  setIsMobile: (mobile: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setImportDialogOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      queryPanelOpen: false,
      isMobile: false,
      searchOpen: false,
      importDialogOpen: false,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleQueryPanel: () => set((s) => ({ queryPanelOpen: !s.queryPanelOpen })),
      setIsMobile: (mobile) => set({ isMobile: mobile, sidebarOpen: !mobile }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setImportDialogOpen: (open) => set({ importDialogOpen: open }),
    }),
    {
      name: 'quak-ui-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        queryPanelOpen: state.queryPanelOpen,
      }),
    }
  )
);
