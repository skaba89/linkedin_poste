import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-providers';
import type { AIMessage } from '@/lib/ai-providers';

// ============================================================
// Types
// ============================================================

export interface ProfileOptimizerConfig {
  targetIndustry: string;
  targetRole: string;
  tone: string;
  keywords: string[];
  autoOptimize: boolean;
}

export interface ProfileAnalysisResult {
  headline: string;
  about: string;
  headlineScore: number;
  aboutScore: number;
  experienceScore: number;
  skillsScore: number;
  recommendationsScore: number;
  overallScore: number;
  suggestions: string[];
}

export interface OptimizationResult {
  optimizedHeadline: string;
  optimizedAbout: string;
  changesExplained: string;
}

export interface BenchmarkProfile {
  name: string;
  headline: string;
  strengths: string[];
}

export interface BenchmarkResult {
  topProfiles: BenchmarkProfile[];
  gaps: string[];
  opportunities: string[];
}

const DEFAULT_CONFIG: ProfileOptimizerConfig = {
  targetIndustry: '',
  targetRole: '',
  tone: 'professionnel',
  keywords: [],
  autoOptimize: false,
};

// ============================================================
// ProfileOptimizerAgent — Core Intelligence
// ============================================================

export class ProfileOptimizerAgent {
  /**
   * Get user-specific Profile Optimizer config from Settings table.
   */
  static async getConfig(userId: string): Promise<ProfileOptimizerConfig> {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `profile_optimizer_${userId}_`,
          },
        },
      });

      const config = { ...DEFAULT_CONFIG };
      for (const s of settings) {
        const key = s.key.replace(`profile_optimizer_${userId}_`, '');
        switch (key) {
          case 'targetIndustry':
            config.targetIndustry = s.value || '';
            break;
          case 'targetRole':
            config.targetRole = s.value || '';
            break;
          case 'tone':
            config.tone = s.value || 'professionnel';
            break;
          case 'keywords':
            config.keywords = JSON.parse(s.value || '[]');
            break;
          case 'autoOptimize':
            config.autoOptimize = s.value === 'true';
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save user-specific Profile Optimizer config.
   */
  static async saveConfig(userId: string, config: Partial<ProfileOptimizerConfig>): Promise<ProfileOptimizerConfig> {
    const entries: { key: string; value: string }[] = [];
    if (config.targetIndustry !== undefined) entries.push({ key: `profile_optimizer_${userId}_targetIndustry`, value: config.targetIndustry });
    if (config.targetRole !== undefined) entries.push({ key: `profile_optimizer_${userId}_targetRole`, value: config.targetRole });
    if (config.tone !== undefined) entries.push({ key: `profile_optimizer_${userId}_tone`, value: config.tone });
    if (config.keywords !== undefined) entries.push({ key: `profile_optimizer_${userId}_keywords`, value: JSON.stringify(config.keywords) });
    if (config.autoOptimize !== undefined) entries.push({ key: `profile_optimizer_${userId}_autoOptimize`, value: String(config.autoOptimize) });

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
  // 1. PROFILE ANALYSIS
  // ----------------------------------------------------------------

  /**
   * Uses AI to create a comprehensive ProfileAnalysis with scores for each section.
   * Stores in ProfileAnalysis table and creates AgentActivity.
   */
  static async analyzeProfile(userId: string): Promise<ProfileAnalysisResult> {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const previousAnalyses = await db.profileAnalysis.findMany({
      where: { userId },
      orderBy: { analyzedAt: 'desc' },
      take: 3,
    });

    const industry = config.targetIndustry || 'Technologie';
    const role = config.targetRole || 'Professionnel';
    const tone = config.tone || 'professionnel';
    const keywords = config.keywords.join(', ') || 'LinkedIn, B2B, croissance';

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un expert en optimisation de profil LinkedIn. Tu analyses les profils professionnels et fournis des scores détaillés et des recommandations d'amélioration.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "headline": "titre actuel ou suggestion",
  "about": "résumé actuel ou suggestion",
  "headlineScore": 75,
  "aboutScore": 60,
  "experienceScore": 80,
  "skillsScore": 70,
  "recommendationsScore": 65,
  "overallScore": 70,
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}
Les scores sont entre 0 et 100. Sois exigeant mais juste dans ton évaluation.`,
      },
      {
        role: 'user',
        content: `Analyse le profil LinkedIn suivant :
- Nom : ${user?.name || 'Utilisateur'}
- Industrie cible : ${industry}
- Rôle cible : ${role}
- Ton souhaité : ${tone}
- Mots-clés stratégiques : ${keywords}
${previousAnalyses.length > 0 ? `- Dernier score global : ${previousAnalyses[0].score}/100 (analysé le ${previousAnalyses[0].analyzedAt.toLocaleDateString('fr-FR')})` : ''}

Évalue chaque section (headline, about, expérience, compétences, recommandations) sur 100.
Propose au moins 5 suggestions d'amélioration concrètes et actionnables.
Date d'analyse : ${new Date().toLocaleDateString('fr-FR')}`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.4, maxTokens: 1500 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const analysis = JSON.parse(cleaned) as ProfileAnalysisResult;

      analysis.headlineScore = Math.max(0, Math.min(100, analysis.headlineScore || 0));
      analysis.aboutScore = Math.max(0, Math.min(100, analysis.aboutScore || 0));
      analysis.experienceScore = Math.max(0, Math.min(100, analysis.experienceScore || 0));
      analysis.skillsScore = Math.max(0, Math.min(100, analysis.skillsScore || 0));
      analysis.recommendationsScore = Math.max(0, Math.min(100, analysis.recommendationsScore || 0));
      analysis.overallScore = Math.max(0, Math.min(100, analysis.overallScore || 0));

      await db.profileAnalysis.create({
        data: {
          userId,
          headline: analysis.headline,
          about: analysis.about,
          score: analysis.overallScore,
          headlineScore: analysis.headlineScore,
          aboutScore: analysis.aboutScore,
          experienceScore: analysis.experienceScore,
          skillsScore: analysis.skillsScore,
          recommendationsScore: analysis.recommendationsScore,
          suggestions: JSON.stringify(analysis.suggestions),
        },
      });

      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'profile_optimizer',
          status: 'completed',
          title: `Analyse de profil — Score : ${analysis.overallScore}/100`,
          description: `Analyse complète du profil LinkedIn. Scores : Titre ${analysis.headlineScore}, Résumé ${analysis.aboutScore}, Expérience ${analysis.experienceScore}, Compétences ${analysis.skillsScore}, Recommandations ${analysis.recommendationsScore}.`,
          metadata: JSON.stringify({
            scores: {
              headline: analysis.headlineScore,
              about: analysis.aboutScore,
              experience: analysis.experienceScore,
              skills: analysis.skillsScore,
              recommendations: analysis.recommendationsScore,
              overall: analysis.overallScore,
            },
          }),
        },
      });

      if (analysis.overallScore < 50) {
        await db.notification.create({
          data: {
            userId,
            type: 'system',
            title: 'Profil nécessite une optimisation',
            message: `Votre score de profil est de ${analysis.overallScore}/100. Plusieurs améliorations sont recommandées pour augmenter votre visibilité sur LinkedIn.`,
            metadata: JSON.stringify({ score: analysis.overallScore }),
          },
        });
      }

      return analysis;
    } catch (error) {
      console.error('[ProfileOptimizer] Analysis error:', error);
      return this.getFallbackAnalysis(config);
    }
  }

  private static getFallbackAnalysis(config: ProfileOptimizerConfig): ProfileAnalysisResult {
    const industry = config.targetIndustry || 'Technologie';
    return {
      headline: `Expert ${industry} | Accompagnement stratégique`,
      about: `Professionnel passionné par l'${config.targetIndustry || 'innovation technologique'}. ${config.targetRole || 'Expert'} avec une approche orientée résultats.`,
      headlineScore: 55,
      aboutScore: 45,
      experienceScore: 60,
      skillsScore: 50,
      recommendationsScore: 40,
      overallScore: 50,
      suggestions: [
        'Ajoutez des mots-clés stratégiques dans votre titre',
        'Structurez votre résumé avec des bullet points',
        'Ajoutez une photo de profil professionnelle',
        'Sollicitez des recommandations de collègues',
        'Mettez à jour vos compétences principales',
      ],
    };
  }

  // ----------------------------------------------------------------
  // 2. OPTIMIZATION SUGGESTIONS
  // ----------------------------------------------------------------

  /**
   * Gets latest ProfileAnalysis, uses AI to suggest optimizedHeadline and optimizedAbout.
   * Updates the ProfileAnalysis and creates AgentActivity + Notification.
   */
  static async generateOptimizations(userId: string): Promise<OptimizationResult> {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    let latestAnalysis = await db.profileAnalysis.findFirst({
      where: { userId },
      orderBy: { analyzedAt: 'desc' },
    });

    if (!latestAnalysis) {
      const analysis = await this.analyzeProfile(userId);
      latestAnalysis = await db.profileAnalysis.findFirst({
        where: { userId },
        orderBy: { analyzedAt: 'desc' },
      });
      if (!latestAnalysis) {
        throw new Error('Impossible de générer une analyse de profil');
      }
    }

    const industry = config.targetIndustry || 'Technologie';
    const role = config.targetRole || 'Professionnel';
    const tone = config.tone || 'professionnel';
    const keywords = config.keywords.join(', ') || 'LinkedIn, B2B, croissance';

    const previousSuggestions = latestAnalysis.suggestions
      ? JSON.parse(latestAnalysis.suggestions)
      : [];

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un copywriter LinkedIn expert. Tu optimises les titres et résumés de profil pour maximiser l'impact professionnel et la visibilité.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "optimizedHeadline": "titre optimisé (max 120 caractères)",
  "optimizedAbout": "résumé optimisé (max 2600 caractères)",
  "changesExplained": "explication des changements en 2-3 phrases"
}
Le ton doit être : ${tone}. Inclus naturellement les mots-clés stratégiques fournis.`,
      },
      {
        role: 'user',
        content: `Optimise le profil LinkedIn suivant :
