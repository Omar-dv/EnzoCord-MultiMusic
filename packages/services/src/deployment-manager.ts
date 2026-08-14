import {
  ChannelType,
  Guild,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
} from 'discord.js';
import { db } from '@enzocord/database';
import { botManager, controlPanelService, setupBotRuntime } from '@enzocord/discord';
import { emojiService } from './emoji-service';
import { logger } from '@enzocord/shared';

export interface DeploymentBotConfig {
  id: string;
  name: string;
  token: string;
}

export class DeploymentManager {
  private static instance: DeploymentManager;

  public constructor() {}

  public static getInstance(): DeploymentManager {
    const globalObj = globalThis as any;
    if (!globalObj.__enzocord_deployment_manager) {
      globalObj.__enzocord_deployment_manager = new DeploymentManager();
    }
    return globalObj.__enzocord_deployment_manager;
  }

  public async deployBotsToGuild(
    guildId: string,
    bots: DeploymentBotConfig[],
    onProgress?: (step: string) => void
  ): Promise<void> {
    if (bots.length > 15) {
      throw new Error('Maximum 15 bots supported per deployment cluster');
    }

    logger.info(`Starting deployment of ${bots.length} bot(s) to guild ${guildId}`);
    onProgress?.('Initializing deployment...');

    // 1. Ensure Service record
    let service = await db.service.findFirst();
    if (!service) {
      service = await db.service.create({
        data: {
          name: 'EnzoCord Multi Music',
          status: 'DEPLOYING',
          botCount: bots.length,
          targetGuildId: guildId,
        },
      });
    } else {
      service = await db.service.update({
        where: { id: service.id },
        data: {
          status: 'DEPLOYING',
          botCount: bots.length,
          targetGuildId: guildId,
        },
      });
    }

    // Create deployment log entry
    const deployment = await db.deployment.create({
      data: {
        serviceId: service.id,
        guildId,
        status: 'IN_PROGRESS',
        logs: 'Deployment initiated',
      },
    });

    onProgress?.('✓ Authentication & Server verification');

    let botIndex = 1;
    for (const botConf of bots) {
      const paddedIndex = String(botIndex).padStart(2, '0');
      const botDisplayName = botConf.name || `Enzo Music ${paddedIndex}`;
      const categoryName = `🎵 ${botDisplayName}`;
      const voiceChannelName = botDisplayName; // Named strictly after the bot
      const controlRoomName = 'control'; // Named strictly "control"

      onProgress?.(`○ Connecting Bot ${paddedIndex} (${botDisplayName})...`);
      const client = await botManager.startBot(botConf.id, botConf.token);
      const guild = await client.guilds.fetch(guildId);

      // 1. Sync Application Emojis for the bot
      onProgress?.(`○ Syncing Application Emojis for Bot ${paddedIndex}...`);
      await emojiService.installApplicationEmojis(client);

      // Check existing bot record
      const existingBot = await db.bot.findUnique({ where: { id: botConf.id } });

      // 2. Create or reuse Category
      let category: CategoryChannel | null = null;
      if (existingBot?.categoryId) {
        category = (guild.channels.cache.get(existingBot.categoryId) as CategoryChannel) ||
          ((await guild.channels.fetch(existingBot.categoryId).catch(() => null)) as CategoryChannel);
      }
      if (!category) {
        onProgress?.(`○ Creating Category for Bot ${paddedIndex}...`);
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
        });
      }

      // 3. Create or reuse Voice Channel (named strictly {Bot Name})
      let voiceChannel: VoiceChannel | null = null;
      if (existingBot?.voiceChannelId) {
        voiceChannel = (guild.channels.cache.get(existingBot.voiceChannelId) as VoiceChannel) ||
          ((await guild.channels.fetch(existingBot.voiceChannelId).catch(() => null)) as VoiceChannel);
      }
      if (!voiceChannel) {
        onProgress?.(`○ Creating Voice Channel "${voiceChannelName}" for Bot ${paddedIndex}...`);
        voiceChannel = await guild.channels.create({
          name: voiceChannelName,
          type: ChannelType.GuildVoice,
          parent: category.id,
        });
      }

      // 4. Create or reuse Control Room (Dedicated Text Channel named strictly "control")
      let controlRoom: TextChannel | null = null;
      if (existingBot?.controlChannelId) {
        controlRoom = (guild.channels.cache.get(existingBot.controlChannelId) as TextChannel) ||
          ((await guild.channels.fetch(existingBot.controlChannelId).catch(() => null)) as TextChannel);
        if (controlRoom && controlRoom.name !== 'control') {
          await controlRoom.setName('control').catch(() => {});
        }
      }
      if (!controlRoom) {
        onProgress?.(`○ Creating dedicated Control Room "control" for Bot ${paddedIndex}...`);
        controlRoom = await guild.channels.create({
          name: 'control',
          type: ChannelType.GuildText,
          parent: category.id,
          topic: `EnzoCord Multi Music Control Panel for ${botDisplayName}`,
        });
      }

