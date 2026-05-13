import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ============================================================
    // 1. Get historical metrics for the last 60 days (30 actual + reference)
    // ============================================================
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const historicalMetrics = await db.postMetric.findMany({
      where: {
        collectedAt: { gte: sixtyDaysAgo },
      },
      orderBy: { collectedAt: 'asc' },
    });

    // Group by date for actual data
    const dailyMap = new Map<string, { impressions: number; engagementRates: number[]; likes: number[] }>();

    for (const m of historicalMetrics) {
      const dateKey = m.collectedAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { impressions: 0, engagementRates: [], likes: [] };
      existing.impressions += m.impressions;
      existing.engagementRates.push(m.engagementRate);
      existing.likes.push(m.likes);
      dailyMap.set(dateKey, existing);
    }

    const dailyActuals = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      impressions: data.impressions,
      engagementRate: data.engagementRates.length > 0
        ? parseFloat((data.engagementRates.reduce((a, b) => a + b, 0) / data.engagementRates.length).toFixed(2))
        : 0,
      likes: data.likes.length > 0
        ? Math.round(data.likes.reduce((a, b) => a + b, 0) / data.likes.length)
        : 0,
    }));

    // Split: last 30 days actual, previous 30 for trend calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const recentActual = dailyActuals.filter(d => d.date >= thirtyDaysAgoStr);
    const olderActual = dailyActuals.filter(d => d.date < thirtyDaysAgoStr);

    // Calculate trends
    const recentAvgEng = recentActual.length > 0
      ? recentActual.reduce((s, d) => s + d.engagementRate, 0) / recentActual.length
      : 0;
    const olderAvgEng = olderActual.length > 0
      ? olderActual.reduce((s, d) => s + d.engagementRate, 0) / olderActual.length
      : 0;
    const recentAvgImp = recentActual.length > 0
      ? recentActual.reduce((s, d) => s + d.impressions, 0) / recentActual.length
      : 0;
    const olderAvgImp = olderActual.length > 0
      ? olderActual.reduce((s, d) => s + d.impressions, 0) / olderActual.length
      : 0;

    const engTrend = olderAvgEng > 0 ? (recentAvgEng - olderAvgEng) / olderAvgEng : 0;
    const impTrend = olderAvgImp > 0 ? (recentAvgImp - olderAvgImp) / olderAvgImp : 0;

    // Weekly trend direction
    let weeklyTrend: 'up' | 'down' | 'stable' = 'stable';
    if (engTrend > 0.05) weeklyTrend = 'up';
    else if (engTrend < -0.05) weeklyTrend = 'down';

    // ============================================================
    // 2. Generate 30-day forecast with linear regression + seasonality
    // ============================================================
    const dailyForecast: Array<{
      date: string;
      predictedImpressions: number;
      predictedEngagement: number;
      predictedLikes: number;
    }> = [];

    // Linear regression on recent actuals for impressions
    const n = recentActual.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentActual[i].impressions;
      sumXY += i * recentActual[i].impressions;
      sumX2 += i * i;
    }

    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : impTrend * recentAvgImp / 30;
    const intercept = n > 0 ? (sumY - slope * sumX) / n : recentAvgImp;

    // Linear regression for engagement
    let sumXe = 0, sumYe = 0, sumXYe = 0, sumX2e = 0;
    for (let i = 0; i < n; i++) {
      sumXe += i;
      sumYe += recentActual[i].engagementRate;
      sumXYe += i * recentActual[i].engagementRate;
      sumX2e += i * i;
    }
    const engSlope = n > 1 ? (n * sumXYe - sumXe * sumYe) / (n * sumX2e - sumXe * sumXe) : engTrend * recentAvgEng / 30;
    const engIntercept = n > 0 ? (sumYe - engSlope * sumXe) / n : recentAvgEng;

    // Day-of-week seasonality weights
    const dowWeights = new Array(7).fill(1);
    for (const d of dailyActuals) {
      const dow = new Date(d.date).getDay();
      dowWeights[dow] += d.engagementRate * 0.1;
    }
    const avgDowWeight = dowWeights.reduce((a, b) => a + b, 0) / 7;
    for (let i = 0; i < 7; i++) {
      dowWeights[i] = dowWeights[i] / avgDowWeight;
    }

    // Generate forecast for next 30 days
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);
      const dateStr = forecastDate.toISOString().split('T')[0];
      const dow = forecastDate.getDay();
      const seasonFactor = dowWeights[dow];

      // Add some noise (±15%) for realism
      const noiseFactor = 0.85 + Math.random() * 0.3;

      const predictedImpressions = Math.max(0, Math.round(
        (intercept + slope * (n + i)) * seasonFactor * noiseFactor
      ));
      const predictedEngagement = Math.max(0, parseFloat(
        ((engIntercept + engSlope * (n + i)) * seasonFactor * noiseFactor).toFixed(2)
      ));
      const predictedLikes = Math.max(0, Math.round(
        (predictedImpressions * predictedEngagement / 100) * 0.45
      ));

      dailyForecast.push({
        date: dateStr,
        predictedImpressions,
        predictedEngagement,
        predictedLikes,
      });
    }

    // Also include actuals for the chart (with predicted = null for actual days)
    const combinedData = [
      ...recentActual.map(d => ({
        date: d.date,
        actualImpressions: d.impressions,
        actualEngagement: d.engagementRate,
        actualLikes: d.likes,
        predictedImpressions: null as number | null,
        predictedEngagement: null as number | null,
        predictedLikes: null as number | null,
      })),
      ...dailyForecast.map(d => ({
        date: d.date,
        actualImpressions: null as number | null,
        actualEngagement: null as number | null,
        actualLikes: null as number | null,
        predictedImpressions: d.predictedImpressions,
        predictedEngagement: d.predictedEngagement,
        predictedLikes: d.predictedLikes,
      })),
    ];

    // ============================================================
    // 3. Best posting windows from PostingSlot
    // ============================================================
    const postingSlots = await db.postingSlot.findMany({
      where: { userId: authUser.id },
      orderBy: { avgEngagement: 'desc' },
    });

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const timeSlots = [
      { label: '6h-9h', hours: [6, 7, 8] },
      { label: '9h-12h', hours: [9, 10, 11] },
      { label: '12h-15h', hours: [12, 13, 14] },
      { label: '15h-18h', hours: [15, 16, 17] },
      { label: '18h-21h', hours: [18, 19, 20] },
      { label: '21h-24h', hours: [21, 22, 23] },
    ];

    const bestPostingWindows: Array<{ day: string; hour: string; score: number }> = [];

    if (postingSlots.length > 0) {
      // Group slots into our time windows
      const windowScores = new Map<string, { total: number; count: number }>();

      for (const slot of postingSlots) {
        const dayName = dayNames[slot.dayOfWeek] || `Jour ${slot.dayOfWeek}`;
        const slotInfo = timeSlots.find(ts => ts.hours.includes(slot.hour));
        const slotLabel = slotInfo ? slotInfo.label : `${slot.hour}h`;
        const key = `${dayName}|${slotLabel}`;

        const existing = windowScores.get(key) || { total: 0, count: 0 };
        existing.total += slot.avgEngagement;
        existing.count += 1;
        windowScores.set(key, existing);
      }

      const windowEntries = Array.from(windowScores.entries())
        .map(([key, data]) => {
          const [day, hour] = key.split('|');
          return { day, hour, score: parseFloat((data.total / data.count).toFixed(2)) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 14);

      bestPostingWindows.push(...windowEntries);
    } else {
      // Generate default windows based on general LinkedIn best practices
      const defaultBestDays = ['Mardi', 'Mercredi', 'Jeudi'];
      const defaultBestSlots = ['9h-12h', '12h-15h'];
      for (const day of defaultBestDays) {
        for (const slot of defaultBestSlots) {
          bestPostingWindows.push({ day, hour: slot, score: parseFloat((1.5 + Math.random() * 1.5).toFixed(2)) });
        }
      }
    }

    return NextResponse.json({
      dailyForecast: combinedData,
      weeklyTrend,
      bestPostingWindows,
      trendData: {
        recentAvgEngagement: parseFloat(recentAvgEng.toFixed(2)),
        olderAvgEngagement: parseFloat(olderAvgEng.toFixed(2)),
        engTrend: parseFloat((engTrend * 100).toFixed(1)),
        recentAvgImpressions: Math.round(recentAvgImp),
        confidence: Math.min(0.95, Math.max(0.3, dailyActuals.length / 60)),
      },
    });
  } catch (error) {
    console.error('Engagement forecast error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
