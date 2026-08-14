import {
  Client,
  Interaction,
  VoiceState,
  TextChannel,
  MessageFlags,
} from 'discord.js';
import { db } from '@enzocord/database';
import { musicManager } from '@enzocord/music';
import { controlPanelService } from './control-panel-service';
import { permissionService } from './permission-service';
import {
  handlePlayButton,
  handlePauseButton,
  handleStopButton,
  handleSkipButton,
  handlePreviousButton,
  handleVolumeUpButton,
  handleVolumeDownButton,
  handleShuffleButton,
  handleRepeatButton,
  handleQueueButton,
  handleSeekBackButton,
  handleSeekForwardButton,
  handleClearQueueButton,
  handleAutoplayButton,
  handleSelectMainControllerButton,
  handleSelectSubControllerButton,
  handleRemoveSubControllerButton,
  handleHelpButton,
  handleEnzocordButton,
  handleConnectButton,
  handleSearchModalSubmit,
  handleControllerSelectMenu,
} from './interactions';
import { controllerManager, voiceChannelService, emojiService } from '@enzocord/services';
import { logger } from '@enzocord/shared';

const globalObj = globalThis as any;
if (!globalObj.__enzocord_active_bot_runtimes) {
  globalObj.__enzocord_active_bot_runtimes = new Set<string>();
}
const activeRuntimes: Set<string> = globalObj.__enzocord_active_bot_runtimes;

export function clearBotRuntime(botId: string): void {
  activeRuntimes.delete(botId);
}

/**
 * Sets up isolated runtime event listeners for a single bot:
 * - Initializes Kazagumo (Lavalink)
 * - Establishes Control Panel in dedicated Control Room (Text Channel)
 * - Connects bot to Voice Channel
 * - Dynamically updates Voice Channel status
 * - Handles all 20 Emoji-Only button interactions
 */
