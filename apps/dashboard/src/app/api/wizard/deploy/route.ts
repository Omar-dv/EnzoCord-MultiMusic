import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deploymentManager } from '@enzocord/services';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { guildId, bots } = await request.json();

    if (!guildId || !Array.isArray(bots) || bots.length === 0) {
      return NextResponse.json({ error: 'Invalid deployment configuration' }, { status: 400 });
    }

    if (bots.length > 15) {
      return NextResponse.json({ error: 'Maximum 15 bots allowed' }, { status: 400 });
    }

    // Execute real deployment
    await deploymentManager.deployBotsToGuild(guildId, bots);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Deployment failed' },
      { status: 500 }
    );
  }
}
