import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { RedirectLoader } from '@/components/RedirectLoader';

const Index = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);

  // Wait for the silent session-restore to settle before deciding where to
  // go — otherwise a logged-in user refreshing at "/" briefly redirects to
  // /login before bouncing back once the refresh token resolves.
  if (loading) {
    return <RedirectLoader message="Loading..." />;
  }

  const target = isAuthenticated ? '/dashboard' : '/login';
  return (
    <>
      <RedirectLoader message="Loading..." />
      <Navigate to={target} replace />
    </>
  );
};

export default Index;
