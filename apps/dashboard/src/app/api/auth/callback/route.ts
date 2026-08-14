import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@enzocord/config';
import { createSession } from '@/lib/auth';
import { db } from '@enzocord/database';
import { logger } from '@enzocord/shared';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', request.url));
  }

  const config = getConfig();

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      logger.error('Discord OAuth token exchange failed:', err);
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();

    // Fetch User Profile
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL('/?error=user_fetch_failed', request.url));
    }

    const userData = await userResponse.json();

    // Step 5: Check User ID against ownerId in config.json
    if (config.ownerId && userData.id !== config.ownerId) {
      logger.warn(`Unauthorized login attempt by Discord ID ${userData.id} (@${userData.username})`);
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }

    // Upsert Owner in DB
    await db.owner.upsert({
      where: { id: userData.id },
      create: {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
          : null,
      },
      update: {
        username: userData.username,
        avatar: userData.avatar
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
          : null,
      },
    });

    // Create session & HTTP-only cookie
    await createSession(userData.id);

    await db.auditLog.create({
      data: {
        action: 'LOGIN',
        details: `Owner @${userData.username} logged in successfully`,
        userId: userData.id,
      },
    });

    // Check if service already deployed or needs wizard
    const service = await db.service.findFirst();
    if (service && service.status === 'ONLINE') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/wizard', request.url));
    }
  } catch (error) {
    logger.error('OAuth Callback exception:', error);
    return NextResponse.redirect(new URL('/?error=server_error', request.url));
  }
}
