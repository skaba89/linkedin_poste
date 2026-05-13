import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { detectPostFormat } from '@/lib/linkedin-competitor';

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

    // Detect format and group
    const formatGroups: Record<string, { totalEngagement: number; totalImpressions: number; count: number }> = {};

    for (const post of postsWithMetrics) {
      const latestMetric = post.metrics[0];
      if (!latestMetric) continue;

      const format = detectPostFormat(post.subject + ' ' + (post.angle || '') + ' ' + (post.finalContent || ''));
      if (!formatGroups[format]) {
        formatGroups[format] = { totalEngagement: 0, totalImpressions: 0, count: 0 };
      }
      formatGroups[format].totalEngagement += latestMetric.engagementRate;
      formatGroups[format].totalImpressions += latestMetric.impressions;
      formatGroups[format].count += 1;
    }

    const formatLabels: Record<string, string> = {
      listicle: 'Listicle',
      storytelling: 'Storytelling',
      controverse: 'Controverse',
      howto: 'Guide Pratique',
      thought_leadership: 'Thought Leadership',
    };

    const data = Object.entries(formatGroups).map(([format, stats]) => ({
      format,
      label: formatLabels[format] || format,
      avgEngagement: parseFloat((stats.totalEngagement / stats.count).toFixed(2)),
      avgImpressions: Math.round(stats.totalImpressions / stats.count),
      postCount: stats.count,
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    return NextResponse.json({ formats: data });
  } catch (error) {
    console.error('Analytics by-format error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
