import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { onAuthEvent } from '@/lib/auth-events';
import { RedirectLoader } from '@/components/RedirectLoader';

/**
 * Bridges non-React auth events (from graphql-client / token timer) into
 * react-router navigation, avoiding full page reloads when sessions expire.
 * Shows a transient loading overlay during the redirect to prevent flashes.
 */
export const AuthEventBridge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState<string | null>(null);

  useEffect(() => {
    return onAuthEvent((event) => {
      if (event.type === 'logout-redirect') {
        setRedirecting('Session expired. Redirecting to sign in...');
        navigate(event.redirectTo, { replace: true });
      } else if (event.type === 'session-expired') {
        // Fired when a silent refresh fails while already on a public route
        // (e.g. a stale /login tab) — no redirect needed, but the user
        // should still know why, e.g. if a stale form submit just failed.
        toast.error('Your session has expired. Please sign in again.');
      }
    });
  }, [navigate]);

  // Clear the loader once navigation completes (location changed to target).
  useEffect(() => {
    if (!redirecting) return;
    const timer = setTimeout(() => setRedirecting(null), 400);
    return () => clearTimeout(timer);
  }, [location.pathname, redirecting]);

  return redirecting ? <RedirectLoader message={redirecting} /> : null;
};
