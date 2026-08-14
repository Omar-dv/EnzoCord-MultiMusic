const { Client, GatewayIntentBits } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const db = new PrismaClient();
const assetsDir = path.resolve(__dirname, '..', 'assets', 'emojis');

// Normalize filenames in assets/emojis/ to valid Discord identifiers [a-zA-Z0-9_]
function normalizeAssetFiles() {
  console.log('--- Normalizing filenames in assets/emojis/ ---');
  const files = fs.readdirSync(assetsDir);

  const renames = {
    'add-sub.png': 'select_sub_controller.png',
    'clear-queue.png': 'clear_queue.png',
    'how-to-use.png': 'how_to_use.png',
    'main-controller.png': 'main_controller.png',
    'remove-sub.png': 'remove_sub_controller.png',
    'seek back.png': 'seek_back.png',
    'seek forward.png': 'seek_forward.png',
    'volume-down.png': 'volume_down.png',
    'volume-up.png': 'volume_up.png',
  };

  for (const [oldName, newName] of Object.entries(renames)) {
    const oldP = path.join(assetsDir, oldName);
    const newP = path.join(assetsDir, newName);
    if (fs.existsSync(oldP)) {
      fs.copyFileSync(oldP, newP);
      console.log(`✓ Normalized: ${oldName} -> ${newName}`);
      // Remove old file with invalid chars
      try { fs.unlinkSync(oldP); } catch {}
    }
  }

  // Create essential aliases
  const aliasMap = {
    'delete_queue.png': 'clear_queue.png',
    'sub_controller.png': 'select_sub_controller.png',
    'set_sub.png': 'select_sub_controller.png',
    'add_sub.png': 'select_sub_controller.png',
    'remove_sub.png': 'remove_sub_controller.png',
    'help.png': 'how_to_use.png',
    'disconnect.png': 'connect.png',
  };

  for (const [alias, src] of Object.entries(aliasMap)) {
    const srcP = path.join(assetsDir, src);
    const aliasP = path.join(assetsDir, alias);
    if (fs.existsSync(srcP) && !fs.existsSync(aliasP)) {
      fs.copyFileSync(srcP, aliasP);
      console.log(`✓ Created alias: ${alias} -> ${src}`);
    }
  }
}

async function syncApplicationEmojis() {
  normalizeAssetFiles();

  const bots = await db.bot.findMany();
  if (!bots.length) {
    console.log('❌ No bots found in database.');
    return;
  }

  const validFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.png') && /^[a-zA-Z0-9_]+\.png$/.test(f));
  console.log(`\nFound ${validFiles.length} valid icon files for Discord Developer Portal.`);

  for (const bot of bots) {
    if (!bot.token) continue;

    console.log(`\n==================================================`);
    console.log(`Bot: [${bot.name}] (${bot.id})`);
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers],
    });

    try {
      await client.login(bot.token);
      console.log(`✓ Logged in as ${client.user.tag} (Application ID: ${client.application?.id})`);

      // 1. Fetch current Application Emojis from Discord Developer Portal
      const appEmojis = await client.application.emojis.fetch();
      console.log(`Developer Portal currently has ${appEmojis.size} Application Emojis for ${client.user.username}.`);

      const appEmojiMap = new Map();
      for (const [id, e] of appEmojis) {
        if (e.name) appEmojiMap.set(e.name, id);
      }

      // Upload missing emojis to Bot Application (Developer Portal)
      for (const file of validFiles) {
        const name = path.basename(file, '.png');
        if (appEmojiMap.has(name)) {
          console.log(`  - [Developer Portal] :${name}: already exists (ID: ${appEmojiMap.get(name)})`);
          continue;
        }

        try {
          const filePath = path.join(assetsDir, file);
          const buffer = fs.readFileSync(filePath);
          const created = await client.application.emojis.create({
            attachment: buffer,
            name: name,
          });
          appEmojiMap.set(name, created.id);
          console.log(`  + [Developer Portal] Created App Emoji :${name}: (ID: ${created.id})`);
        } catch (uploadErr) {
          console.error(`  ❌ Error uploading :${name}:`, uploadErr.message);
        }
      }

      // 2. Clean up server emojis (Remove any bot emojis from the Guild)
      if (bot.guildId) {
        const guild = await client.guilds.fetch(bot.guildId).catch(() => null);
        if (guild) {
          const guildEmojis = await guild.emojis.fetch().catch(() => new Map());
          let deleted = 0;
          for (const [id, emoji] of guildEmojis) {
            if (emoji.name && validFiles.some((f) => path.basename(f, '.png') === emoji.name)) {
              try {
                await guild.emojis.delete(id, 'Cleaned guild emoji — moved to Bot Application Emojis');
                deleted++;
                console.log(`  - Deleted server emoji :${emoji.name}: from ${guild.name}`);
              } catch {}
            }
          }
          if (deleted > 0) {
            console.log(`✓ Cleaned ${deleted} emojis from server ${guild.name}. Server emojis are 100% free.`);
          }
        }
      }

      client.destroy();
    } catch (err) {
      console.error(`❌ Bot error:`, err.message);
      try { client.destroy(); } catch {}
    }
  }

  console.log('\n=== All Application Emojis Synced to Discord Developer Portal ===');
}

syncApplicationEmojis().catch(console.error).finally(() => {
  db.$disconnect().catch(() => {});
});
