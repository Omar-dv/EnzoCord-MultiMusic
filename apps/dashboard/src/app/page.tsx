'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Bot,
  Zap,
  Radio,
  Sliders,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  LogIn,
  Play,
  UserCheck,
  LogOut,
  Lock,
} from 'lucide-react';

const pages = [
  {
    id: 1,
    title: 'ENZOCORD MULTI MUSIC',
    subtitle: 'Your Discord music infrastructure. One powerful control center.',
    icon: Music,
    gradient: 'from-blue-600/20 via-electric-500/20 to-transparent',
  },
  {
    id: 2,
    title: 'MULTI-BOT ENGINE',
    subtitle: 'Manage up to 15 high-performance Discord music bots simultaneously from one intuitive interface.',
    icon: Bot,
    gradient: 'from-electric-500/20 via-cyan-500/20 to-transparent',
  },
  {
    id: 3,
    title: 'LAVALINK POWERED',
    subtitle: 'Ultra-low latency audio processing powered by Lavalink infrastructure for 24/7 crystal-clear playback.',
    icon: Zap,
    gradient: 'from-blue-500/20 via-indigo-500/20 to-transparent',
  },
  {
    id: 4,
    title: 'SMART VOICE CONTROL',
    subtitle: 'Users entering the music room automatically receive controller access. When the controller leaves, control is transferred automatically.',
    icon: Radio,
    gradient: 'from-cyan-500/20 via-electric-400/20 to-transparent',
  },
  {
    id: 5,
    title: 'COMPLETE CONTROL',
    subtitle: 'Bots • Music • Queue • Voice • Real-time Monitoring • One-click Deployment',
    icon: Sliders,
    gradient: 'from-electric-500/30 via-blue-600/30 to-transparent',
  },
];

interface OwnerUser {
  id: string;
  username: string;
  avatar: string | null;
}

