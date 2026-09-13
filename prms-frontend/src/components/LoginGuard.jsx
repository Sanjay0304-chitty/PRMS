import { Navigate } from 'react-router-dom';
import { useRegistration } from '../contexts/RegistrationContext';

/**
 * Security gate for /login.
 * If pendingRegistration is true (user started registration but hasn't
 * completed it), redirect them back to /role-selection so they cannot
 * skip the role-selection step and bypass the data-injection guard.
 *
 * Returning users with no pending registration pass through to login.
 */
function LoginGuard({ children }) {
  const { pendingRegistration } = useRegistration();

  if (pendingRegistration) {
    return <Navigate to="/role-selection" replace />;
  }

  return children;
}

export default LoginGuard;
