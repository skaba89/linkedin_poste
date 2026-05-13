import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const posts = await db.post.findMany({
      where: { contentScore: { not: null } },
      include: { metrics: { orderBy: { collectedAt: 'desc' }, take: 1 } },
      orderBy: { contentScore: 'desc' },
      take: 20,
    });

    const leaderboard = posts.map(p => ({
      id: p.id,
      subject: p.subject,
      contentScore: p.contentScore,
      engagementRate: p.metrics.length > 0 ? p.metrics[0].engagementRate : null,
      delta: p.metrics.length > 0 && p.contentScore
        ? Math.round((p.metrics[0].engagementRate * 10 - p.contentScore) * 100) / 100
        : null,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
