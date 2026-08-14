import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-dark-300 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Glow ambient background */}
      <div className="absolute w-96 h-96 bg-red-500/10 rounded-full blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-electric-500/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      <div className="max-w-md w-full glass-panel rounded-2xl p-8 border-red-500/30 text-center shadow-2xl relative z-10">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 shadow-glow">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Access Denied
        </h1>

        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          You are not authorized to use EnzoCord Multi Music. Access to this control panel is strictly limited to the configured owner account.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-dark-50 border border-slate-700 text-slate-200 hover:text-white hover:border-electric-500 transition-all duration-300 font-medium text-sm w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </main>
  );
}
