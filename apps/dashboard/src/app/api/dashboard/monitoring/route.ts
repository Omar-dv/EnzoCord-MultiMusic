import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@enzocord/database';
import { lavalinkManager } from '@enzocord/music';
import { botManager } from '@enzocord/discord';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bots = await db.bot.findMany();
  const botStatuses = bots.map((b) => botManager.getBotStatus(b.id, b));
  const activeBotsCount = botStatuses.filter((b) => b.isReady).length;
  const voiceConnectedCount = botStatuses.filter((b) => b.voiceConnected).length;
  const lavalinkOnline = lavalinkManager.getStatus();

  // Test database connection
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const services = [
    {
      name: 'Discord Gateway',
      status: activeBotsCount > 0 ? `Connected (${activeBotsCount}/${bots.length} active)` : 'No bots running',
      isOk: activeBotsCount > 0 || bots.length === 0,
    },
    {
      name: 'Voice Manager',
      status: voiceConnectedCount > 0 ? `Connected (${voiceConnectedCount} voice rooms)` : 'Idle (0 in voice)',
      isOk: true,
    },
    {
      name: 'Lavalink Audio Node',
      status: lavalinkOnline ? 'Connected & Ready' : 'Disconnected',
      isOk: lavalinkOnline,
    },
    {
      name: 'SQL Database (Prisma SQLite)',
      status: dbOk ? 'Connected & Synced' : 'Connection Error',
      isOk: dbOk,
    },
    {
      name: 'Backend API Service',
      status: 'Operational (Next.js 14)',
      isOk: true,
    },
  ];

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return NextResponse.json({
    services,
    diagnostics: {
      activeBots: activeBotsCount,
      totalBots: bots.length,
      voiceConnections: voiceConnectedCount,
      lavalinkConnected: lavalinkOnline,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: Math.round(usedMem / (1024 * 1024)),
      totalMemoryMB: Math.round(totalMem / (1024 * 1024)),
    },
  });
}
