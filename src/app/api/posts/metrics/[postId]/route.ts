import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { postId } = await params;

    const metrics = await db.postMetric.findMany({
      where: { postId },
      orderBy: { collectedAt: 'desc' },
    });

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('PostMetrics GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
