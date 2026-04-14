import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation } from '@apollo/client/react';
import { RECORD_DAILY_VISIT } from '@/graphql/mutations/attendance';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
