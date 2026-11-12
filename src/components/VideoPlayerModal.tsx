import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FastForward,
  SkipForward,
  RotateCcw,
  List,
  Settings,
  Tv,
} from 'lucide-react';
import { AnimeItem, Episode } from '../types/anime';

interface VideoPlayerModalProps {
  item: AnimeItem | null;
  initialEpisode?: Episode;
  onClose: () => void;
  onNextEpisode?: () => void;
  onSelectEpisode?: (ep: Episode) => void;
  minimal?: boolean;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  item,
  initialEpisode,
  onClose,
  onNextEpisode,
  onSelectEpisode,
  minimal = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(15); // Percentage
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [audioTrack, setAudioTrack] = useState<'ja' | 'en'>('ja');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [streamSource, setStreamSource] = useState<'trailer' | 'embed'>('trailer');

  const currentEp =
    initialEpisode ||
    (item?.episodes && item.episodes[0]) || {
      id: 1,
      episodeNumber: 1,
      title: item?.title || 'Episode 1',
      duration: '24m',
      overview: 'Full anime episode streaming stream.',
      thumbnail: item?.backdropPath || '',
    };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  // Minimal trailer popup: only the close button and the trailer embed.
  if (minimal) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
        {item.trailerYoutubeKey && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${item.trailerYoutubeKey}?autoplay=1&controls=1&rel=0&modestbranding=1`}
            title={item.title}
            className="w-full h-full max-w-[90vw] max-h-[90vh]"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none animate-fadeIn">
      {/* Top Controls Bar */}
      <div className="absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-black/90 via-black/40 to-transparent p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Back to Browse"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight">
              {item.title}
            </h2>
            <p className="text-xs text-zinc-400">
              {item.type === 'movie'
                ? 'Anime Feature Film'
                : `S1 : E${currentEp.episodeNumber} - ${currentEp.title}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stream Server Toggle */}
          <div className="hidden sm:flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setStreamSource('trailer')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                streamSource === 'trailer'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              HD Stream
            </button>
            <button
              onClick={() => setStreamSource('embed')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                streamSource === 'embed'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              StreamFlix Server
            </button>
          </div>

          {/* Episode List Trigger */}
          {item.episodes && item.episodes.length > 1 && (
            <button
              onClick={() => setShowEpisodeDrawer(!showEpisodeDrawer)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <List className="w-4 h-4 text-red-500" />
              <span className="hidden sm:inline">Episodes</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video Screen Container */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {streamSource === 'trailer' && item.trailerYoutubeKey ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${item.trailerYoutubeKey}?autoplay=1&controls=1&rel=0&modestbranding=1`}
            title={item.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          /* StreamFlix Embed Stream Player (Simulated Stream with Video Canvas) */
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={item.backdropPath}
              alt={item.title}
              className="w-full h-full object-cover filter brightness-75"
            />
            {/* Cinematic Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl mb-4 animate-pulse">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Streaming: {item.title}
              </h3>
              <p className="text-sm text-zinc-300 max-w-md mb-4">
                Playing Episode {currentEp.episodeNumber}: "{currentEp.title}" (1080p Ultra HD)
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStreamSource('trailer')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Switch to Official Studio Stream
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Netflix-Style "Skip Intro (+85s)" Floating Button */}
        <div className="absolute bottom-24 right-8 z-40">
          <button
            onClick={() => {
              setProgress((p) => Math.min(95, p + 25));
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-900/90 hover:bg-zinc-800 text-white font-semibold text-xs border border-zinc-700 shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <FastForward className="w-4 h-4 text-red-500" />
            Skip Intro (+85s)
          </button>
        </div>
      </div>

      {/* Episode Drawer Sidebar inside player */}
      {showEpisodeDrawer && item.episodes && (
        <div className="absolute top-18 bottom-20 right-4 w-80 bg-zinc-950/95 border border-zinc-800 rounded-xl p-4 z-40 shadow-2xl overflow-y-auto backdrop-blur-md animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Episode Select
            </h4>
            <button
              onClick={() => setShowEpisodeDrawer(false)}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {item.episodes.map((ep) => (
              <div
                key={ep.id}
                onClick={() => {
                  if (onSelectEpisode) onSelectEpisode(ep);
                  setShowEpisodeDrawer(false);
                }}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  currentEp.episodeNumber === ep.episodeNumber
                    ? 'bg-red-950/60 border border-red-700/60 text-white'
                    : 'hover:bg-zinc-900 text-zinc-300'
                }`}
              >
                <div className="relative w-16 h-10 shrink-0 bg-zinc-800 rounded overflow-hidden">
                  <img
                    src={ep.thumbnail || item.backdropPath}
                    alt={ep.title}
                    className="w-full h-full object-cover"
                  />
                  {currentEp.episodeNumber === ep.episodeNumber && (
                    <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                      <Play className="w-3 h-3 fill-white text-white" />
                    </div>
                  )}
                </div>
                <div className="grow min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {ep.episodeNumber}. {ep.title}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">{ep.duration}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Floating Cinema Controls Bar */}
      <div className="absolute bottom-0 inset-x-0 z-40 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 sm:p-6 space-y-3">
        {/* Timeline Progress Bar */}
        <div className="relative w-full h-1.5 bg-zinc-700/60 rounded-full cursor-pointer group">
          <div
            className="absolute top-0 bottom-0 left-0 bg-red-600 rounded-full group-hover:h-2 transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:text-red-500 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={() => setProgress((p) => Math.max(0, p - 10))}
              className="text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (onNextEpisode) onNextEpisode();
              }}
              className="text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              title="Next Episode"
            >
              <SkipForward className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Next Ep</span>
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-mono text-[11px] text-zinc-400">
              03:45 / {currentEp.duration || '24:00'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Track Toggle (Sub / Dub) */}
            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-md p-0.5 text-[11px]">
              <button
                onClick={() => setAudioTrack('ja')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  audioTrack === 'ja' ? 'bg-red-600 text-white font-bold' : 'text-zinc-400'
                }`}
              >
                JP Sub
              </button>
              <button
                onClick={() => setAudioTrack('en')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  audioTrack === 'en' ? 'bg-red-600 text-white font-bold' : 'text-zinc-400'
                }`}
              >
                EN Dub
              </button>
            </div>

            {/* Speed Selector */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              aria-label="Playback speed"
              className="bg-zinc-900 border border-zinc-700 text-zinc-300 rounded px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
