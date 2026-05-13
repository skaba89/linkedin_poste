import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-providers';
import type { AIMessage } from '@/lib/ai-providers';

// ============================================================
// Types
// ============================================================

export interface ContentRecyclerConfig {
  minDaysOld: number;
  minEngagementScore: number;
  maxRecycles: number;
  autoRecycle: boolean;
  recycleFrequency: string;
  targetFormats: string[];
}

export interface RecyclablePost {
  id: string;
  subject: string;
  finalContent: string;
  contentScore: number;
  createdAt: Date;
  metrics: {
    likes: number;
    comments: number;
    reposts: number;
    engagementRate: number;
  } | null;
  recycleCount: number;
  lastRecycledAt: Date | null;
}

export interface RepurposedContentResult {
  sourcePostId: string;
  sourceContent: string;
  sourceType: string;
  targetType: string;
  generatedContent: string;
  title: string;
  qualityScore: number;
}

export interface ScheduledRecycledContent {
  id: string;
  title: string;
  targetType: string;
  generatedContent: string;
  qualityScore: number;
  plannedDate: Date;
}

const DEFAULT_CONFIG: ContentRecyclerConfig = {
  minDaysOld: 30,
  minEngagementScore: 60,
  maxRecycles: 3,
  autoRecycle: false,
  recycleFrequency: 'monthly',
  targetFormats: ['carousel', 'thread', 'article'],
};

const AVAILABLE_FORMATS = [
  'carousel (document PDF avec 8-10 slides)',
  'thread LinkedIn (série de 5-8 posts)',
  'article LinkedIn (format long 1500-3000 mots)',
  'vidéo script (scénario pour vidéo de 60-90 secondes)',
  'infographie (structure de données visuelles)',
  'newsletter (format email engageant)',
  'série de stories LinkedIn',
  'post engageant avec CTA fort',
];

// ============================================================
// ContentRecyclerAgent — Core Intelligence
// ============================================================

