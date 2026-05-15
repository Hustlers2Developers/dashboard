import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { RedirectLoader } from '@/components/RedirectLoader';

const Index = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const target = isAuthenticated ? '/dashboard' : '/login';
  return (
    <>
      <RedirectLoader message="Loading..." />
      <Navigate to={target} replace />
    </>
  );
};

export default Index;
