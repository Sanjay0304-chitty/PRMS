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
  if (allowedRoles && allowedRoles.length > 0 && user?.role) {
    const userRole = user.role.toLowerCase();
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
 * Exception: a brand-new Google sign-in is authenticated immediately, with
 * a placeholder Tenant role, before the user has picked their real role on
 * /role-selection (see AuthContext.googleLogin's isNewUser handling). That
 * page sets prmsOnboarding='true' right before navigating here; without this
 * check, this guard fired first and bounced every new Google user straight
 * to /tenant before they could ever see the role picker.
 */
export function PublicRoute({ children }) {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) return null;

  const isGoogleOnboarding = localStorage.getItem('prmsOnboarding') === 'true';

  if (isAuthenticated && user?.role && !isGoogleOnboarding) {
    const path = roleToPath(user.role);
    return <Navigate to={path} replace />;
  }

  return children;
}
