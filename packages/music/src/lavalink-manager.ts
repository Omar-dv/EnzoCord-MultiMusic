import { Kazagumo, KazagumoPlayer } from 'kazagumo';
import { Connectors } from 'shoukaku';
import { Client } from 'discord.js';
import { getLavalinkConfig } from '@enzocord/config';
import { logger } from '@enzocord/shared';

class CustomDiscordJSConnector extends Connectors.DiscordJS {
  public listen(nodes: any): void {
    if (this.client.isReady()) {
      this.ready(nodes);
    } else {
      this.client.once('clientReady', () => this.ready(nodes));
    }
    this.client.on('raw', (packet: any) => this.raw(packet));
  }
}

export class MusicManager {
  private static instance: MusicManager;
  private kazagumoInstances: Map<string, Kazagumo> = new Map();
  private isConnected: Map<string, boolean> = new Map();

  private constructor() { }

  public static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  /**
   * Initialize Kazagumo for a specific bot client.
   * Each bot gets its own Kazagumo instance tied to its Client.
   */
  public init(client: Client, botId: string): Kazagumo {
    if (this.kazagumoInstances.has(botId)) {
      return this.kazagumoInstances.get(botId)!;
    }

    const lavalinkConf = getLavalinkConfig();
    const nodes = lavalinkConf.nodes.map((node: any) => {
      const isSecure = node.secure ?? false;
      logger.info(`[Bot ${botId}] Configuring Lavalink node: ${node.host}:${node.port} (secure: ${isSecure})`);
      return {
        name: node.name,
        url: `${node.host}:${node.port}`,
        auth: node.auth,
        secure: isSecure,
      };
    });

    const kazagumo = new Kazagumo(
      {
        defaultSearchEngine: 'youtube',
        send: (guildId, payload) => {
          const guild = client.guilds.cache.get(guildId);
          if (guild) guild.shard.send(payload);
        },
      },
      new CustomDiscordJSConnector(client),
      nodes,
      {
        resume: true,
        resumeTimeout: 30,
        reconnectTries: 10,
        reconnectInterval: 5,
      }
    );

    kazagumo.shoukaku.on('ready', (name) => {
      this.isConnected.set(botId, true);
      logger.info(`[Bot ${botId}] Lavalink Node [${name}] connected`);
    });

    kazagumo.shoukaku.on('error', (name, error) => {
      logger.error(`[Bot ${botId}] Lavalink Node [${name}] error:`, error);
    });

    kazagumo.shoukaku.on('close', (name, code, reason) => {
      this.isConnected.set(botId, false);
      logger.warn(`[Bot ${botId}] Lavalink Node [${name}] closed: ${code} - ${reason}`);
    });

    kazagumo.shoukaku.on('disconnect', (name, count) => {
      this.isConnected.set(botId, false);
      logger.warn(`[Bot ${botId}] Lavalink Node [${name}] disconnected (Count: ${count})`);
    });

    // NOTE: Player events (playerStart, playerEnd, playerEmpty, etc.) are
    // registered in bot-runtime.ts per guild. Do NOT add them here to avoid
    // duplicate listeners across HMR / re-deployments.

    this.kazagumoInstances.set(botId, kazagumo);
    return kazagumo;
  }

  public getKazagumo(botId: string): Kazagumo | undefined {
    return this.kazagumoInstances.get(botId);
  }

  private trackHistory: Map<string, any[]> = new Map();
  private autoplayStates: Map<string, boolean> = new Map();

  private getHistoryKey(botId: string, guildId: string): string {
    return `${botId}:${guildId}`;
  }

  public pushPreviousTrack(botId: string, guildId: string, track: any): void {
    if (!track) return;
    const key = this.getHistoryKey(botId, guildId);
    if (!this.trackHistory.has(key)) {
      this.trackHistory.set(key, []);
    }
    const list = this.trackHistory.get(key)!;
    list.push(track);
    if (list.length > 50) list.shift();
  }

  public popPreviousTrack(botId: string, guildId: string): any | undefined {
    const key = this.getHistoryKey(botId, guildId);
    const list = this.trackHistory.get(key);
    if (!list || list.length === 0) return undefined;
    return list.pop();
  }

  public clearHistory(botId: string, guildId: string): void {
    const key = this.getHistoryKey(botId, guildId);
    this.trackHistory.delete(key);
  }

  public toggleAutoplay(botId: string, guildId: string): boolean {
    const key = this.getHistoryKey(botId, guildId);
    const current = this.autoplayStates.get(key) ?? false;
    const next = !current;
    this.autoplayStates.set(key, next);
    return next;
  }

  public isAutoplay(botId: string, guildId: string): boolean {
    const key = this.getHistoryKey(botId, guildId);
    return this.autoplayStates.get(key) ?? false;
  }

  public async handleAutoplay(botId: string, guildId: string): Promise<boolean> {
    const key = this.getHistoryKey(botId, guildId);
    const isAuto = this.autoplayStates.get(key) ?? false;
    if (!isAuto) return false;

    const player = this.getPlayer(botId, guildId);
    if (!player) return false;

    const history = this.trackHistory.get(key);
    const previousTrack = history && history.length > 0 ? history[history.length - 1] : null;
    if (!previousTrack) return false;

    try {
      const searchTitle = `${previousTrack.author || ''} ${previousTrack.title || ''} similar songs`;
      const kazagumo = this.getKazagumo(botId) || Array.from(this.kazagumoInstances.values())[0];
      if (!kazagumo) return false;

      const res = await kazagumo.search(searchTitle, { requester: previousTrack.requester });
      if (res && res.tracks.length > 0) {
        const nextTrack = res.tracks.find((t) => t.identifier !== previousTrack.identifier) || res.tracks[0];
        if (nextTrack) {
          player.queue.add(nextTrack);
          if (!player.playing && !player.paused) {
            await player.play();
          }
          return true;
        }
      }
    } catch (err) {
      logger.warn('[MusicManager] Autoplay resolution error:', err);
    }
    return false;
  }

