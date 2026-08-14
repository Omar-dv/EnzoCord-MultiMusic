'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Shuffle,
  Repeat,
  Volume2,
  ListMusic,
  User,
  Music,
  Radio,
  Search,
  Loader2,
  Trash2,
  Crown,
  UserCheck,
} from 'lucide-react';

interface BotSummary {
  id: string;
  name: string;
  status: string;
  voiceChannelId?: string;
}

interface PlayerState {
  hasPlayer: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  title: string;
  artist: string;
  artworkUrl: string | null;
  duration: number;
  position: number;
  volume: number;
  repeatMode: 'none' | 'track' | 'queue';
  isShuffled: boolean;
  isAutoplay: boolean;
  queueLength: number;
  queue: Array<{
    id: string;
    title: string;
    artist: string;
    duration: number;
    artworkUrl: string | null;
    requester?: string;
  }>;
}

interface MusicResponse {
  bots: BotSummary[];
  selectedBotId: string | null;
  guildId?: string;
  playerState: PlayerState | null;
  controller: {
    mainUserId: string | null;
    mainUsername: string | null;
    subUserId: string | null;
    subUsername: string | null;
  } | null;
}

export default function MusicPage() {
  const [data, setData] = useState<MusicResponse | null>(null);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMusicState = async (botId?: string | null) => {
    const targetId = botId || selectedBotId;
    const url = targetId ? `/api/dashboard/music?botId=${targetId}` : '/api/dashboard/music';
    try {
      const res = await fetch(url);
      const resData: MusicResponse = await res.json();
      if (res.ok) {
        setData(resData);
        if (!selectedBotId && resData.selectedBotId) {
          setSelectedBotId(resData.selectedBotId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch music state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMusicState();
    const interval = setInterval(() => fetchMusicState(selectedBotId), 3000);
    return () => clearInterval(interval);
  }, [selectedBotId]);

  const handleControlAction = async (action: string, value?: any) => {
    if (!selectedBotId) return;
    setActionLoading(action);
    try {
      await fetch('/api/dashboard/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: selectedBotId, action, value }),
      });
      await fetchMusicState(selectedBotId);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedBotId) return;
    setSearching(true);
    try {
      await handleControlAction('PLAY_QUERY', searchQuery.trim());
      setSearchQuery('');
    } finally {
      setSearching(false);
    }
  };

  const formatTime = (ms: number): string => {
    if (!ms || isNaN(ms) || ms <= 0) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const pState = data?.playerState;
  const progressPercent = pState && pState.duration > 0
    ? Math.min(100, Math.round((pState.position / pState.duration) * 100))
    : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Audio Player & Control</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time multi-bot synchronization for Discord Lavalink playback engines.
          </p>
        </div>

        {/* Multi-Bot Selector Tabs */}
        {data?.bots && data.bots.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {data.bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => {
                  setSelectedBotId(bot.id);
                  fetchMusicState(bot.id);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 whitespace-nowrap transition-all ${
                  selectedBotId === bot.id
                    ? 'bg-electric-500 text-black border-electric-400 shadow-glow'
                    : 'bg-dark-100/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${bot.status === 'ONLINE' ? 'text-emerald-400' : 'text-slate-500'}`} />
                {bot.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex justify-center text-electric-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : !data?.bots || data.bots.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
          <Music className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Active Bots Deployed</h3>
          <p className="text-sm text-slate-500 mb-6">Deploy a bot to your server to start playing music.</p>
          <a
            href="/wizard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-electric-500 text-black font-bold text-xs shadow-glow"
          >
            Deploy Bot
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Player Card */}
          <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border-slate-800 space-y-8 flex flex-col justify-between">
            <div>
              {/* Search & Play Input Bar */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-8">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search song title, artist, or paste YouTube/Spotify URL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-200 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-electric-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="px-6 py-3 rounded-xl bg-electric-500 hover:bg-electric-400 disabled:opacity-40 text-black font-bold text-xs shadow-glow transition-all flex items-center gap-2"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  Play
                </button>
              </form>

              {/* Now Playing Track Details */}
              <div className="flex items-center gap-6 mb-8">
                {pState?.artworkUrl ? (
                  <img
                    src={pState.artworkUrl}
                    alt="artwork"
                    className="w-24 h-24 rounded-2xl object-cover border border-electric-500/30 shadow-glow shrink-0 bg-dark-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-electric-500/20 to-blue-600/30 border border-electric-500/30 flex items-center justify-center text-electric-400 shadow-glow shrink-0">
                    <Music className="w-12 h-12" />
                  </div>
                )}

                <div className="space-y-1 overflow-hidden">
                  <span className="text-xs font-mono text-electric-400 uppercase tracking-widest block font-bold">
                    {pState?.isPlaying ? 'Now Playing' : pState?.isPaused ? 'Paused' : 'Idle'}
                  </span>
                  <h2 className="text-2xl font-black text-white truncate">
                    {pState?.title || 'No track playing'}
                  </h2>
                  <p className="text-slate-400 text-sm truncate">{pState?.artist || 'None'}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Main: {data?.controller?.mainUsername ? `@${data.controller.mainUsername}` : 'None'}</span>
                    </div>
                    {data?.controller?.subUsername && (
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-electric-400" />
                        <span>Sub: @{data.controller.subUsername}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 mb-6">
                <div className="h-2 bg-dark-50 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-electric-500 to-blue-600 rounded-full transition-all duration-300 shadow-glow"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-500">
                  <span>{formatTime(pState?.position || 0)}</span>
                  <span>{formatTime(pState?.duration || 0)}</span>
                </div>
              </div>
            </div>

            {/* Playback Controls Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleControlAction('SHUFFLE')}
                  disabled={!pState?.queueLength}
                  className="p-3 rounded-xl border border-slate-800 bg-dark-50 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                  title="Shuffle Queue"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const next = pState?.repeatMode === 'none' ? 'track' : pState?.repeatMode === 'track' ? 'queue' : 'none';
                    handleControlAction('REPEAT', next);
                  }}
                  className={`p-3 rounded-xl border transition-all ${
                    pState?.repeatMode !== 'none'
                      ? 'bg-electric-500/20 border-electric-500/50 text-electric-400 font-bold'
                      : 'bg-dark-50 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Cycle Repeat Mode"
                >
                  <Repeat className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleControlAction('AUTOPLAY')}
                  className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all ${
                    pState?.isAutoplay
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold'
                      : 'bg-dark-50 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Autoplay"
                >
                  Autoplay: {pState?.isAutoplay ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Central Transport Buttons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleControlAction('PREVIOUS')}
                  className="p-3 rounded-xl bg-dark-50 border border-slate-800 text-slate-300 hover:text-white transition-all"
                  title="Previous Track"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={() => {
                    if (pState?.isPaused) handleControlAction('RESUME');
                    else if (pState?.isPlaying) handleControlAction('PAUSE');
                  }}
                  disabled={!pState?.hasPlayer}
                  className="p-5 rounded-2xl bg-electric-500 hover:bg-electric-400 text-black shadow-glow transition-all hover:scale-105 disabled:opacity-50"
                  title={pState?.isPaused ? 'Resume' : 'Pause'}
                >
                  {pState?.isPlaying && !pState?.isPaused ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => handleControlAction('SKIP')}
                  className="p-3 rounded-xl bg-dark-50 border border-slate-800 text-slate-300 hover:text-white transition-all"
                  title="Skip Track"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={() => handleControlAction('STOP')}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                  title="Stop Playback"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-3 w-36">
                <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pState?.volume ?? 100}
                  onChange={(e) => handleControlAction('VOLUME', Number(e.target.value))}
                  className="w-full h-1.5 bg-dark-50 rounded-lg appearance-none cursor-pointer accent-electric-500"
                />
                <span className="text-xs font-mono text-slate-400 w-8">{pState?.volume ?? 100}%</span>
              </div>
            </div>
          </div>

          {/* Up Next Queue Panel */}
          <div className="glass-panel p-6 rounded-3xl border-slate-800 space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-electric-400" />
                  Up Next Queue
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{pState?.queueLength || 0} Tracks</span>
                  {pState && pState.queueLength > 0 && (
                    <button
                      onClick={() => handleControlAction('CLEAR_QUEUE')}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs"
                      title="Clear Upcoming Queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 mt-4">
                {!pState?.queue || pState.queue.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Queue is empty. Enter a song name above or on Discord to enqueue music.
                  </div>
                ) : (
                  pState.queue.map((track, idx) => (
                    <div
                      key={track.id}
                      className="p-3.5 rounded-2xl bg-dark-100/90 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="font-mono text-slate-500 font-bold w-5 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {track.artworkUrl ? (
                          <img src={track.artworkUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-dark-200 flex items-center justify-center shrink-0 text-slate-500">
                            <Music className="w-4 h-4" />
                          </div>
                        )}
                        <div className="truncate">
                          <span className="font-bold text-white block truncate">{track.title}</span>
                          <span className="text-slate-400 block truncate text-[11px]">{track.artist}</span>
                        </div>
                      </div>
                      <span className="font-mono text-slate-500 shrink-0 ml-2">{formatTime(track.duration)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono text-center pt-3 border-t border-slate-800/80">
              Synced with Discord Voice Channel
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
