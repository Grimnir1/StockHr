import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  activeFilters: Record<string, any>;
  toggleSidebar: () => void;
  setFilter: (page: string, key: string, value: any) => void;
  clearFilters: (page: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeFilters: {},
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setFilter: (page, key, value) =>
    set((state) => ({
      activeFilters: {
        ...state.activeFilters,
        [page]: {
          ...(state.activeFilters[page] || {}),
          [key]: value,
        },
      },
    })),
  clearFilters: (page) =>
    set((state) => ({
      activeFilters: {
        ...state.activeFilters,
        [page]: {},
      },
    })),
}));
