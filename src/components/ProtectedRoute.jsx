import { useAuth } from '../contexts/AuthContext';
import AccessDenied from '../pages/AccessDenied';

export default function ProtectedRoute({ path, children }) {
  const { hasAccess, loading } = useAuth();

  if (loading) return null;

  if (!hasAccess(path)) {
    return <AccessDenied />;
  }

  return children;
}
