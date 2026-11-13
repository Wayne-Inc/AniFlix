import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Settings, Heart, Film, Tv, TrendingUp, X, ChevronDown, LogOut, LogIn, User as UserIcon, Bookmark, Clock, Github, Layout } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface NavbarProps {
  user: { displayName?: string | null; email?: string | null; photoURL?: string | null; uid: string } | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signInWithGitHub: () => void;
  signOut: () => void;
  navigate?: (path: string) => void;
  pathname?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  loading,
  signInWithGoogle,
  signInWithGitHub,
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
    <>
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
            <button
              onClick={() => navigate("/history")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                isActive("/history") ? activeClass : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              History
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
                className="fixed right-4 top-18 z-50 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl py-5 px-4 animate-fade-in"
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
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/settings");
                  }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Account settings</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/history");
                  }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span>Watch History</span>
                </button>
                <div className="border-t border-zinc-800 my-1"></div>
                {loading ? (
                  <div className="w-full px-3 py-2 text-xs text-zinc-500">
                    {user ? "Signing out…" : "Signing in…"}
                  </div>
                ) : user ? (
                  <button
                    onClick={signOut}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800/80 transition-colors cursor-pointer text-red-400 hover:bg-red-900/20"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                ) : (
                  <div className="space-y-1">
                    <button
                      onClick={signInWithGoogle}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800/80 transition-colors cursor-pointer text-zinc-300 hover:bg-white/5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign in with Google</span>
                    </button>
                    <button
                      onClick={signInWithGitHub}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800/80 transition-colors cursor-pointer text-zinc-300 hover:bg-white/5"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Sign in with GitHub</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden w-[92%] max-w-[640px] rounded-2xl bg-[#111115]/80 backdrop-blur-md border border-white/10 shadow-2xl px-3 py-2"
    >
      <div className="flex items-center justify-between text-xs overflow-x-auto">
        <button
          onClick={() => navigate("/")}
          className={`flex flex-col items-center gap-1 px-2 py-1 min-w-0 rounded cursor-pointer transition-colors ${
            isActive("/") ? "text-red-500 bg-red-500/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Layout className="w-4 h-4" />
          <span className="leading-none">All</span>
        </button>
        <button
          onClick={() => navigate("/anime")}
          className={`flex flex-col items-center gap-1 px-2 py-1 min-w-0 rounded cursor-pointer transition-colors ${
            isActive("/anime") ? "text-red-500 bg-red-500/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Tv className="w-4 h-4" />
          <span className="leading-none">Shows</span>
        </button>
        <button
          onClick={() => navigate("/movie")}
          className={`flex flex-col items-center gap-1 px-2 py-1 min-w-0 rounded cursor-pointer transition-colors ${
            isActive("/movie") ? "text-amber-400 bg-amber-400/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Film className="w-4 h-4" />
          <span className="leading-none">Movies</span>
        </button>
        <button
          onClick={() => navigate("/trending")}
          className={`flex flex-col items-center gap-1 px-2 py-1 min-w-0 rounded cursor-pointer transition-colors ${
            isActive("/trending") ? "text-cyan-400 bg-cyan-400/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="leading-none">Trending</span>
        </button>
        <button
          onClick={() => navigate("/mylist")}
          className={`flex flex-col items-center gap-1 px-2 py-1 min-w-0 rounded cursor-pointer transition-colors ${
            isActive("/mylist") ? "text-rose-400 bg-rose-400/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span className="leading-none">My List</span>
        </button>
        <button
          onClick={() => navigate("/history")}
          className={`flex flex-col items-center gap-1 px-2 py-1 min-w-0 rounded cursor-pointer transition-colors ${
            isActive("/history") ? "text-orange-400 bg-orange-400/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="leading-none">History</span>
        </button>
      </div>
    </nav>
    </>
  );
};
