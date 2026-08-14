'use client';

import { useEffect, useState } from 'react';
import { ScrollText, ShieldCheck, Clock } from 'lucide-react';

interface AuditLogItem {
  id: string;
  action: string;
  details: string | null;
  userId: string | null;
  createdAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    fetch('/api/dashboard/logs')
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Audit Logs</h1>
        <p className="text-slate-400 text-sm mt-1">
          Historical record of authentication, bot lifecycle events, and deployment activities.
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-6 border-slate-800">
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No audit logs recorded yet.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-dark-100/90 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-electric-500/10 border border-electric-500/30 text-electric-400 font-mono font-bold">
                    {log.action}
                  </span>
                  <span className="text-slate-200">{log.details || 'No details specified'}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