export async function setupBotRuntime(client: Client, botId: string): Promise<void> {
  const botRecord = await db.bot.findUnique({ where: { id: botId } });
  if (!botRecord || !botRecord.guildId || !botRecord.voiceChannelId) {
    logger.warn(`[Bot ${botId}] Missing guild/voice channel record, skipping runtime setup`);
    return;
  }

  const guildId = botRecord.guildId;
  const voiceChannelId = botRecord.voiceChannelId;
  const controlChannelId = botRecord.controlChannelId || voiceChannelId;

  client.removeAllListeners('interactionCreate');
  client.removeAllListeners('voiceStateUpdate');

  activeRuntimes.add(botId);

  // Ensure Application Emojis from Developer Portal are synced/loaded for this bot
  try {
    await emojiService.installApplicationEmojis(client);
  } catch (emojiErr) {
    logger.warn(`[Bot ${botId}] Application emoji installation error:`, emojiErr);
  }

  // ─── 1. Initialize Kazagumo (Lavalink) ──────────────────────────────
  const kazagumo = musicManager.init(client, botId);

  const getControlRoom = async (): Promise<TextChannel | null> => {
    try {
      const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return null;
      const channel = guild.channels.cache.get(controlChannelId) || await guild.channels.fetch(controlChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        return channel as TextChannel;
      }
      return null;
    } catch {
      return null;
    }
  };

  const ensurePlayerAndJoin = async () => {
    try {
      let player = kazagumo.getPlayer(guildId);
      if (!player) {
        player = await kazagumo.createPlayer({
          guildId,
          voiceId: voiceChannelId,
          textId: controlChannelId,
          deaf: true,
          volume: 100,
        });
      } else if (player.voiceId !== voiceChannelId) {
        player.setVoiceChannel(voiceChannelId);
      }
      logger.info(`[Bot ${botId}] Kazagumo player active in voice channel ${voiceChannelId}`);
    } catch (err: any) {
      if (err?.code === 1 || err?.message?.includes('already connected')) {
        logger.info(`[Bot ${botId}] Kazagumo player already connected.`);
      } else {
        logger.error(`[Bot ${botId}] Error creating Kazagumo player:`, err);
      }
    }

    // Deploy or restore Control Panel in dedicated Control Room
    const room = await getControlRoom();
    if (room) {
      const msgId = await controlPanelService.sendOrUpdate(room, botId, guildId, botRecord.controlMessageId);
      if (msgId && msgId !== botRecord.controlMessageId) {
        botRecord.controlMessageId = msgId;
      }
    }
  };

  // Wait for Lavalink node ready
  const hasConnectedNode = Array.from(kazagumo.shoukaku.nodes.values()).some((n) => n.state === 1);
  if (hasConnectedNode) {
    ensurePlayerAndJoin();
  } else {
    kazagumo.shoukaku.once('ready', () => {
      ensurePlayerAndJoin();
    });
  }

  // ─── 2. Player Event Handlers & Voice Status ────────────────────────
  kazagumo.removeAllListeners('playerStart');
  kazagumo.removeAllListeners('playerEnd');
  kazagumo.removeAllListeners('playerEmpty');
  kazagumo.removeAllListeners('playerResolveError');
  kazagumo.removeAllListeners('playerException');
  kazagumo.removeAllListeners('playerClosed');
  kazagumo.removeAllListeners('playerStuck');

  kazagumo.on('playerStart', async (player, track) => {
    if (player.guildId !== guildId) return;
    logger.info(`[Bot ${botId}] ▶️ Now playing: ${track.title} by ${track.author}`);

    if (player.paused) {
      player.pause(false);
    }

    // Update dynamic voice channel status
    await voiceChannelService.setVoiceStatus(client, voiceChannelId, `🎵 ${track.title}`);

    const room = await getControlRoom();
    if (room) {
      const msgId = await controlPanelService.sendOrUpdate(room, botId, guildId, botRecord.controlMessageId);
      if (msgId) {
        controlPanelService.startProgressLoop(room, botId, guildId, msgId);
      }
    }
  });

  kazagumo.on('playerEnd', async (player) => {
    if (player.guildId !== guildId) return;
    logger.info(`[Bot ${botId}] ⏹️ Track ended in guild ${player.guildId}`);

    const room = await getControlRoom();
    if (room) {
      await controlPanelService.sendOrUpdate(room, botId, guildId, botRecord.controlMessageId);
    }
  });

  kazagumo.on('playerEmpty', async (player) => {
    if (player.guildId !== guildId) return;
    logger.info(`[Bot ${botId}] 📭 Queue empty in guild ${player.guildId}`);

    // Clear progress bar loop & set Voice Channel status to Nothing Playing
    controlPanelService.stopProgressLoop(botId, guildId);
    await voiceChannelService.setVoiceStatus(client, voiceChannelId, '🎵 Nothing Playing');

    // Handle Autoplay if enabled
    const triggered = await musicManager.handleAutoplay(botId, guildId);
    if (!triggered) {
      const room = await getControlRoom();
      if (room) {
        await controlPanelService.sendOrUpdate(room, botId, guildId, botRecord.controlMessageId);
      }
    }
  });

  kazagumo.on('playerResolveError', (player, track, message) => {
    if (player.guildId !== guildId) return;
    logger.error(`[Bot ${botId}] ❌ Resolve error for "${track?.title}": ${message}`);
  });

  kazagumo.on('playerException', (player, data) => {
    if (player.guildId !== guildId) return;
    logger.error(`[Bot ${botId}] ❌ Player exception in guild ${player.guildId}:`, data);
  });

  kazagumo.on('playerClosed', (player, data) => {
    if (player.guildId !== guildId) return;
    logger.warn(`[Bot ${botId}] 🔌 WebSocket closed in guild ${player.guildId}:`, data);
  });

  kazagumo.on('playerStuck', (player, data) => {
    if (player.guildId !== guildId) return;
    logger.warn(`[Bot ${botId}] ⚠️ Player stuck in guild ${player.guildId}:`, data);
  });

  // ─── 3. Unified Interaction Router (Buttons, Modals, Selects) ────────
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (
      !interaction.isButton() &&
      !interaction.isModalSubmit() &&
      !interaction.isUserSelectMenu()
    ) {
      return;
    }

    // Check permissions
    const perm = await permissionService.validate(
      interaction as any,
      botId,
      guildId,
      voiceChannelId
    );

    if (!perm.allowed) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: perm.reason || '❌ **Permission denied.**',
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      return;
    }

    try {
      // Button Actions (Standardized custom_ids with fallback support)
      if (interaction.isButton()) {
        const customId = interaction.customId;

        switch (customId) {
          case 'music:play':
          case 'music_play':
            await handlePlayButton(interaction, botId, guildId);
            break;
          case 'music:pause':
          case 'music_pause': {
            await handlePauseButton(interaction, botId, guildId);
            const player = musicManager.getPlayer(botId, guildId);
            if (player?.queue?.current) {
              await voiceChannelService.setVoiceStatus(
                client,
                voiceChannelId,
                player.paused ? `⏸️ ${player.queue.current.title}` : `🎵 ${player.queue.current.title}`
              );
            }
            break;
          }
          case 'music:stop':
          case 'music_stop':
            await handleStopButton(interaction, botId, guildId);
            await voiceChannelService.setVoiceStatus(client, voiceChannelId, '🎵 Nothing Playing');
            break;
          case 'music:skip':
          case 'music_skip':
            await handleSkipButton(interaction, botId, guildId);
            break;
          case 'music:previous':
          case 'music_prev':
            await handlePreviousButton(interaction, botId, guildId);
            break;
          case 'music:volume_up':
          case 'music_vol_up':
            await handleVolumeUpButton(interaction, botId, guildId);
            break;
          case 'music:volume_down':
          case 'music_vol_down':
            await handleVolumeDownButton(interaction, botId, guildId);
            break;
          case 'music:shuffle':
          case 'music_shuffle':
            await handleShuffleButton(interaction, botId, guildId);
            break;
          case 'music:repeat':
          case 'music_repeat':
            await handleRepeatButton(interaction, botId, guildId);
            break;
          case 'music:queue':
          case 'music_queue':
            await handleQueueButton(interaction, botId, guildId);
            break;
          case 'ctrl:sub_controller':
          case 'ctrl_select_sub':
            await handleSelectSubControllerButton(interaction, botId, guildId, voiceChannelId);
            break;
          case 'ctrl:remove_sub':
          case 'ctrl_remove_sub':
            await handleRemoveSubControllerButton(interaction, botId, guildId);
            break;
          case 'ctrl:main_controller':
          case 'ctrl_select_main':
            await handleSelectMainControllerButton(interaction, botId, guildId, voiceChannelId);
            break;
          case 'music:help':
          case 'music_help':
            await handleHelpButton(interaction);
            break;
          case 'music:enzocord':
          case 'music_enzocord':
            await handleEnzocordButton(interaction);
            break;
          case 'music:seek_back':
          case 'music_seek_back':
            await handleSeekBackButton(interaction, botId, guildId);
            break;
          case 'music:seek_forward':
          case 'music_seek_forward':
            await handleSeekForwardButton(interaction, botId, guildId);
            break;
          case 'music:clear_queue':
          case 'music_clear_queue':
            await handleClearQueueButton(interaction, botId, guildId);
            break;
          case 'music:autoplay':
          case 'music_autoplay':
            await handleAutoplayButton(interaction, botId, guildId);
            break;
          case 'music:connect':
          case 'music_connect':
          case 'music:disconnect':
          case 'music_disconnect':
            await handleConnectButton(interaction, botId, guildId, voiceChannelId);
            break;
          default:
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: '❓ **Unknown action.**',
                flags: MessageFlags.Ephemeral,
              });
            }
        }

        // Refresh control panel after non-modal button interactions
        const isModalOrSelect =
          customId === 'music:play' ||
          customId === 'music_play' ||
          customId === 'ctrl:main_controller' ||
          customId === 'ctrl_select_main' ||
          customId === 'ctrl:sub_controller' ||
          customId === 'ctrl_select_sub' ||
          customId === 'music:help' ||
          customId === 'music_help' ||
          customId === 'music:enzocord' ||
          customId === 'music_enzocord';

        if (!isModalOrSelect) {
          const room = await getControlRoom();
          if (room) {
            await controlPanelService.sendOrUpdate(room, botId, guildId, botRecord.controlMessageId);
          }
        }
      }

      // Modal Submissions
      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'play_search_modal') {
          await handleSearchModalSubmit(interaction, botId, guildId, voiceChannelId);
          const room = await getControlRoom();
          if (room) {
            await controlPanelService.sendOrUpdate(room, botId, guildId, botRecord.controlMessageId);
          }
        }
      }

      // User Select Menu Submissions
      if (interaction.isUserSelectMenu()) {
        await handleControllerSelectMenu(interaction, botId, guildId, voiceChannelId);
        const room = await getControlRoom();
        if (room) {
          await controlPanelService.sendOrUpdate(room, botId, guildId, botRecord.controlMessageId);
        }
      }
    } catch (err: any) {
      logger.error(`[Bot ${botId}] Interaction execution error:`, err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `❌ **Error:** ${err?.message || 'Something went wrong processing your request.'}`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  });

  // ─── 4. Voice State Update (Controller Presence & Auto-Transfer) ──────
  client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
    try {
      await controllerManager.handleVoiceStateUpdate(
        oldState,
        newState,
        botId,
        voiceChannelId
      );

      const room = await getControlRoom();
      if (room) {
        await controlPanelService.sendOrUpdate(room, botId, guildId, botRecord.controlMessageId);
      }
    } catch (err) {
      logger.error(`[Bot ${botId}] voiceStateUpdate error:`, err);
    }
  });

  logger.info(`[Bot ${botId}] Runtime successfully initialized with Control Room & Dynamic Voice Status`);
}
