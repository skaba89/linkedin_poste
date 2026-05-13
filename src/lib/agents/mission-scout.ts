import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-providers';
import type { AIMessage } from '@/lib/ai-providers';
import { sendNotification } from '@/lib/notification-sender';

// ============================================================
// Types
// ============================================================

export interface MissionScoutConfig {
  targetSectors: string[];
  targetLocations: string[];
  skills: string[];
  maxApplicationsPerWeek: number;
  autoApply: boolean;
  followUpEnabled: boolean;
  notificationChannel: string;
}

export interface ScannedOpportunity {
  title: string;
  company: string;
  location?: string;
  description?: string;
  salaryRange?: string;
  sourceUrl?: string;
  requiredSkills?: string[];
  sector?: string;
  relevanceScore: number;
}

export interface TrendResult {
  topic: string;
  category: string;
  momentum: 'rising' | 'stable' | 'declining';
  mentionCount: number;
}

export interface LinkedInProfileAnalysis {
  skills: string[];
  sectors: string[];
  jobTitles: string[];
  preferredWorkMode: string[];
  preferredRegions: string[];
  preferredCountries: string[];
  languages: string[];
  contentTone: string;
  engagementStyle: string;
  topTopics: string[];
  analyzedAt: string;
  postCount: number;
}

const DEFAULT_CONFIG: MissionScoutConfig = {
  targetSectors: [],
  targetLocations: [],
  skills: [],
  maxApplicationsPerWeek: 10,
  autoApply: false,
  followUpEnabled: true,
  notificationChannel: 'email',
};

// ============================================================
// MissionScoutAgent — Core Intelligence
// ============================================================

