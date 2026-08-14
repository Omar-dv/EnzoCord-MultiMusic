import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { musicManager } from '@enzocord/music';
import { logger } from '@enzocord/shared';

export async function handleSearchModalSubmit(
  interaction: ModalSubmitInteraction,
  botId: string,
  guildId: string,
  voiceChannelId: string
): Promise<void> {
  const query = interaction.fields.getTextInputValue('search_query').trim();
  if (!query) {
    await interaction.reply({
      content: '❌ **Please enter a valid song name or URL.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const kazagumo = musicManager.getKazagumo(botId);
    if (!kazagumo) {
      await interaction.editReply({
        content: '❌ **Music engine is not ready. Please try again shortly.**',
      });
      return;
    }

    // Verify Lavalink node is actually connected
    const hasNode = Array.from(kazagumo.shoukaku.nodes.values()).some((n: any) => n.state === 1);
    if (!hasNode) {
      await interaction.editReply({
        content: '❌ **سيرفر Lavalink غير متصل حالياً.**\nيرجى التأكد من تشغيل سيرفر Lavalink.',
      });
      return;
    }

    // Get or create player
    let player = kazagumo.getPlayer(guildId);
    if (!player) {
      player = await kazagumo.createPlayer({
        guildId,
        voiceId: voiceChannelId,
        textId: voiceChannelId,
        deaf: true,
        volume: 100,
      });
    }

    // Use smart searchTrack with URL cleaning & Spotify oEmbed fallback
    const searchResult = await musicManager.searchTrack(botId, query, interaction.user);

    if (!searchResult || !searchResult.tracks.length) {
      await interaction.editReply({
        content: `❌ **No results found for:** \`${query}\``,
      });
      return;
    }

    if (searchResult.type === 'PLAYLIST') {
      for (const track of searchResult.tracks) {
        player.queue.add(track);
      }
      if (!player.playing && !player.paused) {
        await player.play();
      }
      await interaction.editReply({
        content: `🎶 **Added playlist to queue:** **${searchResult.playlistName || query}** (${searchResult.tracks.length} tracks)`,
      });
    } else {
      const track = searchResult.tracks[0];
      player.queue.add(track);
      if (!player.playing && !player.paused) {
        await player.play();
      }
      await interaction.editReply({
        content: `🎶 **${player.playing ? 'Added to queue' : 'Now playing'}:** **${track.title}** by *${track.author}*`,
      });
    }
  } catch (err: any) {
    logger.error(`[Bot ${botId}] Error searching/playing track:`, err);
    await interaction.editReply({
      content: `❌ **Playback Error:** ${err?.message || 'Failed to resolve audio stream'}`,
    });
  }
}
