/**
 * User-friendly error messages for authentication and other error states.
 * Centralized so both backend service throws and frontend display stay in sync.
 */

/* ------ Authentication Error Codes ------ */
// Each code has a unique string so the frontend can map it without ambiguity.

export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  FIREBASE_ACCOUNT: 'AUTH_FIREBASE_ACCOUNT',
  EMAIL_REGISTERED: 'AUTH_EMAIL_REGISTERED',
  REFRESH_TOKEN_MISSING: 'AUTH_REFRESH_TOKEN_MISSING',
  REFRESH_TOKEN_INVALID: 'AUTH_REFRESH_TOKEN_INVALID',
  PASSWORD_REQUIRED: 'AUTH_PASSWORD_REQUIRED',
  CURRENT_PASSWORD_WRONG: 'AUTH_CURRENT_PASSWORD_WRONG',
  GOOGLE_ACCOUNT_LINKED: 'AUTH_GOOGLE_LINKED',
};

/* ------ User-Friendly Messages ------ */
// These are the strings shown to end users on the Login / Register pages.

export const AuthErrorMessage = {
  [AuthErrorCode.INVALID_CREDENTIALS]:
    'Wrong email or password. Please check and try again.',
  [AuthErrorCode.ACCOUNT_SUSPENDED]:
    'Your account is currently suspended. Contact support to reactivate it.',
  [AuthErrorCode.FIREBASE_ACCOUNT]:
    'This account uses Google sign-in. Please log in with Google instead.',
  [AuthErrorCode.EMAIL_REGISTERED]:
    'An account with this email already exists. Try signing in, or use a different email.',
  [AuthErrorCode.REFRESH_TOKEN_MISSING]:
    'Session expired. Please log in again.',
  [AuthErrorCode.REFRESH_TOKEN_INVALID]:
    'Session expired. Please log in again.',
  [AuthErrorCode.PASSWORD_REQUIRED]:
    'A password-based account is required to change your password.',
  [AuthErrorCode.CURRENT_PASSWORD_WRONG]:
    'The current password you entered is incorrect. Try again.',
  [AuthErrorCode.GOOGLE_ACCOUNT_LINKED]:
    'This Google account is already linked to another user.',
};

/* ------ Generic Fallbacks ------ */

export const GenericErrorMessage = {
  NETWORK: 'Unable to reach the server. Check your connection and try again.',
  SERVER: 'Something went wrong on our end. Please try again later.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};
