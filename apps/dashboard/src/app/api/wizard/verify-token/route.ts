import { NextRequest, NextResponse } from 'next/server';
import { verifyBotToken } from '@enzocord/discord';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Bot token is required' }, { status: 400 });
    }

    const botInfo = await verifyBotToken(token);

    // Return identity without returning the raw token back
    return NextResponse.json({
      verified: true,
      bot: {
        id: botInfo.id,
        name: botInfo.username,
        discriminator: botInfo.discriminator,
        avatar: botInfo.avatar,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { verified: false, error: error.message || 'Token verification failed' },
      { status: 400 }
    );
  }
}
