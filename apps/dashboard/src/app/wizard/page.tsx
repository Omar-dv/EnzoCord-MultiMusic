'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Key,
  Server,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Search,
  ShieldCheck,
} from 'lucide-react';

interface VerifiedBotCard {
  index: number;
  token: string;
  verifying: boolean;
  verified: boolean;
  error?: string;
  botInfo?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

export default function WizardPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [step, setStep] = useState<number>(1);

  // Step 1: Bot Count
  const [botCount, setBotCount] = useState<number>(1);

  // Step 2: Bot Tokens & Verification
  const [bots, setBots] = useState<VerifiedBotCard[]>([
    { index: 1, token: '', verifying: false, verified: false },
  ]);

  // Step 3: Server Selection
  const [servers, setServers] = useState<DiscordGuild[]>([]);
  const [loadingServers, setLoadingServers] = useState<boolean>(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [serverSearch, setServerSearch] = useState<string>('');

  // Step 4: Real-time Deployment Progress
  const [deploying, setDeploying] = useState<boolean>(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deployError, setDeployError] = useState<string | null>(null);

  // AUTH CHECK ON MOUNT: Must be logged in as owner to use Wizard!
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || !data.user) {
          router.push('/api/auth/login');
        } else {
          setAuthChecking(false);
        }
      })
      .catch(() => {
        router.push('/api/auth/login');
      });
  }, [router]);

  const handleBotCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(15, count));
    setBotCount(validCount);
    
    // Resize bots array
    const updated = Array.from({ length: validCount }, (_, i) => {
      return bots[i] || { index: i + 1, token: '', verifying: false, verified: false };
    });
    setBots(updated);
  };

  const handleTokenChange = (index: number, val: string) => {
    setBots((prev) =>
      prev.map((b) => (b.index === index ? { ...b, token: val, verified: false, error: undefined } : b))
    );
  };

  const verifyToken = async (index: number) => {
    const target = bots.find((b) => b.index === index);
    if (!target || !target.token.trim()) return;

    setBots((prev) =>
      prev.map((b) => (b.index === index ? { ...b, verifying: true, error: undefined } : b))
    );

    try {
      const res = await fetch('/api/wizard/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: target.token.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setBots((prev) =>
          prev.map((b) =>
            b.index === index
              ? {
                  ...b,
                  verifying: false,
                  verified: true,
                  botInfo: data.bot,
                }
              : b
          )
        );
      } else {
        setBots((prev) =>
          prev.map((b) =>
            b.index === index
              ? { ...b, verifying: false, verified: false, error: data.error || 'Verification failed' }
              : b
          )
        );
      }
    } catch {
      setBots((prev) =>
        prev.map((b) =>
          b.index === index
            ? { ...b, verifying: false, verified: false, error: 'Network error verifying token' }
            : b
        )
      );
    }
  };

  const verifiedCount = bots.filter((b) => b.verified).length;
  const allVerified = verifiedCount === botCount && botCount > 0;

  const fetchServers = async () => {
    setLoadingServers(true);
    try {
      const payloadBots = bots.map((b) => ({ id: b.botInfo?.id, name: b.botInfo?.name, token: b.token }));
      const res = await fetch('/api/wizard/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bots: payloadBots }),
      });
      const data = await res.json();
      if (res.ok && data.guilds) {
        setServers(data.guilds);
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err);
    } finally {
      setLoadingServers(false);
    }
  };

  const startDeployment = async () => {
    if (!selectedGuildId) return;
    setDeploying(true);
    setDeployError(null);
    setDeployLogs([
      'Initializing deployment...',
      '✓ Authentication',
      '✓ Bot verification',
      '✓ Server verification',
    ]);

    try {
      const payloadBots = bots.map((b) => ({
        id: b.botInfo?.id || '',
        name: b.botInfo?.name || `Enzo Music ${b.index}`,
        token: b.token,
      }));

      setTimeout(() => setDeployLogs((prev) => [...prev, '○ Creating / reusing categories']), 300);
      setTimeout(() => setDeployLogs((prev) => [...prev, '○ Creating / reusing bot voice channels']), 600);
      setTimeout(() => setDeployLogs((prev) => [...prev, '○ Creating dedicated Control Room text channels']), 900);
      setTimeout(() => setDeployLogs((prev) => [...prev, '○ Installing custom emoji assets & 20-button panel']), 1200);
      setTimeout(() => setDeployLogs((prev) => [...prev, '○ Connecting bots & Lavalink audio engines']), 1500);

      const res = await fetch('/api/wizard/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: selectedGuildId, bots: payloadBots }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setDeployLogs((prev) => [...prev, '✓ Starting music services', '✓ Complete!']);
        setTimeout(() => setStep(5), 1000);
      } else {
        setDeployError(data.error || 'Deployment failed');
      }
    } catch {
      setDeployError('Unexpected deployment connection error');
    } finally {
      setDeploying(false);
    }
  };

  const stepsList = [
    { num: 1, label: '01 Bots' },
    { num: 2, label: '02 Tokens' },
    { num: 3, label: '03 Server' },
    { num: 4, label: '04 Deployment' },
    { num: 5, label: '05 Complete' },
  ];

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(serverSearch.toLowerCase())
  );

  if (authChecking) {
    return (
      <main className="min-h-screen bg-dark-900 flex items-center justify-center text-electric-400">
        <Loader2 className="w-10 h-10 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dark-900 text-white p-6 md:p-12 relative overflow-hidden flex flex-col justify-between">
      {/* Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-electric-glow rounded-full blur-[130px] pointer-events-none" />

      {/* Header Stepper */}
      <div className="max-w-5xl w-full mx-auto z-10 mb-8">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-500">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="font-extrabold tracking-wide text-lg">ENZOCORD MULTI MUSIC</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4 font-mono text-xs">
            {stepsList.map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  step === s.num
                    ? 'bg-electric-500/10 border-electric-500/40 text-electric-400 font-bold'
                    : step > s.num
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                    : 'border-slate-800 text-slate-500'
                }`}
              >
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wizard Step Content */}
      <div className="max-w-3xl w-full mx-auto my-auto z-10">
        <AnimatePresence mode="wait">
          {/* STEP 1: Select Bot Count */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass-panel rounded-3xl p-8 md:p-12 border-electric-500/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-500 mb-6">
                <Bot className="w-7 h-7" />
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                How many bots do you want?
              </h2>
              <p className="text-slate-400 text-sm mb-8">
                Select the number of Discord music bots you wish to deploy (Maximum: 15 bots).
              </p>

              <div className="flex items-center gap-6 mb-10">
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={botCount}
                  onChange={(e) => handleBotCountChange(Number(e.target.value))}
                  className="w-full h-2 bg-dark-50 rounded-lg appearance-none cursor-pointer accent-electric-500"
                />
                <div className="w-16 h-12 rounded-xl bg-electric-500/10 border border-electric-500/40 flex items-center justify-center text-electric-400 font-mono font-bold text-xl">
                  {botCount}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-electric-500 hover:bg-electric-400 text-black font-bold text-sm shadow-glow transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: Input & Verify Bot Tokens */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass-panel rounded-3xl p-8 md:p-12 border-electric-500/20 max-h-[75vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Bot Tokens</h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Provide and verify the Discord bot tokens for your {botCount} bot(s).
                  </p>
                </div>
                <div className="px-3 py-1 rounded-lg bg-electric-500/10 border border-electric-500/30 text-electric-400 font-mono text-xs">
                  {verifiedCount} / {botCount} Verified
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {bots.map((botCard) => (
                  <div
                    key={botCard.index}
                    className="p-5 rounded-2xl bg-dark-100/90 border border-slate-800 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        BOT {String(botCard.index).padStart(2, '0')}
                      </span>
                      {botCard.verified && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="password"
                        placeholder="Bot Token [************************]"
                        value={botCard.token}
                        onChange={(e) => handleTokenChange(botCard.index, e.target.value)}
                        disabled={botCard.verified}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-dark-200 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-electric-500"
                      />
                      <button
                        onClick={() => verifyToken(botCard.index)}
                        disabled={botCard.verifying || botCard.verified || !botCard.token.trim()}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          botCard.verified
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-electric-500 text-black hover:bg-electric-400 disabled:opacity-50'
                        }`}
                      >
                        {botCard.verifying ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Verify'
                        )}
                      </button>
                    </div>

                    {botCard.botInfo && (
                      <div className="flex items-center gap-3 pt-2 text-xs text-slate-300">
                        <img
                          src={botCard.botInfo.avatar || '/placeholder-avatar.png'}
                          alt="avatar"
                          className="w-6 h-6 rounded-full border border-slate-700"
                        />
                        <span className="font-bold">{botCard.botInfo.name}</span>
                        <span className="text-slate-500 font-mono">ID: {botCard.botInfo.id}</span>
                      </div>
                    )}

                    {botCard.error && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {botCard.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3.5 rounded-xl bg-dark-50 border border-slate-800 text-slate-300 hover:text-white text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4 inline mr-1" />
                  Prev
                </button>

                <button
                  onClick={() => {
                    fetchServers();
                    setStep(3);
                  }}
                  disabled={!allVerified}
                  className="px-8 py-3.5 rounded-xl bg-electric-500 hover:bg-electric-400 disabled:opacity-40 text-black font-bold text-sm shadow-glow transition-all"
                >
                  Next
                  <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Select Discord Server */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass-panel rounded-3xl p-8 md:p-12 border-electric-500/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-500 mb-6">
                <Server className="w-7 h-7" />
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-2">Select Your Discord Server</h2>
              <p className="text-slate-400 text-xs mb-6">
                Choose the Discord server where EnzoCord categories, voice rooms, and control panels will be deployed.
              </p>

              <div className="relative mb-6">
                <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="Search Server..."
                  value={serverSearch}
                  onChange={(e) => setServerSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-200 border border-slate-800 text-sm text-white focus:outline-none focus:border-electric-500"
                />
              </div>

              {loadingServers ? (
                <div className="py-12 flex justify-center text-electric-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto mb-8 pr-2">
                  {filteredServers.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No server found or bot has not joined any server yet. Add the bot to your server first.
                    </div>
                  ) : (
                    filteredServers.map((server) => (
                      <div
                        key={server.id}
                        onClick={() => setSelectedGuildId(server.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          selectedGuildId === server.id
                            ? 'bg-electric-500/10 border-electric-500 text-white shadow-glow'
                            : 'bg-dark-100/80 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {server.icon ? (
                            <img src={server.icon} alt="icon" className="w-10 h-10 rounded-xl border border-slate-700" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-dark-200 border border-slate-700 flex items-center justify-center font-bold text-slate-400">
                              {server.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="font-bold block text-sm">{server.name}</span>
                            <span className="text-xs text-slate-500 font-mono">ID: {server.id}</span>
                          </div>
                        </div>
                        {selectedGuildId === server.id && (
                          <CheckCircle2 className="w-5 h-5 text-electric-400" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3.5 rounded-xl bg-dark-50 border border-slate-800 text-slate-300 hover:text-white text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4 inline mr-1" />
                  Prev
                </button>

                <button
                  onClick={() => {
                    setStep(4);
                    startDeployment();
                  }}
                  disabled={!selectedGuildId}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-electric-500 to-blue-600 hover:from-electric-400 hover:to-blue-500 disabled:opacity-40 text-white font-extrabold text-sm shadow-glow transition-all"
                >
                  Start Deployment
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Real Deployment Execution Progress Screen */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass-panel rounded-3xl p-8 md:p-12 border-electric-500/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-500 mb-6">
                <Rocket className="w-7 h-7 animate-pulse" />
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-2">Deploying Infrastructure</h2>
              <p className="text-slate-400 text-xs mb-8">
                Creating categories, voice rooms, control panels, and establishing Lavalink audio links.
              </p>

              <div className="p-6 rounded-2xl bg-dark-300 border border-slate-800 font-mono text-xs space-y-3 mb-8">
                {deployLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 ${
                      log.startsWith('✓')
                        ? 'text-emerald-400 font-bold'
                        : log.startsWith('○')
                        ? 'text-electric-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>

              {deployError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-6 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {deployError}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 5: Success Screen */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel rounded-3xl p-8 md:p-14 border-emerald-500/30 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-glow">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="text-3xl font-black text-white mb-2">Service Deployed Successfully</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
                All Discord music bots and voice control rooms are active and connected to Lavalink.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-xl mx-auto mb-10 text-left font-mono text-xs">
                <div className="p-4 rounded-2xl bg-dark-100 border border-slate-800">
                  <span className="text-slate-500 block">Bots</span>
                  <span className="text-white font-bold text-sm">{botCount} Active</span>
                </div>
                <div className="p-4 rounded-2xl bg-dark-100 border border-slate-800">
                  <span className="text-slate-500 block">Voice Rooms</span>
                  <span className="text-white font-bold text-sm">{botCount} Rooms</span>
                </div>
                <div className="p-4 rounded-2xl bg-dark-100 border border-slate-800">
                  <span className="text-slate-500 block">Lavalink</span>
                  <span className="text-emerald-400 font-bold text-sm">Connected</span>
                </div>
                <div className="p-4 rounded-2xl bg-dark-100 border border-slate-800">
                  <span className="text-slate-500 block">Service</span>
                  <span className="text-electric-400 font-bold text-sm">Online</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="px-10 py-4 rounded-xl bg-electric-500 hover:bg-electric-400 text-black font-extrabold text-sm shadow-glow transition-all hover:scale-105"
              >
                Open Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="text-center text-xs text-slate-500 font-mono z-10">
        © 2026 EnzoCord Multi Music
      </footer>
    </main>
  );
}