- Nom : ${user?.name || 'Utilisateur'}
- Industrie : ${industry}
- Rôle cible : ${role}
- Mots-clés stratégiques : ${keywords}
- Titre actuel : "${latestAnalysis.headline || 'Non défini'}"
- Résumé actuel : "${(latestAnalysis.about || 'Non défini').substring(0, 500)}"
- Scores actuels : Titre ${latestAnalysis.headlineScore}/100, Résumé ${latestAnalysis.aboutScore}/100
${previousSuggestions.length > 0 ? `- Suggestions d'amélioration : ${previousSuggestions.slice(0, 5).join(', ')}` : ''}

Génère un titre accrocheur et optimisé SEO LinkedIn ainsi qu'un résumé percutant qui met en valeur l'expertise.`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.7, maxTokens: 1500 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const optimizations = JSON.parse(cleaned) as OptimizationResult;

      await db.profileAnalysis.update({
        where: { id: latestAnalysis.id },
        data: {
          optimizedHeadline: optimizations.optimizedHeadline,
          optimizedAbout: optimizations.optimizedAbout,
        },
      });

      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'profile_optimizer',
          status: 'completed',
          title: 'Optimisations de profil générées',
          description: `Nouveau titre et résumé optimisés pour l'industrie "${industry}" et le rôle "${role}". ${optimizations.changesExplained}`,
          metadata: JSON.stringify({
            optimizedHeadline: optimizations.optimizedHeadline,
            changes: optimizations.changesExplained,
          }),
        },
      });

      await db.notification.create({
        data: {
          userId,
          type: 'system',
          title: 'Nouvelles optimisations disponibles',
          message: `Votre titre et résumé LinkedIn ont été optimisés pour "${role}" dans "${industry}". Consultez les suggestions et appliquez-les à votre profil.`,
          metadata: JSON.stringify({ type: 'optimization' }),
        },
      });

      return optimizations;
    } catch (error) {
      console.error('[ProfileOptimizer] Optimization error:', error);
      return {
        optimizedHeadline: `${role} ${industry} | Stratège & Expert`,
        optimizedAbout: `Professionnel spécialisé en ${industry} avec une expertise confirmée en tant que ${role}. Passionné par la création de valeur et l'innovation. Contactez-moi pour discuter de vos projets.`,
        changesExplained: 'Optimisations de base générées. Veuillez réessayer pour des suggestions plus personnalisées.',
      };
    }
  }

  // ----------------------------------------------------------------
  // 3. BENCHMARKING
  // ----------------------------------------------------------------

  /**
   * AI compares user profile to top profiles in their industry.
   * Returns insights and stores in ProfileAnalysis.topProfiles.
   */
  static async benchmarkAgainstProfiles(
    userId: string,
    topProfileNames?: string[]
  ): Promise<BenchmarkResult> {
    const config = await this.getConfig(userId);

    const latestAnalysis = await db.profileAnalysis.findFirst({
      where: { userId },
      orderBy: { analyzedAt: 'desc' },
    });

    const industry = config.targetIndustry || 'Technologie';
    const role = config.targetRole || 'Professionnel';
    const keywords = config.keywords.join(', ') || '';

    const profileNamesHint = topProfileNames && topProfileNames.length > 0
      ? `\nProfils de référence souhaités : ${topProfileNames.join(', ')}`
      : '';

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Tu es un analyste de profil LinkedIn expert. Tu compares un profil à ceux des leaders d'opinion dans son industrie.
Réponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "topProfiles": [
    {"name": "Nom Expert", "headline": "Son titre LinkedIn", "strengths": ["force 1", "force 2"]}
  ],
  "gaps": ["écart identifié 1", "écart identifié 2"],
  "opportunities": ["opportunité 1", "opportunité 2"]
}
Génère 5 profils de référence réalistes, 5 écarts et 5 opportunités.`,
      },
      {
        role: 'user',
        content: `Compare le profil suivant aux meilleurs profils de l'industrie :
