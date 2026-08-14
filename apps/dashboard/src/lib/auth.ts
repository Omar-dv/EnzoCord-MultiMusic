import { cookies } from 'next/headers';
import { db } from '@enzocord/database';
import { getConfig } from '@enzocord/config';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'enzocord_session';

export async function getSession() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) return null;

  const session = await db.session.findUnique({
    where: { token: sessionToken },
  });

  if (!session) return null;

  if (new Date() > session.expiresAt) {
    await db.session.delete({ where: { token: sessionToken } }).catch(() => null);
    return null;
  }

  const ownerConfig = getConfig();
  if (session.userId !== ownerConfig.ownerId) {
    return null;
  }

  const owner = await db.owner.findUnique({
    where: { id: session.userId },
  });

  return {
    session,
    owner,
  };
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function destroySession() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await db.session.delete({ where: { token: sessionToken } }).catch(() => null);
    cookies().delete(SESSION_COOKIE_NAME);
  }
}
