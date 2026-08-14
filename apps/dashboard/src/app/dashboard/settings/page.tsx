'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetService = async () => {
    setResetting(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/reset-service', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/wizard');
      } else {
        setError(data.error || 'Failed to reset service');
      }
    } catch {
      setError('Unexpected error during service reset');
    } finally {
      setResetting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">System Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configuration parameters and service reset controls.
        </p>
      </div>

      <div className="glass-panel p-8 rounded-3xl border-slate-800 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">General Configuration</h2>
            <p className="text-xs text-slate-500 font-mono">Main settings loaded from .env environment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-dark-100 border border-slate-800 flex justify-between">
            <span className="text-slate-500">Port</span>
            <span className="text-white font-bold">3000</span>
          </div>
          <div className="p-4 rounded-2xl bg-dark-100 border border-slate-800 flex justify-between">
            <span className="text-slate-500">Callback URL</span>
            <span className="text-electric-400 font-bold">http://localhost:3000/api/auth/callback</span>
          </div>
        </div>
      </div>

      {/* DANGER ZONE - Reset Service */}
      <div className="glass-panel p-8 rounded-3xl border-red-500/30 space-y-6 bg-red-950/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Danger Zone</h2>
            <p className="text-xs text-slate-400">Irreversible operational reset action.</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-dark-300/80 border border-red-500/20 text-xs text-slate-300 leading-relaxed">
          <p className="font-bold text-red-400 mb-1">Reset Service Action</p>
          This will completely reset EnzoCord Multi Music. All deployed bots will be stopped. EnzoCord-created Discord resources will be removed, and service deployment database records will be cleared. Lavalink configuration and owner credentials will remain intact.
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/20 text-red-400 text-xs border border-red-500/40">
            {error}
          </div>
        )}

        {showConfirm ? (
          <div className="p-6 rounded-2xl bg-dark-100 border border-red-500/40 space-y-4">
            <p className="text-sm text-white font-bold">
              Are you absolute sure you want to reset the service?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetService}
                disabled={resetting}
                className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-glow transition-all flex items-center gap-2"
              >
                {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, Reset Service Now
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-6 py-3 rounded-xl bg-dark-50 text-slate-300 hover:text-white text-xs font-medium border border-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-6 py-3.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs transition-all shadow-glow"
          >
            Reset Service
          </button>
        )}
      </div>
    </div>
  );
}
