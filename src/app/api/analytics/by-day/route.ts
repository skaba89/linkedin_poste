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

    const dayLabels: Record<string, string> = {
      '0': 'Dim', '1': 'Lun', '2': 'Mar', '3': 'Mer', '4': 'Jeu', '5': 'Ven', '6': 'Sam',
    };

    const dayGroups: Record<string, { totalEngagement: number; totalImpressions: number; count: number }> = {};

    for (const post of postsWithMetrics) {
      const latestMetric = post.metrics[0];
      if (!latestMetric) continue;

      // Use the post's createdAt day as a proxy for posting day
      const day = String(new Date(post.createdAt).getDay());
      if (!dayGroups[day]) {
        dayGroups[day] = { totalEngagement: 0, totalImpressions: 0, count: 0 };
      }
      dayGroups[day].totalEngagement += latestMetric.engagementRate;
      dayGroups[day].totalImpressions += latestMetric.impressions;
      dayGroups[day].count += 1;
    }

    // Ensure all days are present
    const dayOrder = ['1', '2', '3', '4', '5', '6', '0']; // Mon-Sun
    const data = dayOrder.map(day => {
      const stats = dayGroups[day] || { totalEngagement: 0, totalImpressions: 0, count: 0 };
      return {
        day,
        dayLabel: dayLabels[day],
        avgEngagement: stats.count > 0 ? parseFloat((stats.totalEngagement / stats.count).toFixed(2)) : 0,
        avgImpressions: stats.count > 0 ? Math.round(stats.totalImpressions / stats.count) : 0,
        postCount: stats.count,
      };
    });

    return NextResponse.json({ days: data });
  } catch (error) {
    console.error('Analytics by-day error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
