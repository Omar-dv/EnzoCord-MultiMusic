# EnzoCord Multi Music 🎵⚡

<div align="center">
  <h3>Advanced Multi-Bot Architecture & 20-Control Music System</h3>
  <p>Engineered for high performance, scale, and rich Discord user experience.</p>
</div>

---

## 🌟 Key Features

- **Multi-Bot Management**: Deploy, control, and monitor multiple Discord music bots concurrently within isolated guild categories.
- **20-Button Neon Electric Violet Control Panel**: Full Emoji-only layout with custom Discord Application Emojis uploaded directly to Developer Portal.
- **Real Controller Roles System**:
  - 👑 **Main Controller**: Full authority over playback, transfer of control, and assigning/removing Sub-Controllers.
  - 👤 **Sub-Controller**: Playback, volume, queue, and seek permissions.
  - 👥 **Normal Users**: Real-time status display and informational commands.
- **Smart YouTube & Spotify Resolvers**:
  - Official **YouTube oEmbed** API integration for 100% accurate track & artist metadata retrieval.
  - Supports standard YouTube URLs, `youtu.be`, Shorts, YouTube Music, and tracking links without resolving to unintended videos.
  - **Spotify oEmbed** resolution for seamless playlist/track conversion.
- **Lavalink v4 Integration**: Low-latency, high-quality audio streaming powered by Kazagumo & Shoukaku.
- **Live Interactive Progress Loop**: Throttled progress bar updates with real-time timestamps and dynamic voice channel statuses.
- **Full Web Dashboard**: Next.js 14 web control panel with OAuth2 Discord login, server selection, and real-time player controls.

---

## 🎮 Control Panel Layout (20 Controls)

```text
Row 1:  ⏸️ Pause   |  ⏮️ Previous  |  ▶️ Play / Search  |  ⏭️ Skip    |  ⏹️ Stop
Row 2:  🔁 Repeat  |  🔉 Vol -5%   |  ♾️ AutoPlay        |  🔊 Vol +5% |  🔀 Shuffle
Row 3:  ⏪ -10s    |  ❌ Del Sub   |  👑 Main Controller|  👤 Set Sub |  ⏩ +10s
Row 4:  🔌 Connect |  🗑️ Del Queue |  🔗 EnzoCord Info  |  ❓ Guide   |  📜 Queue
```

---

## 🚀 Quick Start

### 1. Requirements
- **Node.js**: v18+ (Node.js 20+ recommended)
- **Lavalink Server**: v4+
- **Discord Bot Application(s)** with Message Content & Voice Gateway Intents enabled.

### 2. Installation
```bash
# Clone the repository
git clone <YOUR_REPO_URL>
cd "EnzoCord Multi Music"

# Install dependencies
npm install

# Initialize Prisma Database
npx prisma generate
npx prisma db push
```

### 3. Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
cp config.example.json config.json
cp lavalink.example.json lavalink.json
```

Configure your Discord OAuth2 and Lavalink Node details in `.env`:
```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_OWNER_ID=your_user_id
PORT=3000
DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/callback

LAVALINK_NODE_NAME="EnzoCord Lavalink Node"
LAVALINK_HOST=node.enzocord-host.tech
LAVALINK_PORT=25002
LAVALINK_AUTH=youshallnotpass
LAVALINK_SECURE=false
```

### 4. Running Locally
```bash
# Start development server
npm run dev

# Or build for production
npm run build
npm start
```

---

## 🛠️ Project Structure

```text
├── apps/
│   └── dashboard/         # Next.js 14 Web Dashboard & API Routes
├── packages/
│   ├── config/            # Shared configuration loaders (.env, json)
│   ├── database/          # Prisma Client & SQLite schema
│   ├── discord/           # Discord.js bot runtime, handlers & control panel
│   ├── music/             # Kazagumo / Lavalink audio manager & resolvers
│   ├── services/          # Multi-bot deployer, emoji manager & controller state
│   └── shared/            # Shared utilities, logger, types
├── assets/
│   └── emojis/            # 20 custom glowing violet 3D neon icons
└── prisma/
    └── schema.prisma      # Database models for bots, sessions & controllers
```

---

## 🤝 Community & Support

Join the official **EnzoCord** developer community on Discord:
👉 **[discord.gg/ec-s](https://discord.gg/ec-s)**

---

<div align="center">
  <sub>Built with ❤️ by EnzoCord Community</sub>
</div>
