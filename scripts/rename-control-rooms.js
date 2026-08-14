const { Client, GatewayIntentBits } = require('discord.js');
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function renameControlRooms() {
  console.log('--- Renaming all Bot Control Rooms to "control" ---');
  const bots = await db.bot.findMany();

  for (const bot of bots) {
    if (!bot.token || !bot.controlChannelId) continue;

    console.log(`Checking Bot [${bot.name}] (${bot.id})...`);
    const client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    try {
      await client.login(bot.token);
      const channel = await client.channels.fetch(bot.controlChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        if (channel.name !== 'control') {
          const oldName = channel.name;
          await channel.setName('control', 'Standardizing control room name to "control"');
          console.log(`  ✓ Renamed channel "${oldName}" -> "control" (ID: ${channel.id})`);
        } else {
          console.log(`  - Channel is already named "control" (ID: ${channel.id})`);
        }
      }
      client.destroy();
    } catch (err) {
      console.warn(`  ❌ Error renaming channel for bot ${bot.name}:`, err.message);
      try { client.destroy(); } catch {}
    }
  }

  console.log('--- Finished Renaming Control Rooms ---');
}

renameControlRooms().catch(console.error).finally(() => {
  db.$disconnect().catch(() => {});
});
