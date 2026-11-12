import { ArrowLeft, Settings, Loader, Minimize2, ShieldOff, CheckCircle2, Circle, Share2 } from "lucide-react";
import { AnimeItem } from "@/types/anime";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { markWatched, isWatched } from "@/lib/continue-watching-firestore";
import { toast } from "sonner";

interface EmbedServer {
  id: string;
  name: string;
  isFrench: boolean;
  urls: {
    movie: string;
    tv: string;
  };
}

const availableEmbedServers: EmbedServer[] = [
  { id: "vidrift", name: "Vidrift", isFrench: false, urls: { movie: "https://embed.vidrift.net/embed/movie/{id}?color=#DF2225", tv: "https://embed.vidrift.net/embed/tv/{id}/{season}/{episode}?color=#DF2225" } },
  { id: "vidy", name: "Vidy", isFrench: false, urls: { movie: "https://vidy.st/movie/{id}?color=DF2225", tv: "https://vidy.st/tv/{id}/{season}/{episode}?color=DF2225" } },
  { id: "vsembed", name: "VSEmbed", isFrench: false, urls: { movie: "https://vsembed.su/embed/movie/{id}", tv: "https://vsembed.su/embed/tv/{id}/{season}/{episode}" } },
  { id: "2embed", name: "2Embed", isFrench: false, urls: { movie: "https://www.2embed.cc/embed/{id}", tv: "https://www.2embed.cc/embedtv/{id}&s={season}&e={episode}" } },
  { id: "multiembed", name: "MultiEmbed", isFrench: false, urls: { movie: "https://multiembed.mov/?video_id={id}&tmdb=1", tv: "https://multiembed.mov/?video_id={id}&tmdb=1&s={season}&e={episode}" } },
  { id: "videasy", name: "VidEasy", isFrench: false, urls: { movie: "https://videasy.xyz/embed/movie/{id}?theme=#DF2225", tv: "https://videasy.xyz/embed/tv/{id}/{season}/{episode}?theme=#DF2225" } },
];

const embedHostnames = new Set(
  availableEmbedServers.map((server) => {
    try {
      return new URL(server.urls.movie).hostname;
    } catch {
      return server.urls.movie;
    }
  }),
);

function buildEmbedUrl(serverId: string, movieId: string, isTv: boolean, season?: number, episode?: number) {
  const server = availableEmbedServers.find((item) => item.id === serverId) ?? availableEmbedServers[0];
  const tmdbId = String(movieId);
  const template = isTv ? server.urls.tv : server.urls.movie;
  return template
    .replace("{id}", tmdbId)
    .replace("{season}", String(season ?? 1))
    .replace("{episode}", String(episode ?? 1));
}

function isEmbedUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return embedHostnames.has(hostname);
  } catch {
    return false;
  }
}

