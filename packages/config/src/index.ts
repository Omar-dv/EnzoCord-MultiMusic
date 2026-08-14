import fs from 'fs';
import path from 'path';
import { AppConfig, LavalinkConfig, logger } from '@enzocord/shared';

function getCandidatePaths(filename: string): string[] {
  return Array.from(new Set([
    path.join(process.cwd(), filename),
    path.resolve(process.cwd(), filename),
    path.resolve(process.cwd(), '..', filename),
    path.resolve(process.cwd(), '../..', filename),
  ]));
}

/**
 * Loads the root .env file across Next.js, scripts, and package-level code.
 */
function loadEnvironmentFile(): void {
  const envPath = getCandidatePaths('.env').find((candidate) => fs.existsSync(candidate));
  if (!envPath) return;

  try {
    for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      let value = rawValue;
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      } else {
        // Permit an inline comment in unquoted values.
        value = value.replace(/\s+#.*$/, '').trim();
      }

      // Never overwrite an explicitly supplied process environment variable.
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    logger.warn('Failed to load .env configuration:', error);
  }
}

loadEnvironmentFile();

export function getConfig(): AppConfig {
  loadEnvironmentFile();
  const configuredPort = Number(process.env.PORT || process.env.SERVER_PORT || 3000);
  return {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    ownerId: process.env.DISCORD_OWNER_ID || '',
    port: Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000,
    callbackUrl:
      process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/api/auth/callback',
  };
}

export function getLavalinkConfig(): LavalinkConfig {
  loadEnvironmentFile();
  const configuredPort = Number(process.env.LAVALINK_PORT || 2333);
  const secureValue = process.env.LAVALINK_SECURE?.trim().toLowerCase();
  const secure =
    secureValue === undefined
      ? false
      : ['true', '1', 'yes', 'on'].includes(secureValue);

  return {
    nodes: [
      {
        name: process.env.LAVALINK_NODE_NAME || 'EnzoCord Lavalink Node',
        host: process.env.LAVALINK_HOST || '127.0.0.1',
        port: Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 2333,
        auth: process.env.LAVALINK_AUTH || 'youshallnotpass',
        secure,
      },
    ],
  };
}