export default function LandingPage() {
  const [currentPage, setCurrentPage] = useState(0);
  const [owner, setOwner] = useState<OwnerUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setOwner(data.user);
        } else {
          setOwner(null);
        }
      })
      .catch(() => setOwner(null))
      .finally(() => setLoadingAuth(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setOwner(null);
  };

  const nextPage = () => {
    if (!owner) return;
    if (currentPage < pages.length - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const activePageData = pages[currentPage];
  const IconComponent = activePageData.icon;

  return (
    <main className="min-h-screen bg-dark-900 text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden selection:bg-electric-500 selection:text-black">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-electric-glow rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header / Brand & User State */}
      <header className="flex items-center justify-between z-10 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-500 shadow-glow">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-electric-400">
              ENZOCORD
            </span>
            <span className="text-xs block text-slate-400 font-mono tracking-widest uppercase">
              Multi Music
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://discord.gg/ec-s"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-100/80 border border-slate-800 text-slate-300 hover:text-white hover:border-electric-500/50 transition-all text-xs font-medium backdrop-blur-md"
          >
            <ExternalLink className="w-3.5 h-3.5 text-electric-400" />
            EnzoCord
          </a>

          {!loadingAuth && (
            owner ? (
              <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-dark-200 border border-slate-800">
                <img
                  src={owner.avatar || '/placeholder-avatar.png'}
                  alt="avatar"
                  className="w-7 h-7 rounded-full border border-slate-700"
                />
                <span className="text-xs font-bold text-white">@{owner.username}</span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Owner
                </span>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="text-slate-400 hover:text-red-400 ml-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <a
                href="/api/auth/login"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-electric-500 hover:bg-electric-400 text-black font-bold text-xs shadow-glow transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </a>
            )
          )}
        </div>
      </header>

      {/* Main 5-Page Interactive Slider */}
      <div className="max-w-4xl w-full mx-auto my-auto py-12 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="glass-panel rounded-3xl p-8 md:p-14 relative shadow-2xl border-electric-500/20 overflow-hidden"
          >
            {/* Slide Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${activePageData.gradient} pointer-events-none`} />

            {/* Slide Counter & Auth Lock Notice */}
            <div className="flex items-center justify-between text-xs font-mono tracking-widest mb-8">
              <span className="text-electric-400/80 uppercase">0{currentPage + 1} / 05</span>
              {!owner ? (
                <span className="text-amber-400 flex items-center gap-1.5 font-bold uppercase bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30">
                  <Lock className="w-3.5 h-3.5" /> Login Required To Access
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1.5 font-bold uppercase bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
                  <UserCheck className="w-3.5 h-3.5" /> Owner Authenticated
                </span>
              )}
            </div>

            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl bg-dark-50 border border-electric-500/30 flex items-center justify-center text-electric-500 shadow-glow mb-8">
              <IconComponent className="w-10 h-10" />
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
              {activePageData.title}
            </h1>

            <p className="text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed mb-10 font-normal">
              {activePageData.subtitle}
            </p>

            {/* Controls & Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800/80">
              {/* PAGE 1 */}
              {currentPage === 0 && (
                <>
                  {!owner ? (
                    <a
                      href="/api/auth/login"
                      className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-electric-500 hover:bg-electric-400 text-black font-bold text-sm shadow-glow transition-all duration-300 hover:scale-[1.02]"
                    >
                      <LogIn className="w-4 h-4" />
                      Login with Discord
                    </a>
                  ) : (
                    <a
                      href="/wizard"
                      className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-glow transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Service
                    </a>
                  )}

                  <a
                    href="https://discord.gg/ec-s"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-dark-50 border border-slate-700 text-slate-200 hover:border-electric-500/50 hover:text-white transition-all text-sm font-medium"
                  >
                    EnzoCord
                  </a>

                  {/* NEXT BUTTON: Enabled ONLY if owner is logged in */}
                  {owner ? (
                    <button
                      onClick={nextPage}
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-electric-500/90 hover:bg-electric-400 text-black font-bold text-sm shadow-glow transition-all ml-auto"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <a
                      href="/api/auth/login"
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-dark-50 border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-amber-500/50 transition-all text-sm font-medium ml-auto"
                      title="Please login first to navigate"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Login to Continue
                    </a>
                  )}
                </>
              )}

              {/* PAGES 2, 3, 4 */}
              {currentPage > 0 && currentPage < 4 && (
                <>
                  <button
                    onClick={prevPage}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-dark-50 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-sm font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>

                  {/* NEXT BUTTON: Enabled ONLY if owner is logged in */}
                  {owner ? (
                    <button
                      onClick={nextPage}
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-electric-500/90 hover:bg-electric-400 text-black font-bold text-sm shadow-glow transition-all ml-auto"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <a
                      href="/api/auth/login"
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-dark-50 border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-amber-500/50 transition-all text-sm font-medium ml-auto"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Login to Continue
                    </a>
                  )}
                </>
              )}

              {/* PAGE 5 */}
              {currentPage === 4 && (
                <>
                  <button
                    onClick={prevPage}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-dark-50 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-sm font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>

                  {owner ? (
                    <a
                      href="/wizard"
                      className="flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-electric-500 to-blue-600 hover:from-electric-400 hover:to-blue-500 text-white font-extrabold text-sm shadow-glow-lg transition-all duration-300 hover:scale-[1.03] ml-auto"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Service
                    </a>
                  ) : (
                    <a
                      href="/api/auth/login"
                      className="flex items-center gap-2.5 px-8 py-4 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-sm shadow-glow transition-all ml-auto hover:bg-amber-500/30"
                    >
                      <LogIn className="w-4 h-4" />
                      Login to Start Service
                    </a>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Page Indicators */}
        <div className="flex items-center justify-center gap-3 mt-8">
          {pages.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => {
                if (owner) setCurrentPage(idx);
              }}
              disabled={!owner}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentPage === idx
                  ? 'w-8 bg-electric-500 shadow-glow'
                  : owner
                  ? 'w-2 bg-slate-800 hover:bg-slate-700 cursor-pointer'
                  : 'w-2 bg-slate-850 opacity-40 cursor-not-allowed'
              }`}
            />
          ))}
        </div>
      </div>

      <footer className="text-center text-xs text-slate-500 font-mono tracking-wide z-10 max-w-7xl w-full mx-auto">
        © 2026 EnzoCord • All rights reserved
      </footer>
    </main>
  );
}
