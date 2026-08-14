import { Client, GatewayIntentBits } from 'discord.js';
import { db } from '../packages/database/src';
import { controlPanelService } from '../packages/discord/src/control-panel-service';
import { emojiService } from '../packages/services/src/emoji-service';

async function main() {
  console.log('--- Refreshing Control Panels with interactive EnzoCord button ---');
  const bots = await db.bot.findMany();

  for (const bot of bots) {
    if (!bot.token || !bot.controlChannelId) continue;

    console.log(`Connecting Bot [${bot.name}] (${bot.id})...`);
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers],
    });

    try {
      await client.login(bot.token);
      await emojiService.installApplicationEmojis(client);

      const channel: any = await client.channels.fetch(bot.controlChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const msgId = await controlPanelService.sendOrUpdate(
          channel,
          bot.id,
          bot.guildId || '',
          bot.controlMessageId
        );
        console.log(`  ✓ Updated Control Panel for ${bot.name} (Msg ID: ${msgId})`);
      }
      client.destroy();
    } catch (e: any) {
      console.warn(`  ❌ Error for ${bot.name}:`, e.message);
      try { client.destroy(); } catch {}
    }
  }

  console.log('--- Completed Control Panel Refresh ---');
}

main().catch(console.error).finally(() => db.$disconnect());
