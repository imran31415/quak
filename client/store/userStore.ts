import { create } from 'zustand';

export interface UserInfo {
  id: string;
  displayName: string | null;
  defaultModel: string | null;
  hasApiKey: boolean;
  deviceCount: number;
}

interface UserState {
  user: UserInfo | null;
  loading: boolean;
  error: string | null;

  fetchMe: () => Promise<void>;
  saveSettings: (s: { displayName?: string; openrouterApiKey?: string | null; defaultModel?: string | null }) => Promise<void>;
  clear: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  fetchMe: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as UserInfo;
      set({ user: data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  saveSettings: async (s) => {
    const res = await fetch('/api/me/settings', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    await get().fetchMe();
  },

  clear: () => set({ user: null, error: null }),
}));
