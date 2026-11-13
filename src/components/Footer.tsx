import { navigate } from "@/lib/navigation";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Anime Series", href: "/anime" },
  { label: "Movies", href: "/movie" },
  { label: "Trending", href: "/trending" },
  { label: "Watchlist", href: "/mylist" },
];

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800/80 bg-[#0d0d10] py-8 px-4 sm:px-6 lg:px-8 text-xs text-zinc-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl text-[#e50914] tracking-wider">ANIFLIX</span>
          <span className="text-zinc-600">·</span>
          <span>StreamFlix Anime Edition</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-zinc-400">
          {LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => {
                // Keep modifier clicks (new tab/window) as real link behaviour.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                navigate(href);
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
