
/**
 * Returning users must be able to sign in even after starting registration.
 * Registration role selection remains enforced on the registration route.
 */
function LoginGuard({ children }) {
  return children;
}

export default LoginGuard;
