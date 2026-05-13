import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-providers';
import type { AIMessage } from '@/lib/ai-providers';

// ============================================================
// Types
// ============================================================

export interface ClientNurtureConfig {
  inactiveDaysThreshold: number;
  touchFrequency: string;
  channels: string[];
  autoSendMessage: boolean;
  maxTouchesPerDay: number;
}

export interface ColdClient {
  prospectId: string;
  name: string;
  company: string | null;
  headline: string | null;
  title: string | null;
  score: number;
  lastContactedAt: string;
  daysInactive: number;
  tags: string[];
}

export interface TouchpointMessage {
  prospectId: string;
  prospectName: string;
  message: string;
  channel: string;
  approach: string;
}

export interface NurtureResult {
  processed: number;
  contacted: number;
  skipped: number;
  details: any[];
}

const DEFAULT_CONFIG: ClientNurtureConfig = {
  inactiveDaysThreshold: 30,
  touchFrequency: 'weekly',
  channels: ['linkedin'],
  autoSendMessage: false,
  maxTouchesPerDay: 10,
};

// ============================================================
// ClientNurtureAgent — Core Intelligence
// ============================================================

export class ClientNurtureAgent {
  /**
   * Get user-specific Client Nurture config from Settings table.
   */
  static async getConfig(userId: string): Promise<ClientNurtureConfig> {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `client_nurture_${userId}_`,
          },
        },
      });

      const config = { ...DEFAULT_CONFIG };
      for (const s of settings) {
        const key = s.key.replace(`client_nurture_${userId}_`, '');
        switch (key) {
          case 'inactiveDaysThreshold':
            config.inactiveDaysThreshold = parseInt(s.value, 10) || 30;
            break;
          case 'touchFrequency':
            config.touchFrequency = s.value || 'weekly';
            break;
          case 'channels':
            config.channels = JSON.parse(s.value || '["linkedin"]');
            break;
          case 'autoSendMessage':
            config.autoSendMessage = s.value === 'true';
            break;
          case 'maxTouchesPerDay':
            config.maxTouchesPerDay = parseInt(s.value, 10) || 10;
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save user-specific Client Nurture config.
   */
  static async saveConfig(userId: string, config: Partial<ClientNurtureConfig>): Promise<ClientNurtureConfig> {
    const entries: { key: string; value: string }[] = [];
    if (config.inactiveDaysThreshold !== undefined) entries.push({ key: `client_nurture_${userId}_inactiveDaysThreshold`, value: String(config.inactiveDaysThreshold) });
    if (config.touchFrequency !== undefined) entries.push({ key: `client_nurture_${userId}_touchFrequency`, value: config.touchFrequency });
    if (config.channels !== undefined) entries.push({ key: `client_nurture_${userId}_channels`, value: JSON.stringify(config.channels) });
    if (config.autoSendMessage !== undefined) entries.push({ key: `client_nurture_${userId}_autoSendMessage`, value: String(config.autoSendMessage) });
    if (config.maxTouchesPerDay !== undefined) entries.push({ key: `client_nurture_${userId}_maxTouchesPerDay`, value: String(config.maxTouchesPerDay) });

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
  // 1. IDENTIFY COLD CLIENTS
  // ----------------------------------------------------------------

  /**
   * Finds prospects with lastContactedAt > inactiveDaysThreshold ago
   * and status not 'converted'/'not_interested'.
   * Returns them sorted by score descending.
   */
  static async identifyColdClients(userId: string): Promise<ColdClient[]> {
    const config = await this.getConfig(userId);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - config.inactiveDaysThreshold);

    const prospects = await db.prospect.findMany({
      where: {
        userId,
        status: { notIn: ['converted', 'not_interested', 'closed_won', 'closed_lost', 'archived'] },
        lastContactedAt: { lte: thresholdDate },
        isActive: true,
      },
      orderBy: { score: 'desc' },
      take: 30,
    });

    if (prospects.length === 0) {
      return [];
    }

    const now = new Date();

    const coldClients: ColdClient[] = prospects.map((p) => {
      const lastContacted = p.lastContactedAt || p.createdAt;
      const diffMs = now.getTime() - lastContacted.getTime();
      const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return {
        prospectId: p.id,
        name: p.fullName || 'Sans nom',
        company: p.company || null,
        headline: p.headline || null,
        title: p.title || null,
        score: p.score || 0,
        lastContactedAt: lastContacted.toISOString(),
        daysInactive,
        tags: p.tags ? JSON.parse(p.tags) : [],
      };
    });

    coldClients.sort((a, b) => b.score - a.score);

    if (coldClients.length > 0) {
      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'client_nurture',
          status: 'completed',
          title: `${coldClients.length} clients froids identifiés`,
          description: `${coldClients.length} prospects inactifs depuis plus de ${config.inactiveDaysThreshold} jours. Score moyen : ${Math.round(coldClients.reduce((a, b) => a + b.score, 0) / coldClients.length)}/100.`,
          metadata: JSON.stringify({
            count: coldClients.length,
            thresholdDays: config.inactiveDaysThreshold,
            avgScore: Math.round(coldClients.reduce((a, b) => a + b.score, 0) / coldClients.length),
            topScore: coldClients[0]?.score || 0,
          }),
        },
      });
    }

    return coldClients;
  }

  // ----------------------------------------------------------------
  // 2. TOUCHPOINT MESSAGE GENERATION
  // ----------------------------------------------------------------

  /**
   * Gets prospect info, uses AI to generate a personalized re-engagement message.
   * Returns the message.
   */
  static async generateTouchpointMessage(
    userId: string,
    prospectId: string
  ): Promise<TouchpointMessage> {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const prospect = await db.prospect.findUnique({
      where: { id: prospectId, userId },
    });

    if (!prospect) {
      throw new Error('Prospect introuvable');
    }

    const lastMessages = await db.outreachMessage.findMany({
      where: { prospectId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { content: true, channel: true, sentAt: true },
    });

    const channel = config.channels[0] || 'linkedin';
    const lastMessageContext = lastMessages.length > 0
      ? `Dernier message envoyé (${lastMessages[0].channel}, ${lastMessages[0].sentAt?.toLocaleDateString('fr-FR') || 'date inconnue'}): "${lastMessages[0].content.substring(0, 200)}"`
      : 'Aucun message précédent envoyé';

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un expert en relance client B2B LinkedIn. Tu génères des messages de réactivation personnalisés, chaleureux et non intrusifs.
Le message doit être court (max 300 mots), professionnel et donner envie de répondre.
Réponds UNIQUEMENT en JSON valide, sans markdown.
Format: {"message":"message de réactivation","channel":"linkedin|email","approach":"approche utilisée (ex: actualité sectorielle, offre valeur, curiosité, etc.)"}`,
      },
      {
        role: 'user',
        content: `Génère un message de réactivation personnalisé pour :
- De la part de : ${user?.name || 'Professionnel'}
- Prospect : ${prospect.fullName}
${prospect.company ? `- Entreprise : ${prospect.company}` : ''}
${prospect.title ? `- Titre : ${prospect.title}` : ''}
${prospect.headline ? `- Headline LinkedIn : ${prospect.headline}` : ''}
${prospect.tags ? `- Tags : ${prospect.tags}` : ''}
- Canal préféré : ${channel}
- ${lastMessageContext}
- Fréquence de contact : ${config.touchFrequency}

Le message doit créer une connexion authentique et ouvrir la possibilité d'un échange professionnel sans être commercial.`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.7, maxTokens: 500 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as {
        message: string;
        channel: string;
        approach: string;
      };

      return {
        prospectId,
        prospectName: prospect.fullName,
        message: parsed.message,
        channel: parsed.channel || channel,
        approach: parsed.approach || 'Valorisation du parcours',
      };
    } catch {
      const firstName = (prospect.fullName || '').split(' ')[0] || prospect.fullName;
      return {
        prospectId,
        prospectName: prospect.fullName,
        message: `Bonjour ${firstName}, cela fait un moment que nous n'avons pas échangé${prospect.company ? ` depuis notre échange à propos de ${prospect.company}` : ''}. Je voulais prendre de vos nouvelles et voir si nos solutions pourraient vous être utiles dans votre parcours actuel.`,
        channel,
        approach: 'Relance chaleureuse',
      };
    }
  }

  // ----------------------------------------------------------------
  // 3. NURTURE QUEUE PROCESSING
  // ----------------------------------------------------------------

  /**
   * Identifies cold clients, generates touchpoint messages for each
   * (respecting maxTouchesPerDay), creates OutreachMessage records,
   * updates prospect's lastContactedAt and nextFollowUpAt.
   * Creates AgentActivity + Notifications.
   */
  static async processNurtureQueue(userId: string): Promise<NurtureResult> {
    const config = await this.getConfig(userId);
    const result: NurtureResult = { processed: 0, contacted: 0, skipped: 0, details: [] };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTouches = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: 'outbound',
        createdAt: { gte: todayStart },
      },
    });

    const remaining = config.maxTouchesPerDay - todayTouches;
    if (remaining <= 0) {
      return { ...result, details: [{ message: 'Limite quotidienne de touches atteinte' }] };
    }

    const coldClients = await this.identifyColdClients(userId);
    if (coldClients.length === 0) {
      return result;
    }

    const toProcess = coldClients.slice(0, remaining);

    for (const client of toProcess) {
      try {
        const touchpoint = await this.generateTouchpointMessage(userId, client.prospectId);

        const outreachMessage = await db.outreachMessage.create({
          data: {
            prospectId: client.prospectId,
            channel: touchpoint.channel,
            direction: 'outbound',
            subject: `Relance — ${client.name}`,
            content: touchpoint.message,
            status: 'sent',
            sentAt: new Date(),
          },
        });

        let nextFollowUpAt: Date | undefined;
        switch (config.touchFrequency) {
          case 'daily':
            nextFollowUpAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
            break;
          case 'biweekly':
            nextFollowUpAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            nextFollowUpAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            break;
          case 'weekly':
          default:
            nextFollowUpAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            break;
        }

        await db.prospect.update({
          where: { id: client.prospectId },
          data: {
            lastContactedAt: new Date(),
            nextFollowUpAt,
          },
        });

        await db.agentActivity.create({
          data: {
            userId,
            agentType: 'client_nurture',
            status: 'completed',
            title: `Relance envoyée — ${client.name}`,
            description: `Message de réactivation envoyé à ${client.name}${client.company ? ` (${client.company})` : ''} via ${touchpoint.channel}. Approche : ${touchpoint.approach}.`,
            metadata: JSON.stringify({
              prospectId: client.prospectId,
              outreachMessageId: outreachMessage.id,
              prospectName: client.name,
              prospectCompany: client.company,
              channel: touchpoint.channel,
              approach: touchpoint.approach,
              score: client.score,
            }),
          },
        });

        result.processed++;
        result.contacted++;
        result.details.push({
          prospectId: client.prospectId,
          name: client.name,
          company: client.company,
          channel: touchpoint.channel,
          approach: touchpoint.approach,
          score: client.score,
          status: 'contacted',
        });
      } catch (error) {
        console.error(`[ClientNurture] Process error for prospect ${client.prospectId}:`, error);
        result.skipped++;
        result.details.push({
          prospectId: client.prospectId,
          name: client.name,
          status: 'error',
        });
      }
    }

    if (result.contacted > 0) {
      await db.notification.create({
        data: {
          userId,
          type: 'system',
          title: `${result.contacted} relance(s) client(s) envoyée(s)`,
          message: `${result.contacted} message(s) de réactivation ont été envoyés automatiquement à des prospects inactifs. ${remaining - result.contacted > 0 ? `Il reste ${remaining - result.contacted} touches disponibles aujourd'hui.` : 'Limite quotidienne atteinte.'}`,
          metadata: JSON.stringify({
            contacted: result.contacted,
            remaining: remaining - result.contacted,
          }),
        },
      });
    }

    return result;
  }

  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------

  /**
   * Main cycle: identifyColdClients + processNurtureQueue.
   * Returns stats.
   */
  static async runWorkerCycle(userId: string): Promise<{
    coldClientsIdentified: number;
    messagesSent: number;
    messagesSkipped: number;
    dailyLimitUsed: number;
    dailyLimitTotal: number;
  }> {
    const config = await this.getConfig(userId);
    const result = {
      coldClientsIdentified: 0,
      messagesSent: 0,
      messagesSkipped: 0,
      dailyLimitUsed: 0,
      dailyLimitTotal: config.maxTouchesPerDay,
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTouches = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: 'outbound',
        createdAt: { gte: todayStart },
      },
    });
    result.dailyLimitUsed = todayTouches;

    try {
      const coldClients = await this.identifyColdClients(userId);
      result.coldClientsIdentified = coldClients.length;
    } catch (error) {
      console.error(`[ClientNurture Worker] Identify error for user ${userId}:`, error);
    }

    if (config.autoSendMessage) {
      try {
        const nurtureResult = await this.processNurtureQueue(userId);
        result.messagesSent = nurtureResult.contacted;
        result.messagesSkipped = nurtureResult.skipped;
        result.dailyLimitUsed = todayTouches + nurtureResult.contacted;
      } catch (error) {
        console.error(`[ClientNurture Worker] Nurture error for user ${userId}:`, error);
      }
    }

    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: 'client_nurture' } },
        data: { lastExecutedAt: new Date() },
      });
    } catch {
      // Config may not exist
    }

    return result;
  }

  /**
   * Get dashboard stats for a user.
   * Returns cold client count, messages sent this week, response rate, etc.
   */
  static async getDashboardStats(userId: string) {
    const config = await this.getConfig(userId);

    const [
      totalProspects,
      activeProspects,
      convertedProspects,
      recentActivities,
    ] = await Promise.all([
      db.prospect.count({ where: { userId } }),
      db.prospect.count({ where: { userId, isActive: true } }),
      db.prospect.count({ where: { userId, status: 'converted' } }),
      db.agentActivity.findMany({
        where: { userId, agentType: 'client_nurture' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - config.inactiveDaysThreshold);

    const coldClients = await db.prospect.count({
      where: {
        userId,
        status: { notIn: ['converted', 'not_interested', 'closed_won', 'closed_lost', 'archived'] },
        lastContactedAt: { lte: thresholdDate },
        isActive: true,
      },
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const messagesSentThisWeek = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: 'outbound',
        createdAt: { gte: weekStart },
      },
    });

    const repliesThisWeek = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: 'inbound',
        createdAt: { gte: weekStart },
      },
    });

    const responseRate = messagesSentThisWeek > 0
      ? Math.round((repliesThisWeek / messagesSentThisWeek) * 100)
      : 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const touchesToday = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: 'outbound',
        createdAt: { gte: todayStart },
      },
    });

    const topColdClients = await db.prospect.findMany({
      where: {
        userId,
        status: { notIn: ['converted', 'not_interested', 'closed_won', 'closed_lost', 'archived'] },
        lastContactedAt: { lte: thresholdDate },
        isActive: true,
      },
      orderBy: { score: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        company: true,
        title: true,
        score: true,
        lastContactedAt: true,
      },
    });

    const monthlyStats = await db.outreachMessage.groupBy({
      by: ['channel'],
      where: {
        prospect: { userId },
        direction: 'outbound',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _count: { id: true },
    });

    return {
      totalProspects,
      activeProspects,
      coldClients,
      convertedProspects,
      messagesSentThisWeek,
      repliesThisWeek,
      responseRate,
      touchesToday,
      dailyLimit: config.maxTouchesPerDay,
      dailyRemaining: Math.max(0, config.maxTouchesPerDay - touchesToday),
      topColdClients,
      monthlyStatsByChannel: monthlyStats.map((s) => ({
        channel: s.channel,
        count: s._count.id,
      })),
      recentActivities,
    };
  }
}
