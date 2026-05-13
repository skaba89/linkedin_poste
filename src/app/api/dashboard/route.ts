import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const now = new Date();

    const [
      totalIdeas,
      totalDrafts,
      pendingApproval,
      approved,
      published,
      failed,
      totalPosts,
    ] = await Promise.all([
      db.post.count({ where: { status: 'idea' } }),
      db.post.count({ where: { status: 'draft' } }),
      db.post.count({ where: { status: 'pending_approval' } }),
      db.post.count({ where: { status: 'approved' } }),
      db.post.count({ where: { status: 'posted' } }),
      db.post.count({ where: { status: 'failed' } }),
      db.post.count(),
    ]);

    const recentPosts = await db.post.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Posts by provider stats
    const postsByProvider = await db.post.groupBy({
      by: ['aiProvider'],
      _count: true,
    });

    // --- engagementRate: average from PostMetric ---
    const metricsAgg = await db.postMetric.aggregate({
      _avg: { engagementRate: true },
      _count: true,
    });
    const engagementRate = metricsAgg._count > 0
      ? Math.round((metricsAgg._avg.engagementRate ?? 0) * 100) / 100
      : 0;

    // --- weeklyGrowth: posts created this week vs last week ---
    const dayOfWeek = now.getDay();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    thisMonday.setHours(0, 0, 0, 0);

    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const [postsThisWeekCount, postsLastWeekCount] = await Promise.all([
      db.post.count({ where: { createdAt: { gte: thisMonday } } }),
      db.post.count({
        where: { createdAt: { gte: lastMonday, lt: thisMonday } },
      }),
    ]);

    const weeklyGrowth =
      postsLastWeekCount > 0
        ? Math.round(((postsThisWeekCount - postsLastWeekCount) / postsLastWeekCount) * 100)
        : postsThisWeekCount > 0
          ? 100
          : 0;

    // --- topPerformingFormat: format with highest avg engagement ---
    // We infer format from hashtags or angle keywords matching known categories
    const FORMAT_KEYWORDS: Record<string, string[]> = {
      storytelling: ['storytelling', 'histoire', 'story', 'récit'],
      listicle: ['listicle', 'liste', 'top ', 'conseil'],
      thought_leadership: ['thought leadership', 'vision', 'réflexion', 'insight'],
      howto: ['howto', 'guide', 'tutoriel', 'comment ', 'étape'],
      engagement: ['question', 'sondage', 'poll', 'avis'],
      controverse: ['controverse', 'débat', 'provoc', 'opinion'],
    };

    const postsWithMetrics = await db.post.findMany({
      where: {
        metrics: { some: {} },
        status: 'posted',
      },
      select: {
        hashtags: true,
        angle: true,
        metrics: { select: { engagementRate: true } },
      },
    });

    let topPerformingFormat: string | null = null;
    if (postsWithMetrics.length > 0) {
      const formatScores: Record<string, { total: number; count: number }> = {};

      for (const post of postsWithMetrics) {
        const text = `${post.hashtags || ''} ${post.angle || ''}`.toLowerCase();
        let matchedFormat: string | null = null;

        for (const [format, keywords] of Object.entries(FORMAT_KEYWORDS)) {
          if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
            matchedFormat = format;
            break;
          }
        }

        if (matchedFormat) {
          if (!formatScores[matchedFormat]) {
            formatScores[matchedFormat] = { total: 0, count: 0 };
          }
          // Use the latest metric's engagement rate
          const latestMetric = post.metrics[post.metrics.length - 1];
          formatScores[matchedFormat].total += latestMetric.engagementRate;
          formatScores[matchedFormat].count += 1;
        }
      }

      let bestFormat = '';
      let bestAvg = -1;
      for (const [format, scores] of Object.entries(formatScores)) {
        const avg = scores.total / scores.count;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestFormat = format;
        }
      }
      if (bestFormat) {
        topPerformingFormat = bestFormat;
      }
    }

    // --- streak: consecutive days with at least 1 posted post ---
    const postedPostsForStreak = await db.post.findMany({
      where: { status: 'posted' },
      select: { createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    let streak = 0;
    if (postedPostsForStreak.length > 0) {
      // Get unique days (using updatedAt as the publication date)
      const daysSet = new Set<string>();
      for (const p of postedPostsForStreak) {
        const d = new Date(p.updatedAt);
        daysSet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }

      // Check consecutive days from today going backwards
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
        if (daysSet.has(key)) {
          streak++;
        } else {
          break;
        }
      }
    }

    // --- lastError: most recent failed post's error message ---
    const lastFailedPost = await db.post.findFirst({
      where: { status: 'failed', errorMessage: { not: null } },
      select: { errorMessage: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      totalIdeas,
      totalDrafts,
      pendingApproval,
      approved,
      published,
      failed,
      totalPosts,
      recentPosts,
      postsByProvider,
      postsThisWeek: postsThisWeekCount,
      engagementRate,
      weeklyGrowth,
      topPerformingFormat,
      streak,
      lastError: lastFailedPost?.errorMessage ?? null,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
