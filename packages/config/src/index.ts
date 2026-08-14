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
 * Next loads an .env file from its app directory, while this repository keeps
 * its source of truth at the workspace root. Load that root file here as well
 * so the same settings work for Next, scripts, and package-level code.
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

function findConfigFile(filename: string): string | null {
  const candidatePaths = getCandidatePaths(filename);

  // Prefer paths where config.json has populated clientId if searching for config.json
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(content);
        if (filename === 'config.json' && parsed.clientId) {
          return p;
        }
        if (filename === 'lavalink.json' && parsed.nodes) {
          return p;
        }
      } catch {
        // continue
      }
    }
  }

  // Fallback to first existing path
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

export function getConfig(): AppConfig {
  const configPath = findConfigFile('config.json');
  let parsed: Partial<AppConfig> = {};

  if (configPath) {
    try {
      parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      logger.error('Failed to parse config.json:', error);
      throw new Error('Invalid config.json format');
    }
  }

  const configuredPort = Number(process.env.PORT || parsed.port || 3000);
  return {
    clientId: process.env.DISCORD_CLIENT_ID || parsed.clientId || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || parsed.clientSecret || '',
    ownerId: process.env.DISCORD_OWNER_ID || parsed.ownerId || '',
    port: Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000,
    callbackUrl:
      process.env.DISCORD_CALLBACK_URL || parsed.callbackUrl || 'http://localhost:3000/api/auth/callback',
  };
}

export function getLavalinkConfig(): LavalinkConfig {
  const lavalinkPath = findConfigFile('lavalink.json');
  let fileConfig: LavalinkConfig = { nodes: [] };

  if (lavalinkPath) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(lavalinkPath, 'utf-8'));
    } catch (error) {
      logger.error('Failed to parse lavalink.json:', error);
    }
  }

  const fallbackNode = fileConfig.nodes[0] || {
    name: 'Default Lavalink',
    host: '127.0.0.1',
    port: 2333,
    auth: 'youshallnotpass',
    secure: false,
  };

  const hasEnvironmentNode = Boolean(
    process.env.LAVALINK_HOST ||
      process.env.LAVALINK_PORT ||
      process.env.LAVALINK_AUTH ||
      process.env.LAVALINK_NODE_NAME
  );

  if (!hasEnvironmentNode) {
    return fileConfig.nodes.length ? fileConfig : { nodes: [fallbackNode] };
  }

  const configuredPort = Number(process.env.LAVALINK_PORT || fallbackNode.port);
  const secureValue = process.env.LAVALINK_SECURE?.trim().toLowerCase();
  const secure =
    secureValue === undefined
      ? Boolean(fallbackNode.secure)
      : ['true', '1', 'yes', 'on'].includes(secureValue);

  return {
    nodes: [
      {
        name: process.env.LAVALINK_NODE_NAME || fallbackNode.name,
        host: process.env.LAVALINK_HOST || fallbackNode.host,
        port: Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : fallbackNode.port,
        auth: process.env.LAVALINK_AUTH || fallbackNode.auth,
        secure,
      },
    ],
  };
}