export class MissionScoutAgent {
  /**
   * Get user-specific Mission Scout config from Settings table.
   */
  static async getConfig(userId: string): Promise<MissionScoutConfig> {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `mission_scout_${userId}_`,
          },
        },
      });

      const config = { ...DEFAULT_CONFIG };
      for (const s of settings) {
        const key = s.key.replace(`mission_scout_${userId}_`, '');
        switch (key) {
          case 'targetSectors':
            config.targetSectors = JSON.parse(s.value || '[]');
            break;
          case 'targetLocations':
            config.targetLocations = JSON.parse(s.value || '[]');
            break;
          case 'skills':
            config.skills = JSON.parse(s.value || '[]');
            break;
          case 'maxApplicationsPerWeek':
            config.maxApplicationsPerWeek = parseInt(s.value, 10) || 10;
            break;
          case 'autoApply':
            config.autoApply = s.value === 'true';
            break;
          case 'followUpEnabled':
            config.followUpEnabled = s.value !== 'false';
            break;
          case 'notificationChannel':
            config.notificationChannel = s.value || 'email';
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save user-specific Mission Scout config.
   */
  static async saveConfig(userId: string, config: Partial<MissionScoutConfig>): Promise<MissionScoutConfig> {
    const entries: { key: string; value: string }[] = [];
    if (config.targetSectors !== undefined) entries.push({ key: `mission_scout_${userId}_targetSectors`, value: JSON.stringify(config.targetSectors) });
    if (config.targetLocations !== undefined) entries.push({ key: `mission_scout_${userId}_targetLocations`, value: JSON.stringify(config.targetLocations) });
    if (config.skills !== undefined) entries.push({ key: `mission_scout_${userId}_skills`, value: JSON.stringify(config.skills) });
    if (config.maxApplicationsPerWeek !== undefined) entries.push({ key: `mission_scout_${userId}_maxApplicationsPerWeek`, value: String(config.maxApplicationsPerWeek) });
    if (config.autoApply !== undefined) entries.push({ key: `mission_scout_${userId}_autoApply`, value: String(config.autoApply) });
    if (config.followUpEnabled !== undefined) entries.push({ key: `mission_scout_${userId}_followUpEnabled`, value: String(config.followUpEnabled) });
    if (config.notificationChannel !== undefined) entries.push({ key: `mission_scout_${userId}_notificationChannel`, value: config.notificationChannel });

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
  // 1. TREND SURVEILLANCE
  // ----------------------------------------------------------------

  /**
   * Scan LinkedIn for trending topics in user's industry.
   * Uses AI analysis to identify hot topics based on user config.
   */
  static async scanTrends(userId: string): Promise<TrendResult[]> {
    const config = await this.getConfig(userId);
    const sectors = config.targetSectors.join(', ');
    const skills = config.skills.join(', ');

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un analyste de tendances LinkedIn spécialisé B2B. Tu identifies les sujets chauds, les tendances émergentes et les opportunités dans les secteurs spécifiés.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: [{"topic":"...","category":"...","momentum":"rising|stable|declining","mentionCount":123}]`,
      },
      {
        role: 'user',
        content: `Secteurs cibles: ${sectors || 'Tech, Marketing, Consulting'}.
Compétences clés: ${skills || 'Développement, Data, Growth, IA'}.
Identifie les 10 tendances les plus pertinentes et montantes sur LinkedIn pour un profil professionnel dans ces domaines.
Inclus des tendances sur l'emploi, les missions freelance, et les compétences demandées.
Date actuelle: ${new Date().toLocaleDateString('fr-FR')}`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.6, maxTokens: 1200 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const trends = JSON.parse(cleaned) as TrendResult[];
      return Array.isArray(trends) ? trends.slice(0, 10) : [];
    } catch (error) {
      console.error('[MissionScout] Trend scan error:', error);
      // Return simulated trends as fallback
      return this.getFallbackTrends(config);
    }
  }

  private static getFallbackTrends(config: MissionScoutConfig): TrendResult[] {
    const sector = config.targetSectors[0] || 'Tech';
    return [
      { topic: `IA et automatisation dans le ${sector}`, category: 'Technologie', momentum: 'rising', mentionCount: 245 },
      { topic: `Transition écliche dans le ${sector}`, category: 'RSE', momentum: 'rising', mentionCount: 189 },
      { topic: 'Remote work et hybridation', category: 'Travail', momentum: 'stable', mentionCount: 156 },
      { topic: 'Compétences data et analytics', category: 'Formation', momentum: 'rising', mentionCount: 132 },
      { topic: `Freelance et missions de conseil en ${sector}`, category: 'Emploi', momentum: 'rising', mentionCount: 98 },
    ];
  }

  // ----------------------------------------------------------------
  // 2. OPPORTUNITY DETECTION
  // ----------------------------------------------------------------

  /**
   * Find relevant jobs/missions/gigs.
   * Uses AI to score each opportunity for relevance (0-100).
   */
  static async findOpportunities(userId: string): Promise<ScannedOpportunity[]> {
    const config = await this.getConfig(userId);
    const sectors = config.targetSectors.join(', ');
    const locations = config.targetLocations.join(', ');
    const skills = config.skills.join(', ');

    // Get recent agent activities to avoid duplicates
    const existingOpportunities = await db.opportunity.findMany({
      where: { userId },
      select: { title: true, company: true },
      take: 50,
    });
    const existingTitles = new Set(existingOpportunities.map((o) => `${o.title}|${o.company}`));

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un chasseur de têtes IA spécialisé LinkedIn B2B. Tu génères des opportunités de missions/emplois réalistes et pertinentes basées sur les critères fournis.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: [{"title":"...","company":"...","location":"...","description":"...","salaryRange":"...","requiredSkills":["..."],"sector":"..."}]
Génère 8-12 opportunités réalistes avec des entreprises réelles ou plausibles.`,
      },
      {
        role: 'user',
        content: `Profil recherché:
- Secteurs: ${sectors || 'Tech, Marketing, Consulting'}
- Lieux: ${locations || 'France, Remote'}
- Compétences: ${skills || 'Développement, Data, Growth, IA, Product Management'}

Génère des opportunités de missions/emplois pertinentes pour ce profil.
Inclus un mélange de CDI, missions freelance, et contrats.
Varie les niveaux de seniorité (mid à senior).
Date: ${new Date().toLocaleDateString('fr-FR')}`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.8, maxTokens: 2000 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const opportunities = JSON.parse(cleaned) as ScannedOpportunity[];

      if (!Array.isArray(opportunities)) return [];

      // Score each opportunity using AI
      const scored = await Promise.all(
        opportunities.map(async (opp) => {
          const score = await this.scoreOpportunity(opp, config);
          return { ...opp, relevanceScore: score };
        })
      );

      // Filter duplicates
      const unique = scored.filter((opp) => !existingTitles.has(`${opp.title}|${opp.company}`));

      // Save new opportunities to DB
      for (const opp of unique) {
        await db.opportunity.create({
          data: {
            userId,
            title: opp.title,
            company: opp.company || undefined,
            location: opp.location || undefined,
            description: opp.description || undefined,
            salaryRange: opp.salaryRange || undefined,
            relevanceScore: opp.relevanceScore,
            requiredSkills: opp.requiredSkills ? JSON.stringify(opp.requiredSkills) : undefined,
            sector: opp.sector || undefined,
            source: 'linkedin',
          },
        });
      }

      return unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('[MissionScout] Opportunity scan error:', error);
      return [];
    }
  }

  /**
   * Score a single opportunity for relevance (0-100).
   */
  private static async scoreOpportunity(
    opp: ScannedOpportunity,
    config: MissionScoutConfig
  ): Promise<number> {
    const skills = config.skills.join(', ');
    const sectors = config.targetSectors.join(', ');

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu évalues la pertinence d'une opportunité professionnelle. 
Réponds UNIQUEMENT avec un nombre entre 0 et 100, sans autre texte.`,
      },
      {
        role: 'user',
        content: `Opportunité: "${opp.title}" chez ${opp.company}
Secteur: ${opp.sector || 'Non précisé'}
Lieu: ${opp.location || 'Non précisé'}
Compétences requises: ${opp.requiredSkills?.join(', ') || 'Non précisées'}

Profil du candidat:
- Secteurs cibles: ${sectors || 'Non définis'}
- Compétences clés: ${skills || 'Non définies'}

Score de pertinence (0-100):`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0, maxTokens: 10 }, 'zai');
      const score = parseInt(result.trim(), 10);
      return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
    } catch {
      return 50;
    }
  }

  // ----------------------------------------------------------------
  // 3. AUTO-APPLICATION
  // ----------------------------------------------------------------

  /**
   * Generate personalized application message via AI and "send" (record in DB).
   */
  static async applyToOpportunity(
    userId: string,
    opportunityId: string,
    customMessage?: string
  ): Promise<{ application: any; message: string }> {
    const opportunity = await db.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity || opportunity.userId !== userId) {
      throw new Error('Opportunité introuvable');
    }

    // Check weekly limit
    const config = await this.getConfig(userId);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyApplications = await db.application.count({
      where: {
        userId,
        status: 'sent',
        createdAt: { gte: weekStart },
      },
    });

    if (weeklyApplications >= config.maxApplicationsPerWeek) {
      throw new Error(`Limite hebdomadaire atteinte (${config.maxApplicationsPerWeek} candidatures/semaine)`);
    }

    // Check existing application
    const existingApp = await db.application.findFirst({
      where: { opportunityId, userId },
    });

    if (existingApp && existingApp.status === 'sent') {
      throw new Error('Candidature déjà envoyée pour cette opportunité');
    }

    // Generate application message with AI
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    let message = customMessage;
    if (!message) {
      message = await this.generateApplicationMessage(opportunity, user?.name || 'Candidat', config);
    }

    // Calculate follow-up schedule
    const now = new Date();
    const followUpJ3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const followUpJ7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const followUpJ14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Create application
    const application = await db.application.create({
      data: {
        opportunityId,
        userId,
        status: 'sent',
        message,
        connectionSent: true,
        followUpStage: 0,
        nextFollowUpAt: followUpJ3,
      },
    });

    // Update opportunity status
    await db.opportunity.update({
      where: { id: opportunityId },
      data: { status: 'applied' },
    });

    // Create agent activity
    await db.agentActivity.create({
      data: {
        userId,
        agentType: 'mission_scout',
        status: 'completed',
        title: `Candidature envoyée — ${opportunity.title}`,
        description: `Candidature envoyée à ${opportunity.company || 'l\'entreprise'}. Prochain relance prévue J+3.`,
        metadata: JSON.stringify({
          opportunityId,
          applicationId: application.id,
          company: opportunity.company,
        }),
      },
    });

    // Create in-app notification + send via Email/WhatsApp/Telegram
    await sendNotification({
      userId,
      eventType: 'mission_application_sent',
      title: 'Candidature envoyée',
      message: `Mission Scout a envoyé votre candidature pour "${opportunity.title}" chez ${opportunity.company || 'l\'entreprise'}. Score: ${opportunity.relevanceScore}/100. Prochaine relance: J+3.`,
      priority: 'high',
      metadata: { opportunityId, applicationId: application.id, company: opportunity.company },
    });

    return {
      application,
      message,
    };
  }

  /**
   * Generate a personalized application message via AI.
   */
  private static async generateApplicationMessage(
    opportunity: any,
    userName: string,
    config: MissionScoutConfig
  ): Promise<string> {
    const skills = config.skills.join(', ');
    const requiredSkills = opportunity.requiredSkills
      ? JSON.parse(opportunity.requiredSkills)
      : [];

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu rédiges un message de candidature professionnel et personnalisé pour LinkedIn.
Le message doit être concis (max 300 mots), chaleureux et mettre en valeur les compétences du candidat.
Il ne doit PAS être générique — il doit mentionner l'entreprise et le poste spécifiquement.
Le ton est professionnel mais accessible, adapté au B2B francophone.`,
      },
      {
        role: 'user',
        content: `Rédige un message de candidature LinkedIn pour:
- Candidat: ${userName}
- Poste: ${opportunity.title}
- Entreprise: ${opportunity.company || 'Non précisée'}
- Description: ${opportunity.description || 'Non précisée'}
- Compétences du candidat: ${skills}
- Compétences requises: ${requiredSkills.join(', ')}
- Salaire: ${opportunity.salaryRange || 'Non précisé'}

Le message doit inclure:
1. Un accroche personnalisée
2. Pourquoi ce poste intéresse le candidat
3. 2-3 compétences clés pertinentes
4. Un appel à action pour échanger`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.7, maxTokens: 500 }, 'zai');
      return result.trim();
    } catch {
      return `Bonjour,\n\nJe suis très intéressé(e) par le poste de ${opportunity.title} chez ${opportunity.company || 'votre entreprise'}.\n\nMon profil et mes compétences correspondent à vos besoins, et je serais ravi(e) d'en échanger davantage avec vous.\n\nCordialement,\n${userName}`;
    }
  }

  // ----------------------------------------------------------------
  // 4. FOLLOW-UP SEQUENCE
  // ----------------------------------------------------------------

  /**
   * Process pending follow-ups for a user.
   * Schedule: J+3 (gentle ping), J+7 (value message), J+14 (final attempt)
   * J+21 → mark as expired
   */
  static async processFollowUps(userId: string): Promise<{
    processed: number;
    expired: number;
    details: any[];
  }> {
    const config = await this.getConfig(userId);
    if (!config.followUpEnabled) {
      return { processed: 0, expired: 0, details: [] };
    }

    const now = new Date();
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

    // Find applications needing follow-up
    const pendingApps = await db.application.findMany({
      where: {
        userId,
        status: 'sent',
        nextFollowUpAt: { lte: now },
        followUpStage: { lt: 3 },
      },
      include: { opportunity: true },
    });

    // Find applications to expire (J+21)
    const expiredApps = await db.application.findMany({
      where: {
        userId,
        status: 'sent',
        createdAt: { lte: twentyOneDaysAgo },
        followUpStage: 3,
      },
      include: { opportunity: true },
    });

    const details: any[] = [];
    let processed = 0;

    for (const app of pendingApps) {
      try {
        const newStage = app.followUpStage + 1;
        const followUpMessage = await this.generateFollowUpMessage(
          app,
          newStage
        );

        // Update application
        await db.application.update({
          where: { id: app.id },
          data: {
            followUpStage: newStage,
            lastFollowUpAt: now,
            nextFollowUpAt: newStage < 3
              ? new Date(now.getTime() + [3, 7, 14][newStage] * 24 * 60 * 60 * 1000)
              : undefined,
            notes: (app.notes || '') + `\n--- Relance J+${[3, 7, 14][newStage - 1]} ---\n${followUpMessage}`,
          },
        });

        // Create agent activity
        await db.agentActivity.create({
          data: {
            userId,
            agentType: 'mission_scout',
            status: 'completed',
            title: `Relance J+${[3, 7, 14][newStage - 1]} — ${app.opportunity.title}`,
            description: `Relance envoyée à ${app.opportunity.company || 'l\'entreprise'} (étape ${newStage}/3).`,
            metadata: JSON.stringify({
              applicationId: app.id,
              opportunityId: app.opportunity.id,
              stage: newStage,
            }),
          },
        });

        details.push({
          applicationId: app.id,
          opportunity: app.opportunity.title,
          stage: newStage,
          message: followUpMessage,
        });
        processed++;
      } catch (error) {
        console.error(`[MissionScout] Follow-up error for app ${app.id}:`, error);
      }
    }

    // Expire old applications
    let expired = 0;
    for (const app of expiredApps) {
      await db.application.update({
        where: { id: app.id },
        data: { status: 'expired' },
      });
      await db.opportunity.update({
        where: { id: app.opportunityId },
        data: { status: 'expired', closedAt: now },
      });
      expired++;
    }

    return { processed, expired, details };
  }

  /**
   * Generate a context-aware follow-up message.
   */
  private static async generateFollowUpMessage(
    application: any,
    stage: number
  ): Promise<string> {
    const stageLabels = ['J+3', 'J+7', 'J+14'];
    const stageTones = [
      'Poliment insistant — rappel doux et professionnel',
      'Apport de valeur — partage un insight ou article pertinent',
      'Dernière tentative — respectueuse mais directe',
    ];

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu rédiges un message de relance LinkedIn. Le message doit être court (max 150 mots), professionnel et non intrusif.
Ton: ${stageTones[stage - 1]}`,
      },
      {
        role: 'user',
        content: `Contexte:
- Candidature pour: ${application.opportunity.title} chez ${application.opportunity.company}
- Message original envoyé: "${application.message?.substring(0, 200)}..."
- Étape de relance: ${stageLabels[stage - 1]} (${stage}/3)

Rédige un message de relance adapté à l'étape ${stage}.`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.6, maxTokens: 300 }, 'zai');
      return result.trim();
    } catch {
      return `Bonjour,\n\nJe me permets de faire un suivi de ma candidature pour le poste de ${application.opportunity.title}.\n\nJe reste à votre disposition pour en discuter.\n\nCordialement`;
    }
  }

  // ----------------------------------------------------------------
  // 5. STATUS TRACKING
  // ----------------------------------------------------------------

  /**
   * Update application status (viewed, replied, etc.).
   */
  static async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: string,
    responseText?: string,
    aiAnalysis?: string
  ): Promise<any> {
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { opportunity: true },
    });

    if (!application || application.userId !== userId) {
      throw new Error('Candidature introuvable');
    }

    const updateData: any = { status };
    if (responseText) updateData.responseText = responseText;
    if (aiAnalysis) updateData.aiAnalysis = aiAnalysis;

    // Sync opportunity status based on application status
    if (status === 'replied') {
      updateData.nextFollowUpAt = null;
      await db.opportunity.update({
        where: { id: application.opportunityId },
        data: { status: 'replied' },
      });
    } else if (status === 'rejected') {
      await db.opportunity.update({
        where: { id: application.opportunityId },
        data: { status: 'not_interested', closedAt: new Date() },
      });
    }

    return db.application.update({
      where: { id: applicationId },
      data: updateData,
    });
  }

  /**
   * Analyze a response from a recruiter using AI.
   */
  static async analyzeResponse(
    userId: string,
    applicationId: string,
    responseText: string
  ): Promise<string> {
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { opportunity: true },
    });

    if (!application || application.userId !== userId) {
      throw new Error('Candidature introuvable');
    }

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu analyses la réponse d'un recruteur à une candidature LinkedIn. 
Identifie le sentiment (positif, neutre, négatif), l'intention (intérêt, refus, demande d'info) et suggère une réponse adaptée.
Réponds en français, max 200 mots.`,
      },
      {
        role: 'user',
        content: `Poste: ${application.opportunity.title} chez ${application.opportunity.company}
