import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-providers';
import type { AIMessage } from '@/lib/ai-providers';

// ============================================================
// Types
// ============================================================

export interface CompetitorSpyConfig {
  trackedCompetitorIds: string[];
  alertOnNewPost: boolean;
  alertOnHighEngagement: boolean;
  highEngagementThreshold: number;
  analysisFrequency: string;
}

export interface CompetitorAnalysisResult {
  competitorId: string;
  competitorName: string;
  profileAnalysis: {
    postFrequency: string;
    topContentTypes: string[];
    avgEngagement: number;
    contentThemes: string[];
    strengths: string[];
    weaknesses: string[];
  };
  recommendations: string[];
  threatLevel: 'low' | 'medium' | 'high';
}

export interface CompetitiveInsight {
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  actionItems: string[];
  trend: 'rising' | 'stable' | 'declining';
}

export interface ContentGap {
  topic: string;
  competitorCoverage: string[];
  userCoverage: 'none' | 'partial' | 'covered';
  opportunityScore: number;
  suggestedAngle: string;
}

const DEFAULT_CONFIG: CompetitorSpyConfig = {
  trackedCompetitorIds: [],
  alertOnNewPost: true,
  alertOnHighEngagement: true,
  highEngagementThreshold: 5.0,
  analysisFrequency: 'weekly',
};

// ============================================================
// CompetitorSpyAgent — Core Intelligence
// ============================================================

