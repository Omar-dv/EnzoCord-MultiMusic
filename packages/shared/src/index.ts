export interface AppConfig {
  clientId: string;
  clientSecret: string;
  ownerId: string;
  port: number;
  callbackUrl: string;
}

export interface LavalinkNodeConfig {
  name: string;
  host: string;
  port: number;
  auth: string;
  secure?: boolean;
}

export interface LavalinkConfig {
  nodes: LavalinkNodeConfig[];
}

export interface VerifiedBotInfo {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

export interface UserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => console.log(`[DEBUG] [${new Date().toISOString()}] ${msg}`, ...args),
};
