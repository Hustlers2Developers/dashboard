import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAccessToken, setAccessToken, clearToken } from '@/lib/auth/token-manager';
import { authService, AuthUser } from '@/services/auth.service';

// Re-export token helpers so existing imports in graphql-client keep working
export { getAccessToken as getToken, setAccessToken as setToken, clearToken };

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  sendLoginOtp: (email: string) => Promise<void>;
  loginWithOtp: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  fetchCurrentUser: () => Promise<void>;
  setTokens: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  /** @deprecated use loading */
  isSessionLoading: boolean;
  setSessionLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      loading: true,
      // legacy alias
      get isSessionLoading() { return (this as AuthState).loading; },
      setSessionLoading: (v) => set({ loading: v }),

      setTokens: (accessToken) => {
        setAccessToken(accessToken);
        set({ isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      hydrate: async () => {
        try {
          const newToken = await authService.refreshTokens();
          setAccessToken(newToken);
          set({ isAuthenticated: true });
        } catch {
          set({ isAuthenticated: false });
        } finally {
          set({ loading: false });
        }
      },

      login: async (email, password) => {
        await authService.login(email, password);
        set({ isAuthenticated: true });
      },

      sendLoginOtp: async (email) => {
        await authService.sendLoginOtp(email);
      },

      loginWithOtp: async (email, otp) => {
        await authService.loginWithOtp(email, otp);
        set({ isAuthenticated: true });
      },

      logout: async () => {
        try {
          await authService.logout();
        } finally {
          clearToken();
          set({ user: null, isAuthenticated: false });
        }
      },

      refresh: async () => {
        try {
          const token = await authService.refreshTokens();
          set({ isAuthenticated: true });
          return token;
        } catch {
          clearToken();
          set({ user: null, isAuthenticated: false });
          return null;
        }
      },

      fetchCurrentUser: async () => {
        try {
          const user = await authService.getCurrentUser();
          set({ user });
        } catch {
          // silently ignore — user info is best-effort
        }
      },
    }),
    {
      name: 'auth-storage',
      // Persist only user profile — isAuthenticated and token reset on every reload
      partialize: (state) => ({ user: state.user }),
    }
  )
);
