import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-providers';
import type { AIMessage } from '@/lib/ai-providers';

// ============================================================
// Types
// ============================================================

export interface NetworkBuilderConfig {
  targetIndustries: string[];
  targetRoles: string[];
  maxConnectionsPerWeek: number;
  autoConnect: boolean;
  connectionMessage: string;
}

export interface DiscoveredTarget {
  targetName: string;
  targetHeadline: string;
  targetCompany: string;
  targetSector: string;
  relevanceScore: number;
  reason: string;
}

export interface ConnectionMessageResult {
  message: string;
  approach: string;
}

const DEFAULT_CONFIG: NetworkBuilderConfig = {
  targetIndustries: [],
  targetRoles: [],
  maxConnectionsPerWeek: 20,
  autoConnect: false,
  connectionMessage: '',
};

// ============================================================
// NetworkBuilderAgent — Core Intelligence
// ============================================================

export class NetworkBuilderAgent {
  /**
   * Get user-specific Network Builder config from Settings table.
   */
  static async getConfig(userId: string): Promise<NetworkBuilderConfig> {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `network_builder_${userId}_`,
          },
        },
      });

      const config = { ...DEFAULT_CONFIG };
      for (const s of settings) {
        const key = s.key.replace(`network_builder_${userId}_`, '');
        switch (key) {
          case 'targetIndustries':
            config.targetIndustries = JSON.parse(s.value || '[]');
            break;
          case 'targetRoles':
            config.targetRoles = JSON.parse(s.value || '[]');
            break;
          case 'maxConnectionsPerWeek':
            config.maxConnectionsPerWeek = parseInt(s.value, 10) || 20;
            break;
          case 'autoConnect':
            config.autoConnect = s.value === 'true';
            break;
          case 'connectionMessage':
            config.connectionMessage = s.value || '';
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save user-specific Network Builder config.
   */
  static async saveConfig(userId: string, config: Partial<NetworkBuilderConfig>): Promise<NetworkBuilderConfig> {
    const entries: { key: string; value: string }[] = [];
    if (config.targetIndustries !== undefined) entries.push({ key: `network_builder_${userId}_targetIndustries`, value: JSON.stringify(config.targetIndustries) });
    if (config.targetRoles !== undefined) entries.push({ key: `network_builder_${userId}_targetRoles`, value: JSON.stringify(config.targetRoles) });
    if (config.maxConnectionsPerWeek !== undefined) entries.push({ key: `network_builder_${userId}_maxConnectionsPerWeek`, value: String(config.maxConnectionsPerWeek) });
    if (config.autoConnect !== undefined) entries.push({ key: `network_builder_${userId}_autoConnect`, value: String(config.autoConnect) });
    if (config.connectionMessage !== undefined) entries.push({ key: `network_builder_${userId}_connectionMessage`, value: config.connectionMessage });

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
  // 1. TARGET DISCOVERY
  // ----------------------------------------------------------------

  /**
   * AI generates 8-15 relevant people to connect with.
   * Creates ConnectionTarget records with status 'identified'.
   * Creates AgentActivity.
   */
  static async discoverTargets(userId: string): Promise<DiscoveredTarget[]> {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const industries = config.targetIndustries.join(', ') || 'Tech, Marketing, Consulting';
    const roles = config.targetRoles.join(', ') || 'CTO, VP Marketing, Head of Sales';

    const existingTargets = await db.connectionTarget.findMany({
      where: { userId },
      select: { targetName: true, targetCompany: true },
      take: 100,
    });
    const existingKeys = new Set(existingTargets.map((t) => `${t.targetName}|${t.targetCompany}`));

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un expert en networking LinkedIn B2B. Tu identifies les personnes les plus pertinentes à connecter pour développer un réseau professionnel stratégique.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: [{"targetName":"Prénom Nom","targetHeadline":"Titre LinkedIn","targetCompany":"Entreprise","targetSector":"Secteur","relevanceScore":85,"reason":"Raison de la connexion"}]
Génère 8-15 profils réalistes et variés. Inclus des décideurs, des influenceurs et des pairs.
Les scores de pertinence sont entre 0 et 100.`,
      },
      {
        role: 'user',
        content: `Trouve les personnes idéales à connecter pour le profil suivant :
- Utilisateur : ${user?.name || 'Professionnel'}
- Industries cibles : ${industries}
- Rôles cibles : ${roles}
${config.connectionMessage ? `- Note additionnelle de l'utilisateur : ${config.connectionMessage}` : ''}

Cherche des profils qui pourraient être des partenaires, clients potentiels, mentors ou collaborateurs.
Inclus une diversité d'entreprises (grandes, startups, agences).
Date : ${new Date().toLocaleDateString('fr-FR')}`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.7, maxTokens: 2000 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const targets = JSON.parse(cleaned) as DiscoveredTarget[];

      if (!Array.isArray(targets)) return [];

      const unique = targets.filter(
        (t) => !existingKeys.has(`${t.targetName}|${t.targetCompany}`)
      );

      for (const target of unique) {
        await db.connectionTarget.create({
          data: {
            userId,
            targetName: target.targetName,
            targetHeadline: target.targetHeadline,
            targetCompany: target.targetCompany,
            targetSector: target.targetSector,
            relevanceScore: target.relevanceScore || 50,
            status: 'identified',
            notes: target.reason,
          },
        });
      }

      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'network_builder',
          status: 'completed',
          title: `${unique.length} nouvelles cibles de connexion identifiées`,
          description: `Découverte de ${unique.length} profils pertinents dans les secteurs : ${industries}. ${unique.length > 0 ? `Score moyen : ${Math.round(unique.reduce((a, b) => a + b.relevanceScore, 0) / unique.length)}/100.` : ''}`,
          metadata: JSON.stringify({
            totalFound: unique.length,
            topScore: unique.length > 0 ? Math.max(...unique.map((t) => t.relevanceScore)) : 0,
            industries,
          }),
        },
      });

      return unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('[NetworkBuilder] Target discovery error:', error);
      return [];
    }
  }

  // ----------------------------------------------------------------
  // 2. CONNECTION MESSAGE GENERATION
  // ----------------------------------------------------------------

  /**
   * AI generates a personalized LinkedIn connection note (max 300 chars).
   * Returns the message.
   */
  static async generateConnectionMessage(
    userId: string,
    targetName: string,
    targetCompany: string,
    targetRole: string
  ): Promise<ConnectionMessageResult> {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const industries = config.targetIndustries.join(', ') || '';
    const roles = config.targetRoles.join(', ') || '';

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu rédiges des messages de connexion LinkedIn personnalisés et engageants.
Le message doit être court (max 300 caractères), chaleureux et donner envie de répondre.
Il ne doit PAS être générique — il doit mentionner la personne et son entreprise spécifiquement.
Évite les formulations trop commerciales ou agressives.
Réponds UNIQUEMENT en JSON valide, sans markdown.
Format: {"message":"message de connexion","approach":"approche utilisée (ex: valorisation expertise, intérêt commun, etc.)"}`,
      },
      {
        role: 'user',
        content: `Rédige un message de connexion LinkedIn pour :
- De la part de : ${user?.name || 'Professionnel'}
- Destinataire : ${targetName}
- Entreprise du destinataire : ${targetCompany}
- Rôle du destinataire : ${targetRole}
${industries ? `- Industries d'intérêt commun : ${industries}` : ''}
${roles ? `- Rôles d'intérêt : ${roles}` : ''}
${config.connectionMessage ? `- Note additionnelle de l'utilisateur : ${config.connectionMessage}` : ''}

Le message doit créer une connexion authentique et ouvrir la possibilité d'un échange professionnel.`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.7, maxTokens: 400 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as ConnectionMessageResult;
      if (parsed.message.length > 300) {
        parsed.message = parsed.message.substring(0, 297) + '...';
      }
      return parsed;
    } catch {
      const firstName = targetName.split(' ')[0] || targetName;
      return {
        message: `Bonjour ${firstName}, votre parcours chez ${targetCompany} en tant que ${targetRole} est particulièrement inspirant. Je serais ravi(e) d'échanger avec vous sur nos secteurs d'activité communs.`,
        approach: 'Valorisation du parcours professionnel',
      };
    }
  }

  // ----------------------------------------------------------------
  // 3. PENDING CONNECTION PROCESSING
  // ----------------------------------------------------------------

  /**
   * Finds targets with status 'identified', generates connection messages,
   * updates status to 'connection_sent'. Respects weekly limit.
   * Creates AgentActivity.
   */
  static async processPendingConnections(userId: string): Promise<{
    processed: number;
    sent: number;
    skipped: number;
    details: any[];
  }> {
    const config = await this.getConfig(userId);
    const result = {
      processed: 0,
      sent: 0,
      skipped: 0,
      details: [] as any[],
    };

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyConnections = await db.connectionTarget.count({
      where: {
        userId,
        status: 'connection_sent',
        connectionDate: { gte: weekStart },
      },
    });

    const remaining = config.maxConnectionsPerWeek - weeklyConnections;
    if (remaining <= 0) {
      return result;
    }

    const pendingTargets = await db.connectionTarget.findMany({
      where: {
        userId,
        status: 'identified',
      },
      orderBy: { relevanceScore: 'desc' },
      take: remaining,
    });

    for (const target of pendingTargets) {
      try {
        const msgResult = await this.generateConnectionMessage(
          userId,
          target.targetName || 'Contact',
          target.targetCompany || 'Entreprise',
          target.targetHeadline || 'Professionnel'
        );

        await db.connectionTarget.update({
          where: { id: target.id },
          data: {
            status: 'connection_sent',
            messageSent: msgResult.message,
            connectionDate: new Date(),
          },
        });

        await db.agentActivity.create({
          data: {
            userId,
            agentType: 'network_builder',
            status: 'completed',
            title: `Connexion envoyée — ${target.targetName}`,
            description: `Demande de connexion envoyée à ${target.targetName} (${target.targetCompany || 'Entreprise'}). Approche : ${msgResult.approach}.`,
            metadata: JSON.stringify({
              targetId: target.id,
              targetName: target.targetName,
              targetCompany: target.targetCompany,
              approach: msgResult.approach,
            }),
          },
        });

        result.processed++;
        result.sent++;
        result.details.push({
          targetId: target.id,
          targetName: target.targetName,
          message: msgResult.message,
          approach: msgResult.approach,
        });
      } catch (error) {
        console.error(`[NetworkBuilder] Error processing target ${target.id}:`, error);
        result.skipped++;
      }
    }

    if (result.sent > 0) {
      await db.notification.create({
        data: {
          userId,
          type: 'system',
          title: `${result.sent} connexion(s) envoyée(s)`,
          message: `${result.sent} demande(s) de connexion ont été envoyée(s) automatiquement. Il vous reste ${remaining - result.sent} connexion(s) disponible(s) cette semaine.`,
          metadata: JSON.stringify({ sent: result.sent, remaining: remaining - result.sent }),
        },
      });
    }

    return result;
  }

  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------

  /**
   * Main cycle: discoverTargets + processPendingConnections.
   * Returns stats.
   */
  static async runWorkerCycle(userId: string): Promise<{
    targetsDiscovered: number;
    connectionsSent: number;
    connectionsProcessed: number;
    weeklyLimitUsed: number;
    weeklyLimitTotal: number;
  }> {
    const config = await this.getConfig(userId);
    const result = {
      targetsDiscovered: 0,
      connectionsSent: 0,
      connectionsProcessed: 0,
      weeklyLimitUsed: 0,
      weeklyLimitTotal: config.maxConnectionsPerWeek,
    };

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyCount = await db.connectionTarget.count({
      where: {
        userId,
        status: 'connection_sent',
        connectionDate: { gte: weekStart },
      },
    });
    result.weeklyLimitUsed = weeklyCount;

    try {
      const targets = await this.discoverTargets(userId);
      result.targetsDiscovered = targets.length;
    } catch (error) {
      console.error(`[NetworkBuilder Worker] Discovery error for user ${userId}:`, error);
    }

    if (config.autoConnect) {
      try {
        const processResult = await this.processPendingConnections(userId);
        result.connectionsSent = processResult.sent;
        result.connectionsProcessed = processResult.processed;
        result.weeklyLimitUsed = weeklyCount + processResult.sent;
      } catch (error) {
        console.error(`[NetworkBuilder Worker] Processing error for user ${userId}:`, error);
      }
    }

    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: 'network_builder' } },
        data: { lastExecutedAt: new Date() },
      });
    } catch {
      // Config may not exist
    }

    return result;
  }

  /**
   * Get dashboard stats for a user.
   * Returns counts by status, weekly connection count, etc.
   */
  static async getDashboardStats(userId: string) {
    const [
      totalTargets,
      identifiedTargets,
      connectedTargets,
      repliedTargets,
      convertedTargets,
      recentActivities,
    ] = await Promise.all([
      db.connectionTarget.count({ where: { userId } }),
      db.connectionTarget.count({ where: { userId, status: 'identified' } }),
      db.connectionTarget.count({ where: { userId, status: 'connected' } }),
      db.connectionTarget.count({ where: { userId, status: 'replied' } }),
      db.connectionTarget.count({ where: { userId, status: 'converted' } }),
      db.agentActivity.findMany({
        where: { userId, agentType: 'network_builder' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklySent = await db.connectionTarget.count({
      where: {
        userId,
        status: 'connection_sent',
        connectionDate: { gte: weekStart },
      },
    });

    const weeklyConnected = await db.connectionTarget.count({
      where: {
        userId,
        status: { in: ['connected', 'replied', 'converted'] },
        connectionDate: { gte: weekStart },
      },
    });

    const totalSent = await db.connectionTarget.count({
      where: { userId, status: { in: ['connection_sent', 'connected', 'replied', 'converted'] } },
    });
    const connected = await db.connectionTarget.count({
      where: { userId, status: { in: ['connected', 'replied', 'converted'] } },
    });
    const connectionRate = totalSent > 0
      ? Math.round((connected / totalSent) * 100)
      : 0;

    const topTargets = await db.connectionTarget.findMany({
      where: { userId },
      orderBy: { relevanceScore: 'desc' },
      take: 5,
      select: {
        targetName: true,
        targetCompany: true,
        targetHeadline: true,
        relevanceScore: true,
        status: true,
      },
    });

    return {
      totalTargets,
      identifiedTargets,
      connectedTargets,
      repliedTargets,
      convertedTargets,
      weeklySent,
      weeklyConnected,
      connectionRate,
      topTargets,
      recentActivities,
    };
  }
}
