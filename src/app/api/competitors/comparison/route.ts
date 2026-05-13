import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Get your avg metrics
    const yourPosts = await db.post.findMany({
      where: { status: 'posted' },
      include: { metrics: { orderBy: { collectedAt: 'desc' }, take: 1 } },
    });

    const yourWithMetrics = yourPosts.filter(p => p.metrics.length > 0);
    let yourAvgEngagement = 0;
    let yourAvgLikes = 0;
    let yourAvgComments = 0;
    let yourAvgImpressions = 0;

    if (yourWithMetrics.length > 0) {
      yourAvgEngagement = yourWithMetrics.reduce((s, p) => s + p.metrics[0].engagementRate, 0) / yourWithMetrics.length;
      yourAvgLikes = yourWithMetrics.reduce((s, p) => s + p.metrics[0].likes, 0) / yourWithMetrics.length;
      yourAvgComments = yourWithMetrics.reduce((s, p) => s + p.metrics[0].comments, 0) / yourWithMetrics.length;
      yourAvgImpressions = yourWithMetrics.reduce((s, p) => s + p.metrics[0].impressions, 0) / yourWithMetrics.length;
    }

    // Get competitors
    const competitors = await db.competitor.findMany({
      where: { isActive: true, userId: authUser.id },
      include: { posts: true },
    });

    const competitorStats = await Promise.all(
      competitors.map(async (c) => {
        const posts = c.posts;
        const avgEngagement = posts.length > 0
          ? posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length
          : 0;
        const avgLikes = posts.length > 0
          ? posts.reduce((s, p) => s + p.likes, 0) / posts.length
          : 0;
        const avgComments = posts.length > 0
          ? posts.reduce((s, p) => s + p.comments, 0) / posts.length
          : 0;
        const postingFrequency = posts.length > 0
          ? parseFloat((posts.length / Math.max(1, Math.ceil((Date.now() - new Date(c.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)))).toFixed(1))
          : 0;

        return {
          id: c.id,
          name: c.name,
          industry: c.industry,
          postCount: posts.length,
          avgEngagement: parseFloat(avgEngagement.toFixed(2)),
          avgLikes: Math.round(avgLikes),
          avgComments: Math.round(avgComments),
          postingFrequency,
        };
      })
    );

    return NextResponse.json({
      you: {
        name: 'Vous',
        postCount: yourWithMetrics.length,
        avgEngagement: parseFloat(yourAvgEngagement.toFixed(2)),
        avgLikes: Math.round(yourAvgLikes),
        avgComments: Math.round(yourAvgComments),
        avgImpressions: Math.round(yourAvgImpressions),
      },
      competitors: competitorStats,
    });
  } catch (error) {
    console.error('Competitors comparison error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
