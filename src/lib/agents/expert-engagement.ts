import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-providers';
import type { AIMessage } from '@/lib/ai-providers';
import { postComment } from '@/lib/linkedin-comments';

// ============================================================
// Types
// ============================================================

export interface ExpertEngagementConfig {
  enabledDomains: string[];
  customKeywords: string[];
  commentStyle: 'concis' | 'détaillé' | 'question' | 'expert_opinion';
  maxCommentsPerDay: number;
  autoPost: boolean;
  tone: 'professionnel' | 'décontracté' | 'technique' | 'thought_leader';
  languages: ('fr' | 'en')[];
}

export interface DataDomain {
  id: string;
  label: string;
  keywords: string[];
  icon: string;
  color: string;
  description: string;
}

export interface GeneratedComment {
  comment: string;
  domain: string;
  domainLabel?: string;
}

export interface DomainStats {
  domain: string;
  domainLabel: string;
  totalComments: number;
  totalLikes: number;
  totalReplies: number;
}

// ============================================================
// Data Domains Configuration
// ============================================================

export const DATA_DOMAINS: DataDomain[] = [
  {
    id: 'data_engineering',
    label: 'Data Engineering',
    keywords: ['data engineering', 'ingestion données', 'pipeline', 'ETL', 'ELT', 'data pipeline', 'dbt', 'Snowflake', 'Databricks', 'data lakehouse', 'Airflow', 'data orchestration'],
    icon: 'Database',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    description: 'Pipelines de données, ingestion, transformation et orchestration de flux data.',
  },
  {
    id: 'data_architecture',
    label: 'Data Architecture',
    keywords: ['data architecture', 'architecture de données', 'data mesh', 'data fabric', 'data modeling', 'modélisation', 'data governance', 'data quality', 'Master Data', 'data vault', 'lakehouse'],
    icon: 'Boxes',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    description: 'Conception de systèmes de données, gouvernance, modélisation et qualité.',
  },
  {
    id: 'data_science',
    label: 'Data Science & Analytics',
    keywords: ['data science', 'data analyst', 'machine learning', 'analyse de données', 'business intelligence', 'dashboard', 'Python', 'pandas', 'statistiques', 'feature engineering'],
    icon: 'BarChart3',
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
    description: 'Machine learning, analyse prédictive, business intelligence et visualisation.',
  },
  {
    id: 'ai_ml',
    label: 'Intelligence Artificielle & ML',
    keywords: ['intelligence artificielle', 'IA', 'AI', 'deep learning', 'neural network', 'NLP', 'computer vision', 'MLOps', 'LLM', 'GPT', 'modèle de langage', 'RAG', 'embedding', 'fine-tuning'],
    icon: 'Brain',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400',
    description: 'Deep learning, NLP, vision par ordinateur, MLOps et modèles de langage.',
  },
  {
    id: 'ai_agents',
    label: 'Agents IA & Autonomie',
    keywords: ['agent IA', 'AI agent', 'autonomous agent', 'multi-agent', 'LangChain', 'CrewAI', 'AutoGPT', 'agent workflow', 'AI assistant', 'agent intelligent', 'orchestration agent'],
    icon: 'Zap',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    description: 'Agents autonomes, multi-agents, workflows IA et assistants intelligents.',
  },
  {
    id: 'cloud',
    label: 'Cloud Computing',
    keywords: ['cloud', 'AWS', 'Azure', 'GCP', 'serverless', 'Lambda', 'Kubernetes', 'Docker', 'container', 'infrastructure as code', 'Terraform', 'microservices'],
    icon: 'Cloud',
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400',
    description: 'Cloud providers, conteneurisation, infrastructure as code et microservices.',
  },
  {
    id: 'devops',
    label: 'DevOps & SRE',
    keywords: ['DevOps', 'SRE', 'CI/CD', 'GitOps', 'observabilité', 'monitoring', 'Prometheus', 'Grafana', 'logging', 'incident management', 'site reliability'],
    icon: 'Server',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
    description: 'CI/CD, observabilité, fiabilité des sites et gestion d\'incidents.',
  },
  {
    id: 'cybersecurity',
    label: 'Cybersécurité',
    keywords: ['cybersécurité', 'sécurité', 'RGPD', 'GDPR', 'zero trust', 'encryption', 'IAM', 'SOC', 'penetration testing', 'vulnerability', 'firewall'],
    icon: 'Shield',
    color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
    description: 'Sécurité informatique, RGPD, zero trust, tests de pénétration et audit.',
  },
  {
    id: 'saas',
    label: 'SaaS & Produit',
    keywords: ['SaaS', 'product-led', 'PLG', 'pricing strategy', 'customer success', 'churn', 'onboarding', 'activation', 'go-to-market', 'product market fit'],
    icon: 'AppWindow',
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400',
    description: 'Product-led growth, stratégie de pricing, go-to-market et customer success.',
  },
  {
    id: 'software_arch',
    label: 'Architecture Logicielle',
    keywords: ['architecture logicielle', 'system design', 'API', 'REST', 'GraphQL', 'event-driven', 'scalable', 'high availability', 'design patterns', 'clean architecture'],
    icon: 'Settings2',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    description: 'Design patterns, API, architecture événementielle et haute disponibilité.',
  },
];

