import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQuery } from '@apollo/client/react';
import { RECORD_DAILY_VISIT } from '@/graphql/mutations/attendance';
import { CURRENT_USER_QUERY } from '@/graphql/mutations/auth';
import { RedirectLoader } from '@/components/RedirectLoader';

// Module-level (not a ref) because ProtectedRoute remounts on every route
// change — each <Route> in App.tsx wraps its own <ProtectedRoute> instance,
// so a useRef guard reset to false on every navigation and fired this
// DB-backed mutation on every single page visit instead of once per tab.
let dailyVisitRecordedThisSession = false;

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);
  const location = useLocation();
  const [recordDailyVisit] = useMutation(RECORD_DAILY_VISIT);

  // Refresh current user (incl. systemRole) so sidebar/role-gated UI stays in
  // sync if the persisted user is stale. This component remounts on every
  // route change (each <Route> wraps its own <ProtectedRoute>), so
  // 'network-only' here was firing a DB-backed query on every single page
  // navigation — a major source of constant compute load. Apollo's default
  // cache-first policy still refetches once per unique query the first time
  // it's seen this session, then serves cache on subsequent navigations.
  const { data: currentUserData } = useQuery<{ currentUser: { sub: string; email: string; systemRole: 'SUPER_ADMIN' | 'USER'; orgId: string } }>(
    CURRENT_USER_QUERY,
    { skip: !isAuthenticated }
  );

  useEffect(() => {
    if (currentUserData?.currentUser) {
      setUser(currentUserData.currentUser);
    }
  }, [currentUserData, setUser]);

  useEffect(() => {
    if (isAuthenticated && !dailyVisitRecordedThisSession) {
      dailyVisitRecordedThisSession = true;
      recordDailyVisit().catch(() => {
        // Reset so a transient failure (e.g. a dropped request) doesn't
        // permanently block this tab's daily-visit record for the rest of
        // the session — streak update is best-effort either way.
        dailyVisitRecordedThisSession = false;
      });
    }
  }, [isAuthenticated, recordDailyVisit]);

  if (loading) {
    return <RedirectLoader message="Restoring session..." />;
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return (
      <>
        <RedirectLoader message="Please sign in to continue..." />
        <Navigate to={`/login?redirect=${redirect}`} replace />
      </>
    );
  }

  return <div key={location.pathname} className="animate-fade-in">{children}</div>;
};