- Industrie : ${industry}
- Rôle cible : ${role}
- Mots-clés : ${keywords || 'Non définis'}
- Score global actuel : ${latestAnalysis?.score || 'Non analysé'}/100
- Titre actuel : "${latestAnalysis?.headline || 'Non défini'}"
- Résumé actuel : "${(latestAnalysis?.about || 'Non défini').substring(0, 300)}"
${profileNamesHint}

Identifie les profils de référence dans le domaine "${industry}" pour un "${role}".
Mets en évidence les écarts entre le profil analysé et les meilleures pratiques.
Propose des opportunités concrètes d'amélioration.
Date : ${new Date().toLocaleDateString('fr-FR')}`,
      },
    ];

    try {
      const result = await callAI(messages, { temperature: 0.6, maxTokens: 2000 }, 'zai');
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const benchmark = JSON.parse(cleaned) as BenchmarkResult;

      if (latestAnalysis) {
        await db.profileAnalysis.update({
          where: { id: latestAnalysis.id },
          data: {
            topProfiles: JSON.stringify(benchmark.topProfiles),
          },
        });
      }

      await db.agentActivity.create({
        data: {
          userId,
          agentType: 'profile_optimizer',
          status: 'completed',
          title: `Benchmark de profil — ${industry}`,
          description: `Comparaison avec ${benchmark.topProfiles?.length || 0} profils de référence. ${benchmark.gaps?.length || 0} écarts identifiés, ${benchmark.opportunities?.length || 0} opportunités détectées.`,
          metadata: JSON.stringify({ benchmark, industry }),
        },
      });

      return benchmark;
    } catch (error) {
      console.error('[ProfileOptimizer] Benchmark error:', error);
      return {
        topProfiles: [
          { name: 'Expert A', headline: `VP ${industry} | Speaker | Auteur`, strengths: ['Branding fort', 'Contenu régulier'] },
          { name: 'Expert B', headline: `CEO @Startup${industry} | Top Voice`, strengths: ['Thought leadership', 'Network étendu'] },
          { name: 'Expert C', headline: `Directeur ${industry} | Mentor`, strengths: ['Mentorat actif', 'Partages fréquents'] },
          { name: 'Expert D', headline: `Consultant ${industry} | Formateur`, strengths: ['Contenu éducatif', 'Haute engagement'] },
          { name: 'Expert E', headline: `Fondateur ${industry} | Innovateur`, strengths: ['Vision stratégique', 'Storytelling'] },
        ],
        gaps: [
          'Le titre manque de mots-clés spécifiques',
          'Le résumé ne montre pas de résultats chiffrés',
          'Absence de contenu publié régulièrement',
          'Peu de témoignages visibles',
          'Faible activité de networking récent',
        ],
        opportunities: [
          'Ajouter des publications régulières sur le sujet',
          'Obtenir des recommandations de leaders du secteur',
          'Publier des études de cas chiffrées',
          'Participer activement à des groupes LinkedIn',
          'Créer du contenu carrousel éducatif',
        ],
      };
    }
  }

  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------

  /**
   * Main cycle: analyzeProfile + generateOptimizations + benchmarkAgainstProfiles.
   * Returns stats.
   */
  static async runWorkerCycle(userId: string): Promise<{
    analyzed: boolean;
    optimized: boolean;
    benchmarked: boolean;
    score: number;
  }> {
    const config = await this.getConfig(userId);
    const result = {
      analyzed: false,
      optimized: false,
      benchmarked: false,
      score: 0,
    };

    try {
      const analysis = await this.analyzeProfile(userId);
      result.analyzed = true;
      result.score = analysis.overallScore;
    } catch (error) {
      console.error(`[ProfileOptimizer Worker] Analysis error for user ${userId}:`, error);
    }

    if (config.autoOptimize) {
      try {
        await this.generateOptimizations(userId);
        result.optimized = true;
      } catch (error) {
        console.error(`[ProfileOptimizer Worker] Optimization error for user ${userId}:`, error);
      }
    }

    try {
      const lastBenchmarkActivity = await db.agentActivity.findFirst({
        where: {
          userId,
          agentType: 'profile_optimizer',
          title: { contains: 'Benchmark' },
        },
        orderBy: { createdAt: 'desc' },
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (!lastBenchmarkActivity || lastBenchmarkActivity.createdAt < sevenDaysAgo) {
        await this.benchmarkAgainstProfiles(userId);
        result.benchmarked = true;
      }
    } catch (error) {
      console.error(`[ProfileOptimizer Worker] Benchmark error for user ${userId}:`, error);
    }

    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: 'profile_optimizer' } },
        data: { lastExecutedAt: new Date() },
      });
    } catch {
      // Config may not exist
    }

    return result;
  }

  /**
   * Get dashboard stats for a user.
   * Returns last analysis, score history count, etc.
   */
  static async getDashboardStats(userId: string) {
    const [
      totalAnalyses,
      latestAnalysis,
      recentActivities,
      totalOptimizations,
    ] = await Promise.all([
      db.profileAnalysis.count({ where: { userId } }),
      db.profileAnalysis.findFirst({
        where: { userId },
        orderBy: { analyzedAt: 'desc' },
      }),
      db.agentActivity.findMany({
        where: { userId, agentType: 'profile_optimizer' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.profileAnalysis.count({
        where: {
          userId,
          optimizedHeadline: { not: null },
        },
      }),
    ]);

    const scoreHistory = await db.profileAnalysis.findMany({
      where: { userId },
      orderBy: { analyzedAt: 'asc' },
      take: 10,
      select: { score: true, analyzedAt: true },
    });

    let scoreTrend: 'up' | 'down' | 'stable' = 'stable';
    if (scoreHistory.length >= 2) {
      const recent = scoreHistory[scoreHistory.length - 1].score;
      const previous = scoreHistory[scoreHistory.length - 2].score;
      if (recent > previous + 5) scoreTrend = 'up';
      else if (recent < previous - 5) scoreTrend = 'down';
    }

    return {
      totalAnalyses,
      latestScore: latestAnalysis?.score || 0,
      latestHeadlineScore: latestAnalysis?.headlineScore || 0,
      latestAboutScore: latestAnalysis?.aboutScore || 0,
      latestExperienceScore: latestAnalysis?.experienceScore || 0,
      latestSkillsScore: latestAnalysis?.skillsScore || 0,
      latestRecommendationsScore: latestAnalysis?.recommendationsScore || 0,
      optimizedHeadline: latestAnalysis?.optimizedHeadline || null,
      optimizedAbout: latestAnalysis?.optimizedAbout || null,
      hasOptimizations: !!latestAnalysis?.optimizedHeadline,
      totalOptimizations,
      scoreHistory,
      scoreTrend,
      suggestions: latestAnalysis?.suggestions ? JSON.parse(latestAnalysis.suggestions) : [],
      recentActivities,
    };
  }
}
