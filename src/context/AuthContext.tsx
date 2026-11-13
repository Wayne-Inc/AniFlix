import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { getUserProfiles, ensureUserHasProfile } from "../lib/profiles";
import { setSelectedProfile, clearSelectedProfile } from "../lib/selected-profile";
import { getMyListFromFirestore } from "../lib/my-list-firestore";
import { takeStreamFlixHandoffToken } from "../lib/streamflix-handoff";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  profiles: any[];
  selectedProfile: any | null;
  handoffError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  selectProfile: (profile: any) => void;
  refreshProfiles: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Keys StreamFlix uses to persist its signed-in state and selected profile.
const SF_AUTH_FLAG = "sf:auth";
const SF_SELECTED_SESSION_KEY = "sf:selectedProfile";
const SF_SELECTED_PERSIST_KEY = "sf:selectedProfile:persist";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfileState] = useState<any | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const signInWithGitHub = useCallback(async () => {
    const provider = new GithubAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // User dismissed the GitHub popup — treat as a cancellation, not an error.
      if (error?.code === "auth/popup-closed-by-user") return;

      // The email is already tied to a different provider (email/password or
      // Google). Link the GitHub credential to that existing account so both
      // providers sign into the same profile.
      if (error?.code === "auth/account-exists-with-different-credential") {
        const email = error.customData?.email;
        const credential = GithubAuthProvider.credentialFromError(error);
        if (email && credential) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.includes("password")) {
              throw new Error(
                "An account with this email already exists. Sign in with your email and password first, then link GitHub in Account settings.",
              );
            }
            if (methods.includes("google.com")) {
              throw new Error(
                "An account with this email already exists via Google. Sign in with Google first, then link GitHub in Account settings.",
              );
            }
          } catch (linkedErr) {
            // Re-throw our friendly message; surface anything else verbatim.
            throw linkedErr instanceof Error && linkedErr.message
              ? linkedErr
              : error;
          }
          // No known sign-in method on file — link directly so the GitHub
          // identity is attached to the existing account.
          const existingUser = auth.currentUser;
          if (existingUser) {
            await linkWithCredential(existingUser, credential);
            return;
          }
        }
      }
      throw error;
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    clearSelectedProfile();
    // Also clear StreamFlix flags so both apps are signed out together.
    try {
      localStorage.removeItem(SF_AUTH_FLAG);
      sessionStorage.removeItem(SF_SELECTED_SESSION_KEY);
      localStorage.removeItem(SF_SELECTED_PERSIST_KEY);
    } catch {}
    setProfiles([]);
    setSelectedProfileState(null);
  }, []);

  const selectProfile = useCallback((profile: any) => {
    setSelectedProfileState(profile);
    setSelectedProfile(profile);
  }, []);

  const refreshProfiles = useCallback(async () => {
    if (!user) return;
    try {
      const list = await ensureUserHasProfile(user.uid, user.displayName || user.email?.split("@")[0] || "Profile");
      setProfiles(list);
      // No profile is auto-selected or hardcoded. The user must explicitly
      // pick a profile on the profile page before accessing the app.
    } catch (e) {
      console.warn("Failed to refresh profiles:", e);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    // StreamFlix mints a short-lived Firebase custom token and hands it over in
    // the URL fragment. Consume it exactly once, before the first auth-state
    // callback, so the user lands on AniFlix already signed in.
    const handoffToken = takeStreamFlixHandoffToken();

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (cancelled) return;
      setUser(u);

      if (u) {
        // Shared Firebase project: the same account is valid on both apps.
        await refreshProfiles();
        if (!cancelled) setLoading(false);
      } else {
        setProfiles([]);
        setSelectedProfileState(null);
        clearSelectedProfile();
        // Keep the loading screen up while the handoff sign-in is in flight so
        // the sign-in form never flashes before it completes.
        if (!handoffToken) setLoading(false);
      }
    });

    if (handoffToken) {
      signInWithCustomToken(auth, handoffToken)
        .then(() => {
          try {
            // Keep the shared StreamFlix signed-in flag in sync so signing out
            // of either app clears both.
            localStorage.setItem(SF_AUTH_FLAG, "1");
          } catch {}
        })
        .catch((error) => {
          console.warn("[AniFlix] StreamFlix handoff sign-in failed:", error);
          if (cancelled) return;
          setHandoffError("We couldn't sign you in from StreamFlix. Please sign in below.");
          setLoading(false);
        });
    }

    return () => {
      cancelled = true;
      unsub();
    };
  }, [refreshProfiles]);

  const value = {
    user,
    loading,
    profiles,
    selectedProfile,
    handoffError,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    selectProfile,
    refreshProfiles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
