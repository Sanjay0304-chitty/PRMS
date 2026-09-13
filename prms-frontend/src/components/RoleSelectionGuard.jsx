import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRegistration } from '../contexts/RegistrationContext';

/**
 * Guard component that ensures a role has been selected before
 * allowing access to the registration page.
 *
 * - If no role is selected AND the user is not authenticated, redirect to /role-selection.
 * - If a role exists in sessionStorage (pending registration) OR user is authenticated, render children.
 */
export default function RoleSelectionGuard({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const { selectedRole } = useRegistration();

  if (loading) return null;

  /* Allow if already logged in or a role was already chosen */
  if (isAuthenticated || selectedRole) {
    return children;
  }

  return <Navigate to="/role-selection" replace />;
}
