import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// Firebase config – uses the same Firebase project as StreamFlix so both apps
// share accounts, profiles, and watch data. Configure via .env.local VITE_FIREBASE_* vars.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// Enable offline persistence so profiles, my list and continue watching work
// offline. `enableIndexedDbPersistence()` is deprecated in Firestore 13, so the
// cache is configured at initialization time instead.
function createFirestore() {
  if (typeof window === "undefined") {
    // No IndexedDB outside the browser — fall back to the default in-memory cache.
    return getFirestore(app);
  }

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    // Already initialized (e.g. this module re-running under Vite HMR) — reuse it.
    console.warn("[Firestore] Persistence setup skipped:", e);
    return getFirestore(app);
  }
}

export const db = createFirestore();

if (typeof window !== "undefined") {
  // Firebase App Check — always enforced via reCAPTCHA Enterprise. There is no
  // bypass path: if the site key is missing, App Check is simply not
  // initialized and the failure is surfaced loudly rather than disabled.
  const siteKey = import.meta.env.VITE_APP_CHECK_SITE_KEY;

  if (!siteKey) {
    console.error(
      "[Firebase App Check] VITE_APP_CHECK_SITE_KEY is not set — App Check is NOT enforced.",
    );
  } else {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.error("[Firebase App Check] Initialization failed:", e);
    }
  }
}

export { app };
