export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapExistingBots } = await import('@enzocord/services');
    await bootstrapExistingBots().catch((err) => {
      console.error('Failed to bootstrap bots in instrumentation:', err);
    });
  }
}
