import React, { useState } from 'react';
import { X, Check, Database, Key, Sparkles, RefreshCw, ExternalLink } from 'lucide-react';
import { TmdbConfig } from '../types/anime';
import { getTmdbConfig, getTmdbApiKey, saveTmdbConfig } from '../services/tmdb';

interface TmdbConfigModalProps {
  onClose: () => void;
  onConfigSaved: () => void;
}

export const TmdbConfigModal: React.FC<TmdbConfigModalProps> = ({
  onClose,
  onConfigSaved,
}) => {
  const currentConfig = getTmdbConfig();
  const [useLiveApi, setUseLiveApi] = useState(currentConfig.useLiveApi);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    saveTmdbConfig({ ...currentConfig, useLiveApi });
    setStatusMessage('Configuration saved successfully!');
    onConfigSaved();
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleTestKey = async () => {
    const apiKey = getTmdbApiKey();
    if (!apiKey) {
      setStatusMessage(
        'No TMDB API key configured. Set VITE_TMDB_API_KEY in your environment variables.',
      );
      return;
    }
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const testUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${encodeURIComponent(
        apiKey
      )}&with_genres=16&with_original_language=ja`;
      const res = await fetch(testUrl);
      if (res.ok) {
        const data = await res.json();
        setStatusMessage(`Connection verified! Found ${data.total_results ?? 0}+ Japanese anime titles.`);
      } else {
        setStatusMessage('TMDB returned an error. Check key or permissions.');
      }
    } catch (e) {
      setStatusMessage('Network request failed. Check your connection.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#18181f] border border-zinc-800 text-white rounded-xl shadow-2xl overflow-hidden p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <Database className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-bold text-white">TMDB Anime Query Engine</h3>
        </div>

        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          AniFlix strictly queries The Movie Database (TMDB) for Japanese animation titles using the exact parameters below.
        </p>

        {/* Query Specs Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs space-y-2 mb-4 font-mono">
          <div className="text-zinc-400 text-[11px] uppercase tracking-wider font-sans font-semibold">
            Anime Filter Query Architecture:
          </div>
          <div className="text-emerald-400 break-all">
            with_genres=16 <span className="text-zinc-500">(Animation)</span>
          </div>
          <div className="text-emerald-400 break-all">
            with_original_language=ja <span className="text-zinc-500">(Japanese Origin)</span>
          </div>
          <div className="text-zinc-400 text-[11px] font-sans">
            Endpoints: <code className="text-red-400">/discover/tv</code> & <code className="text-red-400">/discover/movie</code>
          </div>
        </div>

        {/* API Key from Environment Variable */}
        <div className="space-y-3 mb-4">
          <label className="block text-xs font-semibold text-zinc-300">
            TMDB API Key (from environment variable)
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              placeholder="Not configured"
              value={getTmdbApiKey() ? '••••••••••••••••••••••' : ''}
              className="w-full bg-zinc-900/90 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none cursor-default"
            />
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>
                {getTmdbApiKey()
                  ? 'Configured via VITE_TMDB_API_KEY'
                  : 'Set VITE_TMDB_API_KEY in .env.local to enable live TMDB data.'}
              </span>
              <button
                onClick={handleTestKey}
                disabled={isTesting || !getTmdbApiKey()}
                className="text-red-400 hover:text-red-300 font-semibold cursor-pointer flex items-center gap-1"
              >
                {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                Test Key
              </button>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 mb-4">
            {statusMessage}
          </div>
        )}

        {/* Live API Toggle */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-zinc-300">Live TMDB API</label>
            <button
              onClick={() => setUseLiveApi((prev) => !prev)}
              className={`w-10 h-5 rounded-full transition-colors ${
                useLiveApi
                  ? 'bg-red-600'
                  : 'bg-zinc-700'
              }`}
            >
              <span
                className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                  useLiveApi ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-[10px] text-zinc-500">
            {useLiveApi ? 'Live TMDB data is enabled.' : 'Live TMDB data is disabled.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow cursor-pointer"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
