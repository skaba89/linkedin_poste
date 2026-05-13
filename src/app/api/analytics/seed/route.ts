import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    // Get all "posted" posts
    const postedPosts = await db.post.findMany({
      where: { status: 'posted' },
    });

    if (postedPosts.length === 0) {
      return NextResponse.json({ seeded: 0, message: 'Aucun post publié trouvé' });
    }

    let seeded = 0;

    for (const post of postedPosts) {
      // Check if metrics already exist
      const existing = await db.postMetric.findFirst({ where: { postId: post.id } });
      if (existing) continue;

      // Generate realistic metrics based on content score
      const score = post.contentScore || 50;
      const scoreMultiplier = 0.5 + (score / 100) * 1.5; // 0.5x to 2x based on score
      const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3

      const baseImpressions = Math.round((800 + Math.random() * 4000) * scoreMultiplier * randomFactor);
      const engagementRate = parseFloat(((0.8 + Math.random() * 4.5) * scoreMultiplier * randomFactor).toFixed(2));
      const totalEngagements = Math.round(baseImpressions * engagementRate / 100);

      await db.postMetric.create({
        data: {
          postId: post.id,
          impressions: baseImpressions,
          reach: Math.round(baseImpressions * (0.6 + Math.random() * 0.3)),
          likes: Math.round(totalEngagements * 0.45),
          comments: Math.round(totalEngagements * 0.15),
          reposts: Math.round(totalEngagements * 0.1),
          clicks: Math.round(totalEngagements * 0.3),
          engagementRate,
          source: 'manual',
        },
      });

      // Generate time-series data: 3-5 data points over 30 days
      const dataPoints = 3 + Math.floor(Math.random() * 3);
      for (let i = 1; i <= dataPoints; i++) {
        const daysAgo = Math.round(i * (30 / dataPoints));
        const collectedAt = new Date();
        collectedAt.setDate(collectedAt.getDate() - daysAgo);

        const growthFactor = 1 + (i * 0.05); // Slight growth over time
        const imp = Math.round(baseImpressions * (0.5 + Math.random() * 0.5) * growthFactor);
        const eng = parseFloat((engagementRate * (0.7 + Math.random() * 0.6)).toFixed(2));
        const totalEng = Math.round(imp * eng / 100);

        await db.postMetric.create({
          data: {
            postId: post.id,
            impressions: imp,
            reach: Math.round(imp * (0.6 + Math.random() * 0.3)),
            likes: Math.round(totalEng * 0.45),
            comments: Math.round(totalEng * 0.15),
            reposts: Math.round(totalEng * 0.1),
            clicks: Math.round(totalEng * 0.3),
            engagementRate: eng,
            source: 'manual',
            collectedAt,
          },
        });
      }

      seeded++;
    }

    return NextResponse.json({ seeded, total: postedPosts.length });
  } catch (error) {
    console.error('Analytics seed error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
