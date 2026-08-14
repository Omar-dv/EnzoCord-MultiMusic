import { Client, Routes, VoiceChannel } from 'discord.js';
import { logger } from '@enzocord/shared';

export class VoiceChannelService {
  private static instance: VoiceChannelService;
  private lastStatuses: Map<string, string> = new Map();

  public constructor() {}

  public static getInstance(): VoiceChannelService {
    const globalObj = globalThis as any;
    if (!globalObj.__enzocord_voice_channel_service) {
      globalObj.__enzocord_voice_channel_service = new VoiceChannelService();
    }
    return globalObj.__enzocord_voice_channel_service;
  }

  /**
   * Updates the native Discord Voice Channel Status text (e.g. "🎵 Song Title" or "⏸️ Song Title").
   * Rate-limit aware: skips update if status is identical to previous value.
   */
  public async setVoiceStatus(
    client: Client,
    voiceChannelId: string,
    statusText: string
  ): Promise<void> {
    if (!client || !voiceChannelId) return;

    // Check if status is unchanged
    const current = this.lastStatuses.get(voiceChannelId);
    if (current === statusText) return;

    try {
      this.lastStatuses.set(voiceChannelId, statusText);

      // 1. Try discord.js Channel method if available
      const channel = client.channels.cache.get(voiceChannelId) as VoiceChannel | undefined;
      if (channel && typeof (channel as any).setStatus === 'function') {
        await (channel as any).setStatus(statusText);
        return;
      }

      // 2. Direct Discord REST API Route
      await client.rest.put(Routes.channelVoiceStatus(voiceChannelId), {
        body: { status: statusText },
      });
    } catch (err: any) {
      // Ignore transient errors if guild doesn't have voice status feature or lacks permission
      logger.debug(`[VoiceChannelService] Could not set voice status for channel ${voiceChannelId}:`, err?.message);
    }
  }

  public clearStatus(voiceChannelId: string): void {
    this.lastStatuses.delete(voiceChannelId);
  }
}

export const voiceChannelService = VoiceChannelService.getInstance();
