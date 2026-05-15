import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthEvent } from '@/lib/auth-events';

/**
 * Bridges non-React auth events (from graphql-client / token timer) into
 * react-router navigation, avoiding full page reloads when sessions expire.
 */
export const AuthEventBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    return onAuthEvent((event) => {
      if (event.type === 'logout-redirect') {
        navigate(event.redirectTo, { replace: true });
      }
    });
  }, [navigate]);

  return null;
};
