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

    const posts = postsWithMetrics
      .filter(p => p.metrics.length > 0 && p.contentScore !== null && p.contentScore !== undefined)
      .map(p => ({
        id: p.id,
        subject: p.subject,
        contentScore: p.contentScore!,
        engagementRate: p.metrics[0].engagementRate,
        format: detectPostFormat(p.subject + ' ' + (p.angle || '') + ' ' + (p.finalContent || '')),
      }));

    // Calculate Pearson correlation
    const n = posts.length;
    let correlation = 0;
    if (n >= 2) {
      const sumX = posts.reduce((s, p) => s + p.contentScore, 0);
      const sumY = posts.reduce((s, p) => s + p.engagementRate, 0);
      const sumXY = posts.reduce((s, p) => s + p.contentScore * p.engagementRate, 0);
      const sumX2 = posts.reduce((s, p) => s + p.contentScore * p.contentScore, 0);
      const sumY2 = posts.reduce((s, p) => s + p.engagementRate * p.engagementRate, 0);

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

      correlation = denominator !== 0 ? parseFloat((numerator / denominator).toFixed(3)) : 0;
    }

    return NextResponse.json({
      posts,
      correlation,
    });
  } catch (error) {
    console.error('Analytics score-correlation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
