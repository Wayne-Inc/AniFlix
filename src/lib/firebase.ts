import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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
export const db = getFirestore(app);

// Enable offline persistence so profiles, my list and continue watching work offline
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Firestore persistence failed:", err);
  });

  // Firebase App Check
  const appCheckDisabled = import.meta.env.VITE_DISABLE_APP_CHECK === "true";
  const debugToken = import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN;
  const siteKey = import.meta.env.VITE_APP_CHECK_SITE_KEY;

  if (debugToken || appCheckDisabled) {
    // Debug mode — App Check bypassed using debug token
    console.log("[Firebase App Check] Debug mode — App Check bypassed");
  } else if (siteKey && !appCheckDisabled) {
    // Production — use reCAPTCHA Enterprise
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
      console.log("[Firebase App Check] Initialized");
    } catch (e) {
      console.warn("[Firebase App Check] Initialization failed:", e);
    }
  }
}

export { app };
