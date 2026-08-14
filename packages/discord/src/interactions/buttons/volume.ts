import { ButtonInteraction, MessageFlags } from 'discord.js';
import { musicManager } from '@enzocord/music';
import { db } from '@enzocord/database';

export async function handleVolumeUpButton(
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

  const currentVol = player.volume ?? 100;
  const newVol = Math.min(100, currentVol + 5);
  player.setVolume(newVol);

  await db.musicSession.update({
    where: { botId },
    data: { volume: newVol },
  }).catch(() => {});

  await interaction.reply({
    content: `🔊 **Volume increased to:** \`${newVol}%\``,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleVolumeDownButton(
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

  const currentVol = player.volume ?? 100;
  const newVol = Math.max(0, currentVol - 5);
  player.setVolume(newVol);

  await db.musicSession.update({
    where: { botId },
    data: { volume: newVol },
  }).catch(() => {});

  await interaction.reply({
    content: `🔉 **Volume decreased to:** \`${newVol}%\``,
    flags: MessageFlags.Ephemeral,
  });
}
