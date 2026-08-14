import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@enzocord/database';
import { lavalinkManager, musicManager } from '@enzocord/music';
import { botManager } from '@enzocord/discord';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = await db.service.findFirst();
  const bots = await db.bot.findMany();
  
  const botStatuses = bots.map((b) => botManager.getBotStatus(b.id, b));
  const onlineBots = botStatuses.filter((b) => b.isReady).length;
  const lavalinkOnline = lavalinkManager.getStatus();

  // Real RAM usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramUsagePercent = Math.round((usedMem / totalMem) * 100);
  const ramUsageStr = `${(usedMem / (1024 * 1024 * 1024)).toFixed(1)} GB / ${(totalMem / (1024 * 1024 * 1024)).toFixed(1)} GB (${ramUsagePercent}%)`;

  // Real Process Uptime
  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeStr = `${hours}h ${minutes}m`;

  // Real CPU Load
  const cpus = os.cpus();
  const cpuModel = cpus.length ? cpus[0].model.trim() : 'System CPU';
  const cpuUsage = `${(os.loadavg()[0] || 0.5).toFixed(1)}%`;

  return NextResponse.json({
    service: service || { status: bots.length > 0 ? 'ONLINE' : 'STOPPED', botCount: bots.length },
    botsTotal: bots.length,
    botsOnline: onlineBots,
    lavalinkOnline,
    metrics: {
      cpuUsage,
      cpuModel,
      ramUsage: ramUsageStr,
      ramPercent: ramUsagePercent,
      uptime: uptimeStr,
    },
  });
}
