import { Client, Guild, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { logger } from '@enzocord/shared';

export const FALLBACK_EMOJIS: Record<string, string> = {
  play: '▶️',
  pause: '⏸️',
  stop: '⏹️',
  skip: '⏭️',
  previous: '⏮️',
  volume_up: '🔊',
  volume_down: '🔉',
  shuffle: '🔀',
  repeat: '🔁',
  autoplay: '♾️',
  remove_sub_controller: '❌',
  remove_sub: '❌',
  main_controller: '👑',
  select_sub_controller: '👤',
  sub_controller: '👤',
  set_sub: '👤',
  add_sub: '👤',
  seek_back: '⏪',
  seek_forward: '⏩',
  connect: '🔌',
  disconnect: '🔌',
  delete_queue: '🗑️',
  clear_queue: '🗑️',
  enzocord: '🔗',
  how_to_use: '❓',
  help: '❓',
  queue: '📜',
};

export class EmojiService {
  private static instance: EmojiService;
  // Map of botId (or appId) -> Map of emojiName -> { id: string, name: string }
  private appEmojis: Map<string, Map<string, { id: string; name: string }>> = new Map();
  // Map of guildId -> Map of emojiName -> { id: string, name: string }
  private guildEmojis: Map<string, Map<string, { id: string; name: string }>> = new Map();

  public constructor() {}

  public static getInstance(): EmojiService {
    const globalObj = globalThis as any;
    if (!globalObj.__enzocord_emoji_service) {
      globalObj.__enzocord_emoji_service = new EmojiService();
    }
    return globalObj.__enzocord_emoji_service;
  }

  /**
   * Robust directory resolution for assets/emojis
   */
  public getAssetsDir(): string {
    const candidates = [
      path.resolve(process.cwd(), 'assets', 'emojis'),
      path.resolve(process.cwd(), '..', 'assets', 'emojis'),
      path.resolve(process.cwd(), '..', '..', 'assets', 'emojis'),
      path.resolve(__dirname, '..', '..', '..', 'assets', 'emojis'),
      path.resolve(__dirname, '..', '..', 'assets', 'emojis'),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        return dir;
      }
    }
    return candidates[0];
  }

  /**
   * Scans assets directory and installs/syncs emojis directly into the Bot's Application on Discord Developer Portal.
   * Emojis are attached to the Bot Application globally and do NOT occupy any guild/server slots!
   */
  public async installApplicationEmojis(client: Client): Promise<void> {
    if (!client?.application) return;

    const appId = client.application.id;
    const botId = client.user?.id || appId;

    if (!this.appEmojis.has(botId)) {
      this.appEmojis.set(botId, new Map());
    }
    if (!this.appEmojis.has(appId)) {
      this.appEmojis.set(appId, this.appEmojis.get(botId)!);
    }
    const emojiMap = this.appEmojis.get(botId)!;

    // 1. Fetch existing Application Emojis from Discord Developer Portal
    try {
      const existing = await client.application.emojis.fetch();
      for (const [id, emoji] of existing) {
        if (emoji.name) {
          emojiMap.set(emoji.name, { id, name: emoji.name });
        }
      }
      logger.info(`[EmojiService] Bot [${client.user?.tag}] loaded ${emojiMap.size} Application Emojis from Developer Portal.`);
    } catch (err: any) {
      logger.warn(`[EmojiService] Failed to fetch application emojis for ${client.user?.tag}:`, err?.message || err);
    }

    // 2. Scan assets directory
    const assetsDir = this.getAssetsDir();
    if (!fs.existsSync(assetsDir)) {
      logger.warn(`[EmojiService] Assets directory not found at ${assetsDir}`);
      return;
    }

    const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.png') && /^[a-zA-Z0-9_]+\.png$/.test(f));

    // 3. Upload missing emojis to Developer Portal Application
    for (const file of files) {
      const name = path.basename(file, '.png');
      if (emojiMap.has(name)) {
        continue;
      }

      try {
        const filePath = path.join(assetsDir, file);
        const buffer = fs.readFileSync(filePath);

        const created = await client.application.emojis.create({
          attachment: buffer,
          name: name,
        });

        emojiMap.set(name, { id: created.id, name: created.name || name });
        logger.info(`[EmojiService] ✓ Uploaded Application Emoji :${name}: to Developer Portal for ${client.user?.tag}`);
      } catch (uploadErr: any) {
        logger.warn(`[EmojiService] Could not upload Application Emoji :${name}: to Developer Portal:`, uploadErr?.message || uploadErr);
      }
    }
  }

  /**
   * Compatibility method: Clean server emojis and ensure Application Emojis are used
   */
  public async installGuildEmojis(guild: Guild): Promise<void> {
    // Emojis are stored at Bot Application level on Developer Portal, server emojis are kept clean.
  }

  /**
   * Resolves an emoji for use in embeds or text strings.
   * Returns `<:name:id>` if custom emoji exists, or the Unicode fallback.
   */
  public getEmoji(idOrGuildId: string | null | undefined, name: string): string {
    // Check in Application Emojis
    if (idOrGuildId && this.appEmojis.has(idOrGuildId)) {
      const emoji = this.appEmojis.get(idOrGuildId)!.get(name);
      if (emoji) {
        return `<:${emoji.name}:${emoji.id}>`;
      }
    }
    // Check in any loaded Application Emojis map
    for (const map of this.appEmojis.values()) {
      const emoji = map.get(name);
      if (emoji) {
        return `<:${emoji.name}:${emoji.id}>`;
      }
    }
    // Check in Guild Emojis
    if (idOrGuildId && this.guildEmojis.has(idOrGuildId)) {
      const emoji = this.guildEmojis.get(idOrGuildId)!.get(name);
      if (emoji) {
        return `<:${emoji.name}:${emoji.id}>`;
      }
    }
    return FALLBACK_EMOJIS[name] || '❓';
  }

  /**
   * Resolves emoji for ButtonBuilder.setEmoji()
   * Returns custom emoji Snowflake ID string, or Unicode character string.
   */
  public getButtonEmoji(idOrGuildId: string | null | undefined, name: string): string {
    // Check in Application Emojis
    if (idOrGuildId && this.appEmojis.has(idOrGuildId)) {
      const emoji = this.appEmojis.get(idOrGuildId)!.get(name);
      if (emoji) {
        return emoji.id;
      }
    }
    // Check in any loaded Application Emojis map
    for (const map of this.appEmojis.values()) {
      const emoji = map.get(name);
      if (emoji) {
        return emoji.id;
      }
    }
    // Check in Guild Emojis
    if (idOrGuildId && this.guildEmojis.has(idOrGuildId)) {
      const emoji = this.guildEmojis.get(idOrGuildId)!.get(name);
      if (emoji) {
        return emoji.id;
      }
    }
    return FALLBACK_EMOJIS[name] || '❓';
  }

  public getFallbackEmoji(name: string): string {
    return FALLBACK_EMOJIS[name] || '❓';
  }
}

export const emojiService = EmojiService.getInstance();
