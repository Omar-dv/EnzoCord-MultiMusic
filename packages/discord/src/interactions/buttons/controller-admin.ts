import {
  ButtonInteraction,
  UserSelectMenuBuilder,
  ActionRowBuilder,
  MessageFlags,
  VoiceChannel,
} from 'discord.js';
import { db } from '@enzocord/database';

export async function handleSelectMainControllerButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string,
  voiceChannelId: string
): Promise<void> {
  const guild = interaction.guild;
  const channel = guild?.channels.cache.get(voiceChannelId) as VoiceChannel | undefined;

  if (!channel || !channel.isVoiceBased()) {
    await interaction.reply({
      content: '❌ **Voice channel not found.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId('select_main_menu')
    .setPlaceholder('👑 Select a member to transfer Main Controller to...')
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.reply({
    content: '👑 **Select a new Main Controller from members currently in the voice channel:**',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleSelectSubControllerButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string,
  voiceChannelId: string
): Promise<void> {
  const guild = interaction.guild;
  const channel = guild?.channels.cache.get(voiceChannelId) as VoiceChannel | undefined;

  if (!channel || !channel.isVoiceBased()) {
    await interaction.reply({
      content: '❌ **Voice channel not found.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId('select_sub_menu')
    .setPlaceholder('👤 Select a member to assign as Sub-Controller...')
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.reply({
    content: '👤 **Select a Sub-Controller from members currently in the voice channel:**',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleRemoveSubControllerButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string
): Promise<void> {
  const controller: any = await db.controller.findUnique({ where: { botId } });

  if (!controller || !controller.subUserId) {
    await interaction.reply({
      content: 'ℹ️ **There is currently no Sub-Controller assigned.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const prevSubName = controller.subUsername || controller.subUserId;
  await (db.controller as any).update({
    where: { botId },
    data: {
      subUserId: null,
      subUsername: null,
    },
  });

  await interaction.reply({
    content: `✅ **Removed Sub-Controller:** \`@${prevSubName}\``,
    flags: MessageFlags.Ephemeral,
  });
}
