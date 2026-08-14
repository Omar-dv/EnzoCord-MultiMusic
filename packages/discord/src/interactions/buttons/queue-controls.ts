import { ButtonInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { musicManager } from '@enzocord/music';
import { formatTime } from '../../control-panel-service';
import { db } from '@enzocord/database';

export async function handleShuffleButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const player = musicManager.getPlayer(botId, guildId);
  if (!player || player.queue.length === 0) {
    await interaction.reply({
      content: '❌ **Queue is empty, nothing to shuffle.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  player.queue.shuffle();
  await interaction.reply({
    content: `🔀 **Queue shuffled!** (${player.queue.length} track${player.queue.length === 1 ? '' : 's'})`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleRepeatButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const player = musicManager.getPlayer(botId, guildId);
  if (!player) {
    await interaction.reply({
      content: '❌ **No player active.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modes: Array<'none' | 'track' | 'queue'> = ['none', 'track', 'queue'];
  const currentIndex = modes.indexOf(player.loop);
  const nextMode = modes[(currentIndex + 1) % modes.length];
  player.setLoop(nextMode);

  await db.musicSession.update({
    where: { botId },
    data: { repeatMode: nextMode.toUpperCase() },
  }).catch(() => {});

  const labels: Record<string, string> = {
    none: '🔁 **Repeat mode:** `OFF`',
    track: '🔂 **Repeat mode:** `Current Track`',
    queue: '🔁 **Repeat mode:** `Entire Queue`',
  };

  await interaction.reply({
    content: labels[nextMode],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleQueueButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const player = musicManager.getPlayer(botId, guildId);
  if (!player || (!player.queue.current && player.queue.length === 0)) {
    await interaction.reply({
      content: '📜 **The music queue is currently empty.**\nPress **▶️ Play** to add tracks!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const current = player.queue.current;
  let description = '';

  if (current) {
    const requesterName = (current.requester as any)?.username || (current.requester as any)?.id;
    description += `### 🎶 Now Playing\n**${current.title}** — *${current.author}*\n` +
      `⏱️ Duration: \`${formatTime(current.length || 0)}\`${requesterName ? ` • Requester: <@${requesterName}>` : ''}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n### 📜 Up Next\n`;
  }

  if (player.queue.length > 0) {
    const maxTracks = Math.min(player.queue.length, 12);
    for (let i = 0; i < maxTracks; i++) {
      const t = player.queue[i];
      const req = (t.requester as any)?.username || (t.requester as any)?.id;
      description += `\`${i + 1}.\` **${t.title}** — *${t.author}* (\`${formatTime(t.length || 0)}\`)${req ? ` [<@${req}>]` : ''}\n`;
    }
    if (player.queue.length > maxTracks) {
      description += `\n*...and ${player.queue.length - maxTracks} more tracks in queue*`;
    }
  } else {
    description += '*No upcoming tracks in queue.*';
  }

  const totalDurationMs = (current?.length || 0) + player.queue.reduce((acc, t) => acc + (t.length || 0), 0);

  const embed = new EmbedBuilder()
    .setTitle('📜 Music Queue')
    .setColor(0x8b5cf6)
    .setDescription(description)
    .setFooter({
      text: `Total: ${player.queue.length + (current ? 1 : 0)} track(s) • Total Time: ${formatTime(totalDurationMs)}`,
    })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleSeekBackButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const player = musicManager.getPlayer(botId, guildId);
  if (!player || !player.queue.current) {
    await interaction.reply({
      content: '❌ **No track currently playing to seek.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const currentPos = player.position || 0;
  const newPos = Math.max(0, currentPos - 10000);
  player.seek(newPos);

  await interaction.reply({
    content: `⏪ **Seeked backward 10s:** \`${formatTime(newPos)}\` / \`${formatTime(player.queue.current.length || 0)}\``,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleSeekForwardButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const player = musicManager.getPlayer(botId, guildId);
  if (!player || !player.queue.current) {
    await interaction.reply({
      content: '❌ **No track currently playing to seek.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const trackLength = player.queue.current.length || 0;
  const currentPos = player.position || 0;
  const newPos = Math.min(trackLength, currentPos + 10000);
  player.seek(newPos);

  await interaction.reply({
    content: `⏩ **Seeked forward 10s:** \`${formatTime(newPos)}\` / \`${formatTime(trackLength)}\``,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleClearQueueButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const player = musicManager.getPlayer(botId, guildId);
  if (!player || player.queue.length === 0) {
    await interaction.reply({
      content: '❌ **Queue is already empty.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const clearedCount = player.queue.length;
  player.queue.clear();

  await interaction.reply({
    content: `🗑️ **Cleared ${clearedCount} track(s) from the queue.** (Current track continues playing)`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleAutoplayButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const isEnabled = musicManager.toggleAutoplay(botId, guildId);

  await db.musicSession.update({
    where: { botId },
    data: { isAutoplay: isEnabled },
  }).catch(() => {});

  await interaction.reply({
    content: isEnabled
      ? '🔄 **Autoplay is now `ENABLED`.** Similar recommended tracks will play when the queue ends.'
      : '🔄 **Autoplay is now `DISABLED`.**',
    flags: MessageFlags.Ephemeral,
  });
}
