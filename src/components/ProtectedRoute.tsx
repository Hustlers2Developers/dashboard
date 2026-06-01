import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQuery } from '@apollo/client/react';
import { RECORD_DAILY_VISIT } from '@/graphql/mutations/attendance';
import { CURRENT_USER_QUERY } from '@/graphql/mutations/auth';
import { RedirectLoader } from '@/components/RedirectLoader';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);
  const location = useLocation();
  const [recordDailyVisit] = useMutation(RECORD_DAILY_VISIT);
  const hasRecorded = useRef(false);

  // Refresh current user (incl. systemRole) on every protected mount so
  // sidebar/role-gated UI stays in sync if the persisted user is stale.
  const { data: currentUserData } = useQuery<{ currentUser: { sub: string; email: string; systemRole: 'SUPER_ADMIN' | 'USER'; orgId: string } }>(
    CURRENT_USER_QUERY,
    { skip: !isAuthenticated, fetchPolicy: 'network-only' }
  );

  useEffect(() => {
    if (currentUserData?.currentUser) {
      setUser(currentUserData.currentUser);
    }
  }, [currentUserData, setUser]);

  useEffect(() => {
    if (isAuthenticated && !hasRecorded.current) {
      hasRecorded.current = true;
      recordDailyVisit().catch(() => {
        // silently ignore — streak update is best-effort
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
