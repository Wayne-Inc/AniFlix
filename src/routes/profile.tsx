import { Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { navigate } from "@/lib/navigation";
import {
  ensureUserHasProfile,
  profileToSelected,
  type Profile,
} from "@/lib/profiles";

const COLORS = [
  "from-rose-500 to-red-700",
  "from-sky-500 to-indigo-700",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-violet-500 to-purple-700",
  "from-pink-500 to-rose-700",
  "from-cyan-500 to-blue-700",
  "from-lime-400 to-green-600",
];

export function ProfilePage() {
  const { user, profiles, selectProfile } = useAuth();

  useEffect(() => {
    if (!user) return;
    ensureUserHasProfile(user.uid, user.displayName || user.email?.split("@")[0] || "Profile");
  }, [user]);

  const choose = (p: Profile) => {
    selectProfile(profileToSelected(p));
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#111115]">
      <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background">
        <header className="absolute inset-x-0 top-0 px-4 sm:px-12 py-5 z-10 flex items-center justify-between">
          <div className="font-display text-2xl text-[#e50914] tracking-wider">ANIFLIX</div>
        </header>
        <div className="relative z-20 w-full max-w-4xl px-4 text-center">
          <h1 className="text-3xl font-medium sm:text-5xl">Who's watching?</h1>

          {profiles === null ? (
            <div className="mt-20 text-center text-zinc-400">Loading profiles...</div>
          ) : (
            <ul className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-8">
              {profiles.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => choose(p)}
                    className="group flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                  >
                    <div
                      className={`relative size-28 overflow-hidden rounded-lg transition-all duration-200 sm:size-32 ${p.avatarUrl ? "" : `bg-gradient-to-br ${p.color}`} group-hover:shadow-xl group-hover:ring-2 group-hover:ring-red-500/40`}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-2xl font-black text-white/90 sm:text-5xl">
                          {p.name[0]?.toUpperCase()}
                        </span>
                      )}
                      {p.pinHash && (
                        <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full bg-black/70 text-foreground ring-1 ring-zinc-800 sm:size-6" title="Locked profile">
                          <Lock className="size-3 sm:size-3.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground transition-colors group-hover:text-foreground">
                      {p.name}{" "}
                      {p.kids && (
                        <span className="ml-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                          Kids
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
