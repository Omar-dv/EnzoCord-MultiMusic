import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@enzocord/database';
import { botManager, setupBotRuntime } from '@enzocord/discord';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const botRecords = await db.bot.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const bots = botRecords.map((record) => {
    return botManager.getBotStatus(record.id, record);
  });

  return NextResponse.json({ bots });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, botId } = await request.json();

    if (!botId) {
      return NextResponse.json({ error: 'Missing botId parameter' }, { status: 400 });
    }

    const bot = await db.bot.findUnique({ where: { id: botId } });
    if (!bot) {
      return NextResponse.json({ error: `Bot ${botId} not found in database` }, { status: 404 });
    }

    if (action === 'STOP') {
      await botManager.stopBot(botId);
      await db.auditLog.create({
        data: {
          action: 'BOT_STOPPED',
          details: `Bot ${botId} (${bot.name}) stopped by owner`,
          userId: session.owner?.id,
        },
      });
      return NextResponse.json({ success: true, message: `Bot ${bot.name} stopped successfully` });
    }

    if (action === 'START') {
      const client = await botManager.startBot(bot.id, bot.token);
      await setupBotRuntime(client, bot.id);
      await db.auditLog.create({
        data: {
          action: 'BOT_STARTED',
          details: `Bot ${botId} (${bot.name}) started by owner`,
          userId: session.owner?.id,
        },
      });
      return NextResponse.json({ success: true, message: `Bot ${bot.name} started successfully` });
    }

    if (action === 'RESTART') {
      await botManager.stopBot(bot.id);
      const client = await botManager.startBot(bot.id, bot.token);
      await setupBotRuntime(client, bot.id);
      await db.auditLog.create({
        data: {
          action: 'BOT_RESTARTED',
          details: `Bot ${botId} (${bot.name}) restarted by owner`,
          userId: session.owner?.id,
        },
      });
      return NextResponse.json({ success: true, message: `Bot ${bot.name} restarted successfully` });
    }

    if (action === 'REMOVE') {
      await botManager.stopBot(botId);

      await db.discordResource.deleteMany({ where: { botId } });
      await db.controller.deleteMany({ where: { botId } });
      await db.musicSession.deleteMany({ where: { botId } });
      await db.bot.delete({ where: { id: botId } });

      await db.auditLog.create({
        data: {
          action: 'BOT_REMOVED',
          details: `Bot ${botId} (${bot.name}) removed by owner`,
          userId: session.owner?.id,
        },
      });
      return NextResponse.json({ success: true, message: `Bot ${bot.name} removed successfully` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Bot action failed' }, { status: 500 });
  }
}
