'use client';

import { useEffect, useState } from 'react';
import { Bot, Radio, Zap, Cpu, HardDrive, Clock, Activity, ShieldCheck, RefreshCw } from 'lucide-react';

interface OverviewData {
  service: {
    status: string;
    botCount: number;
  };
  botsTotal: number;
  botsOnline: number;
  lavalinkOnline: boolean;
  metrics: {
    cpuUsage: string;
    cpuModel?: string;
    ramUsage: string;
    ramPercent: number;
    uptime: string;
  };
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/dashboard/overview');
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
      }
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Overview</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time telemetry and operational status of EnzoCord Multi Music cluster.
          </p>
        </div>
        <button
          onClick={fetchOverview}
          className="p-2.5 rounded-xl bg-dark-50 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Top Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Service Status */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Cluster State</span>
            <div className="w-8 h-8 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${data?.service.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-2xl font-black text-white">
              {data?.service.status || (loading ? 'Loading...' : 'N/A')}
            </span>
          </div>
        </div>

        {/* Bots Count */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Bots</span>
            <div className="w-8 h-8 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {data ? `${data.botsOnline} / ${data.botsTotal}` : 'N/A'}{' '}
            <span className="text-xs font-normal text-slate-500">(Max 15)</span>
          </div>
        </div>

        {/* Lavalink Status */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Lavalink Node</span>
            <div className="w-8 h-8 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${data?.lavalinkOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-2xl font-black text-white">
              {data ? (data.lavalinkOnline ? 'Connected' : 'Disconnected') : 'N/A'}
            </span>
          </div>
        </div>

        {/* System Uptime */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Process Uptime</span>
            <div className="w-8 h-8 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {data?.metrics.uptime || 'N/A'}
          </div>
        </div>
      </div>

      {/* Real Hardware & Host Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-panel p-6 rounded-2xl border-slate-800 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-dark-50 border border-slate-800 flex items-center justify-center text-electric-400 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <span className="text-xs font-mono text-slate-400 block uppercase">CPU Load (Average)</span>
            <span className="text-xl font-bold text-white block">{data?.metrics.cpuUsage || 'N/A'}</span>
            <span className="text-xs text-slate-500 truncate block mt-0.5">{data?.metrics.cpuModel || ''}</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-slate-800 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-dark-50 border border-slate-800 flex items-center justify-center text-electric-400 shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono text-slate-400 block uppercase">RAM Memory</span>
            <span className="text-xl font-bold text-white block">{data?.metrics.ramUsage || 'N/A'}</span>
            <div className="w-44 h-1.5 bg-dark-50 rounded-full overflow-hidden border border-slate-800 mt-2">
              <div
                className="h-full bg-electric-500 rounded-full"
                style={{ width: `${data?.metrics.ramPercent || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
