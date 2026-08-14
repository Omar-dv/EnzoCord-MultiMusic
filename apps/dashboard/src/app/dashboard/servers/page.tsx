'use client';

import { Server, CheckCircle2, ShieldCheck, Hash, Volume2 } from 'lucide-react';

export default function ServersPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Guild Infrastructure</h1>
        <p className="text-slate-400 text-sm mt-1">
          Connected Discord servers and deployed category/channel structures.
        </p>
      </div>

      <div className="glass-panel p-8 rounded-3xl border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400 font-bold">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Target Discord Server</h2>
              <p className="text-xs text-slate-500 font-mono">EnzoCord Multi Music Guild Deployment</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 rounded-2xl bg-dark-100 border border-slate-800 space-y-2">
            <span className="text-xs font-mono text-slate-500 block uppercase">Created Categories</span>
            <div className="flex items-center gap-2 text-sm text-slate-200 font-semibold">
              <Hash className="w-4 h-4 text-electric-400" />
              🎵 Enzo Music 01 - 15
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-dark-100 border border-slate-800 space-y-2">
            <span className="text-xs font-mono text-slate-500 block uppercase">Created Voice & Control Rooms</span>
            <div className="flex items-center gap-2 text-sm text-slate-200 font-semibold">
              <Volume2 className="w-4 h-4 text-electric-400" />
              🔊 Music Room & 💬 Control Panel
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
