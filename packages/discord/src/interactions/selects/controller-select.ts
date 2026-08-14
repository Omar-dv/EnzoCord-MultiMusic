import { UserSelectMenuInteraction, MessageFlags, VoiceChannel } from 'discord.js';
import { db } from '@enzocord/database';

export async function handleControllerSelectMenu(
  interaction: UserSelectMenuInteraction,
  botId: string,
  guildId: string,
  voiceChannelId: string
): Promise<void> {
  const selectedUserId = interaction.values[0];
  const selectedUser = interaction.users.get(selectedUserId);

  if (!selectedUser) {
    await interaction.reply({
      content: '❌ **User not found.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (selectedUser.bot) {
    await interaction.reply({
      content: '❌ **Discord bots cannot be appointed as controllers.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Ensure selected member is currently in the voice channel
  const guild = interaction.guild;
  const channel = guild?.channels.cache.get(voiceChannelId) as VoiceChannel | undefined;
  if (!channel || !channel.members.has(selectedUserId)) {
    await interaction.reply({
      content: `❌ **<@${selectedUserId}> must be connected inside the voice channel (${channel?.name || 'Music Room'}).**`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const customId = interaction.customId;

  // Handle Main Controller Assignment
  if (customId === 'select_main_menu') {
    const existing: any = await db.controller.findUnique({ where: { botId } });

    // If new main controller was the sub-controller, clear sub-controller
    const isDemotedSub = existing?.subUserId === selectedUserId;

    await (db.controller as any).upsert({
      where: { botId },
      create: {
        botId,
        guildId,
        channelId: voiceChannelId,
        userId: selectedUserId,
        username: selectedUser.username,
        mainUserId: selectedUserId,
        mainUsername: selectedUser.username,
        subUserId: null,
        subUsername: null,
        assignedAt: new Date(),
      },
      update: {
        userId: selectedUserId,
        username: selectedUser.username,
        mainUserId: selectedUserId,
        mainUsername: selectedUser.username,
        subUserId: isDemotedSub ? null : existing?.subUserId,
        subUsername: isDemotedSub ? null : existing?.subUsername,
        assignedAt: new Date(),
      },
    });

    await interaction.reply({
      content: `👑 **Main Controller transferred to:** <@${selectedUserId}> (@${selectedUser.username})`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Handle Sub-Controller Assignment
  if (customId === 'select_sub_menu') {
    const existing: any = await db.controller.findUnique({ where: { botId } });

    if (existing && (existing.mainUserId === selectedUserId || existing.userId === selectedUserId)) {
      await interaction.reply({
        content: '❌ **The Main Controller cannot also be assigned as Sub-Controller.**',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await (db.controller as any).upsert({
      where: { botId },
      create: {
        botId,
        guildId,
        channelId: voiceChannelId,
        subUserId: selectedUserId,
        subUsername: selectedUser.username,
        assignedAt: new Date(),
      },
      update: {
        subUserId: selectedUserId,
        subUsername: selectedUser.username,
        assignedAt: new Date(),
      },
    });

    await interaction.reply({
      content: `👤 **Sub-Controller assigned to:** <@${selectedUserId}> (@${selectedUser.username})`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
}