      // 5. Post or update the 20-button Control Panel in the Control Room Text Channel
      onProgress?.(`○ Deploying 20-button Control Panel into Control Room...`);
      const msgId = await controlPanelService.sendOrUpdate(
        controlRoom,
        botConf.id,
        guildId,
        existingBot?.controlMessageId
      );

      // 6. Save channel & message references in database
      await db.bot.upsert({
        where: { id: botConf.id },
        create: {
          id: botConf.id,
          name: botConf.name,
          token: botConf.token,
          status: 'ONLINE',
          uptime: new Date(),
          serviceId: service.id,
          guildId,
          categoryId: category.id,
          voiceChannelId: voiceChannel.id,
          controlChannelId: controlRoom.id,
          controlMessageId: msgId,
        },
        update: {
          name: botConf.name,
          token: botConf.token,
          status: 'ONLINE',
          uptime: new Date(),
          serviceId: service.id,
          guildId,
          categoryId: category.id,
          voiceChannelId: voiceChannel.id,
          controlChannelId: controlRoom.id,
          controlMessageId: msgId,
        },
      });

      await db.discordResource.createMany({
        data: [
          { botId: botConf.id, guildId, type: 'CATEGORY', discordId: category.id },
          { botId: botConf.id, guildId, type: 'VOICE_CHANNEL', discordId: voiceChannel.id },
          { botId: botConf.id, guildId, type: 'CONTROL_CHANNEL', discordId: controlRoom.id },
          { botId: botConf.id, guildId, type: 'CONTROL_MESSAGE', discordId: msgId || '' },
        ],
      });

      await (db.controller as any).upsert({
        where: { botId: botConf.id },
        create: {
          botId: botConf.id,
          guildId,
          channelId: voiceChannel.id,
          userId: null,
          username: null,
          mainUserId: null,
          mainUsername: null,
          subUserId: null,
          subUsername: null,
        },
        update: {
          guildId,
          channelId: voiceChannel.id,
        },
      });

      // 7. Setup runtime, join Voice Channel, and activate event listeners
      onProgress?.(`○ Connecting Bot ${paddedIndex} to "${voiceChannelName}"...`);
      await setupBotRuntime(client, botConf.id);

      botIndex++;
    }

    await db.service.update({
      where: { id: service.id },
      data: { status: 'ONLINE' },
    });

    await db.deployment.update({
      where: { id: deployment.id },
      data: { status: 'COMPLETED', logs: 'Deployment completed successfully' },
    });

    await db.auditLog.create({
      data: {
        action: 'DEPLOYMENT_COMPLETED',
        details: `Deployed ${bots.length} bot(s) to guild ${guildId}`,
      },
    });

    onProgress?.('✓ Service Deployment Completed Successfully');
    logger.info(`Deployment completed for guild ${guildId}`);
  }

  public async resetService(): Promise<void> {
    logger.warn('Executing RESET SERVICE procedure...');

    await botManager.stopAll();

    const botRecords = await db.bot.findMany();

    for (const bot of botRecords) {
      try {
        const client = await botManager.startBot(bot.id, bot.token);
        if (bot.guildId) {
          const guild = await client.guilds.fetch(bot.guildId).catch(() => null);
          if (guild) {
            if (bot.controlChannelId) {
              const ch = await guild.channels.fetch(bot.controlChannelId).catch(() => null);
              if (ch) await ch.delete().catch(() => null);
            }
            if (bot.voiceChannelId) {
              const ch = await guild.channels.fetch(bot.voiceChannelId).catch(() => null);
              if (ch) await ch.delete().catch(() => null);
            }
            if (bot.categoryId) {
              const ch = await guild.channels.fetch(bot.categoryId).catch(() => null);
              if (ch) await ch.delete().catch(() => null);
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed to clean Discord resources for bot ${bot.id}:`, err);
      }
    }

    await botManager.stopAll();

    await db.discordResource.deleteMany();
    await db.musicSession.deleteMany();
    await db.controller.deleteMany();
    await db.deployment.deleteMany();
    await db.bot.deleteMany();
    await db.service.deleteMany();

    await db.auditLog.create({
      data: {
        action: 'SERVICE_RESET',
        details: 'Service deployment completely reset by owner',
      },
    });

    logger.info('Service reset completed successfully');
  }
}

export const deploymentManager = DeploymentManager.getInstance();