export function WatchPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const id = window.location.pathname.split("/").pop() || "";
  const [selectedServerId, setSelectedServerId] = useState<string>(() => {
    if (typeof window === "undefined") return "vidrift";
    try {
      const savedId = localStorage.getItem("aniflix:embedServer");
      return availableEmbedServers.some((s) => s.id === savedId) ? savedId! : "vidrift";
    } catch {
      return "vidrift";
    }
  });
  const selectedServer = availableEmbedServers.find((s) => s.id === selectedServerId) ?? availableEmbedServers[0];

  const [videoUrl, setVideoUrl] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [embedSyncSupported, setEmbedSyncSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [ended, setEnded] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [isWatchedState, setIsWatchedState] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  const lastTimeUpdateRef = useRef(0);

  const urlParams = new URLSearchParams(window.location.search);
  const contentType = urlParams.get("type"); // "anime" | "movie"
  const season = urlParams.get("s") ? parseInt(urlParams.get("s")!, 10) : undefined;
  const episode = urlParams.get("e") ? parseInt(urlParams.get("e")!, 10) : undefined;
  const isTv = contentType === "anime";

  const handleServerSelect = useCallback((id: string) => {
    setSelectedServerId(id);
    try { localStorage.setItem("aniflix:embedServer", id); } catch {}
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const wake = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (!showSettings) {
      hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
    }
  }, [showSettings]);

  useEffect(() => {
    wake();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [wake]);

  useEffect(() => {
    const url = buildEmbedUrl(selectedServerId, id, isTv, season, episode);
    setVideoUrl(url);
    setEmbedSyncSupported(false);
  }, [selectedServerId, id, isTv]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data as any;
      if (!data?.type) return;
      if (data.type === "ANIFLIX_EMBED_READY") {
        setEmbedSyncSupported(true);
        return;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [id]);

  useEffect(() => {
    const checkPip = async () => {
      const supports = !!document.createElement("video").requestPictureInPicture;
      setPipSupported(supports);
    };
    checkPip();
  }, []);

  useEffect(() => {
    if (!id) return;
    isWatched({ id: parseInt(id, 10), tmdbId: parseInt(id, 10), title: "", type: "anime", overview: "", backdropPath: "", posterPath: "", voteAverage: 0, voteCount: 0, genres: [], matchScore: 0 }).then(setIsWatchedState);
  }, [id]);

  const toggleWatched = async () => {
    setIsWatchedState((prev) => !prev);
    if (!id) return;
    await markWatched({ id: parseInt(id, 10), tmdbId: parseInt(id, 10), title: "", type: "anime", overview: "", backdropPath: "", posterPath: "", voteAverage: 0, voteCount: 0, genres: [], matchScore: 0 });
  };

  const handleShare = async () => {
    const shareData = {
      title: "Anime on AniFlix",
      text: "Check out this anime on AniFlix",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
      } catch {}
    }
  };

  if (!videoUrl) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white">
        <p className="text-zinc-400">Loading player...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden bg-black select-none"
      onMouseMove={wake}
      onTouchEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        wake();
      }}
    >
      {isEmbedUrl(videoUrl) ? (
        <iframe
          ref={iframeRef}
          src={videoUrl}
          title={`Embed Player`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          className="size-full border-0"
        />
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          poster=""
          className="size-full object-contain"
        />
      )}
      {!showControls && (
        <button type="button" onClick={wake} className="absolute inset-0 z-10 bg-transparent" aria-hidden="true" />
      )}
      <div className={`absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black via-black/60 to-transparent pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] transition-opacity duration-300 ${showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="flex flex-col gap-2 px-2 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="group/topbtn rounded-lg transition-colors duration-200 hover:bg-white/10 hover:backdrop-blur-sm -ml-1 sm:-ml-2 px-1 sm:px-2 py-2 sm:py-1">
              <button onClick={goBack} className="inline-flex items-center gap-1 sm:gap-2 text-white/90 hover:text-white min-h-10">
                <ArrowLeft className="size-6 sm:size-6" />
                <span className="text-sm sm:text-base font-semibold drop-shadow-md">Back</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {pipSupported && (
                <button onClick={() => videoRef.current && enterPictureInPicture(videoRef.current)} aria-label="Picture in Picture" className="hover:text-white/70 transition min-h-11 min-w-11 flex items-center justify-center">
                  <Minimize2 className="size-5 sm:size-5" />
                </button>
              )}
              <div className="relative">
                <button onClick={() => { setShowSettings((v) => !v); }} aria-label="Settings" className="hover:text-white/70 transition min-h-11 min-w-11 flex items-center justify-center">
                  <Settings className="size-6 sm:size-6" />
                </button>
                {showSettings && (
                  <div className={`absolute top-full right-0 mt-2 w-56 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-white/10 bg-black/90 p-3 text-sm shadow-2xl backdrop-blur-xl scrollbar-hide`}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Server</p>
                    <div className="grid grid-cols-2 gap-1 mb-3 max-h-40 overflow-y-auto scrollbar-hide">
                      {availableEmbedServers.map((server) => (
                        <button
                          key={server.id}
                          onClick={() => handleServerSelect(server.id)}
                          className={`rounded px-3 py-1.5 text-xs text-left transition ${selectedServerId === server.id ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                        >
                          {server.name}
                        </button>
                      ))}
                    </div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Selected</p>
                    <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">{selectedServer.name}</div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Watched</p>
                        <p className="text-[11px] text-white/50">Mark as watched</p>
                      </div>
                      <button onClick={toggleWatched} className={`rounded px-3 py-1.5 text-xs transition ${isWatchedState ? "bg-emerald-600 text-white" : "bg-white/20 text-white/60 hover:bg-white/10 hover:text-white"}`}>
                        {isWatchedState ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Share</p>
                        <p className="text-[11px] text-white/50">Copy link or share</p>
                      </div>
                      <button onClick={handleShare} className="rounded px-3 py-1.5 text-xs transition bg-white/20 text-white/60 hover:bg-white/10 hover:text-white">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {buffering && !ended && (
        <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
          <Loader className="size-10 text-white/60 animate-spin" />
        </div>
      )}
      {ended && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg text-white/70">You've finished watching</p>
            <h2 className="text-2xl font-bold text-white">Finished</h2>
            <button onClick={goBack} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-lg transition hover:bg-white/20">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

function enterPictureInPicture(video: HTMLVideoElement) {
  return video.requestPictureInPicture();
}
