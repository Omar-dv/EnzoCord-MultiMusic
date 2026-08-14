import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  MessageFlags,
} from 'discord.js';
import { musicManager } from '@enzocord/music';

export async function handlePlayButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const player = musicManager.getPlayer(botId, guildId);

  // If paused and has active track -> resume
  if (player && player.paused && player.queue.current) {
    player.pause(false);
    await interaction.reply({
      content: '▶️ **Resumed playback.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // If nothing playing or no active track -> show modal to search/enter track URL
  const modal = new ModalBuilder()
    .setCustomId('play_search_modal')
    .setTitle('🎵 Play a Song');

  const searchInput = new TextInputBuilder()
    .setCustomId('search_query')
    .setLabel('Song name or URL')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Wegz - ElBakht, or a YouTube/Spotify URL')
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(250);

  const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(searchInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export async function handlePauseButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const player = musicManager.getPlayer(botId, guildId);

  if (!player || !player.queue.current) {
    await interaction.reply({
      content: '❌ **No music is currently playing.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (player.paused) {
    await interaction.reply({
      content: '⏸️ **The track is already paused.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  player.pause(true);
  await interaction.reply({
    content: '⏸️ **Paused playback.**',
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleStopButton(
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

  player.queue.clear();
  musicManager.clearHistory(botId, guildId);
  player.skip();
  player.pause(false);

  await interaction.reply({
    content: '⏹️ **Playback stopped and queue cleared.**',
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleSkipButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const player = musicManager.getPlayer(botId, guildId);

  if (!player || !player.queue.current) {
    await interaction.reply({
      content: '❌ **Nothing is playing to skip.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const current = player.queue.current;
  if (current) {
    musicManager.pushPreviousTrack(botId, guildId, current);
  }

  const nextTrack = player.queue.length > 0 ? player.queue[0] : null;

  // If player was paused, unpause so the new track starts in active playing state
  if (player.paused) {
    player.pause(false);
  }
  player.skip();

  await interaction.reply({
    content: nextTrack
      ? `⏭️ **Skipped to:** ${nextTrack.title}`
      : '⏭️ **Skipped.** Queue is now empty.',
    flags: MessageFlags.Ephemeral,
  });
}

export async function handlePreviousButton(
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

  const previous = musicManager.popPreviousTrack(botId, guildId);
  if (!previous) {
    await interaction.reply({
      content: '❌ **No previous track available in history.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Put current track back in queue if playing
  if (player.queue.current) {
    player.queue.unshift(player.queue.current);
  }

  // If player was paused, unpause so previous track starts in active playing state
  if (player.paused) {
    player.pause(false);
  }

  player.queue.unshift(previous);
  player.skip();

  await interaction.reply({
    content: `⏮️ **Playing previous track:** ${previous.title}`,
    flags: MessageFlags.Ephemeral,
  });
}
