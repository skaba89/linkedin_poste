import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const postsWithMetrics = await db.post.findMany({
      where: { status: 'posted' },
      include: {
        metrics: { orderBy: { collectedAt: 'desc' }, take: 1 },
      },
    });

    const providerLabels: Record<string, string> = {
      openrouter: 'OpenRouter',
      groq: 'Groq',
      glm: 'GLM-5',
    };

    const providerGroups: Record<string, { totalScore: number; totalEngagement: number; count: number }> = {};

    for (const post of postsWithMetrics) {
      const latestMetric = post.metrics[0];
      const provider = post.aiProvider || 'openrouter';

      if (!providerGroups[provider]) {
        providerGroups[provider] = { totalScore: 0, totalEngagement: 0, count: 0 };
      }
      providerGroups[provider].count += 1;
      providerGroups[provider].totalScore += post.contentScore || 0;

      if (latestMetric) {
        providerGroups[provider].totalEngagement += latestMetric.engagementRate;
      }
    }

    const data = Object.entries(providerGroups).map(([provider, stats]) => ({
      provider,
      label: providerLabels[provider] || provider,
      avgScore: stats.count > 0 ? parseFloat((stats.totalScore / stats.count).toFixed(1)) : 0,
      avgEngagement: stats.count > 0 ? parseFloat((stats.totalEngagement / stats.count).toFixed(2)) : 0,
      postCount: stats.count,
    }));

    return NextResponse.json({ providers: data });
  } catch (error) {
    console.error('Analytics by-provider error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
