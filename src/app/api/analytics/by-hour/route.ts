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

    // Group by hour (6-22h)
    const hourGroups: Record<number, { totalEngagement: number; totalImpressions: number; count: number }> = {};

    for (const post of postsWithMetrics) {
      const latestMetric = post.metrics[0];
      if (!latestMetric) continue;

      // Use scheduledDate or createdAt to determine posting hour
      const date = post.scheduledDate || post.createdAt;
      const hour = new Date(date).getHours();

      // Only include hours 6-22
      if (hour < 6 || hour > 22) continue;

      if (!hourGroups[hour]) {
        hourGroups[hour] = { totalEngagement: 0, totalImpressions: 0, count: 0 };
      }
      hourGroups[hour].totalEngagement += latestMetric.engagementRate;
      hourGroups[hour].totalImpressions += latestMetric.impressions;
      hourGroups[hour].count += 1;
    }

    const data: Array<{ hour: number; avgEngagement: number; avgImpressions: number; postCount: number }> = [];
    for (let h = 6; h <= 22; h++) {
      const stats = hourGroups[h] || { totalEngagement: 0, totalImpressions: 0, count: 0 };
      data.push({
        hour: h,
        avgEngagement: stats.count > 0 ? parseFloat((stats.totalEngagement / stats.count).toFixed(2)) : 0,
        avgImpressions: stats.count > 0 ? Math.round(stats.totalImpressions / stats.count) : 0,
        postCount: stats.count,
      });
    }

    return NextResponse.json({ hours: data });
  } catch (error) {
    console.error('Analytics by-hour error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