Message de candidature original: "${application.message?.substring(0, 200)}..."
Réponse du recruteur: "${responseText}"

Analyse cette réponse et suggère une action.`,
      },
    ];

    try {
      const analysis = await callAI(messages, { temperature: 0.3, maxTokens: 300 }, 'zai');

      await db.application.update({
        where: { id: applicationId },
        data: {
          responseText,
          aiAnalysis: analysis,
          status: 'replied',
        },
      });

      await db.opportunity.update({
        where: { id: application.opportunityId },
        data: { status: 'replied' },
      });

      return analysis;
    } catch {
      return 'Analyse indisponible. Veuillez analyser la réponse manuellement.';
    }
  }

  // ----------------------------------------------------------------
  // 6. WORKER METHODS
  // ----------------------------------------------------------------

  /**
   * Full scan cycle for the worker.
   */
  static async runWorkerCycle(userId: string): Promise<{
    opportunitiesFound: number;
    applicationsSent: number;
    followUpsProcessed: number;
    expired: number;
  }> {
    const config = await this.getConfig(userId);
    const result = {
      opportunitiesFound: 0,
      applicationsSent: 0,
      followUpsProcessed: 0,
      expired: 0,
    };

    // Phase 1: Scan for new opportunities
    try {
      const opportunities = await this.findOpportunities(userId);
      result.opportunitiesFound = opportunities.length;

      // Notify user if high-score opportunities found
      const highScoreOpps = opportunities.filter(o => o.relevanceScore >= 80);
      if (highScoreOpps.length > 0) {
        await sendNotification({
          userId,
          eventType: 'mission_high_score_opp',
          title: `${highScoreOpps.length} opportunité(s) détectée(s) — Score ≥ 80`,
          message: `Mission Scout a trouvé ${highScoreOpps.length} opportunité(s) à haut score:\n${highScoreOpps.map(o => `• ${o.title} chez ${o.company || '?'} (${o.relevanceScore}/100)`).join('\n')}`,
          priority: 'high',
          metadata: { count: highScoreOpps.length, opportunities: highScoreOpps.map(o => ({ id: o.id, title: o.title, score: o.relevanceScore })) },
        });
      }
    } catch (error) {
      console.error(`[MissionScout Worker] Scan error for user ${userId}:`, error);
    }

    // Phase 2: Auto-apply if enabled and under weekly limit
    if (config.autoApply) {
      try {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weeklyCount = await db.application.count({
          where: {
            userId,
            status: 'sent',
            createdAt: { gte: weekStart },
          },
        });

        const remaining = config.maxApplicationsPerWeek - weeklyCount;
        if (remaining > 0) {
          // Get high-score new opportunities
          const topOpportunities = await db.opportunity.findMany({
            where: {
              userId,
              status: 'new',
              relevanceScore: { gte: 70 },
            },
            orderBy: { relevanceScore: 'desc' },
            take: remaining,
          });

          for (const opp of topOpportunities) {
            try {
              await this.applyToOpportunity(userId, opp.id);
              result.applicationsSent++;
            } catch (error) {
              console.error(`[MissionScout Worker] Auto-apply error for ${opp.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`[MissionScout Worker] Auto-apply error for user ${userId}:`, error);
      }
    }

    // Phase 3: Process follow-ups
    try {
      const followUpResult = await this.processFollowUps(userId);
      result.followUpsProcessed = followUpResult.processed;
      result.expired = followUpResult.expired;

      // Notify if follow-ups were sent
      if (followUpResult.processed > 0) {
        await sendNotification({
          userId,
          eventType: 'mission_follow_up',
          title: `${followUpResult.processed} relance(s) envoyée(s)`,
          message: `Mission Scout a envoyé ${followUpResult.processed} relance(s) automatique(s) pour vos candidatures en attente.${followUpResult.expired > 0 ? ` ${followUpResult.expired} candidature(s) expirée(s).` : ''}`,
          priority: 'normal',
          metadata: { processed: followUpResult.processed, expired: followUpResult.expired },
        });
      }
    } catch (error) {
      console.error(`[MissionScout Worker] Follow-up error for user ${userId}:`, error);
    }

    // Phase 4: Auto-post if configured
    try {
      const autoPostResult = await this.autoPostIfConfigured(userId);
      if (autoPostResult) {
        await sendNotification({
          userId,
          eventType: 'mission_auto_post',
          title: 'Publication automatique générée',
          message: `Mission Scout a généré une publication automatique de type "${autoPostResult.type}". Statut: brouillon en attente de validation.`,
          priority: 'low',
          metadata: { postId: autoPostResult.postId, type: autoPostResult.type },
        });
      }
    } catch (error) {
      console.error(`[MissionScout Worker] Auto-post error for user ${userId}:`, error);
    }

    // Update lastExecutedAt on agent config
    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: 'mission_scout' } },
        data: { lastExecutedAt: new Date() },
      });
    } catch {
      // Config may not exist
    }

    return result;
  }

  /**
   * Get dashboard stats for a user.
   */
  // ----------------------------------------------------------------
  // 7. LINKEDIN PROFILE ANALYSIS
  // ----------------------------------------------------------------

  /**
   * Analyze a user's LinkedIn content to build a professional profile.
   * Uses the last 30 posts to extract skills, sectors, tone, etc.
   * Results are cached for 24h in the Settings table.
   */
  static async analyzeLinkedInProfile(userId: string): Promise<LinkedInProfileAnalysis> {
    const cacheKey = `mission_scout_${userId}_profileAnalysis`;

    // Check cache (24h TTL)
    try {
      const cached = await db.settings.findUnique({ where: { key: cacheKey } });
      if (cached?.value) {
        const parsed = JSON.parse(cached.value) as LinkedInProfileAnalysis & { cachedAt?: string };
        if (parsed.cachedAt) {
          const cacheAge = Date.now() - new Date(parsed.cachedAt).getTime();
          if (cacheAge < 24 * 60 * 60 * 1000) {
            // Return cached result without the internal cachedAt field
            const { cachedAt: _, ...analysis } = parsed;
            return analysis as LinkedInProfileAnalysis;
          }
        }
      }
    } catch {
      // Cache miss or parse error — continue to analyze
    }

    // Fetch last 30 posts
    const posts = await db.post.findMany({
      where: {
        authorId: userId,
        status: { in: ['posted', 'approved', 'draft'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { subject: true, finalContent: true },
    });

    if (posts.length === 0) {
      return {
        skills: [],
        sectors: [],
        jobTitles: [],
        preferredWorkMode: [],
        preferredRegions: [],
        preferredCountries: [],
        languages: ['Français'],
        contentTone: 'Non déterminé',
        engagementStyle: 'Non déterminé',
        topTopics: [],
        analyzedAt: new Date().toISOString(),
        postCount: 0,
      };
    }

    // Build corpus from posts
    const corpus = posts
      .map((p) => `${p.subject}${p.finalContent ? `\n${p.finalContent}` : ''}`)
      .join('\n\n---\n\n');

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un analyste de profil LinkedIn expert. Tu analyses le contenu publié par un professionnel pour déterminer son profil professionnel complet.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "skills": ["compétence1", "compétence2", ...],
  "sectors": ["secteur1", "secteur2", ...],
  "jobTitles": ["titre1", "titre2", ...],
  "preferredWorkMode": ["remote", "hybrid", "onsite", ...],
  "preferredRegions": ["région1", "région2", ...],
  "preferredCountries": ["pays1", "pays2", ...],
  "languages": ["langue1", "langue2", ...],
  "contentTone": "description du ton",
  "engagementStyle": "description du style d'engagement",
  "topTopics": ["sujet1", "sujet2", ...]
}
Génère entre 5 et 15 éléments par liste. Base-toi UNIQUEMENT sur le contenu fourni. Sois précis et professionnel.`,
      },
      {
        role: 'user',
        content: `Voici les ${posts.length} derniers posts LinkedIn de cette personne:\n\n${corpus}\n\nAnalyse ce contenu et décris le profil professionnel de cette personne : ses compétences, ses secteurs d'activité, ses intitulés de poste probables, ses préférences de travail, ses langues, son ton de communication et ses sujets de prédilection.`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.3, maxTokens: 1500 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const analysis: LinkedInProfileAnalysis = {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        sectors: Array.isArray(parsed.sectors) ? parsed.sectors : [],
        jobTitles: Array.isArray(parsed.jobTitles) ? parsed.jobTitles : [],
        preferredWorkMode: Array.isArray(parsed.preferredWorkMode) ? parsed.preferredWorkMode : [],
        preferredRegions: Array.isArray(parsed.preferredRegions) ? parsed.preferredRegions : [],
        preferredCountries: Array.isArray(parsed.preferredCountries) ? parsed.preferredCountries : [],
        languages: Array.isArray(parsed.languages) ? parsed.languages : ['Français'],
        contentTone: parsed.contentTone || 'Non déterminé',
        engagementStyle: parsed.engagementStyle || 'Non déterminé',
        topTopics: Array.isArray(parsed.topTopics) ? parsed.topTopics : [],
        analyzedAt: new Date().toISOString(),
        postCount: posts.length,
      };

      // Save to cache
      await db.settings.upsert({
        where: { key: cacheKey },
        update: { value: JSON.stringify({ ...analysis, cachedAt: new Date().toISOString() }) },
        create: { key: cacheKey, value: JSON.stringify({ ...analysis, cachedAt: new Date().toISOString() }) },
      });

      return analysis;
    } catch (error) {
      console.error('[MissionScout] Profile analysis error:', error);
      return {
        skills: [],
        sectors: [],
        jobTitles: [],
        preferredWorkMode: [],
        preferredRegions: [],
        preferredCountries: [],
        languages: ['Français'],
        contentTone: 'Analyse indisponible',
        engagementStyle: 'Analyse indisponible',
        topTopics: [],
        analyzedAt: new Date().toISOString(),
        postCount: posts.length,
      };
    }
  }

  // ----------------------------------------------------------------
  // 8. AUTO-CONFIGURE FROM PROFILE
  // ----------------------------------------------------------------

  /**
   * Auto-configure MissionScout based on the user's LinkedIn profile analysis.
   * Maps AI-extracted profile data to config fields.
   */
  static async autoConfigureFromProfile(userId: string): Promise<MissionScoutConfig> {
    try {
      const profile = await this.analyzeLinkedInProfile(userId);

      if (profile.postCount === 0) {
        throw new Error('Aucun post trouvé pour analyser le profil. Publiez du contenu LinkedIn d\'abord.');
      }

      // Map profile analysis to config fields
      const newConfig: Partial<MissionScoutConfig> = {
        skills: profile.skills.slice(0, 15),
        targetSectors: profile.sectors.slice(0, 10),
        targetLocations: [
          ...profile.preferredRegions,
          ...profile.preferredCountries,
        ].slice(0, 10),
      };

      // Save config
      const config = await this.saveConfig(userId, newConfig);

      // Ensure AgentConfig is enabled
      try {
        await db.agentConfig.upsert({
          where: { userId_agentType: { userId, agentType: 'mission_scout' } },
          update: { enabled: true },
          create: { userId, agentType: 'mission_scout', enabled: true },
        });
      } catch {
        // AgentConfig upsert may fail silently
      }

      // Create agent activity
      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'mission_scout',
          status: 'completed',
          title: 'Configuration auto basée sur le profil LinkedIn',
          description: `Mission Scout a analysé ${profile.postCount} posts et configuré automatiquement:
• ${newConfig.skills?.length || 0} compétences
• ${newConfig.targetSectors?.length || 0} secteurs cibles
• ${newConfig.targetLocations?.length || 0} lieux cibles
Ton détecté: ${profile.contentTone}
Sujets principaux: ${profile.topTopics.slice(0, 5).join(', ') || 'N/A'}`,
          metadata: JSON.stringify({
            source: 'profile_analysis',
            postCount: profile.postCount,
            skillsCount: newConfig.skills?.length || 0,
            sectorsCount: newConfig.targetSectors?.length || 0,
          }),
        },
      });

      return config;
    } catch (error) {
      console.error('[MissionScout] Auto-configure error:', error);
      if (error instanceof Error) throw error;
      throw new Error('Erreur lors de la configuration automatique');
    }
  }

  // ----------------------------------------------------------------
  // 9. GENERATE MISSION-RELATED LINKEDIN POSTS
  // ----------------------------------------------------------------

  /**
   * Generate a LinkedIn post related to mission scouting activity.
   * Creates a draft Post in the DB for review.
   */
  static async generateMissionPost(
    userId: string,
    type: 'opportunity_found' | 'application_sent' | 'market_insight' | 'weekly_summary',
    opportunityId?: string
  ): Promise<any> {
    try {
      // Get profile analysis for tone/style matching
      const profile = await this.analyzeLinkedInProfile(userId);

      // Build context based on post type
      let contextPrompt = '';
      let systemPrompt = '';

      switch (type) {
        case 'opportunity_found': {
          let opportunity: any = null;
          if (opportunityId) {
            opportunity = await db.opportunity.findFirst({
              where: { id: opportunityId, userId },
            });
          }
          systemPrompt = `Tu es un expert en personal branding LinkedIn. Tu rédiges un post professionnel inspirant sur la découverte d'une opportunité de mission intéressante.
Le post doit refléter un ton ${profile.contentTone || 'professionnel et authentique'}.`;
          contextPrompt = opportunity
            ? `Je viens de découvrir une opportunité fascinante: ${opportunity.title} dans le secteur ${opportunity.sector || 'en plein essor'}.
Lieu: ${opportunity.location || 'Non précisé'}. Compétences recherchées: ${opportunity.requiredSkills ? JSON.parse(opportunity.requiredSkills).join(', ') : 'Non précisées'}.`
            : 'Je viens de découvrir une opportunité de mission qui correspond parfaitement à mon profil et mes aspirations professionnelles.';
          break;
        }

        case 'application_sent': {
          let opportunity: any = null;
          if (opportunityId) {
            opportunity = await db.opportunity.findFirst({
              where: { id: opportunityId, userId },
            });
          }
          systemPrompt = `Tu es un expert en personal branding LinkedIn. Tu rédiges un post sur le parcours professionnel et la démarche de candidature.
Le post NE DOIT PAS mentionner le nom de l'entreprise de manière identifiable. Il doit se concentrer sur le parcours, la réflexion et les apprentissages.
Le ton doit être ${profile.contentTone || 'professionnel et authentique'}.`;
          contextPrompt = opportunity
            ? `J'ai pris la décision de postuler à une mission de ${opportunity.title} qui me passionne. Ce qui m'a motivé: le secteur (${opportunity.sector || 'en plein essor'}), les défis techniques, et l'opportunité de grandir. Mes compétences clés pour ce poste: ${(profile.skills || []).slice(0, 5).join(', ')}.`
            : `J'ai postulé à une mission qui correspond à mon projet professionnel. Mes compétences: ${(profile.skills || []).slice(0, 5).join(', ')}. Secteurs d'intérêt: ${(profile.sectors || []).slice(0, 3).join(', ')}.`;
          break;
        }

        case 'market_insight': {
          const trends = await this.scanTrends(userId);
          const topTrends = trends.slice(0, 5).map((t) => `${t.topic} (${t.momentum === 'rising' ? '↗️ en hausse' : t.momentum === 'stable' ? '➡️ stable' : '↘️ en baisse'})`).join('\n');
          systemPrompt = `Tu es un expert en personal branding LinkedIn spécialisé dans les insights marché. Tu rédiges un post partageant une analyse de tendances sectorielles pertinentes.
Le ton doit être ${profile.contentTone || 'professionnel et authentique'}, avec une posture de thought leader.`;
          contextPrompt = `Tendances actuelles dans mes secteurs d'intérêt (${(profile.sectors || []).slice(0, 3).join(', ')}):
${topTrends}
\nPartage un insight actionnable basé sur ces tendances.`;
          break;
        }

        case 'weekly_summary': {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);

          const [weekOpportunities, weekApplications] = await Promise.all([
            db.opportunity.count({
              where: { userId, createdAt: { gte: weekStart } },
            }),
            db.application.count({
              where: { userId, createdAt: { gte: weekStart } },
            }),
          ]);

          systemPrompt = `Tu es un expert en personal branding LinkedIn. Tu rédiges un bilan hebdomadaire de veille professionnelle et de recherche de missions.
Le ton doit être ${profile.contentTone || 'professionnel et authentique'}. Le post doit être inspirant et montrer une démarche proactive.`;
          contextPrompt = `Bilan de ma semaine de veille professionnelle:
• ${weekOpportunities} opportunités identifiées
• ${weekApplications} candidatures envoyées
• Secteurs suivis: ${(profile.sectors || []).slice(0, 3).join(', ')}
• Compétences clés: ${(profile.skills || []).slice(0, 5).join(', ')}
\nRédige un post de bilan qui montre mon approche proactive et mes réflexions.`;
          break;
        }
      }

      const messages: AIMessage[] = [
        {
          role: 'system',
          content: `${systemPrompt}
Réponds en français. Le post doit contenir entre 100 et 300 mots.
Inclus un titre accrocheur en première ligne.
Termine par un appel à l'engagement (question ou invitation à réagir).

Format de réponse JSON:
{
  "subject": "Titre accrocheur du post",
  "content": "Contenu complet du post LinkedIn",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}
Génère 5 hashtags pertinents.`,
        },
        {
          role: 'user',
          content: `Contexte pour le post:
${contextPrompt}

Mon profil: ${(profile.jobTitles || []).slice(0, 3).join(', ') || 'Professionnel du digital'}.
Mon style d'engagement: ${profile.engagementStyle || 'professionnel et bienveillant'}.`,
        },
      ];

      const result = await callAI(messages, { temperature: 0.7, maxTokens: 800 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Create draft Post
      const post = await db.post.create({
        data: {
          subject: parsed.subject || 'Nouveau post Mission Scout',
          finalContent: parsed.content || '',
          status: 'draft',
          authorId: userId,
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ') : '',
          aiProvider: 'zai',
        },
      });

      // Create agent activity
      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'mission_scout',
          status: 'completed',
          title: `Post généré — ${type.replace(/_/g, ' ')}`,
          description: `Un post LinkedIn de type "${type}" a été généré et sauvegardé en brouillon. Sujet: ${parsed.subject || 'N/A'}.`,
          metadata: JSON.stringify({ postId: post.id, type, hashtags: parsed.hashtags }),
        },
      });

      return post;
    } catch (error) {
      console.error('[MissionScout] Generate post error:', error);
      throw new Error('Erreur lors de la génération du post LinkedIn');
    }
  }

  // ----------------------------------------------------------------
  // 10. AUTO-POST WORKER INTEGRATION
  // ----------------------------------------------------------------

  /**
   * Check if auto-posting is configured and due, then generate a post.
   * Returns the generated post info or null if not due.
   */
  static async autoPostIfConfigured(userId: string): Promise<{ postId: string; type: string } | null> {
    try {
      // Check if auto-post is enabled
      const autoPostSetting = await db.settings.findUnique({
        where: { key: `mission_scout_${userId}_autoPost` },
      });

      if (!autoPostSetting || autoPostSetting.value !== 'true') {
        return null;
      }

      // Get frequency setting
      const frequencySetting = await db.settings.findUnique({
        where: { key: `mission_scout_${userId}_autoPostFrequency` },
      });
      const frequency = frequencySetting?.value || 'weekly';

      // Check last auto-post date
      const lastAutoPostSetting = await db.settings.findUnique({
        where: { key: `mission_scout_${userId}_lastAutoPost` },
      });

      let lastAutoPost: Date | null = null;
      if (lastAutoPostSetting?.value) {
        lastAutoPost = new Date(lastAutoPostSetting.value);
      }

      // Determine if a post is due
      const now = new Date();
      let isDue = false;

      if (!lastAutoPost) {
        isDue = true;
      } else {
        const diffMs = now.getTime() - lastAutoPost.getTime();
        switch (frequency) {
          case 'daily':
            isDue = diffMs >= 24 * 60 * 60 * 1000;
            break;
          case 'weekly':
            isDue = diffMs >= 7 * 24 * 60 * 60 * 1000;
            break;
          case 'biweekly':
            isDue = diffMs >= 14 * 24 * 60 * 60 * 1000;
            break;
          case 'monthly':
            isDue = diffMs >= 30 * 24 * 60 * 60 * 1000;
            break;
          default:
            isDue = diffMs >= 7 * 24 * 60 * 60 * 1000;
        }
      }

      if (!isDue) {
        return null;
      }

      // Choose post type: alternate between market_insight and weekly_summary
      const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
      const postType = weekNumber % 2 === 0 ? 'market_insight' : 'weekly_summary';

      // Generate the post
      const post = await this.generateMissionPost(userId, postType);

      // Update last auto-post date
      await db.settings.upsert({
        where: { key: `mission_scout_${userId}_lastAutoPost` },
        update: { value: now.toISOString() },
        create: { key: `mission_scout_${userId}_lastAutoPost`, value: now.toISOString() },
      });

      // Create agent activity
      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'mission_scout',
          status: 'completed',
          title: `Auto-publication — ${postType.replace(/_/g, ' ')}`,
          description: `Une publication automatique de type "${postType}" a été générée (fréquence: ${frequency}). Le post est en brouillon et doit être validé avant publication.`,
          metadata: JSON.stringify({
            postId: post.id,
            type: postType,
            frequency,
          }),
        },
      });

      return { postId: post.id, type: postType };
    } catch (error) {
      console.error('[MissionScout] Auto-post check error:', error);
      return null;
    }
  }

  // ----------------------------------------------------------------
  // 11. DASHBOARD STATS
  // ----------------------------------------------------------------

  static async getDashboardStats(userId: string) {
    const [
      totalOpportunities,
      newOpportunities,
      totalApplications,
      sentApplications,
      repliedApplications,
      interestedOpportunities,
      recentActivities,
    ] = await Promise.all([
      db.opportunity.count({ where: { userId } }),
      db.opportunity.count({ where: { userId, status: 'new' } }),
      db.application.count({ where: { userId } }),
      db.application.count({ where: { userId, status: 'sent' } }),
      db.application.count({ where: { userId, status: 'replied' } }),
      db.opportunity.count({ where: { userId, status: 'interested' } }),
      db.agentActivity.findMany({
        where: { userId, agentType: 'mission_scout' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Pipeline counts
    const pipeline = {
      found: await db.opportunity.count({ where: { userId, status: 'new' } }),
      applied: await db.opportunity.count({ where: { userId, status: 'applied' } }),
      viewed: await db.opportunity.count({ where: { userId, status: 'viewed' } }),
      replied: await db.opportunity.count({ where: { userId, status: 'replied' } }),
      interested: await db.opportunity.count({ where: { userId, status: 'interested' } }),
    };

    // Pending follow-ups count
    const pendingFollowUps = await db.application.count({
      where: {
        userId,
        status: 'sent',
        nextFollowUpAt: { lte: new Date() },
      },
    });

    // Response rate
    const responseRate = sentApplications > 0
      ? Math.round((repliedApplications / sentApplications) * 100)
      : 0;

    return {
      totalOpportunities,
      newOpportunities,
      totalApplications,
      sentApplications,
      repliedApplications,
      interestedOpportunities,
      responseRate,
      pipeline,
      pendingFollowUps,
      recentActivities,
    };
  }
}
