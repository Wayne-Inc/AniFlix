import React, { useState, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { HomePage } from "@/routes/index";
import { AnimePage } from "@/routes/anime";
import { MoviePage } from "@/routes/movie";
import { MyListPage } from "@/routes/mylist";
import { TrendingPage } from "@/routes/trending";
import { SearchPage } from "@/routes/search";
import { DetailPage } from "@/routes/detail/[id]";
import { WatchPage } from "@/routes/watch/[id]";
import { ProfilePage } from "@/routes/profile";
import { getSelectedProfile } from "@/lib/selected-profile";

// One client for the lifetime of the app. Creating it inside the component body
// would discard the query cache on every render of <App />.
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppInner() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, loading, handoffError } = useAuth();
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Every hook used by this component is declared above this point. Hooks must
  // never be called after a conditional return: the auth state flips from
  // loading to signed-out to signed-in, so the number of hooks would change
  // between renders and React would throw error #310 ("Rendered more hooks
  // than during the previous render"). Screen-specific state lives in the
  // screen components below instead.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111115]">
        <h1 className="text-xl font-semibold text-white">Signing in…</h1>
      </div>
    );
  }

  // Auth gate: do not allow access unless the user is signed in.
  if (!user) {
    return (
      <AuthScreen
        signInWithGoogle={signInWithGoogle}
        signInWithEmail={signInWithEmail}
        signUpWithEmail={signUpWithEmail}
        handoffError={handoffError}
      />
    );
  }

  // Require an explicit profile choice before accessing the app.
  // No profile is auto-selected / hardcoded — the user must pick one.
  if (!getSelectedProfile()) {
    return <ProfilePage />;
  }

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(path);
  };

  const getPage = (path: string) => {
    if (path === "/") return <HomePage />;
    if (path === "/anime") return <AnimePage />;
    if (path === "/movie") return <MoviePage />;
    if (path === "/mylist") return <MyListPage />;
    if (path === "/trending") return <TrendingPage />;
    if (path === "/search") return <SearchPage />;
    if (path.startsWith("/detail/")) return <DetailPage />;
    if (path.startsWith("/watch/")) return <WatchPage />;
    if (path === "/profile") return <ProfilePage />;
    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#111115] text-[#e5e5e5] font-sans antialiased pt-20">
      <Toaster />
      <Navbar user={user} loading={loading} signInWithGoogle={signInWithGoogle} signOut={signOut} navigate={navigate} pathname={pathname} />
      <main className="flex-1">{getPage(pathname)}</main>
      <Footer />
    </div>
  );
}

type AuthScreenProps = {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  handoffError?: string | null;
};

function AuthScreen({ signInWithGoogle, signInWithEmail, signUpWithEmail, handoffError }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(handoffError ?? "");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName || undefined);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111115] text-white p-6">
      <h1 className="text-3xl font-bold text-[#e50914] mb-2">AniFlix</h1>
      <p className="text-zinc-400 mb-8">You must be signed in to continue.</p>
      {error && (
        <p className="text-red-400 text-sm mb-6">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          required
        />
        {isSignUp ? (
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        ) : null}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          required
        />
        <button
          type="submit"
          className="w-full px-6 py-3 rounded-lg bg-[#e50914] text-white font-bold hover:bg-red-700 transition-colors"
        >
          {isSignUp ? "Create account" : "Sign in"}
        </button>
        <p className="text-xs text-zinc-400 text-center">
          {isSignUp
            ? "Already have an account? "
            : "Don't have an account? "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-red-400 hover:underline cursor-pointer"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
        <hr className="my-6 w-full border-zinc-800" />
        <p className="text-xs text-zinc-500 text-center mb-4">Or continue with</p>
        <button
          onClick={signInWithGoogle}
          className="w-full px-6 py-3 rounded-lg bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-colors"
        >
          Sign in with Google
        </button>
      </form>
    </div>
  );
}
