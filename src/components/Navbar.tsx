import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Settings, Heart, Film, Tv, TrendingUp, X, ChevronDown, LogOut, LogIn, User as UserIcon, Bookmark } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface NavbarProps {
  user: { displayName?: string | null; email?: string | null; photoURL?: string | null; uid: string } | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
  navigate?: (path: string) => void;
  pathname?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  loading,
  signInWithGoogle,
  signOut,
  navigate = () => {},
  pathname = "/",
}) => {
  const { selectedProfile } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-hide the user menu when the mouse leaves both the trigger button and the menu
  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      const button = buttonRef.current;
      const menu = menuRef.current;
      if (!button || !menu) return;
      if (!button.contains(e.relatedTarget as Node) && !menu.contains(e.relatedTarget as Node)) {
        setShowUserMenu(false);
      }
    },
    []
  );

  const profileName = (selectedProfile?.name ?? user?.displayName) || user?.email?.split("@")[0] || "Profile";
  const profileInitial = profileName.slice(0, 1).toUpperCase();
  const profileAvatar = selectedProfile?.avatarUrl ?? user?.photoURL;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path;
  };

  const activeClass = "text-white bg-white/10 font-semibold shadow-sm";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${
        isScrolled
          ? "bg-[#111115]/95 backdrop-blur-md shadow-2xl border-b border-white/5"
          : "bg-gradient-to-b from-[#0a0a0d]/90 via-[#0a0a0d]/40 to-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 lg:gap-8 shrink-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <span className="font-display text-3xl sm:text-4xl tracking-wider text-[#e50914] drop-shadow-md group-hover:scale-105 transition-transform">
              ANIFLIX
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-sm font-medium">
            <button
              onClick={() => navigate("/")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                isActive("/") ? activeClass : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              Browse All
            </button>
            <button
              onClick={() => navigate("/anime")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                isActive("/anime") ? activeClass : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-red-400" />
              Anime Series
            </button>
            <button
              onClick={() => navigate("/movie")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                isActive("/movie") ? activeClass : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              Movies
            </button>
            <button
              onClick={() => navigate("/trending")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                isActive("/trending") ? activeClass : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Trending
            </button>
            <button
              onClick={() => navigate("/mylist")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                isActive("/mylist") ? activeClass : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-rose-400" />
              My List
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <button
              onClick={() => navigate("/search")}
              className="p-2 text-zinc-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex items-center">
            <button
              ref={buttonRef}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-red-600 transition-all cursor-pointer"
            >
              {profileAvatar ? (
                <img src={profileAvatar} alt={profileName} className="w-8 h-8 rounded-full border border-zinc-700" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow">
                  {profileInitial}
                </div>
              )}
              <ChevronDown className="w-3 h-3 text-zinc-400 hidden sm:block" />
            </button>
            {showUserMenu && (
              <div
                ref={menuRef}
                onMouseLeave={handleMouseLeave}
                className="absolute right-6 mt-20 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl py-5 px-4 z-50"
              >
                <div className="px-3 py-2 flex items-center gap-3 border-b border-zinc-800 mb-2">
                  <div className="w-8 h-8 rounded-full border border-zinc-700 overflow-hidden">
                    {profileAvatar ? (
                      <img src={profileAvatar} alt={profileName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                        {profileInitial}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{profileName}</p>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {selectedProfile?.kids ? "Kids profile" : "Profile"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Choose Profile</span>
                </button>
                <div className="border-t border-zinc-800 my-1"></div>
                {loading ? (
                  <div className="w-full px-3 py-2 text-xs text-zinc-500">
                    {user ? "Signing out…" : "Signing in…"}
                  </div>
                ) : (
                  <button
                    onClick={user ? signOut : signInWithGoogle}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800/80 transition-colors cursor-pointer text-red-400 hover:bg-red-900/20"
                  >
                    {user ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                    <span>{user ? "Sign out" : "Sign in"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden flex items-center justify-around px-2 py-2 bg-zinc-950/90 border-t border-zinc-800 text-xs overflow-x-auto">
          <button
            onClick={() => navigate("/search")}
            className="px-2 py-1 rounded cursor-pointer text-zinc-400 hover:text-white"
          >
            <Search className="w-3 h-3 mb-0.5" />
            <span className="block text-[10px]">Search</span>
          </button>
          <button
            onClick={() => navigate("/")}
            className={`px-2 py-1 rounded cursor-pointer font-bold ${
              isActive("/") ? "text-red-500 bg-red-500/10" : "text-zinc-400"
            }`}
          >
            All
          </button>
          <button
            onClick={() => navigate("/anime")}
            className={`px-2 py-1 rounded cursor-pointer ${
              isActive("/anime") ? "text-red-500 bg-red-500/10" : "text-zinc-400"
            }`}
          >
            Anime TV
          </button>
          <button
            onClick={() => navigate("/movie")}
            className={`px-2 py-1 rounded cursor-pointer ${
              isActive("/movie") ? "text-amber-400 bg-amber-400/10" : "text-zinc-400"
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => navigate("/trending")}
            className={`px-2 py-1 rounded cursor-pointer ${
              isActive("/trending") ? "text-cyan-400 bg-cyan-400/10" : "text-zinc-400"
            }`}
          >
            Top Rated
          </button>
          <button
            onClick={() => navigate("/mylist")}
            className={`px-2 py-1 rounded cursor-pointer ${
              isActive("/mylist") ? "text-rose-400 bg-rose-400/10" : "text-zinc-400"
            }`}
          >
            My List
          </button>
        </div>
      </div>
    </header>
  );
};
