'use client';

import { useState, useEffect } from 'react';
import { Activity, Radio, Database, Zap, Globe, RefreshCw, Cpu, HardDrive, Server, ShieldCheck, Loader2 } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: string;
  isOk: boolean;
}

interface DiagnosticsData {
  services: ServiceStatus[];
  diagnostics: {
    activeBots: number;
    totalBots: number;
    voiceConnections: number;
    lavalinkConnected: boolean;
    uptimeSeconds: number;
    memoryUsageMB: number;
    totalMemoryMB: number;
  };
}

export default function MonitoringPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMonitoring = async () => {
    try {
      const res = await fetch('/api/dashboard/monitoring');
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
      }
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getIconForService = (name: string) => {
    if (name.includes('Gateway')) return Radio;
    if (name.includes('Voice')) return Activity;
    if (name.includes('Lavalink')) return Zap;
    if (name.includes('Database')) return Database;
    return Globe;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Health & Diagnostics</h1>
          <p className="text-slate-400 text-sm mt-1">
            Live connection matrix, voice connections, and subsystem operational indicators.
          </p>
        </div>
        <button
          onClick={fetchMonitoring}
          className="p-2.5 rounded-xl bg-dark-50 border border-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-electric-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Services Status Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data?.services.map((item, idx) => {
              const Icon = getIconForService(item.name);
              return (
                <div key={idx} className="glass-panel p-6 rounded-2xl border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{item.name}</h3>
                      <span className="text-xs text-slate-500 font-mono block mt-0.5">{item.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.isOk ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real Diagnostics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                <span>Active Voice Rooms</span>
                <Activity className="w-4 h-4 text-electric-400" />
              </div>
              <span className="text-2xl font-black text-white">
                {data?.diagnostics.voiceConnections || 0} / {data?.diagnostics.totalBots || 0}
              </span>
              <span className="text-xs text-slate-500 block mt-1">Bots streaming in voice channels</span>
            </div>

            <div className="glass-panel p-6 rounded-2xl border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                <span>Memory Allocation</span>
                <HardDrive className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-black text-white">
                {data?.diagnostics.memoryUsageMB || 0} MB
              </span>
              <span className="text-xs text-slate-500 block mt-1">
                Total host RAM: {data?.diagnostics.totalMemoryMB || 0} MB
              </span>
            </div>

            <div className="glass-panel p-6 rounded-2xl border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                <span>Subsystem Uptime</span>
                <Server className="w-4 h-4 text-electric-400" />
              </div>
              <span className="text-2xl font-black text-white">
                {formatUptime(data?.diagnostics.uptimeSeconds || 0)}
              </span>
              <span className="text-xs text-slate-500 block mt-1">Active node process</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
