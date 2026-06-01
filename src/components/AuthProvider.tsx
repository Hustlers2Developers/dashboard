import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const REFRESH_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const hydrate = useAuthStore((s) => s.hydrate);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const refresh = useAuthStore((s) => s.refresh);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydratedRef = useRef(false);

  // Hydrate once on mount
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate();
  }, [hydrate]);

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