  public async searchTrack(botId: string, rawQuery: string, requester?: any): Promise<any> {
    let cleanQuery = rawQuery.trim();

    const kazagumo = this.getKazagumo(botId) || Array.from(this.kazagumoInstances.values())[0];
    if (!kazagumo) {
      throw new Error(`Kazagumo not initialized for bot ${botId}`);
    }

    // 1. YouTube URLs → pass directly to Lavalink v4 (it handles them natively)
    if (cleanQuery.includes('youtube.com/') || cleanQuery.includes('youtu.be/')) {
      logger.info(`[MusicManager] Loading YouTube URL directly via Lavalink: ${cleanQuery}`);
      const result = await kazagumo.search(cleanQuery, { requester });
      if (result && result.tracks.length > 0) return result;
      // If direct URL load fails, try extracting title via oEmbed as fallback
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanQuery)}&format=json`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const data: any = await res.json();
          if (data.title) {
            cleanQuery = `${data.title} ${data.author_name || ''}`.trim();
            logger.info(`[MusicManager] YouTube URL fallback to text search: "${cleanQuery}"`);
          }
        }
      } catch (err) {
        logger.warn('[MusicManager] YouTube oEmbed fetch error:', err);
      }
    }
    // 2. Spotify URLs → fetch title via oEmbed, then search on YouTube
    else if (cleanQuery.includes('open.spotify.com/')) {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanQuery)}`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const data: any = await res.json();
          if (data.title) {
            cleanQuery = `${data.title} ${data.author_name || ''}`.trim();
            logger.info(`[MusicManager] Spotify → YouTube search: "${cleanQuery}"`);
          }
        }
      } catch {
        logger.warn('[MusicManager] Spotify oEmbed fetch error, using raw query');
      }
    }

    // Search via YouTube (default engine)
    let result = await kazagumo.search(cleanQuery, { requester });
    if (!result || result.tracks.length === 0) {
      // Fallback: explicit ytsearch prefix
      result = await kazagumo.search(`ytsearch:${cleanQuery}`, { requester });
    }
    return result;
  }

  public getPlayerState(botId: string, guildId: string) {
    const player = this.getPlayer(botId, guildId);
    const key = this.getHistoryKey(botId, guildId);
    const isAutoplay = this.autoplayStates.get(key) ?? false;

    if (!player) {
      return {
        isPlaying: false,
        isPaused: false,
        title: null,
        artist: null,
        artworkUrl: null,
        duration: 0,
        position: 0,
        volume: 100,
        repeatMode: 'none' as const,
        isShuffled: false,
        isAutoplay,
        queueLength: 0,
      };
    }

    const track = player.queue.current;
    let repeatMode: 'none' | 'track' | 'queue' = 'none';
    if (player.loop === 'track') repeatMode = 'track';
    else if (player.loop === 'queue') repeatMode = 'queue';

    return {
      isPlaying: player.playing,
      isPaused: player.paused,
      title: track?.title || null,
      artist: track?.author || null,
      artworkUrl: track?.thumbnail || null,
      duration: track?.length || 0,
      position: player.position || 0,
      volume: player.volume || 100,
      repeatMode,
      isShuffled: false,
      isAutoplay,
      queueLength: player.queue.length,
    };
  }

  public getPlayer(botId: string, guildId: string): KazagumoPlayer | undefined {
    const kazagumo = this.kazagumoInstances.get(botId);
    if (!kazagumo) return undefined;
    return kazagumo.getPlayer(guildId);
  }

  public getStatus(botId: string): boolean {
    if (!botId) {
      return Array.from(this.isConnected.values()).some(Boolean);
    }
    return this.isConnected.get(botId) ?? false;
  }

  /** Release the Lavalink client that belongs to one Discord bot. */
  public destroy(botId: string): void {
    const kazagumo = this.kazagumoInstances.get(botId);
    if (!kazagumo) return;

    for (const [guildId] of kazagumo.players) {
      try {
        kazagumo.destroyPlayer(guildId);
      } catch (error) {
        logger.warn(`[Bot ${botId}] Failed to destroy player for guild ${guildId}:`, error);
      }
    }

    for (const node of kazagumo.shoukaku.nodes.values()) {
      try {
        node.disconnect(1000, 'Bot stopped');
      } catch (error) {
        logger.warn(`[Bot ${botId}] Failed to disconnect Lavalink node ${node.name}:`, error);
      }
    }

    this.kazagumoInstances.delete(botId);
    this.isConnected.delete(botId);
  }

  public destroyAll(): void {
    for (const botId of Array.from(this.kazagumoInstances.keys())) {
      this.destroy(botId);
    }
  }
}

export const musicManager = MusicManager.getInstance();
export const lavalinkManager = {
  getStatus: (botId?: string) => musicManager.getStatus(botId || ''),
};

