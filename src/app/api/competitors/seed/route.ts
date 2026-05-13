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

    const competitorNames = ['TechVision Corp', 'DataDrive Agency', 'SocialBoost Media'];
    const industries = ['Tech', 'Marketing Digital', 'Social Media'];
    let seededCompetitors = 0;

    for (let i = 0; i < competitorNames.length; i++) {
      const existing = await db.competitor.findFirst({
        where: { name: competitorNames[i], userId: authUser.id },
      });
      if (existing) continue;

      const competitor = await db.competitor.create({
        data: {
          userId: authUser.id,
          name: competitorNames[i],
          linkedinUrl: `https://linkedin.com/company/${competitorNames[i].toLowerCase().replace(/\s/g, '-')}`,
          industry: industries[i],
        },
      });

      // Seed 3-5 posts per competitor
      const subjects = [
        'Les 5 tendances tech qui changent tout en 2025',
        'Comment notre équipe a doublé sa productivité',
        'Pourquoi les KPIs ne suffisent plus',
        'Notre framework d\'onboarding en 7 étapes',
        'L\'histoire de notre premier client enterprise',
      ];

      for (const subject of subjects) {
        const likes = 30 + Math.round(Math.random() * 300);
        const comments = 5 + Math.round(Math.random() * 40);
        const reposts = 2 + Math.round(Math.random() * 20);
        const totalEngagement = likes + comments + reposts;
        const estimatedImpressions = totalEngagement / (0.02 + Math.random() * 0.03);

        const daysAgo = Math.round(Math.random() * 60);
        const publishedAt = new Date();
        publishedAt.setDate(publishedAt.getDate() - daysAgo);

        await db.competitorPost.create({
          data: {
            competitorId: competitor.id,
            subject,
            likes,
            comments,
            reposts,
            engagementRate: parseFloat((totalEngagement / estimatedImpressions * 100).toFixed(2)),
            publishedAt,
          },
        });
      }

      seededCompetitors++;
    }

    return NextResponse.json({ seededCompetitors });
  } catch (error) {
    console.error('Competitors seed error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
