import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@enzocord/config';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { db } from '@enzocord/database';
import { logger } from '@enzocord/shared';

export const dynamic = 'force-dynamic';

function getSafeRedirectUrl(targetPath: string, request: NextRequest, configuredCallbackUrl?: string): URL {
  // 1. If configured DISCORD_CALLBACK_URL in .env has a valid origin (not 0.0.0.0), use its origin
  if (configuredCallbackUrl) {
    try {
      const parsed = new URL(configuredCallbackUrl);
      if (parsed.hostname && parsed.hostname !== '0.0.0.0') {
        return new URL(targetPath, parsed.origin);
      }
    } catch {}
  }

  // 2. Extract from Host or X-Forwarded-Host header sent by the user's browser
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https:') ? 'https' : 'http');
  const activeHost = forwardedHost || host;

  if (activeHost && !activeHost.startsWith('0.0.0.0')) {
    return new URL(targetPath, `${proto}://${activeHost}`);
  }

  // 3. Fallback to request.nextUrl while replacing 0.0.0.0 with localhost
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  url.search = '';
  if (url.hostname === '0.0.0.0') {
    url.hostname = 'localhost';
  }
  return url;
}

export async function GET(request: NextRequest) {
  const config = getConfig();
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(getSafeRedirectUrl('/?error=missing_code', request, config.callbackUrl));
  }

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
      return NextResponse.redirect(getSafeRedirectUrl('/?error=token_exchange_failed', request, config.callbackUrl));
    }

    const tokenData = await tokenResponse.json();

    // Fetch User Profile
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(getSafeRedirectUrl('/?error=user_fetch_failed', request, config.callbackUrl));
    }

    const userData = await userResponse.json();

    // Check User ID against ownerId in .env (only if ownerId is configured)
    if (config.ownerId && userData.id !== config.ownerId) {
      logger.warn(`Unauthorized login attempt by Discord ID ${userData.id} (@${userData.username})`);
      return NextResponse.redirect(getSafeRedirectUrl('/access-denied', request, config.callbackUrl));
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
    const { token, expiresAt } = await createSession(userData.id);

    await db.auditLog.create({
      data: {
        action: 'LOGIN',
        details: `Owner @${userData.username} logged in successfully`,
        userId: userData.id,
      },
    });

    // Check if service already deployed or needs wizard
    const service = await db.service.findFirst();
    const targetPath = service && service.status === 'ONLINE' ? '/dashboard' : '/wizard';
    const redirectUrl = getSafeRedirectUrl(targetPath, request, config.callbackUrl);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // Ensure cookies are stored on HTTP hostings (Pterodactyl/IP) as well as HTTPS
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('OAuth Callback exception:', error);
    return NextResponse.redirect(getSafeRedirectUrl('/?error=server_error', request, config.callbackUrl));
  }
}
