import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const posts = await db.post.findMany({
      where: { contentScore: { not: null } },
      include: { metrics: { orderBy: { collectedAt: 'desc' }, take: 1 } },
    });

    const eligible = posts.filter(p => p.metrics.length > 0 && p.metrics[0].engagementRate > 0);
    let calibrationsCreated = 0;
    let totalDelta = 0;
    const factorDeltas: Record<string, number[]> = { length: [], hook: [], cta: [], hashtags: [], readability: [], emoji: [] };

    for (const post of eligible) {
      const predictedScore = post.contentScore!;
      const engagementRate = post.metrics[0].engagementRate;
      const actualScore = Math.min(100, Math.max(0, engagementRate * 10));
      const delta = actualScore - predictedScore;
      totalDelta += delta;

      await db.scoringCalibration.create({
        data: {
          postId: post.id,
          predictedScore,
          actualScore,
          delta,
          factors: post.scoreDetails || null,
        },
      });
      calibrationsCreated++;

      if (post.scoreDetails) {
        try {
          const details = post.scoreDetails;
          const lengthMatch = details.match(/Longueur.*?\((\d+)\/20\)/);
          const hookMatch = details.match(/Hook.*?\((\d+)\/15\)/);
          const ctaMatch = details.match(/CTA.*?\((\d+)\/15\)/);
          const hashMatch = details.match(/Hashtags.*?\((\d+)\/10\)/);
          const readMatch = details.match(/Lisibilité.*?\((\d+)\/15\)/);
          const emojiMatch = details.match(/Émojis.*?\((\d+)\/10\)/);

          if (lengthMatch) factorDeltas.length.push(parseFloat(lengthMatch[1]));
          if (hookMatch) factorDeltas.hook.push(parseFloat(hookMatch[1]));
          if (ctaMatch) factorDeltas.cta.push(parseFloat(ctaMatch[1]));
          if (hashMatch) factorDeltas.hashtags.push(parseFloat(hashMatch[1]));
          if (readMatch) factorDeltas.readability.push(parseFloat(readMatch[1]));
          if (emojiMatch) factorDeltas.emoji.push(parseFloat(emojiMatch[1]));
        } catch {}
      }
    }

    const avgDelta = calibrationsCreated > 0 ? Math.round(totalDelta / calibrationsCreated * 100) / 100 : 0;
    const factorAdjustments = Object.entries(factorDeltas).map(([name, deltas]) => {
      const avg = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
      return { name, avgScore: Math.round(avg * 10) / 10, count: deltas.length };
    });

    return NextResponse.json({ calibrationsCreated, avgDelta, factorAdjustments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la calibration' }, { status: 500 });
  }
}
