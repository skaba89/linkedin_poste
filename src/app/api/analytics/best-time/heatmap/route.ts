import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const posts = await db.post.findMany({
      where: { scheduledDate: { not: null }, status: 'posted' },
      include: { metrics: { orderBy: { collectedAt: 'desc' }, take: 1 } },
    });

    const grid: Array<{ dayOfWeek: number; hour: number; avgEngagement: number; totalPosts: number; confidence: number }> = [];

    for (let dow = 1; dow <= 7; dow++) {
      for (let hour = 6; hour <= 22; hour++) {
        const dayOfWeek = dow === 7 ? 0 : dow;
        const matching = posts.filter(p => {
          if (!p.scheduledDate || p.metrics.length === 0) return false;
          const d = new Date(p.scheduledDate);
          const pdow = d.getDay();
          const phour = d.getHours();
          return pdow === dayOfWeek && phour === hour;
        });

        if (matching.length > 0) {
          const avg = matching.reduce((s, p) => s + p.metrics[0].engagementRate, 0) / matching.length;
          grid.push({
            dayOfWeek,
            hour,
            avgEngagement: Math.round(avg * 100) / 100,
            totalPosts: matching.length,
            confidence: Math.min(100, matching.length * 25),
          });
        } else {
          grid.push({ dayOfWeek, hour, avgEngagement: 0, totalPosts: 0, confidence: 0 });
        }
      }
    }

    return NextResponse.json({ grid });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
