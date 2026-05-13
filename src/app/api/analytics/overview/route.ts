import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Get all posts with their latest metrics
    const postsWithLatestMetrics = await db.post.findMany({
      where: { status: 'posted' },
      include: {
        metrics: {
          orderBy: { collectedAt: 'desc' },
          take: 1,
        },
      },
    });

    const totalPosts = postsWithLatestMetrics.length;
    const postsWithMetrics = postsWithLatestMetrics.filter(p => p.metrics.length > 0);
    
    let totalImpressions = 0;
    let totalEngagementRate = 0;
    let bestPost: { id: string; subject: string; engagementRate: number } | null = null;
    let worstPost: { id: string; subject: string; engagementRate: number } | null = null;

    for (const post of postsWithMetrics) {
      const latestMetric = post.metrics[0];
      if (latestMetric) {
        totalImpressions += latestMetric.impressions;
        totalEngagementRate += latestMetric.engagementRate;

        if (!bestPost || latestMetric.engagementRate > bestPost.engagementRate) {
          bestPost = { id: post.id, subject: post.subject, engagementRate: latestMetric.engagementRate };
        }
        if (!worstPost || latestMetric.engagementRate < worstPost.engagementRate) {
          worstPost = { id: post.id, subject: post.subject, engagementRate: latestMetric.engagementRate };
        }
      }
    }

    const avgEngagementRate = postsWithMetrics.length > 0
      ? parseFloat((totalEngagementRate / postsWithMetrics.length).toFixed(2))
      : 0;

    // Trend data - last 30 days, group by date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMetrics = await db.postMetric.findMany({
      where: {
        collectedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { collectedAt: 'asc' },
    });

    // Group by date
    const trendMap = new Map<string, { impressions: number; engagementRates: number[] }>();
    for (const m of recentMetrics) {
      const dateKey = m.collectedAt.toISOString().split('T')[0];
      const existing = trendMap.get(dateKey) || { impressions: 0, engagementRates: [] };
      existing.impressions += m.impressions;
      existing.engagementRates.push(m.engagementRate);
      trendMap.set(dateKey, existing);
    }

    const trendData = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      impressions: data.impressions,
      engagementRate: parseFloat((data.engagementRates.reduce((a, b) => a + b, 0) / data.engagementRates.length).toFixed(2)),
    }));

    return NextResponse.json({
      totalImpressions,
      avgEngagementRate,
      bestPost,
      worstPost,
      postsWithMetrics: postsWithMetrics.length,
      totalPosts,
      trendData,
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
