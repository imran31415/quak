import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  queryPanelOpen: boolean;
  isMobile: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleQueryPanel: () => void;
  setIsMobile: (mobile: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  queryPanelOpen: false,
  isMobile: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleQueryPanel: () => set((s) => ({ queryPanelOpen: !s.queryPanelOpen })),
  setIsMobile: (mobile) => set({ isMobile: mobile, sidebarOpen: !mobile }),
}));