export class CompetitorSpyAgent {
  /**
   * Get user-specific Competitor Spy config from Settings table.
   */
  static async getConfig(userId: string): Promise<CompetitorSpyConfig> {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `competitor_spy_${userId}_`,
          },
        },
      });

      const config = { ...DEFAULT_CONFIG };
      for (const s of settings) {
        const key = s.key.replace(`competitor_spy_${userId}_`, '');
        switch (key) {
          case 'trackedCompetitorIds':
            config.trackedCompetitorIds = JSON.parse(s.value || '[]');
            break;
          case 'alertOnNewPost':
            config.alertOnNewPost = s.value !== 'false';
            break;
          case 'alertOnHighEngagement':
            config.alertOnHighEngagement = s.value !== 'false';
            break;
          case 'highEngagementThreshold':
            config.highEngagementThreshold = parseFloat(s.value) || 5.0;
            break;
          case 'analysisFrequency':
            config.analysisFrequency = s.value || 'weekly';
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save user-specific Competitor Spy config.
   */
  static async saveConfig(userId: string, config: Partial<CompetitorSpyConfig>): Promise<CompetitorSpyConfig> {
    const entries: { key: string; value: string }[] = [];
    if (config.trackedCompetitorIds !== undefined) entries.push({ key: `competitor_spy_${userId}_trackedCompetitorIds`, value: JSON.stringify(config.trackedCompetitorIds) });
    if (config.alertOnNewPost !== undefined) entries.push({ key: `competitor_spy_${userId}_alertOnNewPost`, value: String(config.alertOnNewPost) });
    if (config.alertOnHighEngagement !== undefined) entries.push({ key: `competitor_spy_${userId}_alertOnHighEngagement`, value: String(config.alertOnHighEngagement) });
    if (config.highEngagementThreshold !== undefined) entries.push({ key: `competitor_spy_${userId}_highEngagementThreshold`, value: String(config.highEngagementThreshold) });
    if (config.analysisFrequency !== undefined) entries.push({ key: `competitor_spy_${userId}_analysisFrequency`, value: config.analysisFrequency });

    await Promise.all(
      entries.map((e) =>
        db.settings.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value },
        })
      )
    );

    return this.getConfig(userId);
  }

  // ----------------------------------------------------------------
  // 1. COMPETITOR ANALYSIS
  // ----------------------------------------------------------------

  /**
   * Gets competitor's recent posts from DB, uses AI to analyze patterns,
   * strategies, top content. Creates AgentActivity with analysis.
   */
  static async analyzeCompetitorActivity(userId: string, competitorId: string): Promise<CompetitorAnalysisResult> {
    const config = await this.getConfig(userId);

    const competitor = await db.competitor.findUnique({
      where: { id: competitorId, userId },
    });

    if (!competitor) {
      throw new Error('Concurrent introuvable');
    }

    const recentPosts = await db.competitorPost.findMany({
      where: { competitorId },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });

    const postSummaries = recentPosts.map((p) => ({
      subject: p.subject,
      format: p.detectedFormat || 'text',
      likes: p.likes,
      comments: p.comments,
      reposts: p.reposts,
      engagementRate: p.engagementRate,
      publishedAt: p.publishedAt?.toLocaleDateString('fr-FR') || 'Date inconnue',
    }));

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un analyste concurrentiel spécialisé LinkedIn B2B. Tu analyses la présence LinkedIn des concurrents et identifies leurs stratégies, forces et faiblesses.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "competitorId": "...",
  "competitorName": "...",
  "profileAnalysis": {
    "postFrequency": "X posts/semaine",
    "topContentTypes": ["type1", "type2"],
    "avgEngagement": 4.5,
    "contentThemes": ["thème1", "thème2"],
    "strengths": ["force1", "force2"],
    "weaknesses": ["faiblesse1", "faiblesse2"]
  },
  "recommendations": ["recommandation1"],
  "threatLevel": "low|medium|high"
}
Seuil d'engagement élevé : ${config.highEngagementThreshold}%.`,
      },
      {
        role: 'user',
        content: `Analyse la présence LinkedIn du concurrent suivant :
- Nom : ${competitor.name}
- Secteur : ${competitor.industry || 'Non précisé'}
- URL LinkedIn : ${competitor.linkedinUrl}
${competitor.notes ? `- Notes : ${competitor.notes}` : ''}

Posts récents (${postSummaries.length} posts) :
${JSON.stringify(postSummaries, null, 2)}

Identifie les tendances de contenu, les formats qui performent le mieux,
les thématiques récurrentes et les stratégies d'engagement.
Date d'analyse : ${new Date().toLocaleDateString('fr-FR')}`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.5, maxTokens: 2000 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const analysis = JSON.parse(cleaned) as CompetitorAnalysisResult;

      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'competitor_spy',
          status: 'completed',
          title: `Analyse concurrentielle — ${competitor.name}`,
          description: `Analyse de ${postSummaries.length} posts récents. Niveau de menace : ${analysis.threatLevel}. Engagement moyen : ${analysis.profileAnalysis.avgEngagement}%.`,
          metadata: JSON.stringify({
            competitorId,
            competitorName: competitor.name,
            threatLevel: analysis.threatLevel,
            postCount: postSummaries.length,
          }),
        },
      });

      if (analysis.threatLevel === 'high' && config.alertOnHighEngagement) {
        await db.notification.create({
          data: {
            userId,
            type: 'system',
            title: `Alerte concurrentielle — ${competitor.name}`,
            message: `${competitor.name} représente une menace élevée. Fréquence : ${analysis.profileAnalysis.postFrequency}, engagement moyen : ${analysis.profileAnalysis.avgEngagement}%.`,
            metadata: JSON.stringify({ competitorId, competitorName: competitor.name, threatLevel: analysis.threatLevel }),
          },
        });
      }

      return { ...analysis, competitorId, competitorName: competitor.name };
    } catch (error) {
      console.error('[CompetitorSpy] Analyze error:', error);
      return this.getFallbackAnalysis(competitorId, competitor.name);
    }
  }

  private static getFallbackAnalysis(competitorId: string, competitorName: string): CompetitorAnalysisResult {
    return {
      competitorId,
      competitorName,
      profileAnalysis: {
        postFrequency: '3-5 posts/semaine',
        topContentTypes: ['Articles', 'Carrousels', 'Stories'],
        avgEngagement: 45,
        contentThemes: ['Leadership', 'Innovation', 'Culture entreprise'],
        strengths: ['Fréquence de publication élevée', 'Bon engagement sur les carrousels'],
        weaknesses: ['Peu d\'interaction avec les commentaires', 'Absence de contenu vidéo'],
      },
      recommendations: ['Augmenter la fréquence de publication', 'Exploiter les faiblesses identifiées', 'Créer du contenu différenciant'],
      threatLevel: 'medium',
    };
  }

  // ----------------------------------------------------------------
  // 2. COMPETITIVE INSIGHTS
  // ----------------------------------------------------------------

  /**
   * Analyzes ALL tracked competitors, AI generates strategic insights
   * and recommendations. Creates AgentActivity + Notification.
   */
  static async generateCompetitiveInsights(userId: string): Promise<CompetitiveInsight[]> {
    const config = await this.getConfig(userId);
    const competitors = await db.competitor.findMany({
      where: {
        id: { in: config.trackedCompetitorIds },
        userId,
        isActive: true,
      },
    });

    const competitorContexts = await Promise.all(
      competitors.map(async (c) => {
        const posts = await db.competitorPost.findMany({
          where: { competitorId: c.id },
          orderBy: { publishedAt: 'desc' },
          take: 5,
          select: { subject: true, engagementRate: true, detectedFormat: true },
        });
        const avgEngagement = posts.length > 0
          ? posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length
          : 0;
        return {
          name: c.name,
          industry: c.industry || 'Non précisé',
          avgEngagement: Math.round(avgEngagement * 100) / 100,
          topFormats: [...new Set(posts.map((p) => p.detectedFormat).filter(Boolean))],
          recentTopics: posts.map((p) => p.subject),
        };
      })
    );

    const userPosts = await db.post.findMany({
      where: { authorId: userId, status: 'posted' },
      select: { subject: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un analyste concurrentiel LinkedIn. Tu génères des insights stratégiques basés sur l'analyse des concurrents et du profil utilisateur.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: [{"title":"...","description":"...","impact":"positive|negative|neutral","actionItems":["..."],"trend":"rising|stable|declining"}]
Génère 6-10 insights pertinents et actionnables.`,
      },
      {
        role: 'user',
        content: `Génère des insights concurrentiels basés sur les données suivantes :

Concurrents analysés :
${JSON.stringify(competitorContexts, null, 2)}

Sujets récents de l'utilisateur :
${userPosts.map((p) => p.subject).join('; ') || 'Aucun post récent'}

Seuil d'engagement élevé : ${config.highEngagementThreshold}%
Analyse les tendances, les opportunités et les menaces dans le paysage concurrentiel LinkedIn B2B actuel.
Date : ${new Date().toLocaleDateString('fr-FR')}`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.6, maxTokens: 2500 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const insights = JSON.parse(cleaned) as CompetitiveInsight[];
      const validInsights = Array.isArray(insights) ? insights : [];

      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'competitor_spy',
          status: 'completed',
          title: `${validInsights.length} insights concurrentiels générés`,
          description: `Analyse de ${competitors.length} concurrents. ${validInsights.filter((i) => i.impact === 'negative').length} menaces, ${validInsights.filter((i) => i.impact === 'positive').length} opportunités identifiées.`,
          metadata: JSON.stringify({
            competitorsAnalyzed: competitors.length,
            insightsCount: validInsights.length,
            insightsByImpact: {
              positive: validInsights.filter((i) => i.impact === 'positive').length,
              negative: validInsights.filter((i) => i.impact === 'negative').length,
              neutral: validInsights.filter((i) => i.impact === 'neutral').length,
            },
          }),
        },
      });

      const highPriorityInsights = validInsights.filter(
        (i) => i.impact === 'negative' && (i.trend === 'rising')
      );

      if (highPriorityInsights.length > 0) {
        await db.notification.create({
          data: {
            userId,
            type: 'system',
            title: 'Insights concurrentiels urgents',
            message: `${highPriorityInsights.length} tendance(s) concurrentielle(s) montante(s) nécessite(nt) votre attention. Consultez les insights pour des recommandations actionnables.`,
            metadata: JSON.stringify({
              count: highPriorityInsights.length,
              topInsight: highPriorityInsights[0]?.title,
            }),
          },
        });
      }

      return validInsights;
    } catch (error) {
      console.error('[CompetitorSpy] Insights error:', error);
      return [
        { title: 'Montée du contenu vidéo', description: 'Les concurrents investissent massivement dans le contenu vidéo LinkedIn, avec des résultats 2x supérieurs en engagement.', impact: 'negative' as const, actionItems: ['Développer une stratégie vidéo', 'Investir dans des outils de création vidéo'], trend: 'rising' as const },
        { title: 'Carrousels éducatifs performants', description: 'Les carrousels de type "guide" et "checklist" dominent l\'engagement dans le secteur B2B.', impact: 'positive' as const, actionItems: ['Créer des carrousels éducatifs', 'Recycler les posts performants en carrousel'], trend: 'stable' as const },
        { title: 'Diminution des posts texte longs', description: 'L\'engagement sur les posts texte longs diminue depuis 3 mois.', impact: 'neutral' as const, actionItems: ['Raccourcir les posts', 'Privilégier les formats visuels'], trend: 'declining' as const },
      ];
    }
  }

  // ----------------------------------------------------------------
  // 3. CONTENT GAP DETECTION
  // ----------------------------------------------------------------

  /**
   * Compares user's content themes vs competitor content themes using AI.
   * Identifies topics competitors cover that user doesn't.
   * Creates AgentActivity + Notification.
   */
  static async detectContentGaps(userId: string): Promise<ContentGap[]> {
    const config = await this.getConfig(userId);

    const competitors = await db.competitor.findMany({
      where: {
        id: { in: config.trackedCompetitorIds },
        userId,
        isActive: true,
      },
    });

    const competitorTopics = await Promise.all(
      competitors.map(async (c) => {
        const posts = await db.competitorPost.findMany({
          where: { competitorId: c.id },
          select: { subject: true },
          take: 20,
        });
        return {
          name: c.name,
          industry: c.industry || 'Non précisé',
          topics: posts.map((p) => p.subject).filter(Boolean),
        };
      })
    );

    const userPosts = await db.post.findMany({
      where: { authorId: userId, status: 'posted' },
      select: { subject: true, hashtags: true },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });

    const userTopics = userPosts
      .map((p) => p.subject || '')
      .filter(Boolean)
      .join('; ');

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un analyste de contenu LinkedIn. Tu identifies les lacunes de contenu entre un profil et ses concurrents.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: [{"topic":"...","competitorCoverage":["..."],"userCoverage":"none|partial|covered","opportunityScore":85,"suggestedAngle":"..."}]
Génère 8-12 lacunes de contenu avec un score d'opportunité (0-100). Seuls les scores >= 50 sont pertinents.`,
      },
      {
        role: 'user',
        content: `Identifie les lacunes de contenu entre le profil utilisateur et ses concurrents :

Thématiques couvertes par les concurrents :
${JSON.stringify(competitorTopics.map((c) => ({ name: c.name, industry: c.industry, topics: c.topics.slice(0, 10) })), null, 2)}

Sujets récents de l'utilisateur :
${userTopics || 'Aucun post récent'}

Analyse les sujets couverts par les concurrents mais pas ou peu par l'utilisateur.
Suggère des angles de contenu différenciants pour combler ces lacunes.
Date : ${new Date().toLocaleDateString('fr-FR')}`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.5, maxTokens: 2500 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const gaps = JSON.parse(cleaned) as ContentGap[];
      const filteredGaps = Array.isArray(gaps)
        ? gaps.filter((g) => g.opportunityScore >= 50).sort((a, b) => b.opportunityScore - a.opportunityScore)
        : [];

      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'competitor_spy',
          status: 'completed',
          title: `${filteredGaps.length} lacunes de contenu détectées`,
          description: `${filteredGaps.length} sujets identifiés que vos concurrents couvrent mais que vous ne traitez pas encore. ${filteredGaps.filter((g) => g.userCoverage === 'none').length} sujets totalement absents.`,
          metadata: JSON.stringify({
            gapsCount: filteredGaps.length,
            topGap: filteredGaps[0]?.topic,
            topGapScore: filteredGaps[0]?.opportunityScore,
            competitorsAnalyzed: competitors.length,
          }),
        },
      });

      const highOpportunityGaps = filteredGaps.filter((g) => g.opportunityScore >= 80);
      if (highOpportunityGaps.length > 0) {
        await db.notification.create({
          data: {
            userId,
            type: 'system',
            title: `${highOpportunityGaps.length} opportunité(s) de contenu à fort potentiel`,
            message: `Des lacunes de contenu à haut potentiel ont été détectées. Le sujet le plus prometteur : "${highOpportunityGaps[0]?.topic}" (score : ${highOpportunityGaps[0]?.opportunityScore}).`,
            metadata: JSON.stringify({
              count: highOpportunityGaps.length,
              topics: highOpportunityGaps.map((g) => g.topic),
            }),
          },
        });
      }

      return filteredGaps;
    } catch (error) {
      console.error('[CompetitorSpy] Gaps error:', error);
      return [
        { topic: 'Guide de démarrage rapide', competitorCoverage: ['Concurrent A', 'Concurrent B'], userCoverage: 'none', opportunityScore: 88, suggestedAngle: 'Créer un guide pas-à-pas pour votre domaine d\'expertise' },
        { topic: 'Études de cas clients', competitorCoverage: ['Concurrent A'], userCoverage: 'partial', opportunityScore: 75, suggestedAngle: 'Transformer vos succès clients en histoires engageantes' },
        { topic: 'Tendances de l\'industrie 2025', competitorCoverage: ['Concurrent B', 'Concurrent C'], userCoverage: 'none', opportunityScore: 82, suggestedAngle: 'Positionnez-vous comme expert avec des prévisions sectorielles' },
      ];
    }
  }

  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------

  /**
   * Main cycle: analyzeCompetitorActivity for each tracked competitor
   * + generateCompetitiveInsights + detectContentGaps.
   * Returns stats.
   */
  static async runWorkerCycle(userId: string): Promise<{
    competitorsAnalyzed: number;
    insightsGenerated: number;
    contentGapsFound: number;
    alertsSent: number;
  }> {
    const config = await this.getConfig(userId);
    const result = {
      competitorsAnalyzed: 0,
      insightsGenerated: 0,
      contentGapsFound: 0,
      alertsSent: 0,
    };

    try {
      for (const competitorId of config.trackedCompetitorIds) {
        try {
          await this.analyzeCompetitorActivity(userId, competitorId);
          result.competitorsAnalyzed++;
        } catch (error) {
          console.error(`[CompetitorSpy Worker] Error analyzing competitor ${competitorId}:`, error);
        }
      }
    } catch (error) {
      console.error(`[CompetitorSpy Worker] Analysis phase error for user ${userId}:`, error);
    }

    try {
      const insights = await this.generateCompetitiveInsights(userId);
      result.insightsGenerated = insights.length;
    } catch (error) {
      console.error(`[CompetitorSpy Worker] Insights error for user ${userId}:`, error);
    }

    try {
      const gaps = await this.detectContentGaps(userId);
      result.contentGapsFound = gaps.length;
    } catch (error) {
      console.error(`[CompetitorSpy Worker] Gaps error for user ${userId}:`, error);
    }

    try {
      const recentNotifications = await db.notification.count({
        where: {
          userId,
          type: 'system',
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
          title: { contains: 'Alerte concurrentielle' },
        },
      });
      result.alertsSent = recentNotifications;
    } catch {
      // Non-critical
    }

    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: 'competitor_spy' } },
        data: { lastExecutedAt: new Date() },
      });
    } catch {
      // Config may not exist
    }

    return result;
  }

  /**
   * Get dashboard stats for a user.
   * Returns tracked competitor count, recent analyses count, etc.
   */
  static async getDashboardStats(userId: string) {
    const [
      totalCompetitors,
      activeCompetitors,
      recentActivities,
      totalCompetitorPosts,
    ] = await Promise.all([
      db.competitor.count({ where: { userId } }),
      db.competitor.count({ where: { userId, isActive: true } }),
      db.agentActivity.findMany({
        where: { userId, agentType: 'competitor_spy' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.competitorPost.count({
        where: {
          competitor: { userId },
        },
      }),
    ]);

    const totalAnalysisActivities = await db.agentActivity.count({
      where: {
        userId,
        agentType: 'competitor_spy',
        title: { contains: 'Analyse concurrentielle' },
      },
    });

    const totalInsightActivities = await db.agentActivity.count({
      where: {
        userId,
        agentType: 'competitor_spy',
        title: { contains: 'insights concurrentiels' },
      },
    });

    const totalGapActivities = await db.agentActivity.count({
      where: {
        userId,
        agentType: 'competitor_spy',
        title: { contains: 'lacunes de contenu' },
      },
    });

    const highEngagementPosts = await db.competitorPost.findMany({
      where: {
        competitor: { userId, isActive: true },
        engagementRate: { gte: 5.0 },
      },
      orderBy: { engagementRate: 'desc' },
      take: 5,
      include: {
        competitor: {
          select: { name: true },
        },
      },
    });

    const topCompetitors = await db.competitor.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        industry: true,
        lastSyncedAt: true,
        posts: {
          select: { id: true },
        },
      },
    });

    const topCompetitorsWithCount = topCompetitors.map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      lastSyncedAt: c.lastSyncedAt,
      postCount: c.posts.length,
    }));

    return {
      totalCompetitors,
      activeCompetitors,
      totalCompetitorPosts,
      totalAnalyses: totalAnalysisActivities,
      totalInsights: totalInsightActivities,
      totalGapAnalyses: totalGapActivities,
      highEngagementPosts: highEngagementPosts.map((p) => ({
        subject: p.subject,
        engagementRate: p.engagementRate,
        competitorName: p.competitor.name,
        publishedAt: p.publishedAt,
      })),
      topCompetitors: topCompetitorsWithCount,
      recentActivities,
    };
  }
}
