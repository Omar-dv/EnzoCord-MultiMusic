const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const db = new PrismaClient();
const assetsDir = path.resolve(__dirname, '..', 'assets', 'emojis');

async function main() {
  console.log('--- Scanning Database for Bots & Guilds ---');
  const bots = await db.bot.findMany();

  if (!bots.length) {
    console.log('❌ No bots found in database.');
    return;
  }

  if (!fs.existsSync(assetsDir)) {
    console.log(`❌ Assets directory not found at ${assetsDir}`);
    return;
  }

  const pngFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.png'));
  console.log(`Found ${pngFiles.length} PNG icons in ${assetsDir}`);

  for (const bot of bots) {
    if (!bot.token || !bot.guildId) {
      console.log(`Skipping bot ${bot.name} (no token or guildId)`);
      continue;
    }

    console.log(`\nConnecting Bot [${bot.name}] (${bot.id})...`);
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers,
      ],
    });

    try {
      await client.login(bot.token);
      console.log(`✓ Bot logged in as ${client.user.tag}`);

      const guild = await client.guilds.fetch(bot.guildId).catch(() => null);
      if (!guild) {
        console.log(`❌ Could not fetch guild ${bot.guildId}`);
        client.destroy();
        continue;
      }

      console.log(`✓ Fetched guild: ${guild.name} (${guild.id})`);

      const me = await guild.members.fetchMe().catch(() => null);
      const canManage = Boolean(
        me?.permissions.has(PermissionFlagsBits.Administrator) ||
        me?.permissions.has(PermissionFlagsBits.ManageGuildExpressions) ||
        (me?.permissions.has && me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers))
      );

      if (!canManage) {
        console.log(`⚠️ Bot lacks ManageGuildExpressions / Administrator permission in guild ${guild.name}`);
      }

      // Fetch all emojis in guild (do not pass { force: true } as discord.js treats first arg as emoji ID!)
      const existingEmojis = await guild.emojis.fetch();
      const emojiMap = new Map();
      for (const [id, e] of existingEmojis) {
        if (e.name) emojiMap.set(e.name, id);
      }

      console.log(`Guild currently has ${existingEmojis.size} emojis.`);

      for (const file of pngFiles) {
        const name = path.basename(file, '.png');
        if (emojiMap.has(name)) {
          console.log(`  - :${name}: already exists (ID: ${emojiMap.get(name)})`);
          continue;
        }

        try {
          const filePath = path.join(assetsDir, file);
          const buffer = fs.readFileSync(filePath);
          const created = await guild.emojis.create({
            attachment: buffer,
            name: name,
            reason: 'EnzoCord Multi Music Custom Emoji Upload',
          });
          emojiMap.set(name, created.id);
          console.log(`  + Uploaded :${name}: (ID: ${created.id})`);
        } catch (uploadErr) {
          console.error(`  ❌ Failed to upload :${name}: ${uploadErr.message}`);
        }
      }

      client.destroy();
    } catch (err) {
      console.error(`❌ Error with bot ${bot.name}:`, err.message);
      try { client.destroy(); } catch {}
    }
  }

  console.log('\n--- Finished Emojis Installation ---');
}

main().catch(console.error).finally(() => db.$disconnect());
