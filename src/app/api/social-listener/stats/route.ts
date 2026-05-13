import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [mentions, positiveCount, negativeCount, neutralCount, repliedCount] = await Promise.all([
      db.socialMention.findMany({
        where: { userId: authUser.id, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
      }),
      db.socialMention.count({
        where: { userId: authUser.id, sentiment: 'positive', createdAt: { gte: since } },
      }),
      db.socialMention.count({
        where: { userId: authUser.id, sentiment: 'negative', createdAt: { gte: since } },
      }),
      db.socialMention.count({
        where: { userId: authUser.id, sentiment: 'neutral', createdAt: { gte: since } },
      }),
      db.socialMention.count({
        where: { userId: authUser.id, isReplied: true, createdAt: { gte: since } },
      }),
    ]);

    const volumeByDate: Record<string, number> = {};
    for (const m of mentions) {
      const dateStr = m.createdAt.toISOString().split('T')[0];
      volumeByDate[dateStr] = (volumeByDate[dateStr] || 0) + 1;
    }
    const volumeTrend = Object.entries(volumeByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const keywordCounts: Record<string, number> = {};
    for (const m of mentions) {
      keywordCounts[m.keyword] = (keywordCounts[m.keyword] || 0) + 1;
    }
    const topKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalMentions = mentions.length;
    const avgRelevanceScore = totalMentions > 0
      ? Math.round(mentions.reduce((sum, m) => sum + m.relevanceScore, 0) / totalMentions)
      : 0;

    return NextResponse.json({
      totalMentions,
      positiveCount,
      negativeCount,
      neutralCount,
      repliedCount,
      avgRelevanceScore,
      volumeTrend,
      topKeywords,
    });
  } catch (error) {
    console.error('Social Listener Stats error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
