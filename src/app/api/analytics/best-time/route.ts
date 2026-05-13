import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { analyzeBestTime } from '@/lib/best-time-predictor';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const posts = await db.post.findMany({
      where: { scheduledDate: { not: null }, status: 'posted' },
      include: { metrics: { orderBy: { collectedAt: 'desc' }, take: 1 } },
    });

    const withMetrics = posts.filter(p => p.metrics.length > 0 && p.metrics[0].engagementRate > 0);
    const data = withMetrics.map(p => ({
      scheduledDate: p.scheduledDate!.toISOString(),
      engagementRate: p.metrics[0].engagementRate,
    }));

    const analysis = analyzeBestTime(data);

    if (analysis) {
      await db.postingSlot.deleteMany({ where: { userId: authUser.id } });
      for (const slot of [...analysis.topSlots, ...analysis.worstSlots]) {
        await db.postingSlot.create({
          data: {
            userId: authUser.id,
            dayOfWeek: slot.dayOfWeek,
            hour: slot.hour,
            avgEngagement: slot.avgEngagement,
            totalPosts: slot.totalDataPoints,
          },
        });
      }
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const slots = await db.postingSlot.findMany({
      where: { userId: authUser.id },
      orderBy: { avgEngagement: 'desc' },
    });

    if (slots.length === 0) {
      const posts = await db.post.findMany({
        where: { scheduledDate: { not: null }, status: 'posted' },
        include: { metrics: { orderBy: { collectedAt: 'desc' }, take: 1 } },
      });
      const withMetrics = posts.filter(p => p.metrics.length > 0 && p.metrics[0].engagementRate > 0);
      const data = withMetrics.map(p => ({ scheduledDate: p.scheduledDate!.toISOString(), engagementRate: p.metrics[0].engagementRate }));
      const analysis = analyzeBestTime(data);
      return NextResponse.json({ analysis });
    }

    return NextResponse.json({ cached: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
