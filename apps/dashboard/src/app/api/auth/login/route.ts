import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@enzocord/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const config = getConfig();

  if (!config.clientId) {
    return NextResponse.json(
      { error: 'Discord OAuth client ID missing in .env (DISCORD_CLIENT_ID)' },
      { status: 500 }
    );
  }

  // Resolve redirect_uri dynamically if config.callbackUrl is not configured or uses 0.0.0.0
  let callbackUrl = config.callbackUrl;
  if (!callbackUrl || callbackUrl.includes('0.0.0.0')) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https:') ? 'https' : 'http');
    callbackUrl = `${proto}://${host}/api/auth/callback`;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'identify guilds',
  });

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  return NextResponse.redirect(discordAuthUrl);
}
