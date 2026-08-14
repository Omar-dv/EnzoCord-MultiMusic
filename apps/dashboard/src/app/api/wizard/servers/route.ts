import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logger } from '@enzocord/shared';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bots } = await request.json();
    if (!Array.isArray(bots) || bots.length === 0) {
      return NextResponse.json({ error: 'At least one verified bot token is required' }, { status: 400 });
    }

    const firstBot = bots[0];
    const cleanToken = firstBot.token ? firstBot.token.trim() : '';

    if (!cleanToken) {
      return NextResponse.json({ error: 'Bot token is missing' }, { status: 400 });
    }

    // Fetch bot's joined guilds via Discord REST API
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bot ${cleanToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      logger.warn('Failed to fetch bot guilds via REST API:', errText);
      return NextResponse.json(
        { error: 'Unable to fetch bot guilds from Discord API. Make sure the bot token is valid.' },
        { status: 400 }
      );
    }

    const rawGuilds = await response.json();
    const guilds = rawGuilds.map((g: any) => ({
      id: g.id,
      name: g.name,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
    }));

    return NextResponse.json({ guilds });
  } catch (error: any) {
    logger.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Discord servers' },
      { status: 500 }
    );
  }
}
