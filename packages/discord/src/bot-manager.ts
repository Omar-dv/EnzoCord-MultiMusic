import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { VerifiedBotInfo, logger } from '@enzocord/shared';
import { clearBotRuntime } from './bot-runtime';
import { musicManager } from '@enzocord/music';
import { db } from '@enzocord/database';

export async function verifyBotToken(token: string): Promise<VerifiedBotInfo> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Bot token is empty');
  }

  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: {
      Authorization: `Bot ${cleanToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logger.warn('Token verification failed:', errorData);
    throw new Error('Invalid bot token or unable to connect to Discord API');
  }

  const data = await response.json();
  if (data.bot !== true) {
    throw new Error('The provided token does not belong to a bot application');
  }

  return {
    id: data.id,
    username: data.username,
    discriminator: data.discriminator || '0',
    avatar: data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : null,
  };
}

export interface BotRuntimeStatus {
  id: string;
  name: string;
  username?: string;
  avatar: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';
  isReady: boolean;
  voiceConnected: boolean;
  voiceChannelId?: string | null;
  voiceChannelName?: string | null;
  lavalinkConnected: boolean;
  guildId?: string | null;
  guildName?: string | null;
  guildCount: number;
  uptimeSeconds: number;
  currentTrack?: string | null;
}

export class BotManager {
  private clients: Map<string, Client> = new Map();
  private startTimes: Map<string, Date> = new Map();

  public constructor() {}

  public static getInstance(): BotManager {
    const globalObj = globalThis as any;
    if (!globalObj.__enzocord_bot_manager) {
      globalObj.__enzocord_bot_manager = new BotManager();
    }
    return globalObj.__enzocord_bot_manager;
  }

  /**
   * Start or retrieve an existing Discord client for the given bot.
   * Completely isolated: will NOT reconnect or affect other running bots.
   */
  public async startBot(botId: string, token: string): Promise<Client> {
    if (this.clients.has(botId)) {
      const existing = this.clients.get(botId)!;
      if (existing.isReady() && existing.ws.status === 0) {
        return existing;
      }
      try {
        existing.destroy();
      } catch {}
      this.clients.delete(botId);
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    await client.login(token);
    this.clients.set(botId, client);
    this.startTimes.set(botId, new Date());
    logger.info(`[Bot ${botId}] Logged in successfully as ${client.user?.tag}`);

    // Update status in DB
    await db.bot.update({
      where: { id: botId },
      data: { status: 'ONLINE', uptime: new Date() },
    }).catch(() => {});

    return client;
  }

  public getClient(botId: string): Client | undefined {
    return this.clients.get(botId);
  }

  public getAllClients(): Client[] {
    return Array.from(this.clients.values());
  }

  public isBotRunning(botId: string): boolean {
    const client = this.clients.get(botId);
    return Boolean(client && client.isReady() && client.ws.status === 0);
  }

  public async stopBot(botId: string): Promise<void> {
    clearBotRuntime(botId);
    musicManager.destroy(botId);
    const client = this.clients.get(botId);
    if (client) {
      try {
        client.destroy();
      } catch (err) {
        logger.warn(`[Bot ${botId}] Error during client.destroy:`, err);
      }
      this.clients.delete(botId);
      this.startTimes.delete(botId);
      logger.info(`[Bot ${botId}] Stopped and disconnected`);
    }

    await db.bot.update({
      where: { id: botId },
      data: { status: 'OFFLINE' },
    }).catch(() => {});
  }

  public async restartBot(botId: string, token?: string): Promise<Client> {
    logger.info(`[Bot ${botId}] Restarting bot instance...`);
    let botToken = token;
    if (!botToken) {
      const record = await db.bot.findUnique({ where: { id: botId } });
      if (!record || !record.token) {
        throw new Error(`Bot token not found for ID ${botId}`);
      }
      botToken = record.token;
    }

    await this.stopBot(botId);
    // Short grace period before reconnecting
    await new Promise((r) => setTimeout(r, 1000));
    return await this.startBot(botId, botToken);
  }

  public async removeBot(botId: string): Promise<void> {
    await this.stopBot(botId);
  }

  public async stopAll(): Promise<void> {
    for (const [botId] of Array.from(this.clients.entries())) {
      await this.stopBot(botId);
    }
  }

  public getBotStatus(botId: string, botRecord?: any): BotRuntimeStatus {
    const client = this.clients.get(botId);
    const startTime = this.startTimes.get(botId);
    const uptimeSeconds = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;
    const isReady = Boolean(client && client.isReady());
    const lavalinkConnected = musicManager.getStatus(botId);

    let voiceConnected = false;
    let voiceChannelName: string | null = null;
    let guildName: string | null = null;
    let currentTrack: string | null = null;

    if (client && isReady && botRecord?.guildId) {
      const guild = client.guilds.cache.get(botRecord.guildId);
      if (guild) {
        guildName = guild.name;
        if (botRecord.voiceChannelId) {
          const vc = guild.channels.cache.get(botRecord.voiceChannelId);
          if (vc) {
            voiceChannelName = vc.name;
            const me = guild.members.me;
            voiceConnected = Boolean(me && me.voice.channelId === botRecord.voiceChannelId);
          }
        }
        const playerState = musicManager.getPlayerState(botId, botRecord.guildId);
        if (playerState.isPlaying && playerState.title !== 'No track playing') {
          currentTrack = `${playerState.title} - ${playerState.artist}`;
        }
      }
    }

    return {
      id: botId,
      name: botRecord?.name || client?.user?.username || `Bot ${botId}`,
      username: client?.user?.username,
      avatar: client?.user?.displayAvatarURL() || botRecord?.avatar || null,
      status: isReady ? 'ONLINE' : 'OFFLINE',
      isReady,
      voiceConnected,
      voiceChannelId: botRecord?.voiceChannelId || null,
      voiceChannelName,
      lavalinkConnected,
      guildId: botRecord?.guildId || null,
      guildName,
      guildCount: client?.guilds.cache.size || (botRecord?.guildId ? 1 : 0),
      uptimeSeconds,
      currentTrack,
    };
  }
}

export const botManager = BotManager.getInstance();
