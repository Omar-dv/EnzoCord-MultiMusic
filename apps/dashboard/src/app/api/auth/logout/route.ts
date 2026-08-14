import { NextRequest, NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/auth';
import { db } from '@enzocord/database';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sessionData = await getSession();
  if (sessionData) {
    await db.auditLog.create({
      data: {
        action: 'LOGOUT',
        details: `Owner logged out`,
        userId: sessionData.owner?.id,
      },
    });
  }

  await destroySession();
  return NextResponse.json({ success: true });
}
