import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roleToPath } from '../config/routes';

/**
 * Redirect to /login when user is not authenticated.
 * Optionally restrict routes to specific roles.
 * While auth is hydrating (loading=true), render nothing to avoid flicker.
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Issue #11: Strengthen role-based route protection — case-insensitive matching
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role?.toLowerCase();
    const hasAccess = allowedRoles.some(
      (role) => role.toLowerCase() === userRole
    );
    if (!hasAccess) {
      const fallback = roleToPath(user.role);
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
}

/**
 * Redirect to dashboard when user is already authenticated.
 * Uses role-based path, not localStorage (AUTH-005/007).
 *
 * New Google users have a registration grant, not an authenticated session,
 * until they choose a role and acknowledge the notice.
 */
export function PublicRoute({ children }) {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) return null;

  if (isAuthenticated && user?.role) {
    const path = roleToPath(user.role);
    return <Navigate to={path} replace />;
  }

  return children;
}