export class ContentRecyclerAgent {
  /**
   * Get user-specific Content Recycler config from Settings table.
   */
  static async getConfig(userId: string): Promise<ContentRecyclerConfig> {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `content_recycler_${userId}_`,
          },
        },
      });

      const config = { ...DEFAULT_CONFIG };
      for (const s of settings) {
        const key = s.key.replace(`content_recycler_${userId}_`, '');
        switch (key) {
          case 'minDaysOld':
            config.minDaysOld = parseInt(s.value, 10) || 30;
            break;
          case 'minEngagementScore':
            config.minEngagementScore = parseInt(s.value, 10) || 60;
            break;
          case 'maxRecycles':
            config.maxRecycles = parseInt(s.value, 10) || 3;
            break;
          case 'autoRecycle':
            config.autoRecycle = s.value === 'true';
            break;
          case 'recycleFrequency':
            config.recycleFrequency = s.value || 'monthly';
            break;
          case 'targetFormats':
            config.targetFormats = JSON.parse(s.value || '["carousel", "thread", "article"]');
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save user-specific Content Recycler config.
   */
  static async saveConfig(userId: string, config: Partial<ContentRecyclerConfig>): Promise<ContentRecyclerConfig> {
    const entries: { key: string; value: string }[] = [];
    if (config.minDaysOld !== undefined) entries.push({ key: `content_recycler_${userId}_minDaysOld`, value: String(config.minDaysOld) });
    if (config.minEngagementScore !== undefined) entries.push({ key: `content_recycler_${userId}_minEngagementScore`, value: String(config.minEngagementScore) });
    if (config.maxRecycles !== undefined) entries.push({ key: `content_recycler_${userId}_maxRecycles`, value: String(config.maxRecycles) });
    if (config.autoRecycle !== undefined) entries.push({ key: `content_recycler_${userId}_autoRecycle`, value: String(config.autoRecycle) });
    if (config.recycleFrequency !== undefined) entries.push({ key: `content_recycler_${userId}_recycleFrequency`, value: config.recycleFrequency });
    if (config.targetFormats !== undefined) entries.push({ key: `content_recycler_${userId}_targetFormats`, value: JSON.stringify(config.targetFormats) });

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
  // 1. FIND RECYCLABLE CONTENT
  // ----------------------------------------------------------------

  /**
   * Finds old high-performing posts (published > minDaysOld, with good metrics).
   * Returns them.
   */
  static async findRecyclableContent(userId: string): Promise<RecyclablePost[]> {
    const config = await this.getConfig(userId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.minDaysOld);

    const posts = await db.post.findMany({
      where: {
        authorId: userId,
        status: 'posted',
        createdAt: { lte: cutoffDate },
        contentScore: { gte: config.minEngagementScore },
      },
      orderBy: { contentScore: 'desc' },
      take: 20,
    });

    const recyclable: RecyclablePost[] = [];

    for (const post of posts) {
      const recycleCount = await db.repurposedContent.count({
        where: { userId, sourcePostId: post.id },
      });

      if (recycleCount >= config.maxRecycles) continue;

      const metrics = await db.postMetric.findFirst({
        where: { postId: post.id },
        orderBy: { collectedAt: 'desc' },
      });

      const lastRecycled = await db.repurposedContent.findFirst({
        where: { userId, sourcePostId: post.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      recyclable.push({
        id: post.id,
        subject: post.subject,
        finalContent: post.finalContent || '',
        contentScore: post.contentScore || 0,
        createdAt: post.createdAt,
        metrics: metrics
          ? {
              likes: metrics.likes,
              comments: metrics.comments,
              reposts: metrics.reposts,
              engagementRate: metrics.engagementRate,
            }
          : null,
        recycleCount,
        lastRecycledAt: lastRecycled?.createdAt || null,
      });
    }

    recyclable.sort((a, b) => b.contentScore - a.contentScore);

    if (recyclable.length > 0) {
      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'content_recycler',
          status: 'completed',
          title: `${recyclable.length} contenus recyclables identifiés`,
          description: `${recyclable.length} posts publiés depuis plus de ${config.minDaysOld} jours avec un score >= ${config.minEngagementScore} peuvent être recyclés. Meilleur score : ${recyclable[0]?.contentScore || 0}.`,
          metadata: JSON.stringify({
            count: recyclable.length,
            minDaysOld: config.minDaysOld,
            minScore: config.minEngagementScore,
            topScore: recyclable[0]?.contentScore || 0,
          }),
        },
      });
    }

    return recyclable;
  }

  // ----------------------------------------------------------------
  // 2. CONTENT REPURPOSING
  // ----------------------------------------------------------------

  /**
   * Takes a source post, uses AI to repurpose it into a new format.
   * Creates RepurposedContent record and AgentActivity.
   */
  static async generateRepurposedContent(
    userId: string,
    sourcePostId: string
  ): Promise<RepurposedContentResult> {
    const config = await this.getConfig(userId);

    const post = await db.post.findUnique({
      where: { id: sourcePostId, authorId: userId },
    });

    if (!post) {
      throw new Error('Post introuvable ou n\'appartient pas à l\'utilisateur');
    }

    const recycleCount = await db.repurposedContent.count({
      where: { userId, sourcePostId: post.id },
    });

    const metrics = await db.postMetric.findFirst({
      where: { postId: post.id },
      orderBy: { collectedAt: 'desc' },
    });

    const recyclablePost: RecyclablePost = {
      id: post.id,
      subject: post.subject,
      finalContent: post.finalContent || '',
      contentScore: post.contentScore || 0,
      createdAt: post.createdAt,
      metrics: metrics
        ? {
            likes: metrics.likes,
            comments: metrics.comments,
            reposts: metrics.reposts,
            engagementRate: metrics.engagementRate,
          }
        : null,
      recycleCount,
      lastRecycledAt: null,
    };

    const formats = config.targetFormats.length > 0
      ? config.targetFormats
      : ['carousel', 'thread', 'article'];

    const formatIndex = recycleCount % formats.length;
    const targetType = formats[formatIndex];

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un expert en recyclage de contenu LinkedIn. Tu transformes du contenu existant en nouveaux formats tout en conservant le message central et la valeur.
Le contenu recyclé doit être frais, original et adapté au nouveau format cible.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "generatedContent": "contenu recyclé complet",
  "title": "titre accrocheur du contenu recyclé",
  "qualityScore": 80
}
Le score de qualité est entre 0 et 100. Sois exigeant sur la qualité.`,
      },
      {
        role: 'user',
        content: `Transforme le contenu LinkedIn suivant en format "${targetType}" :

Titre original : "${recyclablePost.subject}"
Contenu original :
"""
${recyclablePost.finalContent.substring(0, 1500)}
"""
${recyclablePost.metrics ? `- Engagement original : ${(recyclablePost.metrics.engagementRate * 100).toFixed(1)}%, ${recyclablePost.metrics.likes} likes, ${recyclablePost.metrics.comments} commentaires` : ''}
- Nombre de recyclages précédents : ${recyclablePost.recycleCount}

Génère un contenu de haute qualité adapté au format "${targetType}".
Le contenu doit apporter une perspective nouvelle tout en restant fidèle au message original.
Date : ${new Date().toLocaleDateString('fr-FR')}`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.8, maxTokens: 2000 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const repurposed = JSON.parse(cleaned) as {
        generatedContent: string;
        title: string;
        qualityScore: number;
      };

      const qualityScore = Math.max(0, Math.min(100, repurposed.qualityScore || 0));

      const fullResult: RepurposedContentResult = {
        sourcePostId: recyclablePost.id,
        sourceContent: recyclablePost.finalContent,
        sourceType: 'post',
        targetType,
        generatedContent: repurposed.generatedContent,
        title: repurposed.title,
        qualityScore,
      };

      await db.repurposedContent.create({
        data: {
          userId,
          sourcePostId: recyclablePost.id,
          sourceContent: recyclablePost.finalContent,
          sourceType: 'post',
          targetType,
          generatedContent: repurposed.generatedContent,
          title: repurposed.title,
          qualityScore,
        },
      });

      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'content_recycler',
          status: 'completed',
          title: `Contenu recyclé — ${targetType}`,
          description: `"${recyclablePost.subject.substring(0, 60)}..." transformé en ${targetType}. Score de qualité : ${qualityScore}/100.`,
          metadata: JSON.stringify({
            sourcePostId: recyclablePost.id,
            targetType,
            qualityScore,
          }),
        },
      });

      return fullResult;
    } catch (error) {
      console.error('[ContentRecycler] Repurposing error:', error);
      return {
        sourcePostId: recyclablePost.id,
        sourceContent: recyclablePost.finalContent,
        sourceType: 'post',
        targetType,
        generatedContent: recyclablePost.finalContent,
        title: recyclablePost.subject,
        qualityScore: 40,
      };
    }
  }

  // ----------------------------------------------------------------
  // 3. SCHEDULE RECYCLED CONTENT
  // ----------------------------------------------------------------

  /**
   * Finds RepurposedContent with isUsed=false, creates ContentPlanItem for each.
   * Marks as used. Creates AgentActivity.
   */
  static async scheduleRecycledContent(userId: string): Promise<ScheduledRecycledContent[]> {
    const config = await this.getConfig(userId);

    const unusedContent = await db.repurposedContent.findMany({
      where: {
        userId,
        isUsed: false,
        qualityScore: { gte: 60 },
      },
      orderBy: { qualityScore: 'desc' },
      take: 5,
    });

    const scheduled: ScheduledRecycledContent[] = [];

    for (const content of unusedContent) {
      try {
        const scheduledDate = new Date();
        switch (config.recycleFrequency) {
          case 'weekly':
            scheduledDate.setDate(scheduledDate.getDate() + scheduled.length * 3);
            break;
          case 'biweekly':
            scheduledDate.setDate(scheduledDate.getDate() + scheduled.length * 7);
            break;
          case 'monthly':
          default:
            scheduledDate.setDate(scheduledDate.getDate() + scheduled.length * 14);
            break;
        }
        scheduledDate.setHours(9, 0, 0, 0);

        const contentPlanItem = await db.contentPlanItem.create({
          data: {
            userId,
            plannedDate: scheduledDate,
            topic: content.title || 'Contenu recyclé',
            format: content.targetType || 'text',
            priority: content.qualityScore >= 80 ? 'high' : content.qualityScore >= 60 ? 'medium' : 'low',
            status: 'planned',
            aiSuggestion: content.generatedContent,
            notes: `Contenu recyclé à partir du post original (score: ${content.qualityScore})`,
          },
        });

        await db.repurposedContent.update({
          where: { id: content.id },
          data: { isUsed: true },
        });

        scheduled.push({
          id: contentPlanItem.id,
          title: content.title || 'Contenu recyclé',
          targetType: content.targetType,
          generatedContent: content.generatedContent,
          qualityScore: content.qualityScore,
          plannedDate: scheduledDate,
        });
      } catch (error) {
        console.error(`[ContentRecycler] Error scheduling content ${content.id}:`, error);
      }
    }

    if (scheduled.length > 0) {
      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'content_recycler',
          status: 'completed',
          title: `${scheduled.length} contenus recyclés planifiés`,
          description: `${scheduled.length} contenus recyclés ont été planifiés pour publication. Fréquence : ${config.recycleFrequency}.`,
          metadata: JSON.stringify({
            scheduled: scheduled.map((s) => ({ id: s.id, title: s.title, type: s.targetType })),
          }),
        },
      });

      await db.notification.create({
        data: {
          userId,
          type: 'system',
          title: 'Contenus recyclés planifiés',
          message: `${scheduled.length} contenus recyclés ont été automatiquement planifiés dans votre calendrier de publication.`,
          metadata: JSON.stringify({ count: scheduled.length }),
        },
      });
    }

    return scheduled;
  }

  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------

  /**
   * Main cycle: findRecyclableContent + generateRepurposedContent + scheduleRecycledContent.
   * Returns stats.
   */
  static async runWorkerCycle(userId: string): Promise<{
    recyclableFound: number;
    contentGenerated: number;
    contentScheduled: number;
    avgQualityScore: number;
  }> {
    const config = await this.getConfig(userId);
    const result = {
      recyclableFound: 0,
      contentGenerated: 0,
      contentScheduled: 0,
      avgQualityScore: 0,
    };

    let recyclablePosts: RecyclablePost[] = [];
    try {
      recyclablePosts = await this.findRecyclableContent(userId);
      result.recyclableFound = recyclablePosts.length;
    } catch (error) {
      console.error(`[ContentRecycler Worker] Find error for user ${userId}:`, error);
    }

    const qualityScores: number[] = [];
    if (config.autoRecycle && recyclablePosts.length > 0) {
      try {
        const postsToRecycle = recyclablePosts.slice(0, 3);
        for (const post of postsToRecycle) {
          try {
            const repurposed = await this.generateRepurposedContent(userId, post.id);
            result.contentGenerated++;
            qualityScores.push(repurposed.qualityScore);
          } catch (error) {
            console.error(`[ContentRecycler Worker] Repurpose error for post ${post.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`[ContentRecycler Worker] Repurpose error for user ${userId}:`, error);
      }
    }

    try {
      const scheduled = await this.scheduleRecycledContent(userId);
      result.contentScheduled = scheduled.length;
    } catch (error) {
      console.error(`[ContentRecycler Worker] Schedule error for user ${userId}:`, error);
    }

    result.avgQualityScore = qualityScores.length > 0
      ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
      : 0;

    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: 'content_recycler' } },
        data: { lastExecutedAt: new Date() },
      });
    } catch {
      // Config may not exist
    }

    return result;
  }

  /**
   * Get dashboard stats for a user.
   * Returns recyclable count, repurposed count, scheduled count, etc.
   */
  static async getDashboardStats(userId: string) {
    const [
      totalRepurposed,
      scheduledRepurposed,
      usedRepurposed,
      recyclingRules,
      recentActivities,
    ] = await Promise.all([
      db.repurposedContent.count({ where: { userId } }),
      db.repurposedContent.count({ where: { userId, isUsed: false } }),
      db.repurposedContent.count({ where: { userId, isUsed: true } }),
      db.contentRecyclingRule.count({ where: { userId } }),
      db.agentActivity.findMany({
        where: { userId, agentType: 'content_recycler' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const avgQualityResult = await db.repurposedContent.aggregate({
      where: { userId },
      _avg: { qualityScore: true },
    });
    const avgQuality = Math.round(avgQualityResult._avg.qualityScore || 0);

    const config = await this.getConfig(userId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.minDaysOld);
    const recyclablePosts = await db.post.count({
      where: {
        authorId: userId,
        status: 'posted',
        createdAt: { lte: cutoffDate },
        contentScore: { gte: config.minEngagementScore },
      },
    });

    const plannedItems = await db.contentPlanItem.count({
      where: {
        userId,
        status: 'planned',
        aiSuggestion: { not: null },
      },
    });

    const targetTypeStats = await db.repurposedContent.groupBy({
      by: ['targetType'],
      where: { userId },
      _count: { id: true },
      _avg: { qualityScore: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const recentRepurposed = await db.repurposedContent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        targetType: true,
        qualityScore: true,
        isUsed: true,
        createdAt: true,
      },
    });

    return {
      totalRepurposed,
      scheduledRepurposed,
      usedRepurposed,
      recyclablePosts,
      plannedItems,
      avgQuality,
      recyclingRules,
      targetTypeStats,
      recentRepurposed,
      recentActivities,
    };
  }
}
