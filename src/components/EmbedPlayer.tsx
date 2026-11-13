import React, { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Settings, Loader, Minimize2, ShieldOff, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { setWatched, isWatched } from "../lib/continue-watching-firestore";
import { AnimeItem } from "../types/anime";

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
  { id: "nontongo", name: "NontonGo", isFrench: false, urls: { movie: "https://www.nontongo.win/embed/movie/{id}", tv: "https://www.nontongo.win/embed/tv/{id}/{season}/{episode}" } },
  { id: "vidlink", name: "VidLink (Default)", isFrench: false, urls: { movie: "https://vidlink.pro/movie/{id}?player=default", tv: "https://vidlink.pro/tv/{id}/{season}/{episode}?player=default" } },
  { id: "vidlinkjw", name: "VidLink (JW Player)", isFrench: false, urls: { movie: "https://vidlink.pro/movie/{id}?player=jw", tv: "https://vidlink.pro/tv/{id}/{season}/{episode}?player=jw" } },
  { id: "vidfast", name: "VidFast", isFrench: false, urls: { movie: "https://vidfast.vc/movie/{id}?autoPlay=true", tv: "https://vidfast.vc/tv/{id}/{season}/{episode}?autoPlay=true" } },
  { id: "vidspark", name: "VidSpark", isFrench: false, urls: { movie: "https://vidspark.to/movie/{id}", tv: "https://vidspark.to/tv/{id}/{season}/{episode}" } },
  { id: "vidrift", name: "Vidrift", isFrench: false, urls: { movie: "https://embed.vidrift.net/embed/movie/{id}?color=#DF2225", tv: "https://embed.vidrift.net/embed/tv/{id}/{season}/{episode}?color=#DF2225" } },
  { id: "vidy", name: "Vidy", isFrench: false, urls: { movie: "https://vidy.st/movie/{id}?color=DF2225", tv: "https://vidy.st/tv/{id}/{season}/{episode}?color=DF2225" } },
  { id: "vsembed", name: "VSEmbed", isFrench: false, urls: { movie: "https://vsembed.su/embed/movie/{id}", tv: "https://vsembed.su/embed/tv/{id}/{season}/{episode}" } },
  { id: "2embed", name: "2Embed", isFrench: false, urls: { movie: "https://www.2embed.cc/embed/{id}", tv: "https://www.2embed.cc/embedtv/{id}&s={season}&e={episode}" } },
  { id: "multiembed", name: "MultiEmbed", isFrench: false, urls: { movie: "https://multiembed.mov/?video_id={id}&tmdb=1", tv: "https://multiembed.mov/?video_id={id}&tmdb=1&s={season}&e={episode}" } },
  { id: "videasy", name: "VidEasy", isFrench: false, urls: { movie: "https://videasy.xyz/embed/movie/{id}?theme=#DF2225", tv: "https://videasy.xyz/embed/tv/{id}/{season}/{episode}?theme=#DF2225" } },
  { id: "smashystream", name: "SmashyStream", isFrench: false, urls: { movie: "https://embed.smashystream.com/playere.php?tmdb={id}", tv: "https://embed.smashystream.com/playere.php?tmdb={id}&season={season}&episode={episode}" } },
  { id: "vidsrcto", name: "VidSrc.to", isFrench: false, urls: { movie: "https://vidsrc.to/embed/movie/{id}", tv: "https://vidsrc.to/embed/tv/{id}/{season}/{episode}" } },
  { id: "vidsrcsh", name: "VidSrc.sh", isFrench: false, urls: { movie: "https://vidsrc.sh/embed/movie/{id}", tv: "https://vidsrc.sh/embed/tv/{id}/{season}/{episode}" } },
  { id: "vidsrcsu", name: "VidSrc.su", isFrench: false, urls: { movie: "https://vidsrc.su/embed/movie/{id}", tv: "https://vidsrc.su/embed/tv/{id}/{season}/{episode}" } },
  { id: "vidsrcmov", name: "VidSrc.mov", isFrench: false, urls: { movie: "https://vidsrc.mov/embed/movie/{id}", tv: "https://vidsrc.mov/embed/tv/{id}/{season}/{episode}" } },
  { id: "Atlantic", name: "Atlantic", isFrench: false, urls: { movie: "https://atlantic.st/embed/movie/{id}?color=#DF2225", tv: "https://atlantic.st/embed/tv/{id}/{season}/{episode}?color=#DF2225" } },
  { id: "Chillflix", name: "Chillflix", isFrench: false, urls: { movie: "https://www.chillflix.pw/embed/movie/{id}", tv: "https://www.chillflix.pw/embed/tv/{id}/{season}/{episode}" } },
  { id: "Cinelite", name: "Cinelite", isFrench: false, urls: { movie: "https://embed.cinelite.xyz/movie/{id}?color=#DF2225", tv: "https://embed.cinelite.xyz/tv/{id}/{season}/{episode}?color=#DF2225" } },
  { id: "Vidmario", name: "Vidmario", isFrench: false, urls: { movie: "https://player.vidmario.net/embed/movie/{id}?color=#DF2225", tv: "https://player.vidmario.net/embed/tv/{id}/{season}/{episode}?color=#DF2225" } },
  { id: "Toflix", name: "Toflix", isFrench: false, urls: { movie: "https://toflix.co/embed/movie/{id}?color=DF2225", tv: "https://toflix.co/embed/tv/{id}/{season}/{episode}?color=DF2225" } },
  { id: "Vidly", name: "Vidly", isFrench: false, urls: { movie: "https://vidly.pro/movie/{id}?color=DF2225", tv: "https://vidly.pro/tv/{id}/{season}/{episode}?color=DF2225" } },
  { id: "VidBolt", name: "VidBolt", isFrench: false, urls: { movie: "https://vidbolt.xyz/movie/{id}?theme=DF2225", tv: "https://vidbolt.xyz/tv/{id}/{season}/{episode}?theme=DF2225" } },
  { id: "Tgvid", name: "Tgvid", isFrench: false, urls: { movie: "https://tgvid.lovable.app/embed/movie/{id}?color=DF2225", tv: "https://tgvid.lovable.app/embed/tv/{id}/{season}/{episode}?color=DF2225" } },
  { id: "Xpass", name: "Xpass", isFrench: false, urls: { movie: "https://play.xpass.top/e/movie/{id}", tv: "https://play.xpass.top/e/tv/{id}/{season}/{episode}" } },
  { id: "RiveStream", name: "RiveStream", isFrench: false, urls: { movie: "https://www.rivestream.app/embed?type=movie&id={id}", tv: "https://www.rivestream.app/embed?type=tv&id={id}&season={season}&episode={episode}" } },
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

type EmbedPlaybackCommand = "handshake" | "play" | "pause" | "seek" | "requestProgress";

type EmbedPlaybackMessage = {
  type: "ANIFLIX_EMBED_PLAYBACK";
  command: EmbedPlaybackCommand;
  time?: number;
};

type EmbedPlaybackResponse = {
  type: "ANIFLIX_EMBED_PROGRESS" | "ANIFLIX_EMBED_READY";
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
};

function sendEmbedPlaybackCommand(iframe: HTMLIFrameElement | null, command: EmbedPlaybackCommand, time?: number) {
  if (!iframe?.contentWindow) return;
  const message: EmbedPlaybackMessage = { type: "ANIFLIX_EMBED_PLAYBACK", command };
  if (typeof time === "number") message.time = time;
  iframe.contentWindow.postMessage(message, "*");
}

interface EmbedPlayerProps {
  item: AnimeItem;
  onClose: () => void;
  onBack?: () => void;
}

export function EmbedPlayer({ item, onClose, onBack }: EmbedPlayerProps) {
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
  const [showRotateHint, setShowRotateHint] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(true);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [isWatchedState, setIsWatchedState] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  const lastTimeUpdateRef = useRef(0);
  const lastEmbedProgressRef = useRef(0);

  const isTv = item.type === 'anime';
  const season = item.season ?? 1;
  const episode = item.episode ?? 1;

  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("aniflix:autoplayNext") === "1";
    } catch {
      return false;
    }
  });
  const [nextEp, setNextEp] = useState<{ season: number; episode: number } | null>(null);

  const handleServerSelect = useCallback((id: string) => {
    setSelectedServerId(id);
    try { localStorage.setItem("aniflix:embedServer", id); } catch {}
  }, []);

  const toggleAutoplayNext = useCallback(() => {
    setAutoplayNext((prev) => {
      const next = !prev;
      try { localStorage.setItem("aniflix:autoplayNext", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    onBack?.();
    onClose();
  }, [onBack, onClose]);

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

  // PiP support check
  useEffect(() => {
    if (typeof document === "undefined") return;
    const supports = !!document.createElement("video").requestPictureInPicture;
    setPipSupported(supports);
    if (supports) {
      const testVideo = document.createElement("video");
      testVideo.src = "data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAAAAG1wNDJpc21vbXAyAAAAHG1vb2YAAABsbXZoZAAAAPNtZGF0YQ==";
      testVideo.muted = true;
      testVideo.playsInline = true;
      testVideo.requestPictureInPicture().then(() => document.exitPictureInPicture()).catch(() => {});
    }
  }, []);

  // Watched state
  useEffect(() => {
    if (!item.tmdbId) return;
    isWatched(item, season, episode).then(setIsWatchedState);
  }, [item, season, episode]);

  const toggleWatched = async () => {
    const next = !isWatchedState;
    setIsWatchedState(next);
    if (!item.tmdbId) return;
    // Episode-scoped when the player knows the season/episode, so the AniList
    // sync can count episodes instead of guessing "whole series watched".
    await setWatched(item, next, season, episode);
  };

  // Build embed URL when server or item changes
  useEffect(() => {
    const url = buildEmbedUrl(selectedServerId, String(item.id), isTv, season, episode);
    setVideoUrl(url);
    setEmbedSyncSupported(false);
  }, [selectedServerId, item.id, isTv, season, episode]);

  // Embed message handler
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data as EmbedPlaybackResponse | null;
      if (!data?.type) return;
      if (data.type === "ANIFLIX_EMBED_READY") {
        setEmbedSyncSupported(true);
        return;
      }
      if (data.type === "ANIFLIX_EMBED_PROGRESS") {
        if (typeof data.currentTime !== "number" || typeof data.duration !== "number") return;
        setCurrentTime(data.currentTime);
        setDuration(data.duration);

        const elapsed = Math.abs(data.currentTime - lastEmbedProgressRef.current);
        if (elapsed >= 5 || data.currentTime === 0) {
          lastEmbedProgressRef.current = data.currentTime;
        }

        if (
          embedSyncSupported &&
          autoplayNext &&
          isTv &&
          data.duration > 0 &&
          data.currentTime / data.duration >= 0.98
        ) {
          setEnded(true);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [item.id, season, episode, embedSyncSupported, autoplayNext, isTv]);

  // Poll embed for progress
  useEffect(() => {
    if (!embedSyncSupported || !iframeRef.current) return;
    const intervalId = window.setInterval(() => {
      sendEmbedPlaybackCommand(iframeRef.current, "requestProgress");
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [embedSyncSupported]);

  const handleEmbedLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setEmbedLoading(false);
    setEmbedError(null);
    sendEmbedPlaybackCommand(iframe, "handshake");
    sendEmbedPlaybackCommand(iframe, "requestProgress");
  };

  const handleEmbedError = () => {
    setEmbedLoading(false);
    setEmbedError("This embed server is unavailable. Try switching to a different server in Settings.");
  };

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    setMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  };

  const toggleCaptions = useCallback(() => {
    // Captions handled by embed server
  }, []);

  const seek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const targetTotal = (Number(e.target.value) / 100) * v.duration;
    v.currentTime = targetTotal;
  }, []);

  const checkPipSupport = useCallback(async () => {
    const browserSupports = !!document.createElement("video").requestPictureInPicture;
    if (!browserSupports) {
      setPipSupported(false);
      return;
    }
    try {
      const testVideo = document.createElement("video");
      testVideo.src = "data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAAAAG1wNDJpc21vbXAyAAAAHG1vb2YAAABsbXZoZAAAAPNtZGF0YQ==";
      testVideo.muted = true;
      testVideo.playsInline = true;
      await testVideo.requestPictureInPicture();
      await document.exitPictureInPicture();
      setPipSupported(true);
    } catch {
      setPipSupported(false);
    }
  }, []);

  useEffect(() => {
    checkPipSupport();
  }, [checkPipSupport]);

  // Before unload blocker
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Offline/online
  useEffect(() => {
    const handleOffline = () => toast.error("You're offline. Playback may fail.", { id: "offline-warning", duration: Infinity });
    const handleOnline = () => toast.dismiss("offline-warning");
    if (!navigator.onLine) handleOffline();
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const fmt = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
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
      {embedError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black text-white p-8 text-center">
          <div className="bg-red-900/50 border border-red-500/30 rounded-lg px-6 py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-2-3.3-2-3.774 0L1.57 12c-.77 2 .192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Embed Server Unavailable</h3>
            <p className="text-sm text-red-200 mb-4">{embedError}</p>
            <button
              onClick={() => {
                setEmbedLoading(true);
                setEmbedError(null);
                setEmbedSyncSupported(false);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
            >
              Try Another Server
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-sm font-medium ml-3"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {!embedError && (
        <>
          {embedLoading && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p className="mt-4 text-sm text-zinc-400">Loading embed player...</p>
              <p className="mt-1 text-xs text-zinc-500">This may take a few seconds</p>
            </div>
          )}
          {isEmbedUrl(videoUrl) ? (
            <iframe
              ref={iframeRef}
              src={videoUrl}
              title={`Embed Player — ${item.title}`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              onLoad={handleEmbedLoad}
              onError={handleEmbedError}
              className="size-full border-0"
              style={{ opacity: embedLoading ? 0 : 1 }}
            />
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              poster={item.backdropPath || item.posterPath}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => {
                const cur = e.currentTarget.currentTime;
                const dur = e.currentTarget.duration || 1;
                const now = Date.now();
                if (now - lastTimeUpdateRef.current >= 1000) {
                  lastTimeUpdateRef.current = now;
                  setProgress(dur > 0 ? (cur / dur) * 100 : 0);
                  setDuration(dur);
                  setCurrentTime(cur);
                }
              }}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration);
              }}
              onCanPlay={() => setBuffering(false)}
              onVolumeChange={(e) => {
                setVolume(e.currentTarget.volume);
                setMuted(e.currentTarget.muted);
              }}
              onEnded={() => setEnded(true)}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
              className="size-full object-contain"
              style={{ opacity: embedLoading ? 0 : 1 }}
            >
              <track kind="subtitles" srcLang="en" label="English" />
            </video>
          )}
        </>
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
                <span className="text-sm sm:text-base font-semibold drop-shadow-md">
                  {item.title}
                  {season != null && episode != null && <span className="ml-2 text-sm font-normal text-white/60">S{season} E{episode}</span>}
                </span>
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
                  <div className={`absolute top-full right-0 mt-2 ${isTv ? "w-80" : "w-56"} max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-white/10 bg-black/90 p-3 text-sm shadow-2xl backdrop-blur-xl scrollbar-hide`}>
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
                    {isTv && (
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Autoplay next episode</p>
                          <p className="text-[11px] text-white/50">Automatically start the next episode when one ends.</p>
                        </div>
                        <button onClick={toggleAutoplayNext} className={`rounded px-3 py-1.5 text-xs transition ${autoplayNext ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                          {autoplayNext ? "On" : "Off"}
                        </button>
                      </div>
                    )}
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Captions</p>
                        <p className="text-[11px] text-white/50">Toggle captions on or off.</p>
                      </div>
                      <button onClick={toggleCaptions} className={`rounded px-3 py-1.5 text-xs transition ${true ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                        On
                      </button>
                    </div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Watched</p>
                        <p className="text-[11px] text-white/50">Mark as watched</p>
                      </div>
                      <button onClick={toggleWatched} className={`rounded px-3 py-1.5 text-xs transition ${isWatchedState ? "bg-emerald-600 text-white" : "bg-white/20 text-white/60 hover:bg-white/10 hover:text-white"}`}>
                        {isWatchedState ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRotateHint && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 gap-4 pointer-events-none">
          <RotateIcon className="size-16 text-white/70 animate-[spin_2s_linear_infinite]" />
          <p className="text-sm text-white/70 text-center px-8">Rotate your device to landscape for a better viewing experience</p>
        </div>
      )}

      {buffering && !ended && (
        <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
          <Loader className="size-10 text-white/60 animate-spin" />
        </div>
      )}

      {ended && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg text-white/70">You've finished watching</p>
            <h2 className="text-2xl font-bold text-white">{item.title}</h2>
            <div className="flex items-center gap-3">
              {isTv && nextEp && (
                <button onClick={() => { setEnded(false); }} className="rounded bg-red-600 px-6 py-2 text-sm font-semibold hover:bg-red-700 transition">Next Episode</button>
              )}
              <button onClick={() => {
                const v = videoRef.current;
                if (v) { v.currentTime = 0; v.play().catch(() => {}); setPlaying(true); setEnded(false); }
              }} className="rounded bg-white px-6 py-2 text-sm font-semibold text-black hover:bg-white/90 transition">Play Again</button>
              <button onClick={goBack} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-lg transition hover:bg-white/20">Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function enterPictureInPicture(video: HTMLVideoElement) {
  return video.requestPictureInPicture();
}

function RotateIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 4v6h6" />
      <path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