const DEFAULT_CONFIG: ExpertEngagementConfig = {
  enabledDomains: ['data_engineering', 'ai_ml', 'cloud'],
  customKeywords: [],
  commentStyle: 'détaillé',
  maxCommentsPerDay: 5,
  autoPost: false,
  tone: 'professionnel',
  languages: ['fr', 'en'],
};

const TONE_DESCRIPTIONS: Record<string, string> = {
  professionnel: 'Professionnel et structuré, adapté au milieu B2B',
  décontracté: 'Décontracté et accessible, style conversationnel',
  technique: 'Technique et pointu, avec du jargon métier approprié',
  thought_leader: 'Thought leader, visionnaire et inspirant, avec des perspectives uniques',
};

const STYLE_INSTRUCTIONS: Record<string, string> = {
  concis: 'Rédige un commentaire concis de 1 à 3 phrases. Va droit au but.',
  détaillé: 'Rédige un commentaire détaillé de 3 à 8 sentences. Développe ton argumentation avec des exemples concrets.',
  question: 'Rédige un commentaire pertinent de 2 à 5 phrases qui se termine par une question ouverte pour encourager la discussion.',
  expert_opinion: 'Rédige un commentaire de type "avis d\'expert" de 3 à 6 sentences. Exprime une opinion tranchée mais nuancée, appuyée par ton expérience.',
};

// ============================================================
// ExpertEngagementAgent — Core Intelligence
// ============================================================

