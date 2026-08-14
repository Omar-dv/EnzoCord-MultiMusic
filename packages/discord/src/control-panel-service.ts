import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
  VoiceChannel,
} from 'discord.js';
import { db } from '@enzocord/database';
import { musicManager } from '@enzocord/music';
import { emojiService } from '@enzocord/services';
import { logger } from '@enzocord/shared';

export interface ControlPanelData {
  title?: string | null;
  artist?: string | null;
  artworkUrl?: string | null;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
  isPaused: boolean;
  volume: number;
  repeatMode: 'none' | 'track' | 'queue';
  isShuffled: boolean;
  isAutoplay: boolean;
  queueLength: number;
  mainUserId?: string | null;
  mainControllerName?: string | null;
  subUserId?: string | null;
  subControllerName?: string | null;
  guildId?: string | null;
}

export function formatTime(ms: number): string {
  if (!ms || isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remMins = minutes % 60;
    return `${hours}:${String(remMins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function createProgressBar(currentMs: number, totalMs: number, barLength: number = 14): string {
  if (!totalMs || totalMs <= 0) return '━━━━━━━━━━━━━━';
  const progress = Math.min(1, Math.max(0, currentMs / totalMs));
  const filledBars = Math.round(progress * barLength);
  const emptyBars = barLength - filledBars;

  const bar = '━'.repeat(Math.max(0, filledBars - 1)) + '🔘' + '━'.repeat(Math.max(0, emptyBars));
  return bar;
}

export function buildControlPanelEmbed(data: ControlPanelData): EmbedBuilder {
  const isPlayingOrPaused = data.isPlaying || data.isPaused;
  const positionStr = formatTime(data.positionMs);
  const durationStr = formatTime(data.durationMs);
  const progressBar = createProgressBar(data.positionMs, data.durationMs, 14);

  const repeatLabels: Record<string, string> = {
    none: 'OFF',
    track: '🔂 Track',
    queue: '🔁 Infinite',
  };

  const statusEmoji = data.isPaused ? '⏸️ Paused' : data.isPlaying ? '▶️ Playing' : '⏹️ Idle';

  // Electric Violet Palette: Primary #8B5CF6, Dark #6D28D9, Light Accent #A78BFA, Surface #18112B
  const embedColor = data.isPlaying ? 0x8b5cf6 : data.isPaused ? 0xa78bfa : 0x6d28d9;

  const mainControllerDisplay = data.mainUserId
    ? `<@${data.mainUserId}>`
    : (data.mainControllerName && /^\d+$/.test(data.mainControllerName))
      ? `<@${data.mainControllerName}>`
      : '`None`';

  const subControllerDisplay = data.subUserId
    ? `<@${data.subUserId}>`
    : (data.subControllerName && /^\d+$/.test(data.subControllerName))
      ? `<@${data.subControllerName}>`
      : '`None`';

  const embed = new EmbedBuilder()
    .setTitle('MULTI MUSIC')
    .setColor(embedColor)
    .setDescription(
      isPlayingOrPaused
        ? `### 🎶 [${data.title}](https://discord.gg/ec-s)\n` +
        `**Artist:** ${data.artist}\n\n` +
        `\`${positionStr}\` ${progressBar} \`${durationStr}\`\n` +
        `*Status: ${statusEmoji}*`
        : '### ⏹️ **No Music Playing**\nPress **▶️** below to start playing or enter a song name.'
    )
    .addFields(
      {
        name: '👑 Main Controller',
        value: mainControllerDisplay,
        inline: true,
      },
      {
        name: '👤 Sub Controller',
        value: subControllerDisplay,
        inline: true,
      },
      {
        name: '🔊 Volume',
        value: `\`${data.volume}%\``,
        inline: true,
      },
      {
        name: '🔁 Repeat',
        value: `\`${repeatLabels[data.repeatMode] || 'OFF'}\``,
        inline: true,
      },
      {
        name: '🔀 Shuffle',
        value: `\`${data.isShuffled ? 'Enabled' : 'Disabled'}\``,
        inline: true,
      },
      {
        name: '♾️ AutoPlay',
        value: `\`${data.isAutoplay ? 'ON' : 'OFF'}\``,
        inline: true,
      },
      {
        name: '📜 Queue',
        value: `\`${data.queueLength} tracks\``,
        inline: true,
      }
    )
    .setFooter({
      text: 'EnzoCord Multi Music • Electric Violet 20-Control System',
    })
    .setTimestamp();

  if (data.artworkUrl && isPlayingOrPaused) {
    embed.setThumbnail(data.artworkUrl);
  }

  return embed;
}

