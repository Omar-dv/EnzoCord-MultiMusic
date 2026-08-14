import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deploymentManager } from '@enzocord/services';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deploymentManager.resetService();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Service reset failed' },
      { status: 500 }
    );
  }
}
