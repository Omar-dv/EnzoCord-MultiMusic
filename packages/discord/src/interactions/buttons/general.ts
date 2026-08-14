import { ButtonInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { musicManager } from '@enzocord/music';
import { emojiService } from '@enzocord/services';
import { logger } from '@enzocord/shared';

export async function handleEnzocordButton(interaction: ButtonInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('✨ مجتمع EnzoCord — مجتمع المطورين والمبرمجين')
    .setColor(0x8b5cf6)
    .setDescription(
      '👋 **أهلاً بك في EnzoCord!**\n\n' +
      '🚀 **عن مجتمع EnzoCord:**\n' +
      'مجتمع تقني يجمع المبرمجين والمطورين لتبادل الخبرات، مشاركة المشاريع، وتقديم الدعم الفني للتطوير والارتقاء معاً.\n\n' +
      '🔗 **رابط سيرفر الديسكورد:**\n' +
      'https://discord.gg/ec-s'
    )
    .setFooter({ text: 'EnzoCord Community • Together We Build' })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleHelpButton(interaction: ButtonInteraction): Promise<void> {
  const botId = interaction.client.user?.id || interaction.guildId;
  const e = (name: string) => emojiService.getEmoji(botId, name);

  const embed = new EmbedBuilder()
    .setTitle('📖 دليل استخدام لوحة تحكم الموسيقى — EnzoCord')
    .setColor(0x8b5cf6)
    .setDescription(
      `مرحباً بك في **لوحة التحكم المتطورة** لنظام EnzoCord Multi Music.\n` +
      `تتكون اللوحة من **20 زراً تفاعلياً** مقسمة إلى 4 صفوف رئيسية، مدعومة بنظام صلاحيات متقدم وإدارة ذكية للمسؤولين.\n` +
      `──────────────────────────────`
    )
    .addFields(
      {
        name: `👑 نظام المسؤولين والصلاحيات (Controllers)`,
        value:
          `• **${e('main_controller')} المسؤول الرئيسي (Main Controller)**:\n` +
          `  يمتلك كامل الصلاحيات لإدارة الموسيقى، نقل المسؤول الرئيسي، وتعيين أو إزالة المساعد.\n\n` +
          `• **${e('select_sub_controller')} المسؤول المساعد (Sub-Controller)**:\n` +
          `  يمتلك صلاحيات إدارة التشغيل، الصوت، الطابور، التقديم، والترجيع.\n\n` +
          `• **👥 باقي المتواجدين بالروم**:\n` +
          `  مشاهدة حالة الأغنية الحالية واستخدام الأزرار الاستعلامية.`,
      },
      {
        name: `الصف الأول — 🎵 التحكم الأساسي بالتشغيل`,
        value:
          `• ${e('pause')} **إيقاف مؤقت**: إيقاف تشغيل المقطع الحالي مؤقتاً.\n` +
          `• ${e('previous')} **المقطع السابق**: الرجوع وتشغيل المقطع السابق من السجل.\n` +
          `• ${e('play')} **تشغيل / بحث**: استئناف التشغيل أو فتح نافذة البحث بالاسم أو الرابط.\n` +
          `• ${e('skip')} **تخطي**: الانتقال المباشر إلى المقطع التالي في الطابور.\n` +
          `• ${e('stop')} **إيقاف كلي**: إيقاف التشغيل تماماً ومسح الطابور والسجل.`,
      },
      {
        name: `الصف الثاني — 🔊 مستوى الصوت وأنماط التشغيل`,
        value:
          `• ${e('repeat')} **التكرار**: التبديل بين الأوضاع (\`إيقاف\` ➔ \`المقطع الحالي\` ➔ \`الطابور كاملاً\`).\n` +
          `• ${e('volume_down')} **خفض الصوت (-5%)**: تقليل مستوى الصوت بمقدار 5%.\n` +
          `• ${e('autoplay')} **التشغيل التلقائي (AutoPlay)**: تشغيل مقاطع مشابهة تلقائياً عند نهاية الطابور.\n` +
          `• ${e('volume_up')} **رفع الصوت (+5%)**: زيادة مستوى الصوت بمقدار 5%.\n` +
          `• ${e('shuffle')} **الخلط العشوائي**: إعادة ترتيب مقاطع الطابور القادمة بشكل عشوائي.`,
      },
      {
        name: `الصف الثالث — 👥 إدارة المسؤولين والتنقل الزمني`,
        value:
          `• ${e('seek_back')} **ترجيع 10 ثوانٍ**: إرجاع المقطع الحالي 10 ثوانٍ للخلف.\n` +
          `• ${e('remove_sub_controller')} **إزالة المساعد**: إلغاء تعيين المسؤول المساعد الحالي فوراً.\n` +
          `• ${e('main_controller')} **نقل المسؤول الرئيسي**: نقل رتبة المسؤول الرئيسي لعضو متواجد بالروم.\n` +
          `• ${e('select_sub_controller')} **تعيين مساعد**: اختيار وتعيين عضو من المتواجدين بالروم كمساعد.\n` +
          `• ${e('seek_forward')} **تقديم 10 ثوانٍ**: تقديم المقطع الحالي 10 ثوانٍ للأمام.`,
      },
      {
        name: `الصف الرابع — ⚡ الطابور والاتصال والمعلومات`,
        value:
          `• ${e('connect')} **إعادة الاتصال (Connect)**: ربط البوت بالروم الصوتي في حال خروجه.\n` +
          `• ${e('delete_queue')} **مسح الطابور**: حذف المقاطع المنتظرة مع استمرار المقطع الحالي.\n` +
          `• ${e('enzocord')} **مجتمع EnzoCord**: عرض تفاصيل ورابط سيرفر المطورين الرسمي.\n` +
          `• ${e('how_to_use')} **دليل الاستخدام**: عرض هذه اللائحة الإرشادية المفصلة.\n` +
          `• ${e('queue')} **عرض الطابور**: عرض قائمة الأغاني المنتظرة وأوقاتها.`,
      }
    )
    .setFooter({ text: 'EnzoCord Multi Music • Electric Violet Edition ⚡' })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleConnectButton(
  interaction: ButtonInteraction,
  botId: string,
  guildId: string,
  voiceChannelId: string
): Promise<void> {
  const me = interaction.guild?.members.me;
  const isCurrentlyInVC = Boolean(me && me.voice.channelId === voiceChannelId);

  const kazagumo = musicManager.getKazagumo(botId);
  if (!kazagumo) {
    await interaction.reply({
      content: '❌ **Music engine is not ready. Please try again in a few seconds.**',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Verify Lavalink node is actually connected
  const hasNode = Array.from(kazagumo.shoukaku.nodes.values()).some((n: any) => n.state === 1);
  if (!hasNode) {
    await interaction.reply({
      content: '❌ **سيرفر Lavalink غير متصل حالياً.**\nيرجى التأكد من تشغيل سيرفر Lavalink.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let player = kazagumo.getPlayer(guildId);

  if (isCurrentlyInVC && player && player.voiceId === voiceChannelId) {
    await interaction.reply({
      content: `ℹ️ **Bot is already connected inside the voice room (<#${voiceChannelId}>).**`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    if (!player) {
      player = await kazagumo.createPlayer({
        guildId,
        voiceId: voiceChannelId,
        textId: voiceChannelId,
        deaf: true,
        volume: 100,
      });
    } else {
      player.setVoiceChannel(voiceChannelId);
    }

    logger.info(`[Bot ${botId}] 🔌 Reconnected to voice channel ${voiceChannelId} via Connect button`);

    await interaction.reply({
      content: `🔌 **Connected to voice room (<#${voiceChannelId}>)!**`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (err: any) {
    logger.error(`[Bot ${botId}] Failed to connect to voice channel:`, err);
    await interaction.reply({
      content: `❌ **Failed to connect to voice room:** ${err?.message || 'Unknown error'}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
