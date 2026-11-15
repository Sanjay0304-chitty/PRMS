import helmet from 'helmet';

/** Allow the configured Firebase sign-in flow while retaining Helmet defaults. */
export function createWebSecurity(authDomain: string) {
  const origin = new URL(`https://${authDomain}`);
  if (origin.hostname !== authDomain || origin.port || origin.pathname !== '/' || origin.username || origin.password) {
    throw new Error('FIREBASE_AUTH_DOMAIN must be a hostname without a scheme or path.');
  }
  return helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", 'https://apis.google.com'],
        connectSrc: ["'self'", origin.origin, 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://www.googleapis.com'],
        frameSrc: ["'self'", origin.origin, 'https://accounts.google.com', 'https://www.google.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://*.googleusercontent.com'],
        mediaSrc: ["'self'", 'blob:'],
      },
    },
  });
}
