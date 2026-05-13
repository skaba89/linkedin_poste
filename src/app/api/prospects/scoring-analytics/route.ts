import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `prospects:analytics:${authUser.id}`);
    if (rlResult) return rlResult;

    const where = { userId: authUser.id, isActive: true };

    // Fetch all active prospects for the user
    const prospects = await db.prospect.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        company: true,
        title: true,
        status: true,
        source: true,
        score: true,
        tags: true,
        nextFollowUpAt: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { score: 'desc' },
    });

    const total = prospects.length;

    // 1. Score Distribution (buckets)
    const buckets = [
      { label: '0-20', min: 0, max: 20 },
      { label: '21-40', min: 21, max: 40 },
      { label: '41-60', min: 41, max: 60 },
      { label: '61-80', min: 61, max: 80 },
      { label: '81-100', min: 81, max: 100 },
    ];

    const scoreDistribution = buckets.map(b => ({
      range: b.label,
      count: prospects.filter(p => p.score >= b.min && p.score <= b.max).length,
    }));

    // 2. Status Breakdown
    const allStatuses = ['new', 'contacted', 'replied', 'interested', 'not_interested', 'converted'];
    const statusBreakdown = allStatuses.map(s => ({
      status: s,
      count: prospects.filter(p => p.status === s).length,
    }));

    // 3. Top 20 prospects by score
    const topProspects = prospects.slice(0, 20);

    // 4. Average score
    const avgScore = total > 0
      ? Math.round(prospects.reduce((sum, p) => sum + p.score, 0) / total)
      : 0;

    // 5. Scoring Trend — average score by day over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const recentProspects = prospects.filter(p => new Date(p.updatedAt) >= thirtyDaysAgo);

    // Group by date (updatedAt day)
    const dayMap = new Map<string, { totalScore: number; count: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0];
      dayMap.set(key, { totalScore: 0, count: 0 });
    }

    for (const p of recentProspects) {
      const dayKey = new Date(p.updatedAt).toISOString().split('T')[0];
      if (dayMap.has(dayKey)) {
        const entry = dayMap.get(dayKey)!;
        entry.totalScore += p.score;
        entry.count += 1;
      }
    }

    const scoringTrend = Array.from(dayMap.entries()).map(([date, entry]) => ({
      date,
      avgScore: entry.count > 0 ? Math.round(entry.totalScore / entry.count) : 0,
      count: entry.count,
    }));

    // 6. Source Breakdown
    const allSources = ['manual', 'linkedin_search', 'recommendation', 'import'];
    const sourceBreakdown = allSources.map(s => ({
      source: s,
      count: prospects.filter(p => p.source === s).length,
    }));

    // 7. Tags Cloud — most used tags
    const tagCountMap = new Map<string, number>();
    for (const p of prospects) {
      if (p.tags) {
        try {
          const tags: string[] = JSON.parse(p.tags);
          for (const tag of tags) {
            tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
          }
        } catch {
          // skip malformed tags
        }
      }
    }

    const tagsCloud = Array.from(tagCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag, count]) => ({ tag, count }));

    // 8. Conversion Funnel — ordered stages
    const funnelStages = ['new', 'contacted', 'replied', 'interested', 'converted'];
    const conversionFunnel = funnelStages.map(s => ({
      stage: s,
      count: prospects.filter(p => p.status === s).length,
    }));

    return NextResponse.json({
      scoreDistribution,
      statusBreakdown,
      topProspects,
      avgScore,
      scoringTrend,
      sourceBreakdown,
      tagsCloud,
      conversionFunnel,
      totalProspects: total,
      hotLeads: prospects.filter(p => p.score > 80).length,
      convertedCount: prospects.filter(p => p.status === 'converted').length,
      conversionRate: total > 0
        ? Math.round((prospects.filter(p => p.status === 'converted').length / total) * 100)
        : 0,
      pendingFollowUps: prospects.filter(p => p.nextFollowUpAt && new Date(p.nextFollowUpAt) <= new Date()).length,
    });
  } catch (error) {
    console.error('Scoring analytics error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
