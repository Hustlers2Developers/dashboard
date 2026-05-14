import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation } from '@apollo/client/react';
import { RECORD_DAILY_VISIT } from '@/graphql/mutations/attendance';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const [recordDailyVisit] = useMutation(RECORD_DAILY_VISIT);
  const hasRecorded = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasRecorded.current) {
      hasRecorded.current = true;
      recordDailyVisit().catch(() => {
        // silently ignore — streak update is best-effort
      });
    }
  }, [isAuthenticated, recordDailyVisit]);

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <div key={location.pathname} className="animate-fade-in">{children}</div>;
};
