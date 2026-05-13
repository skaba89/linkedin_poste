import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// POST /api/content/recycle — auto-find and recycle old high-performing content
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const minDaysOld = body.minDaysOld || 30;
    const minScore = body.minScore || 70;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - minDaysOld);

    // Find posts that are old enough and have good scores
    const eligiblePosts = await db.post.findMany({
      where: {
        authorId: authUser.id,
        status: { in: ['posted'] },
        createdAt: { lte: cutoffDate },
        contentScore: { gte: minScore },
        finalContent: { not: null },
      },
      orderBy: { contentScore: 'desc' },
      take: 10,
      select: {
        id: true,
        subject: true,
        finalContent: true,
        contentScore: true,
        createdAt: true,
        hashtags: true,
      },
    });

    // Count how many times each post has already been recycled
    const recyclingCounts: Record<string, number> = {};
    for (const post of eligiblePosts) {
      const count = await db.repurposedContent.count({
        where: { sourcePostId: post.id },
      });
      recyclingCounts[post.id] = count;
    }

    const eligible = eligiblePosts.filter(
      (p) => (recyclingCounts[p.id] || 0) < 3
    );

    const stats = {
      totalScanned: eligiblePosts.length,
      eligible: eligible.length,
      alreadyMaxRecycled: eligiblePosts.length - eligible.length,
      posts: eligible.map((p) => ({
        id: p.id,
        subject: p.subject,
        score: p.contentScore,
        timesRecycled: recyclingCounts[p.id] || 0,
        createdAt: p.createdAt,
      })),
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Content recycle scan error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
