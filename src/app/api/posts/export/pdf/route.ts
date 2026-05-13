import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { exportPostsToPdf, exportAnalyticsToPdf, exportCalendarToPdf } from '@/lib/pdf-export';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { postIds, month, year, type } = body as {
      postIds?: string[];
      month?: number;
      year?: number;
      type: 'posts' | 'analytics' | 'calendar';
    };

    if (!type || !['posts', 'analytics', 'calendar'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }

    // ---- Export Posts ----
    if (type === 'posts') {
      const where: Record<string, unknown> = {};
      if (postIds && postIds.length > 0) {
        where.id = { in: postIds };
      }
      if (!hasRole(authUser, 'admin', 'validator')) {
        where.authorId = authUser.id;
      }

      const posts = await db.post.findMany({
        where,
        include: { author: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      });

      const pdf = exportPostsToPdf(
        posts as any,
        postIds ? 'Export Posts Sélectionnés' : 'Export Tous les Posts',
      );
      const buffer = Buffer.from(pdf.output('arraybuffer'));

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="posts_export_${new Date().toISOString().split('T')[0]}.pdf"`,
        },
      });
    }

    // ---- Export Analytics ----
    if (type === 'analytics') {
      // Fetch analytics overview (reuse same logic as /api/analytics/overview)
      const postsWithLatestMetrics = await db.post.findMany({
        where: { status: 'posted' },
        include: { metrics: { orderBy: { collectedAt: 'desc' }, take: 1 } },
      });

      const totalPosts = postsWithLatestMetrics.length;
      const postsWithMetrics = postsWithLatestMetrics.filter((p) => p.metrics.length > 0);

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

      const avgEngagementRate =
        postsWithMetrics.length > 0
          ? parseFloat((totalEngagementRate / postsWithMetrics.length).toFixed(2))
          : 0;

      // Trend data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentMetrics = await db.postMetric.findMany({
        where: { collectedAt: { gte: thirtyDaysAgo } },
        orderBy: { collectedAt: 'asc' },
      });

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
        engagementRate: parseFloat(
          (data.engagementRates.reduce((a, b) => a + b, 0) / data.engagementRates.length).toFixed(2),
        ),
      }));

      // Format performance
      const { detectPostFormat } = await import('@/lib/linkedin-competitor');
      const formatGroups: Record<string, { totalEngagement: number; totalImpressions: number; count: number }> = {};
      const formatLabels: Record<string, string> = {
        listicle: 'Listicle',
        storytelling: 'Storytelling',
        controverse: 'Controverse',
        howto: 'Guide Pratique',
        thought_leadership: 'Thought Leadership',
      };

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

      const formatPerformance = Object.entries(formatGroups)
        .map(([format, stats]) => ({
          format,
          label: formatLabels[format] || format,
          avgEngagement: parseFloat((stats.totalEngagement / stats.count).toFixed(2)),
          avgImpressions: Math.round(stats.totalImpressions / stats.count),
          postCount: stats.count,
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement);

      const overview = {
        totalImpressions,
        avgEngagementRate,
        bestPost,
        worstPost,
        postsWithMetrics: postsWithMetrics.length,
        totalPosts,
        trendData,
      };

      const period = month
        ? `${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
        : undefined;

      const pdf = exportAnalyticsToPdf(overview, period, formatPerformance);
      const buffer = Buffer.from(pdf.output('arraybuffer'));

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="rapport_analytique_${new Date().toISOString().split('T')[0]}.pdf"`,
        },
      });
    }

    // ---- Export Calendar ----
    if (type === 'calendar') {
      const calMonth = month || new Date().getMonth() + 1;
      const calYear = year || new Date().getFullYear();

      const startDate = new Date(calYear, calMonth - 1, 1);
      const endDate = new Date(calYear, calMonth, 0, 23, 59, 59, 999);

      const where: Record<string, unknown> = {
        scheduledDate: { gte: startDate, lte: endDate },
      };
      if (!hasRole(authUser, 'admin', 'validator')) {
        where.authorId = authUser.id;
      }

      const posts = await db.post.findMany({
        where,
        include: { author: { select: { name: true } } },
        orderBy: { scheduledDate: 'asc' },
      });

      const pdf = exportCalendarToPdf(posts as any, calMonth, calYear);
      const buffer = Buffer.from(pdf.output('arraybuffer'));

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="calendrier_${calYear}_${String(calMonth).padStart(2, '0')}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: 'Type non supporte' }, { status: 400 });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
