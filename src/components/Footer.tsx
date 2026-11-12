export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800/80 bg-[#0d0d10] py-8 px-4 sm:px-6 lg:px-8 text-xs text-zinc-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl text-[#e50914] tracking-wider">ANIFLIX</span>
          <span className="text-zinc-600">·</span>
          <span>StreamFlix Anime Edition</span>
        </div>
        <div className="flex items-center gap-6 text-zinc-400">
          <a href="/" className="hover:text-white transition-colors cursor-pointer">
            Home
          </a>
          <a href="/anime" className="hover:text-white transition-colors cursor-pointer">
            Anime Series
          </a>
          <a href="/movie" className="hover:text-white transition-colors cursor-pointer">
            Movies
          </a>
          <a href="/trending" className="hover:text-white transition-colors cursor-pointer">
            Trending
          </a>
          <a href="/mylist" className="hover:text-white transition-colors cursor-pointer">
            Watchlist
          </a>
        </div>
      </div>
    </footer>
  );
};
