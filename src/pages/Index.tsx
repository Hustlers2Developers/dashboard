import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

const Index = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

export default Index;
