import { VoiceState, VoiceChannel } from 'discord.js';
import { db } from '@enzocord/database';
import { logger } from '@enzocord/shared';

export interface ControllerState {
  mainUserId: string | null;
  mainUsername: string | null;
  subUserId: string | null;
  subUsername: string | null;
}

export class ControllerManager {
  private static instance: ControllerManager;

  public constructor() {}

  public static getInstance(): ControllerManager {
    const globalObj = globalThis as any;
    if (!globalObj.__enzocord_controller_manager) {
      globalObj.__enzocord_controller_manager = new ControllerManager();
    }
    return globalObj.__enzocord_controller_manager;
  }

  public async getControllers(botId: string): Promise<ControllerState> {
    const record: any = await db.controller.findUnique({ where: { botId } });
    return {
      mainUserId: record?.mainUserId || record?.userId || null,
      mainUsername: record?.mainUsername || record?.username || null,
      subUserId: record?.subUserId || null,
      subUsername: record?.subUsername || null,
    };
  }

  /**
   * Handles voice presence events for controller assignments and auto-transfers.
   */
  public async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
    botId: string,
    targetVoiceChannelId: string
  ): Promise<void> {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return; // Ignore bots

    const guild = newState.guild || oldState.guild;
    const channel = guild.channels.cache.get(targetVoiceChannelId) as VoiceChannel | undefined;
    if (!channel || !channel.isVoiceBased()) return;

    // Get non-bot members currently inside the target voice channel
    const activeHumanMembers = channel.members.filter((m) => !m.user.bot);

    const controllerRecord: any = await db.controller.findUnique({ where: { botId } });
    const currentMainId = controllerRecord?.mainUserId || controllerRecord?.userId || null;
    const currentSubId = controllerRecord?.subUserId || null;

    // Case 1: Human members are present in the voice channel
    if (activeHumanMembers.size > 0) {
      const isMainInVC = currentMainId ? channel.members.has(currentMainId) : false;
      const isSubInVC = currentSubId ? channel.members.has(currentSubId) : false;

      // If Main Controller left the voice channel
      if (!isMainInVC) {
        // Priority 1: Promote Sub-Controller if present in VC
        if (isSubInVC && currentSubId) {
          const subMember = channel.members.get(currentSubId)!;
          await (db.controller as any).upsert({
            where: { botId },
            create: {
              botId,
              guildId: guild.id,
              channelId: targetVoiceChannelId,
              userId: subMember.id,
              username: subMember.user.username,
              mainUserId: subMember.id,
              mainUsername: subMember.user.username,
              subUserId: null,
              subUsername: null,
              assignedAt: new Date(),
            },
            update: {
              userId: subMember.id,
              username: subMember.user.username,
              mainUserId: subMember.id,
              mainUsername: subMember.user.username,
              subUserId: null,
              subUsername: null,
              assignedAt: new Date(),
            },
          });
          logger.info(`[Bot ${botId}] Main Controller promoted from Sub-Controller: @${subMember.user.username}`);
          return;
        }

        // Priority 2: Elect a random eligible human member in VC
        const membersArray = Array.from(activeHumanMembers.values());
        const selectedMember = membersArray[Math.floor(Math.random() * membersArray.length)];

        await (db.controller as any).upsert({
          where: { botId },
          create: {
            botId,
            guildId: guild.id,
            channelId: targetVoiceChannelId,
            userId: selectedMember.id,
            username: selectedMember.user.username,
            mainUserId: selectedMember.id,
            mainUsername: selectedMember.user.username,
            subUserId: null,
            subUsername: null,
            assignedAt: new Date(),
          },
          update: {
            userId: selectedMember.id,
            username: selectedMember.user.username,
            mainUserId: selectedMember.id,
            mainUsername: selectedMember.user.username,
            subUserId: null,
            subUsername: null,
            assignedAt: new Date(),
          },
        });
        logger.info(`[Bot ${botId}] Main Controller transferred to random VC member: @${selectedMember.user.username}`);
        return;
      }

      // If Sub-Controller left the voice channel, clear Sub-Controller
      if (currentSubId && !isSubInVC) {
        await (db.controller as any).update({
          where: { botId },
          data: {
            subUserId: null,
            subUsername: null,
          },
        });
        logger.info(`[Bot ${botId}] Sub-Controller left VC, cleared sub-controller role`);
      }
    } else {
      // Case 2: Voice channel is completely empty of human users
      if (currentMainId !== null || currentSubId !== null) {
        await (db.controller as any).update({
          where: { botId },
          data: {
            userId: null,
            username: null,
            mainUserId: null,
            mainUsername: null,
            subUserId: null,
            subUsername: null,
            assignedAt: new Date(),
          },
        });
        logger.info(`[Bot ${botId}] Voice channel empty, controller state reset to None`);
      }
    }
  }
}

export const controllerManager = ControllerManager.getInstance();
