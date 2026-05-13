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

    // Get published posts for test creation
    const publishedPosts = await db.post.findMany({
      where: { status: 'posted' },
      select: { id: true },
      take: 10,
    });

    if (publishedPosts.length < 2) {
      return NextResponse.json({ seeded: 0, message: 'Pas assez de posts publiés pour créer des tests A/B' });
    }

    const criteriaOptions = ['engagement', 'impressions', 'clicks'];
    const testNames = ['Listicle vs Storytelling', 'Ton provocateur vs informatif', 'CTA direct vs indirect'];
    let seeded = 0;

    for (let i = 0; i < Math.min(3, Math.floor(publishedPosts.length / 2)); i++) {
      const postA = publishedPosts[i * 2];
      const postB = publishedPosts[i * 2 + 1];

      if (!postA || !postB) continue;

      // Check if test already exists
      const existing = await db.aBTest.findFirst({
        where: { postAId: postA.id, postBId: postB.id },
      });
      if (existing) continue;

      const test = await db.aBTest.create({
        data: {
          name: testNames[i] || `Test A/B #${i + 1}`,
          description: 'Test de démonstration auto-généré',
          postAId: postA.id,
          postBId: postB.id,
          criteria: criteriaOptions[i % criteriaOptions.length],
          status: 'running',
          startDate: new Date(),
          authorId: authUser.id,
        },
      });

      // Generate readings for both variants
      const metricNames = ['impressions', 'likes', 'comments', 'reposts', 'clicks'];
      for (const variant of ['A', 'B'] as const) {
        for (const metric of metricNames) {
          const baseValues: Record<string, number> = {
            impressions: 500 + Math.random() * 3000,
            likes: 20 + Math.random() * 200,
            comments: 5 + Math.random() * 50,
            reposts: 2 + Math.random() * 30,
            clicks: 10 + Math.random() * 100,
          };

          await db.aBReading.create({
            data: {
              testId: test.id,
              variant,
              metric,
              value: Math.round(baseValues[metric] * (variant === 'A' ? 1 : 0.8 + Math.random() * 0.5)),
            },
          });
        }
      }

      seeded++;
    }

    return NextResponse.json({ seeded });
  } catch (error) {
    console.error('ABTests seed error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
