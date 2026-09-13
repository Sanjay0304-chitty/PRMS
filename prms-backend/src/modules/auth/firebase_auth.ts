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

  if (!env.GCP_SA_KEY) {
    throw new Error(
      'GCP_SA_KEY is required when ENABLE_FIREBASE_VERIFY=true'
    );
  }

  if (getApps().length > 0) {
    initializedApp = getApps()[0];
    return initializedApp;
  }

  initializedApp = initializeApp({
    credential: cert(
      JSON.parse(env.GCP_SA_KEY)
    ),
  });

  return initializedApp;
}

export async function verifyFirebaseToken(
  token: string
): Promise<string> {
  const app = getFirebaseApp();

  const decodedToken =
    await getAuth(app).verifyIdToken(token);

  return decodedToken.uid;
}