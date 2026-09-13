import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Use backend project ID as fallback
if (!firebaseConfig.apiKey) {
  firebaseConfig.apiKey = 'AIzaSyADZjxJGVjlujpvYVuYli4F-jBPEcb0YBI';
  firebaseConfig.authDomain = 'project-prms-149c6.firebaseapp.com';
  firebaseConfig.projectId = 'project-prms-149c6';
  firebaseConfig.storageBucket = 'project-prms-149c6.firebasestorage.app';
  firebaseConfig.messagingSenderId = '1029166478534';
  firebaseConfig.appId = '1:1029166478534:web:1d2f54a217484e83fc13c7';
  firebaseConfig.measurementId = 'G-M0QPJVZ11N';
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return {
    idToken,
    email: result.user.email,
    displayName: result.user.displayName,
  };
}
