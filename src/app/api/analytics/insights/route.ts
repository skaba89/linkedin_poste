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

    const postsWithValidMetrics = postsWithMetrics.filter(p => p.metrics.length > 0);
    const insights: { id: string; type: 'positive' | 'warning' | 'action'; title: string; detail: string }[] = [];

    if (postsWithValidMetrics.length === 0) {
      return NextResponse.json({ insights: [] });
    }

    // Group by format
    const formatGroups: Record<string, { totalEngagement: number; count: number }> = {};
    for (const post of postsWithValidMetrics) {
      const format = detectPostFormat(post.subject + ' ' + (post.angle || '') + ' ' + (post.finalContent || ''));
      if (!formatGroups[format]) formatGroups[format] = { totalEngagement: 0, count: 0 };
      formatGroups[format].totalEngagement += post.metrics[0].engagementRate;
      formatGroups[format].count += 1;
    }

    const formatLabels: Record<string, string> = {
      listicle: 'listicles',
      storytelling: 'storytelling',
      controverse: 'controverses',
      howto: 'guides pratiques',
      thought_leadership: 'thought leadership',
    };

    // Find best and worst formats
    const formatEntries = Object.entries(formatGroups)
      .map(([f, s]) => ({ format: f, avg: s.totalEngagement / s.count, count: s.count }))
      .filter(f => f.count >= 1)
      .sort((a, b) => b.avg - a.avg);

    if (formatEntries.length >= 2) {
      const best = formatEntries[0];
      const worst = formatEntries[formatEntries.length - 1];
      if (best.avg > 0 && worst.avg > 0) {
        const ratio = (best.avg / worst.avg).toFixed(1);
        insights.push({
          id: 'format-best',
          type: 'positive',
          title: 'Format le plus performant',
          detail: `Vos posts ${formatLabels[best.format] || best.format} performent ${ratio}x mieux que vos ${formatLabels[worst.format] || worst.format} (engagement moyen : ${best.avg.toFixed(1)}% vs ${worst.avg.toFixed(1)}%)`,
        });
      }
    }

    // Group by day of week
    const dayGroups: Record<string, { totalEngagement: number; count: number }> = {};
    const dayLabels: Record<string, string> = {
      '0': 'Dimanche', '1': 'Lundi', '2': 'Mardi', '3': 'Mercredi',
      '4': 'Jeudi', '5': 'Vendredi', '6': 'Samedi',
    };
    for (const post of postsWithValidMetrics) {
      const day = String(new Date(post.createdAt).getDay());
      if (!dayGroups[day]) dayGroups[day] = { totalEngagement: 0, count: 0 };
      dayGroups[day].totalEngagement += post.metrics[0].engagementRate;
      dayGroups[day].count += 1;
    }

    const dayEntries = Object.entries(dayGroups)
      .map(([d, s]) => ({ day: d, avg: s.totalEngagement / s.count, count: s.count }))
      .filter(d => d.count >= 1)
      .sort((a, b) => b.avg - a.avg);

    if (dayEntries.length > 0) {
      const bestDay = dayEntries[0];
      insights.push({
        id: 'day-best',
        type: 'positive',
        title: 'Meilleur jour de publication',
        detail: `Le ${dayLabels[bestDay.day] || bestDay.day} est votre meilleur jour (engagement moyen : ${bestDay.avg.toFixed(1)}%)`,
      });
    }

    // Score vs engagement correlation
    const postsWithScore = postsWithValidMetrics.filter(p => p.contentScore !== null && p.contentScore !== undefined);
    if (postsWithScore.length >= 2) {
      const highScore = postsWithScore.filter(p => p.contentScore! >= 70);
      const lowScore = postsWithScore.filter(p => p.contentScore! < 70);
      if (highScore.length > 0 && lowScore.length > 0) {
        const highAvg = highScore.reduce((s, p) => s + p.metrics[0].engagementRate, 0) / highScore.length;
        const lowAvg = lowScore.reduce((s, p) => s + p.metrics[0].engagementRate, 0) / lowScore.length;
        if (highAvg > lowAvg && lowAvg > 0) {
          const ratio = (highAvg / lowAvg).toFixed(1);
          insights.push({
            id: 'score-impact',
            type: 'positive',
            title: "Impact du score IA",
            detail: `Les posts avec un score IA ≥ 70 ont un engagement ${ratio}x supérieur (${highAvg.toFixed(1)}% vs ${lowAvg.toFixed(1)}%)`,
          });
        }
      }
    }

    // Group by hour
    const hourGroups: Record<number, { totalEngagement: number; count: number }> = {};
    for (const post of postsWithValidMetrics) {
      const date = post.scheduledDate || post.createdAt;
      const hour = new Date(date).getHours();
      if (hour < 6 || hour > 22) continue;
      if (!hourGroups[hour]) hourGroups[hour] = { totalEngagement: 0, count: 0 };
      hourGroups[hour].totalEngagement += post.metrics[0].engagementRate;
      hourGroups[hour].count += 1;
    }

    const hourEntries = Object.entries(hourGroups)
      .map(([h, s]) => ({ hour: Number(h), avg: s.totalEngagement / s.count, count: s.count }))
      .filter(h => h.count >= 1)
      .sort((a, b) => b.avg - a.avg);

    if (hourEntries.length > 0) {
      const bestHour = hourEntries[0];
      insights.push({
        id: 'hour-best',
        type: 'positive',
        title: 'Meilleur créneau horaire',
        detail: `Votre meilleur créneau horaire est entre ${bestHour.hour}h et ${bestHour.hour + 1}h (engagement moyen : ${bestHour.avg.toFixed(1)}%)`,
      });
    }

    // Action items
    const postsWithoutMetrics = postsWithMetrics.length - postsWithValidMetrics.length;
    if (postsWithoutMetrics > 0) {
      insights.push({
        id: 'no-metrics',
        type: 'action',
        title: 'Posts sans métriques',
        detail: `${postsWithoutMetrics} post(s) publié(s) n'ont pas encore de métriques. Ajoutez-les pour des analyses plus précises.`,
      });
    }

    // Overall engagement assessment
    const avgEngagement = postsWithValidMetrics.reduce((s, p) => s + p.metrics[0].engagementRate, 0) / postsWithValidMetrics.length;
    if (avgEngagement < 1.5) {
      insights.push({
        id: 'low-engagement',
        type: 'action',
        title: 'Engagement faible',
        detail: `Votre engagement moyen (${avgEngagement.toFixed(1)}%) est inférieur au seuil recommandé de 2%. Essayez des formats plus engageants ou optimisez vos créneaux de publication.`,
      });
    } else if (avgEngagement >= 3) {
      insights.push({
        id: 'high-engagement',
        type: 'positive',
        title: 'Excellent engagement',
        detail: `Votre engagement moyen (${avgEngagement.toFixed(1)}%) est excellent ! Continuez sur cette lancée.`,
      });
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Analytics insights error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
