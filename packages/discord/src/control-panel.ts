import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';

export interface ControlPanelTrackInfo {
  title: string;
  artist: string;
  duration: string;
  requestedBy?: string;
  controllerName?: string;
  isPlaying: boolean;
  isPaused: boolean;
  repeatMode: string;
  isShuffled: boolean;
  volume: number;
}

export function buildControlPanelEmbed(info: ControlPanelTrackInfo) {
  const embed = new EmbedBuilder()
    .setTitle('🎵 ENZOCORD MULTI MUSIC CONTROL PANEL')
    .setColor(0x00d2ff)
    .setDescription(
      info.isPlaying
        ? `**Currently Playing:**\n**${info.title}** - *${info.artist}*`
        : '**Status:** No music is currently playing.'
    )
    .addFields(
      {
        name: '👤 Controller',
        value: info.controllerName ? `@${info.controllerName}` : '`None`',
        inline: true,
      },
      {
        name: '🔊 Volume',
        value: `${info.volume}%`,
        inline: true,
      },
      {
        name: '🔁 Mode',
        value: info.repeatMode + (info.isShuffled ? ' | 🔀 Shuffled' : ''),
        inline: true,
      }
    )
    .setFooter({
      text: '© 2026 EnzoCord Multi Music • Control Panel',
    })
    .setTimestamp();

  return embed;
}

export function buildControlPanelComponents() {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_prev')
      .setLabel('Previous')
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_playpause')
      .setLabel('Play / Pause')
      .setEmoji('⏯️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_next')
      .setLabel('Next')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('Stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_shuffle')
      .setLabel('Shuffle')
      .setEmoji('🔀')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_repeat')
      .setLabel('Repeat')
      .setEmoji('🔁')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setLabel('Queue')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_volume')
      .setLabel('Volume')
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

export async function sendOrUpdateControlPanel(
  channel: TextChannel,
  info: ControlPanelTrackInfo,
  existingMessageId?: string | null
): Promise<string> {
  const embed = buildControlPanelEmbed(info);
  const components = buildControlPanelComponents();

  if (existingMessageId) {
    try {
      const msg = await channel.messages.fetch(existingMessageId);
      if (msg) {
        await msg.edit({ embeds: [embed], components });
        return msg.id;
      }
    } catch {
      // message deleted or fetch failed, recreate below
    }
  }

  const newMsg = await channel.send({ embeds: [embed], components });
  return newMsg.id;
}
