import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { readCookieToken } from '@/lib/auth/token-manager';

// Access tokens are valid for 15 minutes. Refreshing every 4 minutes was
// firing a DB-backed mutation ~15x/hour per open tab even when idle, which
// keeps the Neon endpoint awake continuously and burns compute time fast on
// a free-tier compute-hours budget. 12 minutes still leaves a safe margin
// before the 15-minute expiry while cutting refresh frequency ~3x.
const REFRESH_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const hydrate = useAuthStore((s) => s.hydrate);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const refresh = useAuthStore((s) => s.refresh);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setSessionLoading = useAuthStore((s) => s.setSessionLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydratedRef = useRef(false);

  // Hydrate once on mount — but only after zustand/persist has finished
  // restoring the persisted `user` from localStorage. Both persist's own
  // rehydration and our silent-refresh hydrate() write to this store
  // asynchronously; persist's rehydration does a full-state `set(..., true)`,
  // which could otherwise land after hydrate() and clobber isAuthenticated.
  // Waiting for persist first removes that race.
  //
  // The mobile app's webview can hand off an already-logged-in session two
  // ways: opening the dashboard with ?token=<accessToken> on the URL, or
  // (what the app actually does) writing a gd_token cookie into the
  // webview's cookie jar before navigating to a plain URL. Either one wins
  // over the normal cookie-refresh flow and skips straight past the login
  // screen. A URL token is stripped immediately so it never lingers in
  // history or gets reprocessed on a later navigation.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const url = new URL(window.location.href);
    const handoffToken = url.searchParams.get('token') || readCookieToken();
    if (handoffToken) {
      if (url.searchParams.has('token')) {
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
      setTokens(handoffToken);
      setSessionLoading(false);
      return;
    }

    if (useAuthStore.persist.hasHydrated()) {
      hydrate();
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        unsub();
        hydrate();
      });
    }
  }, [hydrate, setTokens, setSessionLoading]);

  // Fetch user profile whenever auth becomes true
  useEffect(() => {
    if (isAuthenticated) fetchCurrentUser();
  }, [isAuthenticated, fetchCurrentUser]);

  // Auto-refresh token every 4 minutes while authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, refresh]);

  return <>{children}</>;
};
