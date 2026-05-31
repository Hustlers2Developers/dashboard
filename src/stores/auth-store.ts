import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  sub: string;
  email: string;
  systemRole: 'SUPER_ADMIN' | 'USER';
  orgId: string;
}

// accessToken lives only in JS memory — never persisted to localStorage
let _accessToken: string | null = null;
export const getToken = () => _accessToken;
export const setToken = (t: string) => { _accessToken = t; };
export const clearToken = () => { _accessToken = null; };

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  setTokens: (accessToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setSessionLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isSessionLoading: true,
      setTokens: (accessToken) => {
        setToken(accessToken);
        set({ isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        clearToken();
        set({ user: null, isAuthenticated: false });
      },
      setSessionLoading: (loading) => set({ isSessionLoading: loading }),
    }),
    {
      name: 'auth-storage',
      // Persist only user profile — isAuthenticated and token reset on every reload
      partialize: (state) => ({ user: state.user }),
    }
  )
);
