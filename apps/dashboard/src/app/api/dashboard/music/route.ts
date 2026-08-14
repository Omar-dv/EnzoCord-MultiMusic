import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@enzocord/database';
import { musicManager } from '@enzocord/music';
import { botManager } from '@enzocord/discord';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedBotId = searchParams.get('botId');

  const bots = await db.bot.findMany({
    orderBy: { createdAt: 'asc' },
  });

  if (bots.length === 0) {
    return NextResponse.json({
      bots: [],
      selectedBotId: null,
      playerState: null,
      controller: null,
    });
  }

  const targetBot = requestedBotId
    ? bots.find((b) => b.id === requestedBotId) || bots[0]
    : bots[0];

  const guildId = targetBot.guildId;
  const playerState = guildId
    ? musicManager.getPlayerState(targetBot.id, guildId)
    : null;

  const controller: any = await db.controller.findUnique({
    where: { botId: targetBot.id },
  });

  return NextResponse.json({
    bots: bots.map((b) => ({
      id: b.id,
      name: b.name,
      status: botManager.isBotRunning(b.id) ? 'ONLINE' : 'OFFLINE',
      voiceChannelId: b.voiceChannelId,
    })),
    selectedBotId: targetBot.id,
    guildId: targetBot.guildId,
    voiceChannelId: targetBot.voiceChannelId,
    playerState,
    controller: {
      mainUserId: controller?.mainUserId || controller?.userId || null,
      mainUsername: controller?.mainUsername || controller?.username || null,
      subUserId: controller?.subUserId || null,
      subUsername: controller?.subUsername || null,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { botId, action, value } = await request.json();

    if (!botId) {
      return NextResponse.json({ error: 'Missing botId' }, { status: 400 });
    }

    const bot = await db.bot.findUnique({ where: { id: botId } });
    if (!bot || !bot.guildId) {
      return NextResponse.json({ error: 'Bot or guild not found' }, { status: 404 });
    }

    const guildId = bot.guildId;
    const kazagumo = musicManager.getKazagumo(botId);
    let player = kazagumo?.getPlayer(guildId);

    switch (action) {
      case 'PLAY_QUERY': {
        if (!kazagumo || !value) {
          return NextResponse.json({ error: 'Missing query or music engine offline' }, { status: 400 });
        }
        if (!player) {
          if (!bot.voiceChannelId) {
            return NextResponse.json({ error: 'Bot has no voice channel assigned' }, { status: 400 });
          }
          player = await kazagumo.createPlayer({
            guildId,
            voiceId: bot.voiceChannelId,
            textId: bot.voiceChannelId,
            deaf: true,
            volume: 100,
          });
        }
        const searchResult = await musicManager.searchTrack(botId, value);
        if (!searchResult.tracks.length) {
          return NextResponse.json({ error: 'No tracks found' }, { status: 404 });
        }
        if (searchResult.type === 'PLAYLIST') {
          for (const track of searchResult.tracks) {
            player.queue.add(track);
          }
        } else {
          player.queue.add(searchResult.tracks[0]);
        }
        if (!player.playing && !player.paused) {
          await player.play();
        }
        return NextResponse.json({ success: true, message: 'Track added to playback' });
      }

      case 'RESUME': {
        if (player && player.paused) {
          player.pause(false);
        }
        return NextResponse.json({ success: true });
      }

      case 'PAUSE': {
        if (player && player.playing && !player.paused) {
          player.pause(true);
        }
        return NextResponse.json({ success: true });
      }

      case 'STOP': {
        if (player) {
          player.queue.clear();
          musicManager.clearHistory(botId, guildId);
          player.skip();
          player.pause(false);
        }
        return NextResponse.json({ success: true });
      }

      case 'SKIP': {
        if (player && player.queue.current) {
          musicManager.pushPreviousTrack(botId, guildId, player.queue.current);
          if (player.paused) {
            player.pause(false);
          }
          player.skip();
        }
        return NextResponse.json({ success: true });
      }

      case 'PREVIOUS': {
        if (player) {
          const prev = musicManager.popPreviousTrack(botId, guildId);
          if (prev) {
            if (player.queue.current) player.queue.unshift(player.queue.current);
            if (player.paused) {
              player.pause(false);
            }
            player.queue.unshift(prev);
            player.skip();
          }
        }
        return NextResponse.json({ success: true });
      }

      case 'VOLUME': {
        const vol = Number(value);
        if (!isNaN(vol) && vol >= 0 && vol <= 100 && player) {
          player.setVolume(vol);
          await db.musicSession.update({
            where: { botId },
            data: { volume: vol },
          }).catch(() => {});
        }
        return NextResponse.json({ success: true });
      }

      case 'SEEK': {
        const pos = Number(value);
        if (!isNaN(pos) && pos >= 0 && player && player.queue.current) {
          player.seek(pos);
        }
        return NextResponse.json({ success: true });
      }

      case 'SHUFFLE': {
        if (player && player.queue.length > 0) {
          player.queue.shuffle();
        }
        return NextResponse.json({ success: true });
      }

      case 'REPEAT': {
        if (player && ['none', 'track', 'queue'].includes(value)) {
          player.setLoop(value);
          await db.musicSession.update({
            where: { botId },
            data: { repeatMode: value.toUpperCase() },
          }).catch(() => {});
        }
        return NextResponse.json({ success: true });
      }

      case 'AUTOPLAY': {
        const nextState = musicManager.toggleAutoplay(botId, guildId);
        await db.musicSession.update({
          where: { botId },
          data: { isAutoplay: nextState },
        }).catch(() => {});
        return NextResponse.json({ success: true, autoplay: nextState });
      }

      case 'CLEAR_QUEUE': {
        if (player && player.queue.length > 0) {
          player.queue.clear();
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown music control action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Music action failed' }, { status: 500 });
  }
}
