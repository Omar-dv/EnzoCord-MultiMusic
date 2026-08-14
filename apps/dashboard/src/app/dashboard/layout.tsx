'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Music,
  Server,
  Activity,
  ScrollText,
  Settings,
  ExternalLink,
  LogOut,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

interface OwnerUser {
  id: string;
  username: string;
  avatar: string | null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [owner, setOwner] = useState<OwnerUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setOwner(data.user);
        } else {
          router.push('/api/auth/login');
        }
      })
      .catch(() => router.push('/api/auth/login'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/bots', label: 'Bots', icon: Bot },
    { href: '/dashboard/music', label: 'Music', icon: Music },
    { href: '/dashboard/servers', label: 'Servers', icon: Server },
    { href: '/dashboard/monitoring', label: 'Monitoring', icon: Activity },
    { href: '/dashboard/logs', label: 'Logs', icon: ScrollText },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-dark-200 border-r border-slate-800/80 flex flex-col justify-between p-6 z-20 shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-500 shadow-glow">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-wider text-base bg-clip-text text-transparent bg-gradient-to-r from-white to-electric-400">
                ENZOCORD
              </span>
              <span className="text-[10px] block text-slate-400 font-mono tracking-widest uppercase">
                Multi Music
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-electric-500/15 border border-electric-500/40 text-electric-400 shadow-glow'
                      : 'text-slate-400 hover:text-white hover:bg-dark-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Actions */}
        <div className="pt-6 border-t border-slate-800/80 space-y-4">
          <a
            href="https://discord.gg/ec-s"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-dark-100 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-electric-400" />
              EnzoCord
            </span>
            <span className="text-[10px] text-slate-500 font-mono">v1.0</span>
          </a>

          {owner && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-dark-300 border border-slate-800">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img
                  src={owner.avatar || '/placeholder-avatar.png'}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border border-slate-700 shrink-0"
                />
                <div className="truncate">
                  <span className="font-bold text-xs text-white block truncate">
                    @{owner.username}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <UserCheck className="w-2.5 h-2.5" /> Owner
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-dark-900">
        {children}
      </main>
    </div>
  );
}
