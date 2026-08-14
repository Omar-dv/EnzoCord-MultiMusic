import { db } from '@enzocord/database';
import { botManager, setupBotRuntime } from '@enzocord/discord';
import { logger } from '@enzocord/shared';

const globalObj = globalThis as any;
if (!globalObj.__enzocord_bootstrap_state) {
  globalObj.__enzocord_bootstrap_state = {
    isBootstrapped: false,
    promise: null as Promise<void> | null,
  };
}
const state = globalObj.__enzocord_bootstrap_state;

/**
 * Automatically loads and starts all previously deployed bots from the DB
 * when the server boots up. Strictly idempotent: NEVER restarts or touches
 * bots that are already running and active.
 */
export async function bootstrapExistingBots(): Promise<void> {
  if (state.isBootstrapped) return;
  if (state.promise) return state.promise;

  state.promise = (async () => {
    try {
      const bots = await db.bot.findMany();
      if (bots.length === 0) {
        logger.info('No existing bots found in database to bootstrap.');
        state.isBootstrapped = true;
        return;
      }

      logger.info(`[Startup] Bootstrapping ${bots.length} configured bot(s)...`);

      for (const botRecord of bots) {
        // If already connected and ready, skip
        if (botManager.isBotRunning(botRecord.id)) {
          logger.info(`✓ [Startup] Bot ${botRecord.id} (${botRecord.name}) already active.`);
          continue;
        }

        try {
          const client = await botManager.startBot(botRecord.id, botRecord.token);
          await setupBotRuntime(client, botRecord.id);
          logger.info(`✓ [Startup] Reconnected bot ${botRecord.id} (${botRecord.name})`);
        } catch (err) {
          logger.error(`[Startup] Failed to reconnect bot ${botRecord.id} (${botRecord.name}):`, err);
        }
      }

      state.isBootstrapped = true;
      logger.info('[Startup] All existing bots verified and active!');
    } catch (err) {
      logger.error('[Startup] Error during bot bootstrapping:', err);
    }
  })();

  return state.promise;
}
