import { ButtonInteraction, ModalSubmitInteraction, AnySelectMenuInteraction, MessageFlags, GuildMember } from 'discord.js';
import { db } from '@enzocord/database';

export type UserRole = 'MAIN_CONTROLLER' | 'SUB_CONTROLLER' | 'NORMAL_USER';

export interface PermissionCheckResult {
  allowed: boolean;
  role: UserRole;
  mainUserId: string | null;
  mainUsername: string | null;
  subUserId: string | null;
  subUsername: string | null;
  reason?: string;
}

export class PermissionService {
  private static instance: PermissionService;

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Validates if an interacting user is permitted to perform the requested action.
   */
  public async validate(
    interaction: ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction,
    botId: string,
    guildId: string,
    voiceChannelId: string
  ): Promise<PermissionCheckResult> {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    const member = interaction.member as GuildMember | null;

    // Public actions that anyone can use without being in voice
    if (
      customId === 'music:help' ||
      customId === 'music_help' ||
      customId === 'music:enzocord' ||
      customId === 'music_enzocord'
    ) {
      return {
        allowed: true,
        role: 'NORMAL_USER',
        mainUserId: null,
        mainUsername: null,
        subUserId: null,
        subUsername: null,
      };
    }

    // Check voice presence: User must be in the bot's target voice channel
    const userVoiceChannelId = member?.voice?.channelId;
    if (!userVoiceChannelId || userVoiceChannelId !== voiceChannelId) {
      return {
        allowed: false,
        role: 'NORMAL_USER',
        mainUserId: null,
        mainUsername: null,
        subUserId: null,
        subUsername: null,
        reason: '❌ **You must be in the bot\'s voice channel to use the controls.**',
      };
    }

    // Fetch controller state from database
    const controller: any = await db.controller.findUnique({ where: { botId } });

    const mainUserId = controller?.mainUserId || controller?.userId || null;
    const mainUsername = controller?.mainUsername || controller?.username || null;
    const subUserId = controller?.subUserId || null;
    const subUsername = controller?.subUsername || null;

    // If no controller is assigned yet, the first human user in VC who interacts automatically becomes Main Controller
    if (!mainUserId) {
      await (db.controller as any).upsert({
        where: { botId },
        create: {
          botId,
          guildId,
          channelId: voiceChannelId,
          userId: userId,
          username: interaction.user.username,
          mainUserId: userId,
          mainUsername: interaction.user.username,
          assignedAt: new Date(),
        },
        update: {
          userId: userId,
          username: interaction.user.username,
          mainUserId: userId,
          mainUsername: interaction.user.username,
          assignedAt: new Date(),
        },
      });

      return {
        allowed: true,
        role: 'MAIN_CONTROLLER',
        mainUserId: userId,
        mainUsername: interaction.user.username,
        subUserId: null,
        subUsername: null,
      };
    }

    // User is Main Controller
    if (userId === mainUserId) {
      return {
        allowed: true,
        role: 'MAIN_CONTROLLER',
        mainUserId,
        mainUsername,
        subUserId,
        subUsername,
      };
    }

    // User is Sub-Controller
    if (subUserId && userId === subUserId) {
      // Sub-controller cannot modify controllers
      const adminActions = [
        'ctrl:main_controller',
        'ctrl_select_main',
        'ctrl:sub_controller',
        'ctrl_select_sub',
        'ctrl:remove_sub',
        'ctrl_remove_sub',
        'select_main_menu',
        'select_sub_menu',
      ];
      if (adminActions.includes(customId)) {
        return {
          allowed: false,
          role: 'SUB_CONTROLLER',
          mainUserId,
          mainUsername,
          subUserId,
          subUsername,
          reason: `❌ **Only the Main Controller (<@${mainUserId}>) can manage controllers.**`,
        };
      }

      return {
        allowed: true,
        role: 'SUB_CONTROLLER',
        mainUserId,
        mainUsername,
        subUserId,
        subUsername,
      };
    }

    // Normal User (neither Main nor Sub controller)
    return {
      allowed: false,
      role: 'NORMAL_USER',
      mainUserId,
      mainUsername,
      subUserId,
      subUsername,
      reason: `❌ **You are not a controller for this music session.**\n\n👑 **Main Controller:** <@${mainUserId}>\n👤 **Sub-Controller:** ${subUserId ? `<@${subUserId}>` : '`None`'}`,
    };
  }
}

export const permissionService = PermissionService.getInstance();