/**
 * Builds 20 Emoji-Only buttons across 4 rows of 5 buttons each.
 * Exact Layout:
 * Row 1: ⏸️   ⏮️   ▶️   ⏭️   ⏹️
 * Row 2: 🔁   🔉   ♾️   🔊   🔀
 * Row 3: ⏪   ❌   👑   👤   ⏩
 * Row 4: 🔌   🗑️   🔗   ❓   📜
 */
export function buildControlPanelComponents(guildId?: string | null): ActionRowBuilder<ButtonBuilder>[] {
  const getE = (name: string) => emojiService.getButtonEmoji(guildId, name);

  // ROW 1 — MAIN PLAYBACK: Pause | Previous | Play | Skip | Stop
  // ⏸️ | ⏮️ | ▶️ | ⏭️ | ⏹️
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music:pause')
      .setEmoji(getE('pause'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:previous')
      .setEmoji(getE('previous'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:play')
      .setEmoji(getE('play'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:skip')
      .setEmoji(getE('skip'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:stop')
      .setEmoji(getE('stop'))
      .setStyle(ButtonStyle.Secondary)
  );

  // ROW 2 — AUDIO & PLAYBACK MODES: Repeat | Volume Down | AutoPlay | Volume Up | Shuffle
  // 🔁 | 🔉 | ♾️ | 🔊 | 🔀
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music:repeat')
      .setEmoji(getE('repeat'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:volume_down')
      .setEmoji(getE('volume_down'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:autoplay')
      .setEmoji(getE('autoplay'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:volume_up')
      .setEmoji(getE('volume_up'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:shuffle')
      .setEmoji(getE('shuffle'))
      .setStyle(ButtonStyle.Secondary)
  );

  // ROW 3 — CONTROLLERS & SEEK: -10 Sec | Remove Sub Controller | Main Controller | Select Sub Controller | +10 Sec
  // ⏪ | ❌ | 👑 | 👤 | ⏩
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music:seek_back')
      .setEmoji(getE('seek_back'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ctrl:remove_sub')
      .setEmoji(getE('remove_sub_controller'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ctrl:main_controller')
      .setEmoji(getE('main_controller'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ctrl:sub_controller')
      .setEmoji(getE('select_sub_controller'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:seek_forward')
      .setEmoji(getE('seek_forward'))
      .setStyle(ButtonStyle.Secondary)
  );

  // ROW 4 — QUEUE / INFORMATION / CONNECTION: Connect | Delete Queue | EnzoCord | How To Use | Queue
  // 🔌 | 🗑️ | 🔗 | ❓ | 📜
  const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music:connect')
      .setEmoji(getE('connect'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:clear_queue')
      .setEmoji(getE('delete_queue'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:enzocord')
      .setEmoji(getE('enzocord'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:help')
      .setEmoji(getE('how_to_use'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music:queue')
      .setEmoji(getE('queue'))
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3, row4];
}

export class ControlPanelService {
  private static instance: ControlPanelService;
  private progressIntervals: Map<string, NodeJS.Timeout> = new Map();

  public constructor() { }

  public static getInstance(): ControlPanelService {
    if (!ControlPanelService.instance) {
      ControlPanelService.instance = new ControlPanelService();
    }
    return ControlPanelService.instance;
  }

  /**
   * Send or update the Control Panel inside the dedicated Control Room (Text Channel).
   */
  public async sendOrUpdate(
    channel: TextChannel | VoiceChannel,
    botId: string,
    guildId: string,
    existingMessageId?: string | null
  ): Promise<string | null> {
    try {
      if (channel?.guild) {
        await emojiService.installGuildEmojis(channel.guild);
      }
      const state = musicManager.getPlayerState(botId, guildId);
      const controller: any = await db.controller.findUnique({ where: { botId } });
      const mainUserId = controller?.mainUserId || controller?.userId || null;
      const subUserId = controller?.subUserId || null;

      const panelData: ControlPanelData = {
        title: state.title,
        artist: state.artist,
        artworkUrl: state.artworkUrl,
        durationMs: state.duration,
        positionMs: state.position,
        isPlaying: state.isPlaying,
        isPaused: state.isPaused,
        volume: state.volume,
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled,
        isAutoplay: state.isAutoplay,
        queueLength: state.queueLength,
        mainUserId,
        mainControllerName: controller?.mainUsername || controller?.username || null,
        subUserId,
        subControllerName: controller?.subUsername || null,
        guildId,
      };

      const embed = buildControlPanelEmbed(panelData);
      const components = buildControlPanelComponents(botId || guildId);

      // Try editing existing message
      if (existingMessageId) {
        try {
          const msg = await channel.messages.fetch(existingMessageId);
          if (msg) {
            await msg.edit({ embeds: [embed], components });
            return msg.id;
          }
        } catch {
          // Message was deleted or unreachable, recreate below
        }
      }

      // Send new panel message in Control Room
      const newMsg = await channel.send({ embeds: [embed], components });

      // Save ID to DB
      await db.bot.update({
        where: { id: botId },
        data: { controlMessageId: newMsg.id, controlChannelId: channel.id },
      }).catch(() => { });

      await (db.musicSession as any).upsert({
        where: { botId },
        create: {
          botId,
          guildId,
          voiceChannelId: channel.id,
          controlMessageId: newMsg.id,
          volume: state.volume,
          repeatMode: state.repeatMode.toUpperCase(),
          isAutoplay: state.isAutoplay,
        },
        update: {
          controlMessageId: newMsg.id,
          volume: state.volume,
          repeatMode: state.repeatMode.toUpperCase(),
          isAutoplay: state.isAutoplay,
        },
      }).catch(() => { });

      return newMsg.id;
    } catch (err) {
      logger.warn(`[Bot ${botId}] Failed to send/update control panel:`, err);
      return null;
    }
  }

  /**
   * Start live throttled progress bar updater for an active playing session.
   * Runs every 5-7 seconds to respect Discord rate limits.
   */
  public startProgressLoop(
    channel: TextChannel | VoiceChannel,
    botId: string,
    guildId: string,
    messageId: string
  ): void {
    const key = `${botId}:${guildId}`;
    this.stopProgressLoop(botId, guildId);

    const interval = setInterval(async () => {
      const state = musicManager.getPlayerState(botId, guildId);
      if (!state.isPlaying || state.isPaused) {
        return;
      }

      try {
        const controller: any = await db.controller.findUnique({ where: { botId } });
        const mainUserId = controller?.mainUserId || controller?.userId || null;
        const subUserId = controller?.subUserId || null;

        const panelData: ControlPanelData = {
          title: state.title,
          artist: state.artist,
          artworkUrl: state.artworkUrl,
          durationMs: state.duration,
          positionMs: state.position,
          isPlaying: state.isPlaying,
          isPaused: state.isPaused,
          volume: state.volume,
          repeatMode: state.repeatMode,
          isShuffled: state.isShuffled,
          isAutoplay: state.isAutoplay,
          queueLength: state.queueLength,
          mainUserId,
          mainControllerName: controller?.mainUsername || controller?.username || null,
          subUserId,
          subControllerName: controller?.subUsername || null,
          guildId,
        };

        const embed = buildControlPanelEmbed(panelData);
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (msg) {
          await msg.edit({ embeds: [embed] });
        }
      } catch {
        // Silently skip transient rate limit errors
      }
    }, 6000);

    this.progressIntervals.set(key, interval);
  }

  public stopProgressLoop(botId: string, guildId: string): void {
    const key = `${botId}:${guildId}`;
    const interval = this.progressIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.progressIntervals.delete(key);
    }
  }
}

export const controlPanelService = ControlPanelService.getInstance();
