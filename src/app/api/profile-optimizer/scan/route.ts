import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ProfileOptimizerAgent } from '@/lib/agents/profile-optimizer';
import { db } from '@/lib/db';

// POST /api/profile-optimizer/scan — Analyser le profil LinkedIn
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'profile_optimizer',
        status: 'executing',
        title: 'Analyse du profil en cours',
        description: 'Analyse complète du profil LinkedIn en cours de traitement...',
      },
    });

    try {
      const result = await ProfileOptimizerAgent.analyzeProfile(authUser.id);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `Analyse terminée — Score : ${result.overallScore}/100`,
          description: `Analyse du profil LinkedIn terminée. Score global : ${result.overallScore}/100. ${result.suggestions.length} suggestions d'amélioration.`,
          result: JSON.stringify({
            overallScore: result.overallScore,
            headlineScore: result.headlineScore,
            aboutScore: result.aboutScore,
            experienceScore: result.experienceScore,
            skillsScore: result.skillsScore,
            recommendationsScore: result.recommendationsScore,
            suggestionsCount: result.suggestions.length,
          }),
        },
      });

      return NextResponse.json({ analysis: result });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec de l\'analyse du profil',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[ProfileOptimizer] Scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// GET /api/profile-optimizer/scan — Récupérer la dernière analyse de profil
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const latestAnalysis = await db.profileAnalysis.findFirst({
      where: { userId: authUser.id },
      orderBy: { analyzedAt: 'desc' },
    });

    if (!latestAnalysis) {
      return NextResponse.json({ analysis: null, message: 'Aucune analyse disponible. Lancez une analyse pour commencer.' });
    }

    return NextResponse.json({
      analysis: {
        id: latestAnalysis.id,
        headline: latestAnalysis.headline,
        about: latestAnalysis.about,
        optimizedHeadline: latestAnalysis.optimizedHeadline,
        optimizedAbout: latestAnalysis.optimizedAbout,
        headlineScore: latestAnalysis.headlineScore,
        aboutScore: latestAnalysis.aboutScore,
        experienceScore: latestAnalysis.experienceScore,
        skillsScore: latestAnalysis.skillsScore,
        recommendationsScore: latestAnalysis.recommendationsScore,
        overallScore: latestAnalysis.score,
        suggestions: latestAnalysis.suggestions ? JSON.parse(latestAnalysis.suggestions) : [],
        topProfiles: latestAnalysis.topProfiles ? JSON.parse(latestAnalysis.topProfiles) : null,
        analyzedAt: latestAnalysis.analyzedAt,
      },
    });
  } catch (error) {
    console.error('[ProfileOptimizer] Get analysis error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
