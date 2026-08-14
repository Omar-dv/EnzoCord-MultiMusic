'use client';

import { useState, useEffect } from 'react';
import { Bot, Play, Square, RotateCw, Trash2, Plus, Loader2, RefreshCw, Volume2, Mic } from 'lucide-react';

interface BotData {
  id: string;
  name: string;
  username?: string;
  avatar: string | null;
  status: string;
  isReady: boolean;
  voiceConnected: boolean;
  voiceChannelName?: string | null;
  lavalinkConnected: boolean;
  guildName?: string | null;
  uptimeSeconds: number;
  currentTrack?: string | null;
}

export default function BotsPage() {
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/dashboard/bots');
      const data = await res.json();
      if (res.ok && data.bots) {
        setBots(data.bots);
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (botId: string, action: 'START' | 'STOP' | 'RESTART' | 'REMOVE') => {
    setActionId(botId);
    try {
      await fetch('/api/dashboard/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, action }),
      });
      await fetchBots();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
      setConfirmRemoveId(null);
    }
  };

  const formatUptime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Add Bot CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Bot Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor and manage your isolated Discord music bot instances (Up to 15 bots).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBots}
            className="p-2.5 rounded-xl bg-dark-50 border border-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <a
            href="/wizard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-electric-500 hover:bg-electric-400 text-black font-bold text-xs shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Bot ({bots.length} / 15)
          </a>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-electric-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : bots.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
          <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Deployed Bots</h3>
          <p className="text-sm text-slate-500 mb-6">You currently have zero active bots in your cluster.</p>
          <a
            href="/wizard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-electric-500 text-black font-bold text-xs shadow-glow"
          >
            Deploy New Bot
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="glass-panel p-6 rounded-2xl border-slate-800 flex flex-col justify-between hover:border-electric-500/30 transition-all"
            >
              <div>
                {/* Bot Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={bot.avatar || '/placeholder-avatar.png'}
                      alt="avatar"
                      className="w-12 h-12 rounded-2xl border border-slate-700 bg-dark-200"
                    />
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-white text-base truncate">{bot.name}</h3>
                      <span className="text-xs text-slate-500 font-mono">ID: {bot.id}</span>
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${
                      bot.status === 'ONLINE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${bot.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    {bot.status}
                  </span>
                </div>

                {/* Real Live Info List */}
                <div className="space-y-2 py-3 border-t border-b border-slate-800/80 text-xs font-mono mb-6">
                  <div className="flex justify-between text-slate-400">
                    <span>Server:</span>
                    <span className="text-white font-bold truncate max-w-[160px]">{bot.guildName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Voice Room:</span>
                    <span className={bot.voiceConnected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {bot.voiceChannelName || (bot.voiceConnected ? 'Connected' : 'Disconnected')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Lavalink Node:</span>
                    <span className={bot.lavalinkConnected ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {bot.lavalinkConnected ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Playback:</span>
                    <span className="text-electric-400 font-bold truncate max-w-[160px]">
                      {bot.currentTrack || 'Idle'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Uptime:</span>
                    <span className="text-white">{formatUptime(bot.uptimeSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAction(bot.id, 'START')}
                    disabled={bot.status === 'ONLINE' || actionId === bot.id}
                    className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium disabled:opacity-30 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </button>

                  <button
                    onClick={() => handleAction(bot.id, 'STOP')}
                    disabled={bot.status === 'OFFLINE' || actionId === bot.id}
                    className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium disabled:opacity-30 transition-all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </button>

                  <button
                    onClick={() => handleAction(bot.id, 'RESTART')}
                    disabled={actionId === bot.id}
                    className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-dark-50 hover:bg-dark-100 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${actionId === bot.id ? 'animate-spin' : ''}`} />
                    Restart
                  </button>
                </div>

                {confirmRemoveId === bot.id ? (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center space-y-2">
                    <p className="text-xs text-red-400 font-semibold">Remove this bot instance?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(bot.id, 'REMOVE')}
                        className="flex-1 py-1.5 rounded-lg bg-red-500 text-white font-bold text-xs"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="flex-1 py-1.5 rounded-lg bg-dark-50 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(bot.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Bot
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
