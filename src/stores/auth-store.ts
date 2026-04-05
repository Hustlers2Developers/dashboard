import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startTokenRefreshTimer, stopTokenRefreshTimer } from '@/lib/graphql-client';

interface User {
  sub: string;
  email: string;
  systemRole: 'SUPER_ADMIN' | 'USER';
  orgId: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
        startTokenRefreshTimer();
      },
      setUser: (user) => set({ user }),
      logout: () => {
        stopTokenRefreshTimer();
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
      },
      initialize: () => {
        const state = get();
        if (state.accessToken && state.refreshToken) {
          startTokenRefreshTimer();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
