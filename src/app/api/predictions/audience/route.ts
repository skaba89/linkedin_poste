import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ============================================================
    // 1. Calculate current audience metrics from historical data
    // ============================================================
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMetrics = await db.postMetric.findMany({
      where: { collectedAt: { gte: thirtyDaysAgo } },
      include: { post: { select: { finalContent: true, subject: true, hashtags: true, angle: true, cta: true } } },
    });

    const olderMetrics = await db.postMetric.findMany({
      where: {
        collectedAt: {
          gte: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
          lt: thirtyDaysAgo,
        },
      },
      include: { post: { select: { finalContent: true, subject: true, hashtags: true, angle: true, cta: true } } },
    });

    // Current audience estimation (based on average reach)
    const currentAudience = recentMetrics.length > 0
      ? Math.round(recentMetrics.reduce((s, m) => s + m.reach, 0) / recentMetrics.length)
      : 0;

    // Growth calculation: compare reach over periods
    const recentReach = recentMetrics.length > 0
      ? recentMetrics.reduce((s, m) => s + m.reach, 0)
      : 0;
    const olderReach = olderMetrics.length > 0
      ? olderMetrics.reduce((s, m) => s + m.reach, 0)
      : 0;

    const reachGrowthRate = olderReach > 0
      ? ((recentReach - olderReach) / olderReach) * 100
      : 0;

    // Predicted growth (30-day projection)
    const predictedGrowth = Math.round(currentAudience * Math.max(0, reachGrowthRate) / 100 * 30);

    // ============================================================
    // 2. Top content types analysis
    // ============================================================
    const formatKeywords: Record<string, string[]> = {
      'Carrousel': ['carrousel', 'carousel', 'diapositive', 'slide'],
      'Vidéo': ['vidéo', 'video', 'mp4', 'youtube'],
      'Article long': ['article', 'blog', 'long read', 'étude'],
      'Listicle': ['liste', 'conseil', 'astuce', '1.', '2.', '3.'],
      'Storytelling': ['histoire', 'récit', 'jour', 'quand', 'souvenir', 'expérience'],
      'Thought Leadership': ['insight', 'vision', 'futur', 'tendances', 'industrie', 'transformation'],
      'Question/Engagement': ['?', 'votre avis', 'vous pensez', 'comment', 'partagez'],
      'Guide pratique': ['comment', 'guide', 'étape', 'méthode', 'processus', 'tuto'],
    };

    const contentTypePerformance: Record<string, { totalEngagement: number; count: number; totalImpressions: number }> = {};

    for (const m of recentMetrics) {
      const content = `${m.post.finalContent || ''} ${m.post.subject || ''} ${m.post.hashtags || ''} ${m.post.angle || ''}`.toLowerCase();

      let matchedType = 'Autre';
      for (const [type, keywords] of Object.entries(formatKeywords)) {
        if (keywords.some(kw => content.includes(kw))) {
          matchedType = type;
          break;
        }
      }

      if (!contentTypePerformance[matchedType]) {
        contentTypePerformance[matchedType] = { totalEngagement: 0, count: 0, totalImpressions: 0 };
      }
      contentTypePerformance[matchedType].totalEngagement += m.engagementRate;
      contentTypePerformance[matchedType].count += 1;
      contentTypePerformance[matchedType].totalImpressions += m.impressions;
    }

    const topContentTypes = Object.entries(contentTypePerformance)
      .filter(([, v]) => v.count >= 1)
      .map(([type, data]) => ({
        type,
        avgEngagement: parseFloat((data.totalEngagement / data.count).toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5)
      .map(t => t.type);

    // ============================================================
    // 3. Posting frequency analysis
    // ============================================================
    const recentPosts = await db.post.findMany({
      where: {
        status: 'posted',
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const postsPerWeek = recentPosts.length / 4.3;

    let optimalFrequency = '3-5 posts par semaine';
    if (postsPerWeek < 2) {
      optimalFrequency = 'Augmentez à 3-5 posts/semaine pour une croissance optimale';
    } else if (postsPerWeek > 7) {
      optimalFrequency = 'Réduisez à 5-7 posts/semaine pour éviter la fatigue audience';
    } else if (postsPerWeek >= 3 && postsPerWeek <= 5) {
      optimalFrequency = 'Fréquence idéale actuelle : 3-5 posts/semaine';
    }

    // ============================================================
    // 4. AI-powered suggestions
    // ============================================================
    let suggestions: string[] = [];

    // Generate data-driven suggestions
    if (topContentTypes.length > 0) {
      suggestions.push(`Vos "${topContentTypes[0]}" performent le mieux — concentrez-vous sur ce format.`);
    }
    if (topContentTypes.length >= 2) {
      const ratio = contentTypePerformance[topContentTypes[0]]?.avgEngagement
        ? (contentTypePerformance[topContentTypes[0]].avgEngagement / (contentTypePerformance[topContentTypes[1]]?.avgEngagement || 1)).toFixed(1)
        : null;
      if (ratio) {
        suggestions.push(`Les "${topContentTypes[0]}" obtiennent ${ratio}x plus d'engagement que les "${topContentTypes[1]}".`);
      }
    }

    if (reachGrowthRate > 5) {
      suggestions.push(`Votre portée est en croissance de ${reachGrowthRate.toFixed(1)}% — continuez sur cette lancée !`);
    } else if (reachGrowthRate < -5) {
      suggestions.push(`Votre portée a baissé de ${Math.abs(reachGrowthRate).toFixed(1)}% — essayez de varier les formats et les créneaux.`);
    }

    // Best posting slot
    const postingSlots = await db.postingSlot.findMany({
      where: { userId: authUser.id },
      orderBy: { avgEngagement: 'desc' },
      take: 3,
    });

    if (postingSlots.length > 0) {
      const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const best = postingSlots[0];
      suggestions.push(`Publiez le ${dayNames[best.dayOfWeek]} vers ${best.hour}h pour maximiser l'engagement.`);
    }

    // Hashtag analysis
    const allHashtags = recentMetrics
      .map(m => (m.post.hashtags || '').split(/[\s,]+/).filter(h => h.startsWith('#')))
      .flat();
    const hashtagCounts = new Map<string, number>();
    for (const h of allHashtags) {
      hashtagCounts.set(h, (hashtagCounts.get(h) || 0) + 1);
    }
    const topHashtags = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);

    if (topHashtags.length > 0) {
      suggestions.push(`Vos hashtags les plus utilisés : ${topHashtags.join(', ')}. Variez-les pour toucher de nouvelles audiences.`);
    }

    // Try AI-powered suggestions
    try {
      const aiResult = await callAI(
        [
          {
            role: 'system',
            content: `Tu es un expert en stratégie de croissance LinkedIn. Tu analyses des données de performance et proposes des recommandations actionnables en français. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.`
          },
          {
            role: 'user',
            content: `Analyse ces données de performance LinkedIn et propose 3-5 suggestions concises pour améliorer la croissance d'audience.

Métriques récentes (30 jours):
- Posts publiés: ${recentPosts.length}
- Fréquence: ${postsPerWeek.toFixed(1)}/semaine
- Portée moyenne: ${currentAudience}
- Taux de croissance portée: ${reachGrowthRate.toFixed(1)}%
- Types de contenu performants: ${topContentTypes.join(', ') || 'N/A'}
- Hashtags top: ${topHashtags.join(', ') || 'N/A'}

Réponds en JSON:
{
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`
          },
        ],
        { temperature: 0.4, maxTokens: 300 },
        'zai'
      );

      const parsed = JSON.parse(aiResult.replace(/```json\n?|\n?```/g, '').trim());
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        // Merge AI suggestions with data-driven ones, deduplicate
        const allSuggestions = [...suggestions, ...parsed.suggestions];
        const uniqueSuggestions = [...new Set(allSuggestions)];
        suggestions = uniqueSuggestions.slice(0, 6);
      }
    } catch {
      // Keep data-driven suggestions only
    }

    return NextResponse.json({
      currentAudience,
      predictedGrowth,
      growthRate: parseFloat(reachGrowthRate.toFixed(2)),
      topContentTypes: topContentTypes.length > 0 ? topContentTypes : ['Données insuffisantes'],
      optimalFrequency,
      suggestions,
      metrics: {
        postsLast30Days: recentPosts.length,
        postsPerWeek: parseFloat(postsPerWeek.toFixed(1)),
        recentAvgReach: currentAudience,
        contentTypeBreakdown: Object.entries(contentTypePerformance)
          .filter(([, v]) => v.count >= 1)
          .map(([type, data]) => ({
            type,
            avgEngagement: parseFloat((data.totalEngagement / data.count).toFixed(2)),
            count: data.count,
            avgImpressions: Math.round(data.totalImpressions / data.count),
          }))
          .sort((a, b) => b.avgEngagement - a.avgEngagement),
      },
    });
  } catch (error) {
    console.error('Audience prediction error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