export class ExpertEngagementAgent {
  /**
   * Get user-specific Expert Engagement config from Settings table.
   */
  static async getConfig(userId: string): Promise<ExpertEngagementConfig> {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `expert_engagement_${userId}_`,
          },
        },
      });

      const config = { ...DEFAULT_CONFIG };
      for (const s of settings) {
        const key = s.key.replace(`expert_engagement_${userId}_`, '');
        switch (key) {
          case 'enabledDomains':
            config.enabledDomains = JSON.parse(s.value || '[]');
            break;
          case 'customKeywords':
            config.customKeywords = JSON.parse(s.value || '[]');
            break;
          case 'commentStyle':
            config.commentStyle = (s.value || 'détaillé') as ExpertEngagementConfig['commentStyle'];
            break;
          case 'maxCommentsPerDay':
            config.maxCommentsPerDay = parseInt(s.value, 10) || 5;
            break;
          case 'autoPost':
            config.autoPost = s.value === 'true';
            break;
          case 'tone':
            config.tone = (s.value || 'professionnel') as ExpertEngagementConfig['tone'];
            break;
          case 'languages':
            config.languages = JSON.parse(s.value || '["fr","en"]');
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save user-specific Expert Engagement config.
   */
  static async saveConfig(userId: string, config: Partial<ExpertEngagementConfig>): Promise<ExpertEngagementConfig> {
    const entries: { key: string; value: string }[] = [];
    if (config.enabledDomains !== undefined) entries.push({ key: `expert_engagement_${userId}_enabledDomains`, value: JSON.stringify(config.enabledDomains) });
    if (config.customKeywords !== undefined) entries.push({ key: `expert_engagement_${userId}_customKeywords`, value: JSON.stringify(config.customKeywords) });
    if (config.commentStyle !== undefined) entries.push({ key: `expert_engagement_${userId}_commentStyle`, value: config.commentStyle });
    if (config.maxCommentsPerDay !== undefined) entries.push({ key: `expert_engagement_${userId}_maxCommentsPerDay`, value: String(config.maxCommentsPerDay) });
    if (config.autoPost !== undefined) entries.push({ key: `expert_engagement_${userId}_autoPost`, value: String(config.autoPost) });
    if (config.tone !== undefined) entries.push({ key: `expert_engagement_${userId}_tone`, value: config.tone });
    if (config.languages !== undefined) entries.push({ key: `expert_engagement_${userId}_languages`, value: JSON.stringify(config.languages) });

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
  // 1. DOMAIN DETECTION
  // ----------------------------------------------------------------

  /**
   * Auto-detect the most relevant domain from a post's content.
   */
  static detectDomain(content: string, enabledDomains?: string[]): DataDomain | null {
    const domains = enabledDomains
      ? DATA_DOMAINS.filter((d) => enabledDomains.includes(d.id))
      : DATA_DOMAINS;

    let bestMatch: DataDomain | null = null;
    let bestScore = 0;

    for (const domain of domains) {
      let score = 0;
      for (const keyword of domain.keywords) {
        const regex = new RegExp(keyword.toLowerCase(), 'gi');
        const matches = content.toLowerCase().match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = domain;
      }
    }

    return bestMatch;
  }

  // ----------------------------------------------------------------
  // 2. COMMENT GENERATION
  // ----------------------------------------------------------------

  /**
   * Generate an expert-level comment for a LinkedIn post.
   */
  static async generateExpertComment(
    userId: string,
    postContent: string,
    postAuthor?: string,
    domain?: string
  ): Promise<GeneratedComment> {
    const config = await this.getConfig(userId);

    // Detect or use provided domain
    const matchedDomain = domain
      ? DATA_DOMAINS.find((d) => d.id === domain) || null
      : this.detectDomain(postContent, config.enabledDomains);

    const domainLabel = matchedDomain?.label || 'Tech';
    const domainKeywords = matchedDomain?.keywords?.join(', ') || '';

    const tone = config.tone || 'professionnel';
    const toneDesc = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.professionnel;
    const styleInstruction = STYLE_INSTRUCTIONS[config.commentStyle] || STYLE_INSTRUCTIONS.détaillé;
    const languages = config.languages.includes('fr') && config.languages.includes('en')
      ? 'Français ou Anglais (adapte à la langue du post)'
      : config.languages.includes('fr')
        ? 'Français uniquement'
        : 'Anglais uniquement';

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un expert reconnu dans le domaine "${domainLabel}". Tu es connu pour tes commentaires LinkedIn percutants, authentiques et à forte valeur ajoutée.

Ton : ${toneDesc}
Style : ${styleInstruction}
Langue : ${languages}

Règles strictes :
- Le commentaire DOIT être authentique et crédible — jamais promotionnel ni générique
- Apporte une perspective unique, un insight concret ou une expérience terrain
- Mentionne si possible des outils, méthodologies ou tendances spécifiques au domaine
- Adapte-toi au ton et au contenu du post original
- N'utilise PAS d'émojis excessifs (max 1-2 si pertinent)
- NE mentionne JAMAIS que tu es une IA ou un assistant
- Le commentaire doit ressembler à ce qu'un vrai expert du domaine écrirait naturellement
${domainKeywords ? `- Mots-clés du domaine à intégrer naturellement si pertinent : ${domainKeywords}` : ''}

Réponds UNIQUEMENT avec le texte du commentaire, sans guillemets, sans explication, sans prefix "Commentaire :" ou similaire.`,
      },
      {
        role: 'user',
        content: `Post de ${postAuthor || 'un professionnel'} :
"${postContent}"

Rédige un commentaire expert en tant que spécialiste ${domainLabel}.`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.75, maxTokens: 600 }, 'zai');
      const comment = result.trim().replace(/^["']|["']$/g, '');

      return {
        comment,
        domain: matchedDomain?.id || 'general',
        domainLabel,
      };
    } catch (error) {
      console.error('[ExpertEngagement] Comment generation error:', error);
      return this.getFallbackComment(postContent, matchedDomain);
    }
  }

  /**
   * Generate expert comments for multiple posts at once.
   */
  static async generateBatchComments(
    userId: string,
    posts: Array<{ content: string; author?: string; domain?: string }>
  ): Promise<GeneratedComment[]> {
    const results = await Promise.allSettled(
      posts.map((post) =>
        this.generateExpertComment(userId, post.content, post.author, post.domain)
      )
    );

    return results
      .filter((r): r is PromiseFulfilledResult<GeneratedComment> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  /**
   * Fallback comment when AI fails.
   */
  private static getFallbackComment(postContent: string, domain: DataDomain | null): GeneratedComment {
    const domainLabel = domain?.label || 'Tech';
    const fallbacks: Record<string, string> = {
      data_engineering: 'Excellent point sur l\'importance des pipelines de données robustes. Dans mon expérience, la clé réside dans l\'orchestration et la monitoring des flux. dbt + Airflow reste une combinaison redoutable pour garantir la fiabilité des données.',
      data_architecture: 'La data governance est souvent sous-estimée mais c\'elle qui fait la différence entre un projet data réussi et un data swamp. La question clé : comment trouver le bon équilibre entre flexibilité et contrôle ?',
      data_science: 'Les insights les plus précieux viennent souvent de la croisement de sources de données hétérogènes. L\'important n\'est pas la complexité du modèle mais sa capacité à guider l\'action business.',
      ai_ml: 'Le rythme d\'innovation en IA est impressionnant. Ce qui reste crucial c\'est la capacité à passer du POC à la production. Combien de modèles prometteurs n\'atteignent jamais la phase de déploiement ?',
      ai_agents: 'L\'évolution vers les agents autonomes est fascinante. La clé selon moi sera l\'orchestration fiable de chaînes d\'agents spécialisés. On en est encore aux débuts mais le potentiel est énorme.',
      cloud: 'Le cloud n\'est plus un avantage compétitif, c\'est une nécessité. La vraie question aujourd\'hui est l\'optimisation des coûts et le multicloud. Kubernetes a changé la donne mais la complexité reste un défi.',
      devops: 'La culture DevOps est aussi importante que les outils. Les meilleures équipes que j\'ai vues investissent autant dans l\'automatisation que dans la formation et la collaboration inter-équipes.',
      cybersecurity: 'La sécurité ne peut plus être un afterthought. Avec l\'augmentation des cyberattaques, le zero trust et la sécurité "shift-left" sont devenus des impératifs, pas des options.',
      saas: 'Le product-led growth change fondamentalement l\'approche go-to-market. Mais attention : un bon produit ne compense pas une mauvaise expérience d\'onboarding. L\'activation reste le moment critique.',
      software_arch: 'Les architecture event-driven gagnent du terrain et pour cause : elles offrent une scalabilité naturelle et un découplage fort. Le défi principal reste la gestion de la complexité et l\'observabilité.',
    };

    return {
      comment: fallbacks[domain?.id || ''] || `Très intéressant comme perspective sur ce sujet. La complexité croissante des systèmes techniques nous pousse à repenser nos approches. Merci pour ce partage qui alimente la réflexion.`,
      domain: domain?.id || 'general',
      domainLabel,
    };
  }

  // ----------------------------------------------------------------
  // 3. POST COMMENT TO LINKEDIN
  // ----------------------------------------------------------------

  /**
   * Post an expert comment to LinkedIn and record the activity.
   */
  static async postExpertComment(
    userId: string,
    postUrn: string,
    commentText: string,
    domain: string
  ): Promise<{ success: boolean; postedToLinkedIn: boolean; error?: string }> {
    // Get user's LinkedIn account
    const linkedinAccount = await db.linkedInAccount.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!linkedinAccount) {
      return { success: false, postedToLinkedIn: false, error: 'Aucun compte LinkedIn connecté' };
    }

    if (!linkedinAccount.personId) {
      return { success: false, postedToLinkedIn: false, error: 'Person ID LinkedIn non configuré' };
    }

    // Post the comment via LinkedIn API
    const linkedinResult = await postComment(
      linkedinAccount.accessToken,
      postUrn,
      linkedinAccount.personId,
      commentText
    );

    if (!linkedinResult.success) {
      // Save as failed activity even if LinkedIn posting fails
      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'expert_engagement',
          status: 'failed',
          title: `Commentaire non publié — ${domain}`,
          description: `Tentative de commentaire échouée sur le post ${postUrn}. Erreur : ${linkedinResult.error || 'Inconnue'}`,
          metadata: JSON.stringify({
            postUrn,
            commentText,
            domain,
            error: linkedinResult.error,
          }),
        },
      });

      return { success: false, postedToLinkedIn: false, error: linkedinResult.error };
    }

    // Save the activity
    const domainData = DATA_DOMAINS.find((d) => d.id === domain);
    await db.agentActivity.create({
      data: {
        userId,
        agentType: 'expert_engagement',
        status: 'completed',
        title: `Commentaire publié — ${domainData?.label || domain}`,
        description: `Commentaire expert publié sur le post ${postUrn}. Domaine : ${domainData?.label || domain}.`,
        result: commentText,
        metadata: JSON.stringify({
          postUrn,
          commentText,
          domain,
          domainLabel: domainData?.label || domain,
          linkedinCommentId: linkedinResult.commentId,
        }),
      },
    });

    // Update lastExecutedAt on agent config
    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: 'expert_engagement' } },
        data: { lastExecutedAt: new Date() },
      });
    } catch {
      // Config may not exist
    }

    return { success: true, postedToLinkedIn: true };
  }

  // ----------------------------------------------------------------
  // 4. HISTORY & STATS
  // ----------------------------------------------------------------

  /**
   * Get comment history for a user.
   */
  static async getCommentHistory(userId: string, limit = 20) {
    const activities = await db.agentActivity.findMany({
      where: {
        userId,
        agentType: 'expert_engagement',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const totalComments = await db.agentActivity.count({
      where: {
        userId,
        agentType: 'expert_engagement',
        status: 'completed',
      },
    });

    return { activities, totalComments };
  }

  /**
   * Get statistics per domain for a user.
   */
  static async getDomainStats(userId: string): Promise<DomainStats[]> {
    const activities = await db.agentActivity.findMany({
      where: {
        userId,
        agentType: 'expert_engagement',
        status: 'completed',
      },
      select: { metadata: true },
    });

    const statsMap: Record<string, { totalComments: number; totalLikes: number; totalReplies: number }> = {};

    for (const activity of activities) {
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(activity.metadata || '{}');
      } catch {
        // ignore
      }

      const domainId = (meta.domain as string) || 'general';
      if (!statsMap[domainId]) {
        statsMap[domainId] = { totalComments: 0, totalLikes: 0, totalReplies: 0 };
      }
      statsMap[domainId].totalComments += 1;
      statsMap[domainId].totalLikes += (meta.likes as number) || 0;
      statsMap[domainId].totalReplies += (meta.replies as number) || 0;
    }

    return Object.entries(statsMap).map(([domainId, stats]) => {
      const domainData = DATA_DOMAINS.find((d) => d.id === domainId);
      return {
        domain: domainId,
        domainLabel: domainData?.label || domainId,
        ...stats,
      };
    }).sort((a, b) => b.totalComments - a.totalComments);
  }

  // ----------------------------------------------------------------
  // 5. WORKER CYCLE
  // ----------------------------------------------------------------

  /**
   * Main worker cycle for automated engagement.
   * Checks for unprocessed activities and generates comments if autoPost enabled.
   */
  static async runWorkerCycle(userId: string): Promise<{
    commentsGenerated: number;
    commentsPosted: number;
  }> {
    const config = await this.getConfig(userId);
    const result = {
      commentsGenerated: 0,
      commentsPosted: 0,
    };

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayComments = await db.agentActivity.count({
      where: {
        userId,
        agentType: 'expert_engagement',
        status: 'completed',
        createdAt: { gte: today },
      },
    });

    if (todayComments >= config.maxCommentsPerDay) {
      console.log(`[ExpertEngagement Worker] Daily limit reached for user ${userId}: ${todayComments}/${config.maxCommentsPerDay}`);
      return result;
    }

    // Update lastExecutedAt on agent config
    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: 'expert_engagement' } },
        data: { lastExecutedAt: new Date() },
      });
    } catch {
      // Config may not exist
    }

    return result;
  }
}
