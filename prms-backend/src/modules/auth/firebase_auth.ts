import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from '../../config';

let initializedApp: App | null = null;

function getFirebaseApp(): App {
  if (!env.ENABLE_FIREBASE_VERIFY) {
    throw new Error('Firebase verification disabled');
  }

  if (initializedApp) {
    return initializedApp;
  }

  const existing = getApps().find(app => app.name === 'prms-auth');
  if (existing) {
    initializedApp = existing;
    return initializedApp;
  }

  // ID-token verification uses Google's public signing certificates. An explicit
  // project ID avoids requiring a service-account key just to verify sign-in.
  if (!env.FIREBASE_PROJECT_ID && !env.GCP_SA_KEY) throw new Error('Set FIREBASE_PROJECT_ID to enable Google sign-in');
  initializedApp = initializeApp({
    ...(env.FIREBASE_PROJECT_ID ? { projectId: env.FIREBASE_PROJECT_ID } : {}),
    ...(env.GCP_SA_KEY ? { credential: cert(JSON.parse(env.GCP_SA_KEY)) } : {}),
  }, 'prms-auth');

  return initializedApp;
}

export async function verifyFirebaseToken(
  token: string
): Promise<{ uid: string; email: string; name?: string }> {
  const app = getFirebaseApp();

  const decodedToken =
    await getAuth(app).verifyIdToken(token);

  if (!decodedToken.email || decodedToken.email_verified !== true || decodedToken.firebase?.sign_in_provider !== 'google.com') {
    throw new Error('A verified Google email address is required');
  }
  return { uid: decodedToken.uid, email: decodedToken.email.trim().toLowerCase(), ...(typeof decodedToken.name === 'string' ? { name: decodedToken.name } : {}) };
}
