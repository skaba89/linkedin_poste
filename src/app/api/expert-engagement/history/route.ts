import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ExpertEngagementAgent } from '@/lib/agents/expert-engagement';

// GET /api/expert-engagement/history — Historique et statistiques des commentaires
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);

    const [history, domainStats] = await Promise.all([
      ExpertEngagementAgent.getCommentHistory(authUser.id, limit),
      ExpertEngagementAgent.getDomainStats(authUser.id),
    ]);

    return NextResponse.json({
      activities: history.activities,
      totalComments: history.totalComments,
      domainStats,
    });
  } catch (error) {
    console.error('[ExpertEngagement] History fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
