import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { CompetitorSpyAgent } from '@/lib/agents/competitor-spy';
import { db } from '@/lib/db';

// POST /api/competitor-spy/analyze — Analyser l'activité d'un concurrent
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { competitorId } = body;

    if (!competitorId) {
      return NextResponse.json({ error: 'competitorId est requis' }, { status: 400 });
    }

    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'competitor_spy',
        status: 'executing',
        title: 'Analyse concurrentielle en cours',
        description: 'Analyse de l\'activité LinkedIn du concurrent...',
      },
    });

    try {
      const result = await CompetitorSpyAgent.analyzeCompetitorActivity(authUser.id, competitorId);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `Analyse terminée — ${result.competitorName}`,
          description: `Analyse de ${result.competitorName} terminée. Niveau de menace : ${result.threatLevel}. Engagement moyen : ${result.profileAnalysis.avgEngagement}%.`,
          result: JSON.stringify({
            competitorId: result.competitorId,
            competitorName: result.competitorName,
            threatLevel: result.threatLevel,
            avgEngagement: result.profileAnalysis.avgEngagement,
            recommendationsCount: result.recommendations.length,
          }),
        },
      });

      return NextResponse.json({ analysis: result });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec de l\'analyse concurrentielle',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[CompetitorSpy] Analyze error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
