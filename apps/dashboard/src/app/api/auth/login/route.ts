import { NextResponse } from 'next/server';
import { getConfig } from '@enzocord/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getConfig();
  
  if (!config.clientId || !config.callbackUrl) {
    return NextResponse.json(
      { error: 'Discord OAuth credentials missing in config.json' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: 'code',
    scope: 'identify guilds',
  });

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  return NextResponse.redirect(discordAuthUrl);
}
